// ============================================================================
// DATA MIGRATION UTILITIES - Phase 2: Safe Data Transformation
// ============================================================================

import { AppData, Pillar, Task, Phase, CustomRule, ChatMessage } from '../types';
import {
  NormalizedAppData,
  NormalizedEntities,
  NormalizedIds,
  LegacyAppData,
} from '../types/normalized';

// ============================================================================
// MIGRATION FUNCTIONS - Safe data transformation
// ============================================================================

/**
 * Convert legacy nested data to normalized flat structure
 * SAFE: Preserves all data, no information loss
 */
export function normalizeData(legacy: AppData): NormalizedAppData {
  console.log('🔄 Normalizing data structure...');

  // Extract and normalize entities
  const entities: NormalizedEntities = {
    pillars: {},
    tasks: {}, // Future: will be populated
    phases: {},
    rules: {},
    messages: {},
  };

  const ids: NormalizedIds = {
    pillarIds: [],
    allTaskIds: [], // Global task list
    pillarTaskIds: {}, // Tasks per pillar
    phaseIds: [],
    ruleIds: [],
    messageIds: [],
  };

  // FULLY NORMALIZE: Extract tasks from pillars
  legacy.pillars.forEach((pillar, index) => {
    // Extract tasks from pillar and create normalized versions
    const pillarTasks: number[] = [];

    pillar.tasks.forEach((task, taskIndex) => {
      // Create unique task ID: number based on pillar and index (or use existing if available)
      const taskId = typeof task.id === 'number' ? task.id : pillar.id * 1000 + taskIndex;

      // Store task in entities (without pillar reference)
      entities.tasks[taskId] = {
        ...task,
        id: taskId,
      };

      // Track task ID for this pillar
      pillarTasks.push(taskId);

      // Add to global task list
      ids.allTaskIds.push(taskId);
    });

    // Store pillar without nested tasks
    const { tasks, ...pillarWithoutTasks } = pillar;
    entities.pillars[pillar.id] = pillarWithoutTasks;
    ids.pillarIds.push(pillar.id);

    // Store task IDs for this pillar
    ids.pillarTaskIds[pillar.id] = pillarTasks;
  });

  // Normalize phases
  legacy.phases.forEach((phase, index) => {
    entities.phases[phase.phase] = { ...phase };
    ids.phaseIds.push(phase.phase);
  });

  // Normalize custom rules
  legacy.customRules.forEach((rule, index) => {
    entities.rules[rule.id] = { ...rule };
    ids.ruleIds.push(rule.id);
  });

  // Normalize chat messages
  legacy.aiChatHistory.forEach((message, index) => {
    entities.messages[message.id] = { ...message };
    ids.messageIds.push(message.id);
  });

  const normalized: any = {
    entities,
    ids,
    user: { ...legacy.user },
    sprint: { ...legacy.sprint },
    settings: { ...legacy.settings },
    notificationHistory: [...legacy.notificationHistory],
    _version: '2.0.0-normalized',
  };

  // Preserve Finish Mode sessions (future-proof, even if normalized path is re-enabled later)
  normalized.currentFinishSession = (legacy as any).currentFinishSession ?? null;
  normalized.finishSessionsHistory = Array.isArray((legacy as any).finishSessionsHistory)
    ? (legacy as any).finishSessionsHistory
    : [];

  console.log('✅ Data normalization complete');
  console.log(`   📊 Pillars: ${ids.pillarIds.length}`);
  console.log(`   📋 Tasks: ${ids.allTaskIds.length} (fully normalized)`);
  console.log(`   📝 Rules: ${ids.ruleIds.length}`);
  console.log(`   💬 Messages: ${ids.messageIds.length}`);

  return normalized as NormalizedAppData;
}

/**
 * Convert normalized data back to legacy nested structure
 * SAFE: Reverse transformation for backward compatibility
 */
