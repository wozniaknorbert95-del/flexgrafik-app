import { AppData } from '../types';
import { INITIAL_DATA } from '../constants';
import { handleError } from './errorHandler';
import { migrateData } from './storageUtils';
import * as IndexedDBStorage from './indexedDBStorage';

// ============================================================================
// STORAGE MANAGER - Unified API with Progressive Enhancement
// ============================================================================

type StorageType = 'indexeddb' | 'localstorage';

let currentStorageType: StorageType | null = null;
let migrationCompleted = false;

// ============================================================================
// STORAGE DETECTION & SELECTION
// ============================================================================

/**
 * Detect best available storage method
 */
const detectBestStorage = async (): Promise<StorageType> => {
  // Try IndexedDB first (modern, async, scalable)
  if (IndexedDBStorage.isIndexedDBSupported()) {
    try {
      await IndexedDBStorage.initIndexedDB();
      console.log('✅ Using IndexedDB (preferred)');
      return 'indexeddb';
    } catch (error) {
      console.warn('⚠️ IndexedDB available but failed to init, falling back to localStorage');
    }
  }

  // Fallback to localStorage
  console.log('⚙️ Using localStorage (fallback)');
  return 'localstorage';
};

/**
 * Get current storage type (cached)
 */
const getStorageType = async (): Promise<StorageType> => {
  if (currentStorageType) {
    return currentStorageType;
  }
  currentStorageType = await detectBestStorage();
  return currentStorageType;
};

// ============================================================================
// MIGRATION SYSTEM
// ============================================================================

/**
 * Migrate data from localStorage to IndexedDB (one-time)
 */
const migrateToIndexedDB = async (): Promise<void> => {
  if (migrationCompleted) return;

  try {
    // Check if localStorage has data
    const localStorageData = localStorage.getItem('flexgrafik-data');
    if (!localStorageData) {
      console.log('📝 No localStorage data to migrate');
      migrationCompleted = true;
      return;
    }

    // Check if IndexedDB already has data
    const indexedDBData = await IndexedDBStorage.loadFromIndexedDB();
    if (indexedDBData) {
      console.log('✅ IndexedDB already has data, skipping migration');
      migrationCompleted = true;
      return;
    }

    // Perform migration
    console.log('🔄 Migrating data: localStorage → IndexedDB');
    const parsed = JSON.parse(localStorageData);
    const migratedData = migrateData(parsed);

    await IndexedDBStorage.saveToIndexedDB(migratedData);

    // Create backup before clearing localStorage
    await IndexedDBStorage.createBackup(migratedData);

    console.log('✅ Migration complete! Data now in IndexedDB');
    console.log('💡 localStorage data preserved (not deleted for safety)');

    migrationCompleted = true;
  } catch (error) {
    handleError(error, {
      component: 'StorageManager',
      action: 'migrateToIndexedDB',
      userMessage: 'Migration failed, using localStorage',
    });
    // Don't throw - fallback to localStorage is OK
  }
};

// ============================================================================
// UNIFIED CRUD OPERATIONS
// ============================================================================

/**
 * Load app data (tries IndexedDB first, then localStorage)
 */
export const loadAppData = async (): Promise<AppData> => {
  try {
    const storageType = await getStorageType();

    if (storageType === 'indexeddb') {
      // Migrate from localStorage if needed (one-time)
      await migrateToIndexedDB();

      const data = await IndexedDBStorage.loadFromIndexedDB();
      if (data) {
        // Apply any data migrations
        const migratedData = migrateData(data);
        console.log('✅ App data loaded from IndexedDB');
        return migratedData;
      }
    }

    // Fallback: Load from localStorage
    const saved = localStorage.getItem('flexgrafik-data');
    if (!saved) {
      console.log('📝 No saved data found, using defaults');
      return INITIAL_DATA;
    }

    const parsed = JSON.parse(saved);
    const migratedData = migrateData(parsed);
    console.log('✅ App data loaded from localStorage');
    return migratedData;
  } catch (error) {
    handleError(error, {
      component: 'StorageManager',
      action: 'loadAppData',
      userMessage: 'Failed to load data, using defaults',
    });
    return INITIAL_DATA;
  }
};

/**
 * Save app data (tries IndexedDB first, then localStorage)
 */
export const saveAppData = async (data: AppData): Promise<void> => {
  // Validate data structure
  if (!data || typeof data !== 'object' || !data.pillars) {
    handleError(new Error('Invalid data structure'), {
      component: 'StorageManager',
      action: 'validateDataStructure',
      userMessage: 'Data validation failed, not saving',
    });
    return;
  }

  try {
    const storageType = await getStorageType();

    if (storageType === 'indexeddb') {
      await IndexedDBStorage.saveToIndexedDB(data);
      return;
    }

    // Fallback: Save to localStorage
    localStorage.setItem('flexgrafik-data', JSON.stringify(data));
    console.log('💾 Data saved to localStorage');
  } catch (error) {
    handleError(error, {
      component: 'StorageManager',
      action: 'saveAppData',
      userMessage: 'Failed to save data',
    });
    throw error;
  }
};

