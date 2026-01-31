import {
  Task,
  TaskStatus,
  AppData,
  GoalAIContext,
  GoalAiTone,
  GoalAgent,
  GoalStrategy,
  GoalStrategyAIContext,
  Pillar,
  SharedCalendar,
  SuccessCriterionStatus,
} from '../types';
import { generateTaskId, calculateTaskStatus, detectStuckAt90 } from './taskHelpers';

export function migrateOldTasks(oldTasks: any[]): Task[] {
  return oldTasks.map((oldTask) => {
    const now = new Date().toISOString();
    const progress =
      typeof oldTask.progress === 'number' ? oldTask.progress : oldTask.done ? 100 : 0;

    const rawStatus = typeof oldTask.status === 'string' ? oldTask.status : '';
    const rawFinishStatus = typeof oldTask.finishStatus === 'string' ? oldTask.finishStatus : '';

    const isNewStatus = (s: string): s is TaskStatus =>
      s === 'active' || s === 'stuck' || s === 'done' || s === 'abandoned';

    let status: TaskStatus;
    if (isNewStatus(rawStatus)) {
      status = rawStatus;
    } else if (rawFinishStatus === 'done') {
      status = 'done';
    } else if (rawFinishStatus === 'stuck') {
      status = 'stuck';
    } else if (progress >= 100 || oldTask.done === true || rawStatus === 'done') {
      status = 'done';
    } else {
      status = calculateTaskStatus(progress); // active vs done fallback
    }

    const lastProgressUpdate = oldTask.lastProgressUpdate || oldTask.createdAt || now;
    const stuckAtNinety =
      progress >= 100
        ? false
        : typeof oldTask.stuckAtNinety === 'boolean'
          ? oldTask.stuckAtNinety
          : detectStuckAt90({
              id: oldTask.id || generateTaskId(),
              name: String(oldTask.name || ''),
              type: oldTask.type as any,
              progress,
              priority: oldTask.priority || 'medium',
              status: 'active',
              definitionOfDone:
                typeof oldTask.definitionOfDone === 'string' ? oldTask.definitionOfDone : '',
              stuckAtNinety: false,
              lastProgressUpdate,
              dueDate: oldTask.dueDate,
              createdAt: oldTask.createdAt || now,
              completedAt: oldTask.completedAt,
            } as Task);

    if (status !== 'done' && status !== 'abandoned' && stuckAtNinety) {
      status = 'stuck';
    }

    return {
      id: oldTask.id || generateTaskId(),
      name: oldTask.name,
      type: oldTask.type,

      // Task-level Definition of DONE (new field; safe default)
      definitionOfDone:
        typeof oldTask.definitionOfDone === 'string' ? oldTask.definitionOfDone : '',

      // Convert old boolean to progress
      progress,
      priority: oldTask.priority || 'medium', // Default priority
      status,

      // Core anti-90% tracking (safe defaults for older data)
      stuckAtNinety,
      lastProgressUpdate,

      dueDate: oldTask.dueDate,
      createdAt: oldTask.createdAt || now,
      completedAt: oldTask.completedAt || (progress === 100 ? now : undefined),
    };
  });
}

export function migrateOldPillarTasks(pillar: any): any {
  return {
    ...pillar,
    tasks: migrateOldTasks(pillar.tasks || []),
  };
}

export function migrateOldPhaseTasks(phase: any): any {
  return {
    ...phase,
    tasks: migrateOldTasks(phase.tasks || []),
  };
}

export function needsMigration(data: any): boolean {
  // Check if any task has old format (missing progress field)
  if (data.pillars) {
    return data.pillars.some(
      (pillar: any) =>
        pillar.tasks && pillar.tasks.some((task: any) => !task.hasOwnProperty('progress'))
    );
  }
  return false;
}

/**
 * Migrate AppData from v1 to v2 (Evening Protocol support)
 *
 * This migration:
 * - Adds schemaVersion: 2
 * - Initializes empty eveningProtocols array
 * - Initializes empty declarations array
 * - Creates default GoalAgent for each active goal
 *
 * @param data - AppData from v1 (or any version < 2)
 * @returns AppData v2 with new fields initialized
 */
