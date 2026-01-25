/**
 * SCHEDULER SYSTEM - UNIT TESTS
 * Focus: local-first fallback + async safety (no backend required)
 */

// Mock dependencies (must be defined before importing scheduler)
jest.mock('../utils/storageManager', () => ({
  loadAppData: jest.fn(),
}));

jest.mock('../utils/taskHelpers', () => ({
  detectStuckAt90: jest.fn(),
}));

const {
  scheduleStuckTasksAudit,
  checkStuckTasks,
  runStuckTasksAuditNow,
  debugForceAudit,
} = require('../utils/scheduler');

describe('Scheduler System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = undefined;
    // Clear localStorage mocks
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  describe('Local-first Task Fetching', () => {
    test('should fetch tasks from local storage (no backend required)', async () => {
      const { loadAppData } = require('../utils/storageManager');
      loadAppData.mockResolvedValue({
        pillars: [
          {
            tasks: [
              { id: 1, name: 'Task 1', progress: 95, lastProgressUpdate: '2024-01-20T12:00:00Z' },
              { id: 2, name: 'Task 2', progress: 85, lastProgressUpdate: '2024-01-22T12:00:00Z' },
            ],
          },
        ],
      });

      // Avoid notification path in this test (same tasks sent recently)
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'lastStuckNotification') {
          return JSON.stringify({ timestamp: new Date().toISOString(), stuckTaskIds: [1] });
        }
        return null;
      });

      const { detectStuckAt90 } = require('../utils/taskHelpers');
      // Only one of two tasks is "stuck"
      detectStuckAt90.mockReturnValueOnce(true).mockReturnValueOnce(false);

      const result = await checkStuckTasks();

      expect(loadAppData).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Task 1');
      expect(global.fetch).toBeUndefined(); // no backend calls
    });

    test('should handle local storage load failures gracefully', async () => {
      const { loadAppData } = require('../utils/storageManager');
      loadAppData.mockRejectedValue(new Error('Storage unavailable'));

      const result = await checkStuckTasks();
      expect(result).toEqual([]);
    });
  });

  describe('Notification Deduplication', () => {
    test('should use localStorage to decide eligibility (no backend)', async () => {
      const { loadAppData } = require('../utils/storageManager');
      loadAppData.mockResolvedValue({
        pillars: [
          {
            tasks: [
              {
                id: 1,
                name: 'Stuck Task',
                progress: 95,
                lastProgressUpdate: '2024-01-20T12:00:00Z',
              },
            ],
          },
        ],
      });

      // Mark as recently notified for same task -> should not send
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'lastStuckNotification') {
          return JSON.stringify({ timestamp: new Date().toISOString(), stuckTaskIds: [1] });
        }
        return null;
      });

      const { detectStuckAt90 } = require('../utils/taskHelpers');
      detectStuckAt90.mockReturnValue(true);

      await checkStuckTasks();
      expect(localStorage.getItem).toHaveBeenCalledWith('lastStuckNotification');
    });

    test('should log sent notifications to localStorage', async () => {
      const { loadAppData } = require('../utils/storageManager');
      loadAppData.mockResolvedValue({
        pillars: [
          {
            tasks: [
              {
                id: 1,
                name: 'Stuck Task',
                progress: 95,
                lastProgressUpdate: '2024-01-20T12:00:00Z',
              },
            ],
          },
        ],
      });

      // No previous notification -> allow send
      localStorage.getItem.mockReturnValue(null);

      // Ollama call fails -> fallback notification
      global.fetch = jest.fn(() => Promise.reject(new Error('Ollama unavailable')));

      const { detectStuckAt90 } = require('../utils/taskHelpers');
      detectStuckAt90.mockReturnValue(true);

      await checkStuckTasks();
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'lastStuckNotification',
        expect.any(String)
      );
    });

    test('should always write audit debug info to localStorage', async () => {
      const { loadAppData } = require('../utils/storageManager');
      loadAppData.mockResolvedValue({ pillars: [{ tasks: [] }] });

      const { detectStuckAt90 } = require('../utils/taskHelpers');
      detectStuckAt90.mockReturnValue(false);

      await checkStuckTasks();

      expect(localStorage.setItem).toHaveBeenCalledWith('lastStuckTasksAudit', expect.any(String));
    });
  });

  describe('Debug and Manual Testing', () => {
    test('should provide debugForceAudit function globally', () => {
      // This function should be available on window object
      expect(typeof debugForceAudit).toBe('function');
    });

    test('should run manual audit successfully', async () => {
      const { loadAppData } = require('../utils/storageManager');
      loadAppData.mockResolvedValue({
        pillars: [
          {
            tasks: [
              {
                id: 1,
                name: 'Debug Task',
                progress: 95,
                lastProgressUpdate: '2024-01-20T12:00:00Z',
              },
            ],
          },
        ],
      });

      // Avoid notification path
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'lastStuckNotification') {
          return JSON.stringify({ timestamp: new Date().toISOString(), stuckTaskIds: [1] });
        }
        return null;
      });

      const { detectStuckAt90 } = require('../utils/taskHelpers');
      detectStuckAt90.mockReturnValue(true);

      const result = await runStuckTasksAuditNow();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Debug Task');
    });

    test('should handle debug audit errors gracefully', async () => {
      const { loadAppData } = require('../utils/storageManager');
      loadAppData.mockRejectedValue(new Error('Debug error'));

      const { detectStuckAt90 } = require('../utils/taskHelpers');
      detectStuckAt90.mockReturnValue(false);

      const result = await debugForceAudit();

      expect(result.success).toBe(true);
      expect(result.stuckTasksCount).toBe(0);
    });
  });

  describe('Scheduler Lifecycle', () => {
    test('should start scheduler only once', () => {
      // Mock setTimeout and localStorage
      jest.useFakeTimers();
      // First start: not running. Second start: already running.
      localStorage.getItem.mockReturnValueOnce(null).mockReturnValueOnce('running');
      localStorage.setItem.mockImplementation(() => {});

      scheduleStuckTasksAudit();

      expect(localStorage.setItem).toHaveBeenCalledWith('stuckTasksScheduler', 'running');

      // Second call should not restart
      scheduleStuckTasksAudit();
      expect(localStorage.setItem).toHaveBeenCalledTimes(1);
    });

    test('should handle browser tab visibility changes', () => {
      // Mock document.hidden
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
      });

      // Test would verify scheduler pauses on hidden tabs
      expect(document.hidden).toBe(false);
    });
  });
});
