import { AppData, type GoalActivation, type GoalType, TaskStatus } from '../types';
import {
  migrateOldPillarTasks,
  migrateOldPhaseTasks,
  needsMigration,
  migrateToV4,
} from './migrateData';
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

  // First: Migrate schema to latest version (v1 → v2 → v3 → v4) if needed
  const v4Data = migrateToV4(oldData);

  // Continue with existing migration logic on up-to-date schema
  const data = v4Data;

  const MAX_ACTIVE_GOALS_DEFAULT = 3;
  const validGoalTypes = new Set<GoalType>(['main', 'secondary', 'lab']);
  const validActivations = new Set<GoalActivation>(['active', 'backlog']);

  const normalizeGoalType = (raw: any): GoalType => {
    return validGoalTypes.has(raw) ? (raw as GoalType) : 'secondary';
  };

  const normalizeActivation = (raw: any): GoalActivation => {
    return validActivations.has(raw) ? (raw as GoalActivation) : 'active';
  };

  const toSafeMs = (iso: any): number => {
    const t = new Date(typeof iso === 'string' ? iso : 0).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const enforceMaxActiveGoals = (pillars: any[], maxActive: number): any[] => {
    const list = Array.isArray(pillars) ? pillars : [];
    // Configurable but safe: default 3, clamp 1..10.
    const cap = Math.max(
      1,
      Math.min(10, Math.floor(Number(maxActive) || MAX_ACTIVE_GOALS_DEFAULT))
    );

    // Normalize goal fields first so we can enforce rules deterministically.
    let normalizedList = list.map((p: any) => ({
      ...p,
      type: normalizeGoalType(p?.type),
      activation: normalizeActivation(p?.activation),
    }));

    // -----------------------------------------------------------------------
    // PLAN 5.1 / D-003: Enforce "max 1 MAIN goal" among ACTIVE goals.
    // IMPORTANT: This must happen BEFORE enforcing max-active-goals limit.
    // -----------------------------------------------------------------------
    const getGoalRecencyMs = (p: any): number => {
      // Prefer explicit updatedAt if present, otherwise fall back to last_activity_date.
      // Some legacy seeds/imports may have different field names; be permissive but deterministic.
      return Math.max(
        toSafeMs(p?.updatedAt),
        toSafeMs(p?.last_activity_date),
        toSafeMs(p?.lastActivityDate),
        toSafeMs(p?.createdAt)
      );
    };

    const activeMains = normalizedList.filter(
      (p: any) => p && p.status !== 'done' && p.activation === 'active' && p.type === 'main'
    );
    if (activeMains.length > 1) {
      const sortedMains = [...activeMains].sort((a: any, b: any) => {
        const byRecency = getGoalRecencyMs(b) - getGoalRecencyMs(a);
        if (byRecency !== 0) return byRecency;
        return Number(a?.id ?? 0) - Number(b?.id ?? 0);
      });
      const keepId = Number(sortedMains[0]?.id);
      normalizedList = normalizedList.map((p: any) => {
        if (!p || p.status === 'done') return p;
        if (p.activation !== 'active') return p;
        if (p.type !== 'main') return p;
        const id = Number(p?.id);
        if (!Number.isFinite(id)) return p;
        if (id === keepId) return p;
        return { ...p, type: 'secondary' };
      });
    }

    const notDone = normalizedList.filter((p) => p && p.status !== 'done');
    const done = normalizedList.filter((p) => p && p.status === 'done');

    const activeCandidates = notDone.filter((p) => p.activation === 'active');
    if (activeCandidates.length <= cap) {
      return normalizedList;
    }

    const typeRank = (t: any): number => {
      const type = normalizeGoalType(t);
      if (type === 'main') return 0;
      if (type === 'secondary') return 1;
      return 2; // lab
    };

    const sorted = [...activeCandidates].sort((a: any, b: any) => {
      const byType = typeRank(a?.type) - typeRank(b?.type);
      if (byType !== 0) return byType;
      const byCompletion = Number(b?.completion ?? 0) - Number(a?.completion ?? 0);
      if (byCompletion !== 0) return byCompletion;
      const byActivity = toSafeMs(b?.last_activity_date) - toSafeMs(a?.last_activity_date);
      if (byActivity !== 0) return byActivity;
      return Number(a?.id ?? 0) - Number(b?.id ?? 0);
    });

    const keepActiveIds = new Set<number>(sorted.slice(0, cap).map((p: any) => Number(p.id)));

    const nextNotDone = notDone.map((p: any) => {
      const id = Number(p?.id);
      const nextActivation = keepActiveIds.has(id) ? 'active' : 'backlog';
      return { ...p, activation: nextActivation };
    });

    // Keep original ordering (as much as possible) by mapping the normalized list.
    const nextById = new Map<number, any>(nextNotDone.map((p: any) => [Number(p?.id), p]));
    return normalizedList.map((p: any) => {
      if (!p) return p;
      if (p.status === 'done') return p;
      const id = Number(p?.id);
      return nextById.get(id) ?? p;
    });
  };

  // Always ensure new optional fields exist with safe defaults (local-first, backward compatible).
  // This keeps old stored data working without requiring a versioned migration step.
  const ensureTaskDefaults = (data: any): AppData => {
    if (!data?.pillars || !Array.isArray(data.pillars)) return data as AppData;

    const isNewStatus = (s: unknown): s is TaskStatus =>
      s === 'active' || s === 'stuck' || s === 'done' || s === 'abandoned';

    const withTaskDefaults = {
      ...data,
      settings: {
        ...(data?.settings || {}),
        voice: {
          enabled: Boolean(data?.settings?.voice?.enabled),
          volume: Number.isFinite(Number(data?.settings?.voice?.volume))
            ? Number(data.settings.voice.volume)
            : INITIAL_DATA.settings.voice.volume,
          speed: Number.isFinite(Number(data?.settings?.voice?.speed))
            ? Number(data.settings.voice.speed)
            : INITIAL_DATA.settings.voice.speed,
        },
        ai: {
          apiKey: typeof data?.settings?.ai?.apiKey === 'string' ? data.settings.ai.apiKey : '',
          enabled: Boolean(data?.settings?.ai?.enabled),
          customSystemPrompt:
            typeof data?.settings?.ai?.customSystemPrompt === 'string'
              ? data.settings.ai.customSystemPrompt
              : undefined,
        },
        goals: {
          maxActive: Math.max(
            1,
            Math.min(
              10,
              Math.floor(
                Number((data?.settings as any)?.goals?.maxActive ?? MAX_ACTIVE_GOALS_DEFAULT) ||
                  MAX_ACTIVE_GOALS_DEFAULT
              )
            )
          ),
        },
      },
      pillars: data.pillars.map((pillar: any) => ({
        ...pillar,
        type: normalizeGoalType(pillar?.type),
        activation: normalizeActivation(pillar?.activation),
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
                typeof (task as any)?.finishStatus === 'string'
                  ? String((task as any).finishStatus)
                  : '';

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
      // Evening Protocol system (v2)
      schemaVersion: data?.schemaVersion ?? 2,
      eveningProtocols: Array.isArray(data?.eveningProtocols) ? data.eveningProtocols : [],
      declarations: Array.isArray(data?.declarations) ? data.declarations : [],
      goalAgents: data?.goalAgents && typeof data.goalAgents === 'object' ? data.goalAgents : {},
    } as AppData;

    // D-003: enforce max 3 active goals in DATA (auto-archive extras to backlog).
    const maxActive =
      Number((withTaskDefaults.settings as any)?.goals?.maxActive) || MAX_ACTIVE_GOALS_DEFAULT;
    const nextPillars = enforceMaxActiveGoals(withTaskDefaults.pillars as any[], maxActive);
    return { ...withTaskDefaults, pillars: nextPillars };
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
