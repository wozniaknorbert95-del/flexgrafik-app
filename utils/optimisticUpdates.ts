// ============================================================================
// OPTIMISTIC UI SYSTEM - Phase 3: Instant User Feedback
// ============================================================================

import { NormalizedAppData, NormalizedSelectors } from '../types/normalized';
import { Task, Pillar } from '../types';

// ============================================================================
// OPTIMISTIC UPDATE TYPES
// ============================================================================

export interface OptimisticUpdate {
  id: string;
  type: 'task_toggle' | 'pillar_update' | 'rule_toggle';
  timestamp: number;
  rollbackData: any; // Data needed to rollback
  applied: boolean;
}

export interface OptimisticState {
  updates: OptimisticUpdate[];
  pendingTasks: Set<string>; // Task IDs being updated
  pendingPillars: Set<number>; // Pillar IDs being updated
}

// ============================================================================
// OPTIMISTIC TASK OPERATIONS
// ============================================================================

/**
 * Optimistically toggle task completion
 * Returns updated data and rollback info
 */
export function optimisticToggleTask(
  data: NormalizedAppData,
  taskId: string
): { updatedData: NormalizedAppData; rollbackInfo: OptimisticUpdate } {
  const task = NormalizedSelectors.getTask(data, taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  const updateId = `task_toggle_${taskId}_${Date.now()}`;

  // Create rollback data (current state)
  const rollbackInfo: OptimisticUpdate = {
    id: updateId,
    type: 'task_toggle',
    timestamp: Date.now(),
    rollbackData: { taskId, originalProgress: task.progress },
    applied: true,
  };

  // Apply optimistic update
  const newProgress = task.progress >= 100 ? 0 : 100;
  const updatedData: NormalizedAppData = {
    ...data,
    entities: {
      ...data.entities,
      tasks: {
        ...data.entities.tasks,
        [taskId]: {
          ...task,
          progress: newProgress,
          completedAt: newProgress >= 100 ? new Date().toISOString() : undefined,
        },
      },
    },
  };

  return { updatedData, rollbackInfo };
}

/**
 * Rollback task toggle operation
 */
export function rollbackTaskToggle(
  data: NormalizedAppData,
  rollbackInfo: OptimisticUpdate
): NormalizedAppData {
  const { taskId, originalProgress } = rollbackInfo.rollbackData;
  const task = NormalizedSelectors.getTask(data, taskId);

  if (!task) return data;

  return {
    ...data,
    entities: {
      ...data.entities,
      tasks: {
        ...data.entities.tasks,
        [taskId]: {
          ...task,
          progress: originalProgress,
          completedAt: originalProgress >= 100 ? task.completedAt : undefined,
        },
      },
    },
  };
}

// ============================================================================
// OPTIMISTIC PILLAR OPERATIONS
// ============================================================================

/**
 * Optimistically update pillar data
 */
export function optimisticUpdatePillar(
  data: NormalizedAppData,
  pillarId: number,
  updates: Partial<Pillar>
): { updatedData: NormalizedAppData; rollbackInfo: OptimisticUpdate } {
  const pillar = NormalizedSelectors.getPillar(data, pillarId);
  if (!pillar) {
    throw new Error(`Pillar ${pillarId} not found`);
  }

  const updateId = `pillar_update_${pillarId}_${Date.now()}`;

  // Create rollback data (current pillar state)
  const rollbackInfo: OptimisticUpdate = {
    id: updateId,
    type: 'pillar_update',
    timestamp: Date.now(),
    rollbackData: { pillarId, originalPillar: pillar },
    applied: true,
  };

  // Apply optimistic update
  const updatedData: NormalizedAppData = {
    ...data,
    entities: {
      ...data.entities,
      pillars: {
        ...data.entities.pillars,
        [pillarId]: {
          ...pillar,
          ...updates,
        },
      },
    },
  };

  return { updatedData, rollbackInfo };
}

/**
 * Rollback pillar update operation
 */
export function rollbackPillarUpdate(
  data: NormalizedAppData,
  rollbackInfo: OptimisticUpdate
): NormalizedAppData {
  const { pillarId, originalPillar } = rollbackInfo.rollbackData;

  return {
    ...data,
    entities: {
      ...data.entities,
      pillars: {
        ...data.entities.pillars,
        [pillarId]: originalPillar,
      },
    },
  };
}

// ============================================================================
// RULE OPERATIONS
// ============================================================================

/**
 * Optimistically toggle rule active state
 */
export function optimisticToggleRule(
  data: NormalizedAppData,
  ruleId: string
): { updatedData: NormalizedAppData; rollbackInfo: OptimisticUpdate } {
  const rule = data.entities.rules[ruleId];
  if (!rule) {
    throw new Error(`Rule ${ruleId} not found`);
  }

  const updateId = `rule_toggle_${ruleId}_${Date.now()}`;

  const rollbackInfo: OptimisticUpdate = {
    id: updateId,
    type: 'rule_toggle',
    timestamp: Date.now(),
    rollbackData: { ruleId, originalActive: rule.active },
    applied: true,
  };

  const updatedData: NormalizedAppData = {
    ...data,
    entities: {
      ...data.entities,
      rules: {
        ...data.entities.rules,
        [ruleId]: {
          ...rule,
          active: !rule.active,
        },
      },
    },
  };

  return { updatedData, rollbackInfo };
}

/**
 * Rollback rule toggle operation
 */
export function rollbackRuleToggle(
  data: NormalizedAppData,
  rollbackInfo: OptimisticUpdate
): NormalizedAppData {
  const { ruleId, originalActive } = rollbackInfo.rollbackData;
  const rule = data.entities.rules[ruleId];

  if (!rule) return data;

  return {
    ...data,
    entities: {
      ...data.entities,
      rules: {
        ...data.entities.rules,
        [ruleId]: {
          ...rule,
          active: originalActive,
        },
      },
    },
  };
}

// ============================================================================
// OPTIMISTIC STATE MANAGEMENT
// ============================================================================

/**
 * Apply optimistic update to state
 */
export function applyOptimisticUpdate(
  state: OptimisticState,
  update: OptimisticUpdate
): OptimisticState {
  const newUpdates = [...state.updates, update];
  const newPendingTasks = new Set(state.pendingTasks);
  const newPendingPillars = new Set(state.pendingPillars);

  // Mark as pending based on update type
  switch (update.type) {
    case 'task_toggle':
      newPendingTasks.add(update.rollbackData.taskId);
      break;
    case 'pillar_update':
      newPendingPillars.add(update.rollbackData.pillarId);
      break;
  }

  return {
    updates: newUpdates,
    pendingTasks: newPendingTasks,
    pendingPillars: newPendingPillars,
  };
}

/**
 * Remove completed optimistic update
 */
export function completeOptimisticUpdate(
  state: OptimisticState,
  updateId: string
): OptimisticState {
  const update = state.updates.find((u) => u.id === updateId);
  if (!update) return state;

  const newUpdates = state.updates.filter((u) => u.id !== updateId);
  const newPendingTasks = new Set(state.pendingTasks);
  const newPendingPillars = new Set(state.pendingPillars);

  // Remove from pending based on update type
  switch (update.type) {
    case 'task_toggle':
      newPendingTasks.delete(update.rollbackData.taskId);
      break;
    case 'pillar_update':
      newPendingPillars.delete(update.rollbackData.pillarId);
      break;
  }

  return {
    updates: newUpdates,
    pendingTasks: newPendingTasks,
    pendingPillars: newPendingPillars,
  };
}

/**
 * Rollback optimistic update
 */
export function rollbackOptimisticUpdate(
  state: OptimisticState,
  updateId: string
): OptimisticState {
  const update = state.updates.find((u) => u.id === updateId);
  if (!update) return state;

  const newUpdates = state.updates.filter((u) => u.id !== updateId);
  const newPendingTasks = new Set(state.pendingTasks);
  const newPendingPillars = new Set(state.pendingPillars);

  // Remove from pending based on update type
  switch (update.type) {
    case 'task_toggle':
      newPendingTasks.delete(update.rollbackData.taskId);
      break;
    case 'pillar_update':
      newPendingPillars.delete(update.rollbackData.pillarId);
      break;
  }

  return {
    updates: newUpdates,
    pendingTasks: newPendingTasks,
    pendingPillars: newPendingPillars,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if task is pending optimistic update
 */
export function isTaskPending(state: OptimisticState, taskId: string): boolean {
  return state.pendingTasks.has(taskId);
}

/**
 * Check if pillar is pending optimistic update
 */
export function isPillarPending(state: OptimisticState, pillarId: number): boolean {
  return state.pendingPillars.has(pillarId);
}

/**
 * Get pending update for task
 */
export function getPendingTaskUpdate(
  state: OptimisticState,
  taskId: string
): OptimisticUpdate | null {
  return (
    state.updates.find((u) => u.type === 'task_toggle' && u.rollbackData.taskId === taskId) || null
  );
}

/**
 * Clean up old optimistic updates (older than 30 seconds)
 */
export function cleanupOldUpdates(state: OptimisticState, maxAge: number = 30000): OptimisticState {
  const now = Date.now();
  const recentUpdates = state.updates.filter((u) => now - u.timestamp < maxAge);

  // Rebuild pending sets from remaining updates
  const pendingTasks = new Set<string>();
  const pendingPillars = new Set<number>();

  recentUpdates.forEach((update) => {
    switch (update.type) {
      case 'task_toggle':
        pendingTasks.add(update.rollbackData.taskId);
        break;
      case 'pillar_update':
        pendingPillars.add(update.rollbackData.pillarId);
        break;
    }
  });

  return {
    updates: recentUpdates,
    pendingTasks,
    pendingPillars,
  };
}

export default {
  optimisticToggleTask,
  rollbackTaskToggle,
  optimisticUpdatePillar,
  rollbackPillarUpdate,
  optimisticToggleRule,
  rollbackRuleToggle,
  applyOptimisticUpdate,
  completeOptimisticUpdate,
  rollbackOptimisticUpdate,
  isTaskPending,
  isPillarPending,
  getPendingTaskUpdate,
  cleanupOldUpdates,
};