export function migrateToV2(data: any): AppData {
  const currentVersion = data?.schemaVersion || 1;

  // If already v2 or higher, return as-is
  if (currentVersion >= 2) {
    return data as AppData;
  }

  console.log(`🔄 Migrating data from v${currentVersion} to v2 (Evening Protocol support)`);

  // Create default agents for active goals
  const goalAgents = createDefaultGoalAgents(data?.pillars || []);

  const v2: AppData = {
    ...data,
    schemaVersion: 2,
    eveningProtocols: data.eveningProtocols || [],
    declarations: data.declarations || [],
    goalAgents: data.goalAgents || goalAgents,
  };

  return v2;
}

const DEFAULT_CALENDAR: SharedCalendar = {
  entries: [],
  defaultWorkingHours: { start: '09:00', end: '18:00' },
  blockedDays: [],
};

const isGoalAiTone = (v: any): v is GoalAiTone =>
  v === 'military' || v === 'psychoeducation' || v === 'raw_facts';

const normalizeGoalAiTone = (v: any): GoalAiTone => (isGoalAiTone(v) ? v : 'psychoeducation');

const normalizeGoalAIContext = (raw: any): GoalAIContext => {
  const tone = normalizeGoalAiTone(raw?.tone);
  const customInstructions =
    typeof raw?.customInstructions === 'string' ? raw.customInstructions : undefined;
  const conversationHistory = Array.isArray(raw?.conversationHistory)
    ? raw.conversationHistory
    : [];
  return { tone, customInstructions, conversationHistory };
};

const isSuccessCriterionStatus = (v: any): v is SuccessCriterionStatus =>
  v === 'not_met' || v === 'partially_met' || v === 'met';

const normalizeSuccessCriterionStatus = (raw: any): SuccessCriterionStatus => {
  if (isSuccessCriterionStatus(raw)) return raw;
  return 'not_met';
};

const normalizeGoalStrategyAIContext = (
  raw: any,
  fallbackTone: GoalAiTone
): GoalStrategyAIContext => {
  return {
    tone: normalizeGoalAiTone(raw?.tone ?? fallbackTone),
    customInstructions:
      typeof raw?.customInstructions === 'string' ? raw.customInstructions : undefined,
  };
};

const DEFAULT_GOAL_STRATEGY = (tone: GoalAiTone, customInstructions?: string): GoalStrategy => ({
  vision: '',
  successCriteria: [],
  milestones: [],
  ifThenPlans: [],
  obstacles: [],
  structure: undefined,
  tactics: [],
  aiContext: { tone, ...(customInstructions ? { customInstructions } : {}) },
});