export function denormalizeData(normalized: NormalizedAppData): AppData {
  console.log('🔄 Denormalizing data structure...');

  const legacy: AppData = {
    pillars: normalized.ids.pillarIds
      .map((pillarId) => {
        const pillar = normalized.entities.pillars[pillarId];
        if (!pillar) return null;

        // Reconstruct tasks from normalized structure
        const taskIds = normalized.ids.pillarTaskIds[pillarId] || [];
        const tasks = taskIds.map((taskId) => normalized.entities.tasks[taskId]).filter(Boolean);

        // Return pillar with nested tasks
        return {
          ...pillar,
          tasks,
        };
      })
      .filter(Boolean) as any[], // Type assertion for legacy compatibility

    phases: normalized.ids.phaseIds.map((id) => normalized.entities.phases[id]).filter(Boolean),

    customRules: normalized.ids.ruleIds.map((id) => normalized.entities.rules[id]).filter(Boolean),

    aiChatHistory: normalized.ids.messageIds
      .map((id) => normalized.entities.messages[id])
      .filter(Boolean),

    user: { ...normalized.user },
    sprint: { ...normalized.sprint },
    settings: { ...normalized.settings },
    notificationHistory: [...normalized.notificationHistory],

    // Finish Mode sessions (safe defaults; normalized may or may not contain these)
    currentFinishSession: (normalized as any).currentFinishSession ?? null,
    finishSessionsHistory: Array.isArray((normalized as any).finishSessionsHistory)
      ? (normalized as any).finishSessionsHistory
      : [],
  };

  console.log('✅ Data denormalization complete');
  return legacy;
}

/**
 * Validate normalized data integrity
 * SAFE: Ensures data consistency after transformations
 */
