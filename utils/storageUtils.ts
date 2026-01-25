import { AppData, TaskStatus } from '../types';
import { migrateOldPillarTasks, migrateOldPhaseTasks, needsMigration } from './migrateData';
import { INITIAL_DATA } from '../constants';
import { handleError } from './errorHandler';
import { detectStuckAt90 } from './taskHelpers';

// Debounced LocalStorage save
let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 1000; // 1 second

export const debouncedSave = (key: string, data: AppData): void => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log('Data saved to LocalStorage');
    } catch (error) {
      handleError(error, {
        component: 'Storage',
        action: 'saveToLocalStorage',
        userMessage: 'Failed to save your data',
      });
    }
  }, SAVE_DEBOUNCE_MS);
};

// Safe LocalStorage load with error handling
export const safeLoad = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;

    const parsed = JSON.parse(saved);
    return parsed as T;
  } catch (error) {
    handleError(error, {
      component: 'Storage',
      action: 'loadFromLocalStorage',
      userMessage: 'Failed to load your data, using defaults',
    });
    return defaultValue;
  }
};

// Data migration utility for task model updates
export const migrateData = (oldData: any): AppData => {
  if (!oldData || typeof oldData !== 'object') {
    return INITIAL_DATA;
  }

  // Always ensure new optional fields exist with safe defaults (local-first, backward compatible).
  // This keeps old stored data working without requiring a versioned migration step.
  const ensureTaskDefaults = (data: any): AppData => {
    if (!data?.pillars || !Array.isArray(data.pillars)) return data as AppData;

    const isNewStatus = (s: unknown): s is TaskStatus =>
      s === 'active' || s === 'stuck' || s === 'done' || s === 'abandoned';

    return {
      ...data,
      pillars: data.pillars.map((pillar: any) => ({
        ...pillar,
        tasks: Array.isArray(pillar?.tasks)
          ? pillar.tasks.map((task: any) => {
              const now = new Date().toISOString();
              const progress = typeof task?.progress === 'number' ? task.progress : 0;
              const lastProgressUpdate =
                typeof task?.lastProgressUpdate === 'string'
                  ? task.lastProgressUpdate
                  : typeof task?.createdAt === 'string'
                    ? task.createdAt
                    : now;

              const legacyFinishStatus =
                typeof (task as any)?.finishStatus === 'string' ? String((task as any).finishStatus) : '';

              let status: TaskStatus;
              if (isNewStatus(task?.status)) {
                status = task.status;
              } else if (legacyFinishStatus === 'done' || progress >= 100) {
                status = 'done';
              } else if (legacyFinishStatus === 'stuck') {
                status = 'stuck';
              } else {
                // Map legacy progress-statuses to logical ones
                status = 'active';
              }

              const stuckAtNinety =
                progress >= 100
                  ? false
                  : typeof task?.stuckAtNinety === 'boolean'
                    ? task.stuckAtNinety
                    : detectStuckAt90({
                        ...task,
                        progress,
                        lastProgressUpdate,
                        status: 'active',
                        stuckAtNinety: false,
                      });

              if (status !== 'done' && status !== 'abandoned' && stuckAtNinety) {
                status = 'stuck';
              }

              // Drop legacy finishStatus if present (single status system)
              const { finishStatus: _legacyFinish, ...rest } = task || {};

              return {
                ...rest,
                definitionOfDone:
                  typeof task?.definitionOfDone === 'string' ? task.definitionOfDone : '',
                progress,
                status,
                stuckAtNinety,
                lastProgressUpdate,
                createdAt: typeof task?.createdAt === 'string' ? task.createdAt : now,
                completedAt:
                  typeof task?.completedAt === 'string'
                    ? task.completedAt
                    : progress >= 100
                      ? now
                      : undefined,
              };
            })
          : [],
      })),

      // Finish Mode sessions (safe defaults)
      currentFinishSession:
        data?.currentFinishSession && typeof data.currentFinishSession === 'object'
          ? data.currentFinishSession
          : null,
      finishSessionsHistory: Array.isArray(data?.finishSessionsHistory)
        ? data.finishSessionsHistory
        : [],
    } as AppData;
  };

  // Check if migration is needed
  if (needsMigration(oldData)) {
    console.log('🔄 Migrating old task data to new format...');

    const migratedData: AppData = {
      ...oldData,
      pillars: oldData.pillars ? oldData.pillars.map(migrateOldPillarTasks) : [],
      phases: oldData.phases ? oldData.phases.map(migrateOldPhaseTasks) : [],
    };

    console.log('✅ Task migration completed');
    return ensureTaskDefaults(migratedData);
  }

  // No migration needed, return as-is
  return ensureTaskDefaults(oldData);
};

// Enhanced load function with automatic migration
export const loadAppData = (): AppData => {
  try {
    const saved = localStorage.getItem('flexgrafik-data');
    if (!saved) {
      console.log('📝 No saved data found, using defaults');
      return INITIAL_DATA;
    }

    const parsed = JSON.parse(saved);
    return migrateData(parsed);
  } catch (error) {
    console.warn('⚠️ Failed to load data, using defaults:', error);
    return INITIAL_DATA;
  }
};

// Enhanced save function with validation
export const saveAppData = (data: AppData): void => {
  // Validate data structure before saving
  if (!data || typeof data !== 'object' || !data.pillars) {
    handleError(new Error('Invalid data structure'), {
      component: 'Storage',
      action: 'validateDataStructure',
      userMessage: 'Data validation failed, not saving',
    });
    return;
  }

  debouncedSave('flexgrafik-data', data);
};