/**
 * Debounced save (for performance)
 */
let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 500; // Reduced from 1000ms (IndexedDB is async)

export const debouncedSaveAppData = (data: AppData): void => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    await saveAppData(data);
  }, SAVE_DEBOUNCE_MS);
};

// ============================================================================
// BACKUP & RESTORE
// ============================================================================

/**
 * Create a manual backup
 */
export const createManualBackup = async (data: AppData): Promise<void> => {
  try {
    const storageType = await getStorageType();

    if (storageType === 'indexeddb') {
      await IndexedDBStorage.createBackup(data);
      console.log('✅ Backup created in IndexedDB');
      return;
    }

    // Fallback: Export to file
    const timestamp = new Date().toISOString();
    const backup = {
      data,
      timestamp,
      version: 1,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flexgrafik-backup-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('✅ Backup exported to file');
  } catch (error) {
    handleError(error, {
      component: 'StorageManager',
      action: 'createManualBackup',
      userMessage: 'Failed to create backup',
    });
  }
};

/**
 * Export data to JSON file
 */
export const exportDataToFile = (data: AppData): void => {
  try {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: 1,
      data,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flexgrafik-export-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ Data exported to file');
  } catch (error) {
    handleError(error, {
      component: 'StorageManager',
      action: 'exportDataToFile',
      userMessage: 'Failed to export data',
    });
  }
};

/**
 * Import data from JSON file
 */
export const importDataFromFile = (file: File): Promise<AppData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Handle both old format (direct AppData) and new format (with metadata)
        const importedData = parsed.data || parsed;

        // Apply migrations
        const migratedData = migrateData(importedData);

        // Validate
        if (!migratedData.pillars || !Array.isArray(migratedData.pillars)) {
          throw new Error('Invalid data structure in import file');
        }

        console.log('✅ Data imported from file');
        resolve(migratedData);
      } catch (error) {
        handleError(error, {
          component: 'StorageManager',
          action: 'importDataFromFile',
          userMessage: 'Failed to import data - invalid file format',
        });
        reject(error);
      }
    };

    reader.onerror = () => {
      const error = new Error('Failed to read file');
      handleError(error, {
        component: 'StorageManager',
        action: 'importDataFromFile',
        userMessage: 'Failed to read import file',
      });
      reject(error);
    };

    reader.readAsText(file);
  });
};

/**
 * List all backups (IndexedDB only)
 */
export const listBackups = async (): Promise<Array<{ timestamp: string; version: number }>> => {
  try {
    const storageType = await getStorageType();
    if (storageType === 'indexeddb') {
      return await IndexedDBStorage.listBackups();
    }
    return [];
  } catch (error) {
    console.error('Failed to list backups:', error);
    return [];
  }
};

/**
 * Restore from backup (IndexedDB only)
 */
export const restoreFromBackup = async (timestamp: string): Promise<AppData | null> => {
  try {
    const storageType = await getStorageType();
    if (storageType === 'indexeddb') {
      return await IndexedDBStorage.restoreFromBackup(timestamp);
    }
    return null;
  } catch (error) {
    handleError(error, {
      component: 'StorageManager',
      action: 'restoreFromBackup',
      userMessage: 'Failed to restore backup',
    });
    return null;
  }
};

// ============================================================================
// UTILITY & DEBUG
// ============================================================================

/**
 * Get storage info for debugging
 */
export const getStorageInfo = async (): Promise<{
  type: StorageType;
  indexedDBSupported: boolean;
  migrationCompleted: boolean;
  databaseInfo?: any;
}> => {
  const storageType = await getStorageType();
  const info: any = {
    type: storageType,
    indexedDBSupported: IndexedDBStorage.isIndexedDBSupported(),
    migrationCompleted,
  };

  if (storageType === 'indexeddb') {
    info.databaseInfo = await IndexedDBStorage.getDatabaseInfo();
  }

  return info;
};

/**
 * Clear all storage (for testing)
 */
export const clearAllStorage = async (): Promise<void> => {
  try {
    const storageType = await getStorageType();

    if (storageType === 'indexeddb') {
      await IndexedDBStorage.clearIndexedDB();
    }

    localStorage.removeItem('flexgrafik-data');
    console.log('🗑️ All storage cleared');
  } catch (error) {
    handleError(error, {
      component: 'StorageManager',
      action: 'clearAllStorage',
      userMessage: 'Failed to clear storage',
    });
  }
};

export default {
  load: loadAppData,
  save: saveAppData,
  debouncedSave: debouncedSaveAppData,
  exportToFile: exportDataToFile,
  importFromFile: importDataFromFile,
  createBackup: createManualBackup,
  listBackups,
  restoreFromBackup,
  getInfo: getStorageInfo,
  clearAll: clearAllStorage,
};