export function validateNormalizedData(data: NormalizedAppData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check entity consistency
  const pillarIds = Object.keys(data.entities.pillars).map(Number);
  const idsPillarIds = data.ids.pillarIds;

  if (pillarIds.length !== idsPillarIds.length) {
    errors.push(
      `Pillar count mismatch: entities(${pillarIds.length}) vs ids(${idsPillarIds.length})`
    );
  }

  // Check for orphaned pillar IDs
  idsPillarIds.forEach((id) => {
    if (!data.entities.pillars[id]) {
      errors.push(`Missing pillar entity for ID: ${id}`);
    }
  });

  // Check task consistency (FULLY NORMALIZED)
  const taskIds = Object.keys(data.entities.tasks);
  const idsAllTaskIds = data.ids.allTaskIds;

  if (taskIds.length !== idsAllTaskIds.length) {
    errors.push(`Task count mismatch: entities(${taskIds.length}) vs ids(${idsAllTaskIds.length})`);
  }

  // Check pillar-task relationships
  idsPillarIds.forEach((pillarId) => {
    const pillarTaskIds = data.ids.pillarTaskIds[pillarId] || [];
    pillarTaskIds.forEach((taskId) => {
      if (!data.entities.tasks[taskId]) {
        errors.push(`Missing task entity for pillar ${pillarId}: ${taskId}`);
      }
    });
  });

  // Check rule consistency
  const ruleIds = Object.keys(data.entities.rules);
  const idsRuleIds = data.ids.ruleIds;

  if (ruleIds.length !== idsRuleIds.length) {
    errors.push(`Rule count mismatch: entities(${ruleIds.length}) vs ids(${idsRuleIds.length})`);
  }

  // Check message consistency
  const messageIds = Object.keys(data.entities.messages);
  const idsMessageIds = data.ids.messageIds;

  if (messageIds.length !== idsMessageIds.length) {
    errors.push(
      `Message count mismatch: entities(${messageIds.length}) vs ids(${idsMessageIds.length})`
    );
  }

  // Validate required fields
  if (!data.user) errors.push('Missing user data');
  if (!data.sprint) errors.push('Missing sprint data');
  if (!data.settings) errors.push('Missing settings');

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate legacy data before migration
 * SAFE: Ensures source data is valid before transformation
 */
export function validateLegacyData(data: AppData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!data.pillars || !Array.isArray(data.pillars)) {
    errors.push('Invalid pillars data');
  }

  if (!data.user) errors.push('Missing user data');
  if (!data.sprint) errors.push('Missing sprint data');
  if (!data.settings) errors.push('Missing settings');

  // Check pillar integrity
  if (data.pillars) {
    data.pillars.forEach((pillar, index) => {
      if (!pillar.id) errors.push(`Pillar ${index} missing ID`);
      if (!pillar.name) errors.push(`Pillar ${index} missing name`);
      if (typeof pillar.completion !== 'number') {
        errors.push(`Pillar ${index} invalid completion`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create backup before migration
 * SAFE: Preserve data integrity
 */
export function createMigrationBackup(data: AppData): string {
  const backup = {
    timestamp: new Date().toISOString(),
    version: '1.0.0-legacy',
    data: JSON.parse(JSON.stringify(data)), // Deep clone
  };

  return JSON.stringify(backup);
}

/**
 * Restore from backup if migration fails
 * SAFE: Rollback capability
 */
export function restoreFromBackup(backupJson: string): AppData {
  try {
    const backup = JSON.parse(backupJson);
    if (backup.version !== '1.0.0-legacy' || !backup.data) {
      throw new Error('Invalid backup format');
    }
    console.log('♻️ Restored from backup:', backup.timestamp);
    return backup.data;
  } catch (error) {
    throw new Error(`Backup restore failed: ${error}`);
  }
}

/**
 * Gradual migration status tracking
 */
export interface MigrationProgress {
  stage: 'validation' | 'backup' | 'normalization' | 'validation_normalized' | 'complete';
  progress: number; // 0-100
  message: string;
  errors?: string[];
}

/**
 * Perform complete migration with progress tracking
 * SAFE: Step-by-step with rollback capability
 */
export async function performMigration(legacy: AppData): Promise<{
  success: boolean;
  data?: NormalizedAppData;
  backup?: string;
  errors?: string[];
}> {
  const progress: MigrationProgress[] = [];
  let backup: string | undefined;

  try {
    // Stage 1: Validate legacy data
    progress.push({ stage: 'validation', progress: 10, message: 'Validating legacy data...' });
    const validation = validateLegacyData(legacy);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Stage 2: Create backup
    progress.push({ stage: 'backup', progress: 30, message: 'Creating backup...' });
    backup = createMigrationBackup(legacy);

    // Stage 3: Normalize data
    progress.push({
      stage: 'normalization',
      progress: 60,
      message: 'Normalizing data structure...',
    });
    const normalized = normalizeData(legacy);

    // Stage 4: Validate normalized data
    progress.push({
      stage: 'validation_normalized',
      progress: 90,
      message: 'Validating normalized data...',
    });
    const normalizedValidation = validateNormalizedData(normalized);
    if (!normalizedValidation.valid) {
      return { success: false, errors: normalizedValidation.errors };
    }

    // Stage 5: Complete
    progress.push({ stage: 'complete', progress: 100, message: 'Migration successful!' });

    return {
      success: true,
      data: normalized,
      backup,
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Migration failed: ${error}`],
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if data is already normalized
 */
export function isNormalized(data: any): boolean {
  return Boolean(
    data &&
    typeof data === 'object' &&
    data.entities &&
    typeof data.entities === 'object' &&
    data.ids &&
    typeof data.ids === 'object' &&
    data._version &&
    typeof data._version === 'string' &&
    data._version.includes('normalized')
  );
}

/**
 * Check if data is legacy format
 */
export function isLegacy(data: any): data is AppData {
  return data && Array.isArray(data.pillars) && !data.entities;
}

/**
 * Get data format info for debugging
 */
export function getDataFormatInfo(data: any): {
  format: 'normalized' | 'legacy' | 'unknown';
  version?: string;
  entityCount?: number;
} {
  if (isNormalized(data)) {
    return {
      format: 'normalized',
      version: data._version,
      entityCount:
        Object.keys(data.entities.pillars).length +
        Object.keys(data.entities.tasks).length +
        Object.keys(data.entities.rules).length +
        Object.keys(data.entities.messages).length,
    };
  }

  if (isLegacy(data)) {
    return {
      format: 'legacy',
      entityCount:
        (data.pillars?.length || 0) +
        (data.phases?.length || 0) +
        (data.customRules?.length || 0) +
        (data.aiChatHistory?.length || 0),
    };
  }

  return { format: 'unknown' };
}

export default {
  normalizeData,
  denormalizeData,
  validateNormalizedData,
  validateLegacyData,
  createMigrationBackup,
  restoreFromBackup,
  performMigration,
  isNormalized,
  isLegacy,
  getDataFormatInfo,
};
