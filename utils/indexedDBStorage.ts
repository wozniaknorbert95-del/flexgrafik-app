import { AppData } from '../types';
import { handleError } from './errorHandler';

// ============================================================================
// INDEXEDDB STORAGE - Modern, Async, Scalable
// ============================================================================

const DB_NAME = 'FlexgrafikDB';
const DB_VERSION = 1; // Increment for schema changes
const STORE_NAME = 'appData';
const BACKUP_STORE = 'backups';

// Schema version tracking for migrations
interface DBSchema {
  version: number;
  stores: {
    appData: {
      key: string; // 'current'
      value: AppData;
    };
    backups: {
      key: string; // ISO timestamp
      value: {
        data: AppData;
        timestamp: string;
        version: number;
      };
    };
  };
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize IndexedDB with automatic schema versioning
 */
export const initIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Return cached instance if available
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      const error = new Error(`IndexedDB failed to open: ${request.error}`);
      handleError(error, {
        component: 'IndexedDB',
        action: 'open',
        userMessage: 'Failed to initialize database',
      });
      reject(error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('✅ IndexedDB initialized:', DB_NAME);
      resolve(dbInstance);
    };

    // Schema creation/upgrade
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log(
        `🔄 Upgrading IndexedDB schema from v${event.oldVersion} to v${event.newVersion}`
      );

      // Create main data store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        console.log(`  ✅ Created store: ${STORE_NAME}`);
      }

      // Create backup store
      if (!db.objectStoreNames.contains(BACKUP_STORE)) {
        const backupStore = db.createObjectStore(BACKUP_STORE);
        // Index by timestamp for querying
        backupStore.createIndex('timestamp', 'timestamp', { unique: false });
        console.log(`  ✅ Created store: ${BACKUP_STORE}`);
      }

      console.log('✅ Schema upgrade complete');
    };
  });
};

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Save app data to IndexedDB
 */
export const saveToIndexedDB = async (data: AppData): Promise<void> => {
  try {
    const db = await initIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, 'current');

      request.onsuccess = () => {
        console.log('💾 Data saved to IndexedDB');
        resolve();
      };

      request.onerror = () => {
        const error = new Error(`Failed to save to IndexedDB: ${request.error}`);
        handleError(error, {
          component: 'IndexedDB',
          action: 'save',
          userMessage: 'Failed to save data',
        });
        reject(error);
      };

      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error}`));
      };
    });
  } catch (error) {
    handleError(error, {
      component: 'IndexedDB',
      action: 'saveToIndexedDB',
      userMessage: 'Failed to save data',
    });
    throw error;
  }
};

/**
 * Load app data from IndexedDB
 */
export const loadFromIndexedDB = async (): Promise<AppData | null> => {
  try {
    const db = await initIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('current');

      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          console.log('📖 Data loaded from IndexedDB');
          resolve(data as AppData);
        } else {
          console.log('📝 No data found in IndexedDB');
          resolve(null);
        }
      };

      request.onerror = () => {
        const error = new Error(`Failed to load from IndexedDB: ${request.error}`);
        handleError(error, {
          component: 'IndexedDB',
          action: 'load',
          userMessage: 'Failed to load data',
        });
        reject(error);
      };
    });
  } catch (error) {
    handleError(error, {
      component: 'IndexedDB',
      action: 'loadFromIndexedDB',
      userMessage: 'Failed to load data',
    });
    throw error;
  }
};

/**
 * Clear all data from IndexedDB
 */
export const clearIndexedDB = async (): Promise<void> => {
  try {
    const db = await initIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🗑️ IndexedDB cleared');
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to clear IndexedDB: ${request.error}`));
      };
    });
  } catch (error) {
    handleError(error, {
      component: 'IndexedDB',
      action: 'clearIndexedDB',
      userMessage: 'Failed to clear database',
    });
    throw error;
  }
};

// ============================================================================
// BACKUP SYSTEM
// ============================================================================

/**
 * Create a backup snapshot
 */
export const createBackup = async (data: AppData): Promise<void> => {
  try {
    const db = await initIndexedDB();
    const timestamp = new Date().toISOString();

    const backup = {
      data,
      timestamp,
      version: DB_VERSION,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BACKUP_STORE], 'readwrite');
      const store = transaction.objectStore(BACKUP_STORE);
      const request = store.put(backup, timestamp);

      request.onsuccess = () => {
        console.log('💾 Backup created:', timestamp);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to create backup: ${request.error}`));
      };
    });
  } catch (error) {
    handleError(error, {
      component: 'IndexedDB',
      action: 'createBackup',
      userMessage: 'Failed to create backup',
    });
    throw error;
  }
};

/**
 * List all backups
 */
export const listBackups = async (): Promise<Array<{ timestamp: string; version: number }>> => {
  try {
    const db = await initIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BACKUP_STORE], 'readonly');
      const store = transaction.objectStore(BACKUP_STORE);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const keys = request.result as string[];
        const backups = keys.map((key) => ({
          timestamp: key,
          version: DB_VERSION, // TODO: Get actual version from backup
        }));
        resolve(backups);
      };

      request.onerror = () => {
        reject(new Error(`Failed to list backups: ${request.error}`));
      };
    });
  } catch (error) {
    console.error('Failed to list backups:', error);
    return [];
  }
};

/**
 * Restore from backup
 */
export const restoreFromBackup = async (timestamp: string): Promise<AppData | null> => {
  try {
    const db = await initIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BACKUP_STORE], 'readonly');
      const store = transaction.objectStore(BACKUP_STORE);
      const request = store.get(timestamp);

      request.onsuccess = () => {
        const backup = request.result;
        if (backup && backup.data) {
          console.log('♻️ Restored from backup:', timestamp);
          resolve(backup.data as AppData);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(new Error(`Failed to restore backup: ${request.error}`));
      };
    });
  } catch (error) {
    handleError(error, {
      component: 'IndexedDB',
      action: 'restoreFromBackup',
      userMessage: 'Failed to restore backup',
    });
    throw error;
  }
};

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Check if IndexedDB is supported
 */
export const isIndexedDBSupported = (): boolean => {
  return typeof indexedDB !== 'undefined';
};

/**
 * Get database info
 */
export const getDatabaseInfo = async (): Promise<{
  name: string;
  version: number;
  size?: number;
}> => {
  try {
    const db = await initIndexedDB();
    return {
      name: db.name,
      version: db.version,
      // Size estimation (not available in all browsers)
    };
  } catch (error) {
    console.error('Failed to get database info:', error);
    return {
      name: DB_NAME,
      version: DB_VERSION,
    };
  }
};

export default {
  init: initIndexedDB,
  save: saveToIndexedDB,
  load: loadFromIndexedDB,
  clear: clearIndexedDB,
  createBackup,
  listBackups,
  restoreFromBackup,
  isSupported: isIndexedDBSupported,
  getInfo: getDatabaseInfo,
};
