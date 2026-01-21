import { AppData } from '../types';
import { migrateOldPillarTasks, migrateOldPhaseTasks, needsMigration } from './migrateData';
import { INITIAL_DATA } from '../constants';

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
      console.error('Failed to save to LocalStorage:', error);
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
    console.warn('Failed to load from LocalStorage, using defaults:', error);
    return defaultValue;
  }
};

// Data migration utility for task model updates
export const migrateData = (oldData: any): AppData => {
  if (!oldData || typeof oldData !== 'object') {
    return INITIAL_DATA;
  }

  // Check if migration is needed
  if (needsMigration(oldData)) {
    console.log('🔄 Migrating old task data to new format...');

    const migratedData: AppData = {
      ...oldData,
      pillars: oldData.pillars ? oldData.pillars.map(migrateOldPillarTasks) : [],
      phases: oldData.phases ? oldData.phases.map(migrateOldPhaseTasks) : []
    };

    console.log('✅ Task migration completed');
    return migratedData;
  }

  // No migration needed, return as-is
  return oldData as AppData;
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
    console.error('❌ Invalid data structure, not saving');
    return;
  }

  debouncedSave('flexgrafik-data', data);
};