const normalizeGoalStrategy = (
  raw: any,
  tone: GoalAiTone,
  customInstructions?: string
): GoalStrategy => {
  const base = DEFAULT_GOAL_STRATEGY(tone, customInstructions);

  // Legacy: string strategy stored on Pillar.strategy
  if (typeof raw === 'string') {
    const s = raw.trim();
    // Some users/devs may have stored a JSON string strategy in the past.
    // Try to parse it to avoid data loss.
    if (s.startsWith('{') && s.endsWith('}')) {
      try {
        const parsed = JSON.parse(s);
        return normalizeGoalStrategy(parsed, tone, customInstructions);
      } catch {
        // ignore parse errors and fallback to base
      }
    }
    return base;
  }

  if (!raw || typeof raw !== 'object') return base;

  const vision = typeof raw.vision === 'string' ? raw.vision : base.vision;
  const successCriteria = Array.isArray(raw.successCriteria) ? raw.successCriteria : [];
  const milestones = Array.isArray(raw.milestones) ? raw.milestones : [];
  const ifThenPlans = Array.isArray(raw.ifThenPlans) ? raw.ifThenPlans : [];
  const obstacles = Array.isArray(raw.obstacles) ? raw.obstacles : [];
  const structureRaw = raw.structure;
  const tacticsRaw = raw.tactics;

  const nextSuccessCriteria = successCriteria.map((c: any) => {
    const description = typeof c?.description === 'string' ? c.description : '';
    const isMet = typeof c?.isMet === 'boolean' ? c.isMet : undefined;
    const status = isSuccessCriterionStatus(c?.status)
      ? c.status
      : typeof isMet === 'boolean'
        ? isMet
          ? 'met'
          : 'not_met'
        : normalizeSuccessCriterionStatus(c?.status);
    const evidence = typeof c?.evidence === 'string' ? c.evidence : undefined;
    return {
      id: String(c?.id ?? ''),
      description,
      isMet: typeof isMet === 'boolean' ? isMet : status === 'met',
      status,
      ...(evidence ? { evidence } : {}),
    };
  });

  const nextObstacles = obstacles.map((o: any) => {
    const occurredCount =
      typeof o?.occurredCount === 'number' && Number.isFinite(o.occurredCount)
        ? o.occurredCount
        : 0;
    return {
      id: String(o?.id ?? ''),
      description: typeof o?.description === 'string' ? o.description : '',
      countermeasure: typeof o?.countermeasure === 'string' ? o.countermeasure : '',
      occurredCount,
    };
  });

  const aiContext = normalizeGoalStrategyAIContext(raw.aiContext, tone);

  const nextStructure = (() => {
    if (!structureRaw || typeof structureRaw !== 'object') return undefined;
    const summary =
      typeof (structureRaw as any).summary === 'string' ? (structureRaw as any).summary : undefined;
    const phases = Array.isArray((structureRaw as any).phases)
      ? (structureRaw as any).phases
      : undefined;
    const normalizedPhases = Array.isArray(phases)
      ? phases
          .map((p: any) => ({
            id: String(p?.id ?? ''),
            title: typeof p?.title === 'string' ? p.title : '',
            description: typeof p?.description === 'string' ? p.description : undefined,
            status:
              p?.status === 'not_started' || p?.status === 'in_progress' || p?.status === 'done'
                ? p.status
                : undefined,
            order: typeof p?.order === 'number' && Number.isFinite(p.order) ? p.order : undefined,
          }))
          .filter((p: any) => Boolean(p.id || p.title))
      : undefined;

    // Keep structure only if it has any meaningful content.
    if (!summary && (!normalizedPhases || normalizedPhases.length === 0)) return undefined;
    return {
      ...(summary ? { summary } : {}),
      ...(normalizedPhases && normalizedPhases.length > 0 ? { phases: normalizedPhases } : {}),
    };
  })();

  const nextTactics = (() => {
    if (!Array.isArray(tacticsRaw)) return base.tactics || [];
    return tacticsRaw
      .map((t: any) => ({
        id: String(t?.id ?? ''),
        title: typeof t?.title === 'string' ? t.title : '',
        description: typeof t?.description === 'string' ? t.description : undefined,
        isActive: typeof t?.isActive === 'boolean' ? t.isActive : undefined,
        tags: Array.isArray(t?.tags)
          ? Array.from(
              new Set(
                t.tags
                  .map((x: any) => (typeof x === 'string' ? x.trim() : ''))
                  .filter(Boolean)
                  .slice(0, 12)
              )
            )
          : undefined,
      }))
      .filter((t: any) => Boolean(t.id || t.title));
  })();

  return {
    ...base,
    vision,
    successCriteria: nextSuccessCriteria,
    milestones,
    ifThenPlans,
    obstacles: nextObstacles,
    ...(nextStructure ? { structure: nextStructure } : {}),
    tactics: nextTactics,
    aiContext: { ...aiContext, ...(customInstructions ? { customInstructions } : {}) },
  };
};

const isValidSharedCalendar = (raw: any): raw is SharedCalendar => {
  return Boolean(
    raw &&
    typeof raw === 'object' &&
    Array.isArray(raw.entries) &&
    raw.defaultWorkingHours &&
    typeof raw.defaultWorkingHours === 'object' &&
    typeof raw.defaultWorkingHours.start === 'string' &&
    typeof raw.defaultWorkingHours.end === 'string' &&
    Array.isArray(raw.blockedDays)
  );
};

/**
 * Migrate AppData from v2 to v3 (Goal AI context + SharedCalendar defaults)
 *
 * SAFE: additive + backward compatible (no data loss)
 */
export function migrateToV3(data: any): AppData {
  // Ensure v2 fields exist first (Evening Protocol support)
  const v2 = migrateToV2(data);
  const currentVersion = v2?.schemaVersion || 1;

  if (currentVersion >= 3) {
    return v2 as AppData;
  }

  const pillars: Pillar[] = Array.isArray((v2 as any)?.pillars) ? (v2 as any).pillars : [];

  const v3: AppData = {
    ...(v2 as any),
    schemaVersion: 3,
    pillars: pillars.map((p: any) => ({
      ...p,
      aiContext: normalizeGoalAIContext(p?.aiContext),
    })),
    calendar: isValidSharedCalendar((v2 as any)?.calendar)
      ? (v2 as any).calendar
      : DEFAULT_CALENDAR,
  };

  return v3;
}

