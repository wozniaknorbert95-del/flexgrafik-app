import { useCallback } from 'react';
import { Task, ImplementationIntention } from '../types';
import { useData, useUI } from '../contexts';

/**
 * Custom hook for task-related actions
 * Provides centralized task management functionality
 */
export const useTaskActions = () => {
  const { updateTask } = useData();
  const { addNotification } = useUI();

  /**
   * Update task progress with validation
   */
  const updateTaskProgress = useCallback(
    async (taskId: number, progress: number, insight?: string) => {
      try {
        // Validate progress range
        const clampedProgress = Math.max(0, Math.min(100, progress));

        await updateTask(taskId.toString(), {
          progress: clampedProgress,
          lastProgressUpdate: new Date().toISOString(),
        });

        addNotification({
          type: 'success',
          message: `Task progress updated to ${clampedProgress}%`,
          duration: 3000,
        });

        console.log(`✅ Task ${taskId} progress updated to ${clampedProgress}%`);

        return { success: true, progress: clampedProgress };
      } catch (error) {
        console.error('Failed to update task progress:', error);
        addNotification({
          type: 'error',
          message: 'Failed to update task progress',
          duration: 5000,
        });
        return { success: false, error: error as Error };
      }
    },
    [updateTask, addNotification]
  );

  /**
   * Mark task as completed
   */
  const markTaskCompleted = useCallback(
    async (taskId: number) => {
      try {
        await updateTask(taskId.toString(), {
          progress: 100,
          completedAt: new Date().toISOString(),
        });

        addNotification({
          type: 'success',
          message: 'Task completed! 🎉',
          duration: 3000,
        });

        console.log(`🎉 Task ${taskId} marked as completed`);
        return { success: true };
      } catch (error) {
        console.error('Failed to complete task:', error);
        addNotification({
          type: 'error',
          message: 'Failed to complete task',
          duration: 5000,
        });
        return { success: false, error: error as Error };
      }
    },
    [updateTask, addNotification]
  );

  /**
   * Create implementation intention for stuck tasks
   */
  const createImplementationIntention = useCallback(
    async (taskId: number, trigger: string, action: string) => {
      try {
        await updateTask(taskId.toString(), {
          implementationIntention: {
            trigger: trigger.trim(),
            action: action.trim(),
            active: true,
            lastTriggered: new Date().toISOString(),
          },
        });

        addNotification({
          type: 'success',
          message: 'Implementation intention created!',
          duration: 3000,
        });

        console.log(`🧠 Implementation intention created for task ${taskId}`);
        return { success: true };
      } catch (error) {
        console.error('Failed to create implementation intention:', error);
        addNotification({
          type: 'error',
          message: 'Failed to create implementation intention',
          duration: 5000,
        });
        return { success: false, error: error as Error };
      }
    },
    [updateTask, addNotification]
  );

  /**
   * Update task priority
   */
  const updateTaskPriority = useCallback(
    async (taskId: number, priority: Task['priority']) => {
      try {
        await updateTask(taskId, { priority });
        console.log(`📊 Task ${taskId} priority updated to ${priority}`);
        return { success: true };
      } catch (error) {
        console.error('Failed to update task priority:', error);
        return { success: false, error: error as Error };
      }
    },
    [updateTask]
  );

  /**
   * Update task due date
   */
  const updateTaskDueDate = useCallback(
    async (taskId: number, dueDate: string | null) => {
      try {
        await updateTask(taskId, {
          dueDate: dueDate || undefined,
        });
        console.log(`📅 Task ${taskId} due date updated to ${dueDate || 'none'}`);
        return { success: true };
      } catch (error) {
        console.error('Failed to update task due date:', error);
        return { success: false, error: error as Error };
      }
    },
    [updateTask]
  );

  /**
   * Delete task with confirmation
   */
  const deleteTask = useCallback(
    async (taskId: number) => {
      try {
        // Note: This assumes contextDeleteTask exists, adjust based on actual implementation
        if (contextDeleteTask) {
          await contextDeleteTask(taskId);
          console.log(`🗑️ Task ${taskId} deleted`);
          return { success: true };
        } else {
          console.warn('Delete task function not available in context');
          return { success: false, error: new Error('Delete function not available') };
        }
      } catch (error) {
        console.error('Failed to delete task:', error);
        return { success: false, error: error as Error };
      }
    },
    [contextDeleteTask]
  );

  /**
   * Batch update multiple tasks
   */
  const batchUpdateTasks = useCallback(
    async (updates: Array<{ taskId: number; updates: Partial<Task> }>) => {
      const results = [];

      for (const { taskId, updates: taskUpdates } of updates) {
        try {
          await updateTask(taskId, taskUpdates);
          results.push({ taskId, success: true });
        } catch (error) {
          results.push({ taskId, success: false, error: error as Error });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      console.log(`📦 Batch update completed: ${successCount}/${results.length} successful`);

      return {
        results,
        successCount,
        totalCount: results.length,
        allSuccessful: successCount === results.length,
      };
    },
    [updateTask]
  );

  /**
   * Get task completion status
   */
  const getTaskStatus = useCallback((task: Task) => {
    if (task.progress >= 100) return 'completed';
    if (task.progress >= 90) return 'near-completion';
    if (task.progress > 0) return 'in-progress';
    return 'not-started';
  }, []);

  /**
   * Check if task is stuck
   */
  const isTaskStuck = useCallback((task: Task, daysThreshold: number = 3) => {
    if (!task.lastProgressUpdate) return false;

    const lastUpdate = new Date(task.lastProgressUpdate);
    const now = new Date();
    const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

    return task.progress >= 90 && daysSinceUpdate >= daysThreshold;
  }, []);

  return {
    updateTaskProgress,
    markTaskCompleted,
    createImplementationIntention,
    updateTaskPriority,
    updateTaskDueDate,
    deleteTask,
    batchUpdateTasks,
    getTaskStatus,
    isTaskStuck,
  };
};

export default useTaskActions;
