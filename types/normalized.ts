// ============================================================================
// NORMALIZED DATA SCHEMA - Phase 2: Data Normalization
// ============================================================================

import { Task, Pillar, Phase, CustomRule, Sprint, ChatMessage } from './index';

// ============================================================================
// NORMALIZED DATA STRUCTURE
// ============================================================================

/**
 * Normalized entities - flat structure for O(1) lookups
 * Instead of nested objects, we store everything as maps
 */
export interface NormalizedEntities {
  /** All pillars indexed by ID */
  pillars: Record<number, Pillar>;

  /** All tasks indexed by ID - FULLY NORMALIZED */
  tasks: Record<string, Task>; // Using string IDs for flexibility

  /** All phases indexed by ID */
  phases: Record<number, Phase>;

  /** All custom rules indexed by ID */
  rules: Record<string, CustomRule>;

  /** Chat messages indexed by ID */
  messages: Record<string, ChatMessage>;
}

/**
 * Entity IDs - arrays for ordered access
 */
export interface NormalizedIds {
  /** Ordered pillar IDs (for display order) */
  pillarIds: number[];

  /** All task IDs (for global operations) */
  allTaskIds: number[];

  /** Task IDs grouped by pillar */
  pillarTaskIds: Record<number, number[]>;

  /** Ordered phase IDs */
  phaseIds: number[];

  /** Ordered rule IDs */
  ruleIds: string[];

  /** Ordered message IDs (chronological) */
  messageIds: string[];
}

/**
 * Normalized App Data - flat, fast, scalable
 */
export interface NormalizedAppData {
  /** Flat entity storage */
  entities: NormalizedEntities;

  /** Ordered ID arrays */
  ids: NormalizedIds;

  /** Global app state (unchanged) */
  user: {
    streak: number;
    last_checkin: string;
  };

  /** Sprint data (unchanged) */
  sprint: Sprint;

  /** Settings (unchanged) */
  settings: {
    voice: {
      enabled: boolean;
      volume: number;
      speed: number;
    };
    ai: {
      apiKey: string;
      enabled: boolean;
      customSystemPrompt?: string;
    };
  };

  /** Notification history (unchanged) */
  notificationHistory: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;

  /** Version tracking for migrations */
  _version: string; // e.g. "1.0.0-normalized"
}

// ============================================================================
// LEGACY COMPATIBILITY (for gradual migration)
// ============================================================================

/**
 * Legacy nested data structure (current AppData)
 * Kept for backward compatibility during migration
 */
export interface LegacyAppData {
  pillars: Pillar[];
  phases: Phase[];
  customRules: CustomRule[];
  aiChatHistory: ChatMessage[];
  user: { streak: number; last_checkin: string };
  sprint: Sprint;
  settings: {
    voice: { enabled: boolean; volume: number; speed: number };
    ai: { apiKey: string; enabled: boolean; customSystemPrompt?: string };
  };
  notificationHistory: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
}

// ============================================================================
// SELECTORS - Efficient data access patterns
// ============================================================================

/**
 * Selector functions for accessing normalized data
 */
export class NormalizedSelectors {
  /**
   * Get pillar by ID - O(1)
   */
  static getPillar(data: NormalizedAppData, pillarId: number): Pillar | null {
    return data.entities.pillars[pillarId] || null;
  }

  /**
   * Get all pillars in display order - O(n)
   */
  static getPillars(data: NormalizedAppData): Pillar[] {
    return data.ids.pillarIds.map((id) => data.entities.pillars[id]).filter(Boolean);
  }

  /**
   * Get task by ID - O(1) FULLY NORMALIZED
   */
  static getTask(data: NormalizedAppData, taskId: string): Task | null {
    return data.entities.tasks[taskId] || null;
  }

  /**
   * Get all tasks across all pillars - O(n) with normalized tasks
   */
  static getAllTasks(data: NormalizedAppData): Task[] {
    return data.ids.allTaskIds.map((id) => data.entities.tasks[id]).filter(Boolean);
  }

  /**
   * Get tasks for a specific pillar - O(1) lookup
   */
  static getPillarTasks(data: NormalizedAppData, pillarId: number): Task[] {
    const taskIds = data.ids.pillarTaskIds[pillarId] || [];
    return taskIds.map((id) => data.entities.tasks[id]).filter(Boolean);
  }

  /**
   * Get incomplete tasks for today - optimized for Today view
   */
  static getTodayTasks(data: NormalizedAppData): Task[] {
    // Get all tasks, filter incomplete, slice for today
    return this.getAllTasks(data)
      .filter((task) => task.progress < 100)
      .slice(0, 5); // Today shows top 5
  }

  /**
   * Get pillar statistics - O(n)
   */
  static getPillarStats(data: NormalizedAppData) {
    const pillars = this.getPillars(data);
    return {
      total: pillars.length,
      completed: pillars.filter((p) => p.completion === 100).length,
      inProgress: pillars.filter((p) => p.status === 'in_progress').length,
      stuck: pillars.filter((p) => p.ninety_percent_alert).length,
      averageProgress: pillars.reduce((acc, p) => acc + p.completion, 0) / pillars.length,
    };
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Update operations for normalized data
 */
export interface NormalizedUpdate {
  type:
    | 'ADD_PILLAR'
    | 'UPDATE_PILLAR'
    | 'DELETE_PILLAR'
    | 'ADD_TASK'
    | 'UPDATE_TASK'
    | 'DELETE_TASK'
    | 'REORDER_PILLARS'
    | 'REORDER_TASKS';
  payload: any;
}

/**
 * Migration status
 */
export type MigrationStatus = 'not_started' | 'in_progress' | 'completed' | 'error';

// All types are exported as named exports above