/**
 * Migrate AppData to v4 (rich goal strategy model, PLAN_v2 alignment).
 *
 * SAFE: additive + backward compatible (no data loss)
 */
export function migrateToV4(data: any): AppData {
  const v3 = migrateToV3(data);
  const currentVersion = (v3 as any)?.schemaVersion || 1;

  if (currentVersion >= 4) {
    return v3 as AppData;
  }

  const pillars: Pillar[] = Array.isArray((v3 as any)?.pillars) ? (v3 as any).pillars : [];

  const nextPillars = pillars.map((p: any) => {
    const pillarAiContext = normalizeGoalAIContext(p?.aiContext);
    const tone = normalizeGoalAiTone(p?.aiTone ?? pillarAiContext?.tone);
    const customInstructions = pillarAiContext?.customInstructions;

    const legacyStrategyString = typeof p?.strategy === 'string' ? String(p.strategy) : '';
    const legacyStrategyText = typeof p?.strategyText === 'string' ? String(p.strategyText) : '';

    const strategyText = legacyStrategyText || legacyStrategyString || '';
    const strategy = normalizeGoalStrategy(p?.strategy, tone, customInstructions);

    // Ensure nested aiContext exists (PLAN_v2) and is aligned with Pillar AI settings.
    const strategyAiContext: GoalStrategyAIContext = {
      tone,
      ...(customInstructions ? { customInstructions } : {}),
    };

    return {
      ...p,
      aiTone: tone,
      aiContext: {
        ...pillarAiContext,
        tone,
        ...(customInstructions ? { customInstructions } : {}),
      },
      strategy,
      ...(strategyText ? { strategyText } : {}),
      // Keep legacy string as-is only in strategyText; strategy is now structured.
    };
  });

  const v4: AppData = {
    ...(v3 as any),
    schemaVersion: 4,
    pillars: nextPillars as any,
    calendar: isValidSharedCalendar((v3 as any)?.calendar)
      ? (v3 as any).calendar
      : DEFAULT_CALENDAR,
  };

  // Make sure each strategy has PLAN_v2 aiContext (tone/customInstructions).
  // (We do this after building v4 to keep the main mapping readable.)
  v4.pillars = (v4.pillars as any).map((p: any) => {
    const tone = normalizeGoalAiTone(p?.aiTone ?? p?.aiContext?.tone);
    const customInstructions =
      typeof p?.aiContext?.customInstructions === 'string'
        ? p.aiContext.customInstructions
        : undefined;
    const s = normalizeGoalStrategy(p?.strategy, tone, customInstructions);
    return {
      ...p,
      strategy: {
        ...s,
        aiContext: { tone, ...(customInstructions ? { customInstructions } : {}) },
      },
    };
  });

  return v4;
}

/**
 * Create default GoalAgent instances for active goals
 *
 * @param pillars - Array of Pillar/Goal objects
 * @returns Map of goalId -> GoalAgent
 */
function createDefaultGoalAgents(pillars: Pillar[]): Record<number, GoalAgent> {
  return pillars
    .filter((p) => (p.activation ?? 'active') === 'active')
    .reduce(
      (acc, p) => {
        acc[p.id] = createDefaultAgent(p.id);
        return acc;
      },
      {} as Record<number, GoalAgent>
    );
}

/**
 * Create default GoalAgent configuration
 *
 * @param goalId - Goal ID
 * @returns Default GoalAgent instance
 */
function createDefaultAgent(goalId: number): GoalAgent {
  return {
    goalId,
    config: {
      checkIntervalMinutes: 15,
      penaltyPointsPerFailure: 5,
      severityThresholds: {
        minor: 2, // 1-2 failures
        major: 5, // 3-5 failures
        critical: 6, // 6+ failures
      },
      enabled: true,
    },
    state: {
      lastCheckAt: new Date().toISOString(),
      totalPenaltiesApplied: 0,
      consecutiveFailures: 0,
      status: 'active',
    },
    history: [],
  };
}
