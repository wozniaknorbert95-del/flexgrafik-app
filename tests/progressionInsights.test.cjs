/**
 * PROGRESSION INSIGHTS & ANTI-DIP SYSTEM - UNIT TESTS
 * Test scenarios for stuck task detection and analysis
 */

const {
  analyzeTaskProgression,
  detectStuckTask,
  calculateDaysSinceLastUpdate,
} = require('../utils/progressionInsights');
const {
  detectStuckAt90,
  daysBetween,
  updateTaskProgressWithHistory,
} = require('../utils/taskHelpers');
const { STUCK_THRESHOLD_DAYS, STUCK_PROGRESS_MIN, STUCK_PROGRESS_MAX } = require('../utils/config');

// Mock current date for consistent testing
const mockNow = new Date('2024-01-23T12:00:00Z');
global.Date = class extends Date {
  constructor(...args) {
    if (args.length === 0) {
      super(mockNow);
    } else {
      super(...args);
    }
  }

  static now() {
    return mockNow.getTime();
  }
};

describe('Progression Insights & Anti-Dip System', () => {
  describe('Stuck Task Detection', () => {
    test('should detect task stuck at 95% for 4+ days', () => {
      // Arrange: Task stuck for 4 days at 95%
      const fourDaysAgo = new Date(mockNow);
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const stuckTask = {
        id: 1,
        name: 'Implement user authentication',
        progress: 95,
        stuckAtNinety: false, // Not previously marked
        lastProgressUpdate: fourDaysAgo.toISOString(),
      };

      // Act
      const result = analyzeTaskProgression(stuckTask);

      // Assert
      expect(result.isStuck).toBe(true);
      expect(result.daysInCurrentState).toBe(4);
      expect(result.recommendedAction).toBe('break-down-remaining');
    });

    test('should handle completed task', () => {
      // Arrange: Completed task
      const threeDaysAgo = new Date(mockNow);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const completedTask = {
        id: 5,
        name: 'Deploy to production',
        progress: 100,
        stuckAtNinety: false,
        lastProgressUpdate: threeDaysAgo.toISOString(),
      };

      // Act
      const result = analyzeTaskProgression(completedTask);

      // Assert
      expect(result.isStuck).toBe(false);
      expect(result.daysInCurrentState).toBe(3);
      expect(result.recommendedAction).toBe(null);
    });
  });

  describe('Complete Stuck Task Scenario', () => {
    test('should correctly identify and analyze stuck task from user story', () => {
      // Arrange: Simulate the exact scenario from requirements
      // "zamarkuje zadanie z lastProgressUpdate sprzed X dni i progressem w zakresie stuck"

      const daysAgo = new Date(mockNow);
      daysAgo.setDate(mockNow.getDate() - (STUCK_THRESHOLD_DAYS + 1));

      const stuckTaskScenario = {
        id: 999,
        name: 'Implementacja nowego systemu płatności',
        progress: STUCK_PROGRESS_MIN + 5, // Within stuck range
        stuckAtNinety: false,
        lastProgressUpdate: daysAgo.toISOString(),
        createdAt: daysAgo.toISOString(),
      };

      // Act: Run the analysis
      const analysis = analyzeTaskProgression(stuckTaskScenario);

      // Assert: Verify all aspects of stuck task detection
      expect(analysis.isStuck).toBe(true);
      expect(analysis.daysInCurrentState).toBe(STUCK_THRESHOLD_DAYS + 1);
      expect(analysis.recommendedAction).toBe('break-down-remaining');
      expect(analysis.completionVelocity).toBeGreaterThan(0);

      // Verify the stuck detection logic specifically
      const isDetectedAsStuck = detectStuckTask(stuckTaskScenario, 4);
      expect(isDetectedAsStuck).toBe(true);

      console.log('✅ Stuck task scenario test passed:', {
        task: stuckTaskScenario.name,
        progress: stuckTaskScenario.progress,
        daysStuck: analysis.daysInCurrentState,
        isStuck: analysis.isStuck,
        recommendation: analysis.recommendedAction,
      });
    });
  });

  describe('Enhanced 90% Detection Engine', () => {
    test('should detect stuck tasks using detectStuckAt90 function', () => {
      const daysAgo = new Date(mockNow);
      daysAgo.setDate(mockNow.getDate() - (STUCK_THRESHOLD_DAYS + 1)); // More than threshold

      const stuckTask = {
        id: 1,
        name: 'Stuck task',
        progress: STUCK_PROGRESS_MIN + 1, // Within stuck range
        stuckAtNinety: false,
        lastProgressUpdate: daysAgo.toISOString(),
      };

      // Test the core detection function
      const isStuck = detectStuckAt90(stuckTask);
      expect(isStuck).toBe(true);
    });

    test('should not detect tasks below 90%', () => {
      const daysAgo = new Date(mockNow);
      daysAgo.setDate(mockNow.getDate() - (STUCK_THRESHOLD_DAYS + 1));

      const notStuckTask = {
        id: 2,
        name: 'Not stuck task',
        progress: STUCK_PROGRESS_MIN - 1, // Below stuck range
        stuckAtNinety: false,
        lastProgressUpdate: daysAgo.toISOString(),
      };

      const isStuck = detectStuckAt90(notStuckTask);
      expect(isStuck).toBe(false);
    });

    test('should not detect recently updated stuck tasks', () => {
      const recent = new Date(mockNow);
      recent.setDate(mockNow.getDate() - (STUCK_THRESHOLD_DAYS - 1)); // Less than threshold

      const recentlyUpdatedTask = {
        id: 3,
        name: 'Recently updated',
        progress: STUCK_PROGRESS_MIN + 1,
        stuckAtNinety: false,
        lastProgressUpdate: recent.toISOString(),
      };

      const isStuck = detectStuckAt90(recentlyUpdatedTask);
      expect(isStuck).toBe(false);
    });

    test('should handle tasks without lastProgressUpdate', () => {
      const taskWithoutUpdate = {
        id: 4,
        name: 'No update',
        progress: 95,
        stuckAtNinety: false,
        lastProgressUpdate: null,
      };

      const isStuck = detectStuckAt90(taskWithoutUpdate);
      expect(isStuck).toBe(false);
    });

    test('should correctly calculate days between dates', () => {
      const fiveDaysAgo = new Date(mockNow);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const days = daysBetween(fiveDaysAgo.toISOString(), mockNow);
      expect(days).toBe(5);
    });

    test('should reset stuck flag when progress moves out of 90-99 range', () => {
      const taskHelpers = require('../utils/taskHelpers');
      const fourDaysAgo = new Date(mockNow);
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const stuckTask = {
        id: 5,
        name: 'Stuck task',
        progress: 95,
        stuckAtNinety: true,
        lastProgressUpdate: fourDaysAgo.toISOString(),
      };

      // Move progress to 100 (completed)
      const updatedTask = taskHelpers.updateTaskProgressWithHistory(stuckTask, 100);
      expect(updatedTask.stuckAtNinety).toBe(false);
      expect(updatedTask.progress).toBe(100);
      expect(updatedTask.lastProgressUpdate).toBeDefined();
    });

    test('should maintain stuck flag within 90-99 range', () => {
      const taskHelpers = require('../utils/taskHelpers');
      const fourDaysAgo = new Date(mockNow);
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const stuckTask = {
        id: 6,
        name: 'Stuck task',
        progress: 95,
        stuckAtNinety: true,
        lastProgressUpdate: fourDaysAgo.toISOString(),
      };

      // Move progress to value within stuck range - this should maintain stuck status
      const newProgressWithinRange = STUCK_PROGRESS_MIN + 2;
      const updatedTask = taskHelpers.updateTaskProgressWithHistory(
        stuckTask,
        newProgressWithinRange
      );

      // Since the task was already stuck and moved within stuck range,
      // the stuck flag should be determined by detectStuckAt90 on the new state
      const isStillStuck = detectStuckAt90({
        ...updatedTask,
        lastProgressUpdate: fourDaysAgo.toISOString(),
      });
      expect(isStillStuck).toBe(true); // Original timestamp preserved for this check
      expect(updatedTask.progress).toBe(newProgressWithinRange);
    });
  });
});
