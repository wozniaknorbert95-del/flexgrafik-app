import { AppData } from '../types';

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

// Data migration utility (for future schema changes)
export const migrateData = (oldData: any): AppData => {
  // Add migration logic here when needed
  // For now, just return as-is if structure is valid
  if (oldData && typeof oldData === 'object' && oldData.pillars) {
    return oldData as AppData;
  }

  // Return default if migration fails
  throw new Error('Data migration failed');
};