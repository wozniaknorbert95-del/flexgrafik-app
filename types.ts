export type TaskType = 'build' | 'close';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
/**
 * Logical task status (PLAN.md 5.1) – single source of truth.
 *
 * IMPORTANT:
 * - Older stored data may still contain legacy status values or a legacy `finishStatus`.
 * - Those are normalized on load in migrations (see `utils/storageUtils.ts` / `utils/migrateData.ts`).
 */
export type TaskStatus = 'active' | 'stuck' | 'done' | 'abandoned';
export type FinishTaskStatus = 'done' | 'in_progress' | 'stuck';

// Progression Insights Types
export interface TaskInsight {
  isStuck: boolean;
  daysInCurrentState: number;
  recommendedAction: 'break-down-remaining' | 'set-deadline' | 'get-accountability' | null;
  motivationTip: string;
  completionVelocity: number; // tasks/day
}

export interface ImplementationIntention {
  trigger: string;
  action: string;
  active: boolean;
  lastTriggered?: string;
}

export interface Task {
  id: number; // Unique ID for tracking
  name: string;
  type: TaskType; // Keep existing 'build' | 'close'

  /**
   * Definition of DONE (task-level).
   * Optional for backward compatibility with existing stored data.
   * Empty/undefined means: "not defined yet".
   */
  definitionOfDone?: string;

  // NEW FIELDS - CORE FUNCTIONALITY:
  progress: number; // 0-100 percentage
  priority: TaskPriority; // For AI sorting
  status: TaskStatus; // Logical status (PLAN 5.1): active/stuck/done/abandoned

  // PROGRESSION INSIGHTS - ANTI-DIP SYSTEM:
  stuckAtNinety: boolean; // Wykrywanie utknięcia przy 90%+
  lastProgressUpdate: string; // ISO timestamp ostatniej aktualizacji
  implementationIntention?: {
    // System "jeśli-to"
    trigger: string; // Wyzwalacz (np. "Gdy poczuję, że to prawie gotowe...")
    action: string; // Akcja (np. "Sprawdzę listę kryteriów DONE")
    active: boolean; // Czy aktywny
    /**
     * Optional metadata (used by UI/Rules). Kept optional for backward compatibility.
     */
    lastTriggered?: string;
  };

  // OPTIONAL FIELDS:
  dueDate?: string; // ISO date string
  createdAt: string; // Track when task was added
  completedAt?: string; // Track when task finished
}

// ============================================================================
// FINISH MODE – SESSION MODEL (Foundation for stats + AI)
// ============================================================================

export type FinishSessionStatus = 'in_progress' | 'completed' | 'aborted';

export interface FinishSessionClassification {
  status: FinishTaskStatus;
  note?: string;
}

export interface FinishSession {
  /** Unique session identifier (stable across persistence) */
  id: string;
  /** Link to the task being finished */
  taskId: number;
  /** Link to the goal/pillar the task belongs to */
  pillarId: number;
  /** ISO timestamp (consistent with the rest of the app) */
  startTime: string;
  /** ISO timestamp, null until ended */
  endTime: string | null;
  /** Session lifecycle status (for stats + UX) */
  status: FinishSessionStatus;

  /**
   * Optional microstep chosen before starting the session (FinishMode UI).
   * Stored on the session so it survives refresh and can be used as AI context.
   */
  microStep?: string;

  /** User reflection at end of session (future: used by AI + reports) */
  userNote?: string;
  /** Future: AI-generated session summary (leave undefined for now) */
  aiSummary?: string;

  /**
   * Finish Mode classification (done / in_progress / stuck) + optional short note.
   * Optional for backward compatibility with existing stored data.
   */
  classification?: FinishSessionClassification;
}

export interface DoneDefinition {
  tech: string;
  live: string;
  battle: string;
}

// ============================================================================
// GOALS / PILLARS – TYPES + AI CONTEXT (D-003, D-031)
// ============================================================================

export type GoalType = 'main' | 'secondary' | 'lab';

export type GoalAiTone = 'military' | 'psychoeducation' | 'raw_facts';

// ============================================================================
// GOAL STRATEGY (TASK-101)
// ============================================================================

export type SuccessCriterionStatus = 'not_met' | 'partially_met' | 'met';

export interface SuccessCriterion {
  id: string;
  description: string;
  /**
   * Legacy boolean (kept for backward compatibility).
   * Prefer `status` for richer tracking (PLAN_v2).
   */
  isMet?: boolean;
  /**
   * Rich status (PLAN_v2). Optional for backward compatibility.
   */
  status?: SuccessCriterionStatus;
  /**
   * Optional evidence/notes for why the criterion is met (PLAN_v2).
   */
  evidence?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  deadline?: string; // ISO date string
  status: 'not_started' | 'in_progress' | 'done';
  reward?: string;
  completedAt?: string; // ISO date string
}

export interface IfThenPlan {
  id: string;
  trigger: string; // "Jeśli [sytuacja]..."
  action: string; // "...to zrobię [akcja]"
  isActive: boolean;
}

export interface Obstacle {
  id: string;
  description: string;
  countermeasure: string;
  /**
   * PLAN_v2: how many times this obstacle occurred.
   * Optional for backward compatibility.
   */
  occurredCount?: number;
}

export interface GoalStrategyAIContext {
  tone: GoalAiTone;
  customInstructions?: string;
}

/**
 * PLAN_v2 (FAZA 1): optional structured "how we execute" layer.
 *
 * NOTE:
 * - This is intentionally flexible and additive.
 * - Old stored data may not have it yet.
 */
export interface GoalStrategyStructurePhase {
  id: string;
  title: string;
  description?: string;
  /**
   * Optional per-phase status (separate from Pillar/Task status).
   * Useful for Strategy UI (step-by-step).
   */
  status?: 'not_started' | 'in_progress' | 'done';
  /**
   * Optional ordering hint for UI.
   */
  order?: number;
  /**
   * Optional list of task IDs that belong to this phase.
   * Additive: older stored data may not have it.
   */
  taskIds?: number[];
}

export interface GoalStrategyStructure {
  /**
   * Optional high-level outline (1–3 sentences).
   */
  summary?: string;
  /**
   * Optional list of phases/sections describing how the goal will be executed.
   */
  phases?: GoalStrategyStructurePhase[];
}

/**
 * PLAN_v2 (FAZA 1): tactics – small repeatable patterns that reduce friction.
 * Example use-cases: “5-min start”, “definition-of-done first”, “ship then polish”.
 */
export interface GoalStrategyTactic {
  id: string;
  title: string;
  description?: string;
  isActive?: boolean;
  tags?: string[];
}

export interface GoalStrategy {
  vision: string;
  successCriteria: SuccessCriterion[];
  milestones: Milestone[];
  ifThenPlans: IfThenPlan[];
  obstacles: Obstacle[];
  /**
   * PLAN_v2: optional execution structure (additive).
   */
  structure?: GoalStrategyStructure;
  /**
   * PLAN_v2: optional list of tactics (additive).
   */
  tactics?: GoalStrategyTactic[];
  /**
   * PLAN_v2: AI settings embedded in strategy (tone + custom instructions).
   * Optional for backward compatibility; conversation history remains in `Pillar.aiContext`.
   */
  aiContext?: GoalStrategyAIContext;
}

// ============================================================================
// GOAL AI CONTEXT (TASK-102)
// ============================================================================

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO date string
}

export interface GoalAIContext {
  tone: GoalAiTone;
  customInstructions?: string;
  conversationHistory: AIMessage[];
}

// ============================================================================
// SHARED CALENDAR (TASK-103)
// ============================================================================

export interface CalendarEntry {
  id: string;
  type: 'finish_session' | 'blocked' | 'available' | 'declaration';
  goalId?: string | number;
  taskId?: string | number;
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  title: string;
  notes?: string;
}

export interface SharedCalendar {
  entries: CalendarEntry[];
  defaultWorkingHours: {
    start: string; // "09:00"
    end: string; // "18:00"
  };
  blockedDays: string[]; // ISO dates
}

/**
 * Goal activation state (PLAN/D-003).
 * - active: counts towards the max-active-goals limit (default)
 * - backlog: stored but not part of the active set (finish-first)
 *
 * Optional for backward compatibility; defaults are applied on load via migrations.
 */
export type GoalActivation = 'active' | 'backlog';

// ============================================================================
// REWARDS (D-040) – process vs milestone
// ============================================================================

export type RewardType = 'milestone' | 'process';

export type RewardCondition =
  | { kind: 'milestone_completion_percent_at_least'; percent: number }
  | { kind: 'process_finish_sessions_completed_last_7_days_at_least'; count: number }
  | { kind: 'process_stuck_to_done_last_7_days_at_least'; count: number };

export interface Reward {
  id: string;
  description: string;
  type: RewardType;
  condition: RewardCondition;
  createdAt: string;
}

// ============================================================================
// GAMIFICATION FOUNDATION (Phase 2) – UserStats / Achievements (additive)
// ============================================================================

export type XpSource =
  | 'finish_session_minutes'
  | 'task_completed'
  | 'daily_bonus'
  | 'manual_adjustment';

export interface XpEvent {
  /** Stable-ish identifier for dedup/debug (local-first). */
  id: string;
  amount: number;
  source: XpSource;
  at: string; // ISO timestamp
  xpTotalAfter?: number;
  meta?: {
    sessionId?: string;
    taskId?: number;
    pillarId?: number;
    minutes?: number;
  };
}

export interface Achievement {
  /** Stable identifier (e.g. "streak_7_days", "finish_10_sessions") */
  id: string;
  title: string;
  description: string;
  /** Optional category / grouping for UI */
  category?: 'streak' | 'focus' | 'tasks' | 'consistency' | 'other';
  /** Optional icon key for UI (no hard dependency on an icon library) */
  iconKey?: string;
  /** Optional metadata for future condition evaluation */
  meta?: Record<string, any>;
}

export interface AchievementUnlock {
  achievementId: string;
  unlockedAt: string; // ISO timestamp
  /** Optional: traceability for debugging/audit */
  reason?: string;
}

export interface UserStats {
  /**
   * Total focus minutes across all time (source-of-truth for gamification).
   * Derived from completed Finish Mode sessions.
   */
  totalFocusMinutes: number;

  /** Completed Finish Mode sessions across all time */
  finishSessionsCompleted: number;

  /** Task completions across all time (see AppContext notes for counting rules). */
  tasksCompleted: number;

  /** Gamification economy */
  xp: number;
  level: number;
  /** XP remaining until next level (for HUD progress bar). */
  nextLevelXp: number;

  /** Streaks (local-date based, definition aligns with BasicStats MVP) */
  currentStreakDays: number;
  longestStreakDays: number;
  lastActivityDate: string | null; // YYYY-MM-DD in local timezone

  /** Achievements */
  achievementsUnlocked?: AchievementUnlock[];

  /**
   * Ledger of XP grants (bounded list).
   * Optional for backward compatibility.
   */
  xpEvents?: XpEvent[];

  /**
   * Counting policy for tasksCompleted:
   * - we count a task only once in lifetime, even if user toggles done↔not done later.
   * Optional for backward compatibility.
   */
  completedTaskIds?: number[];

  /** Prevents granting daily bonus more than once per local day. */
  lastDailyXpDate?: string | null; // YYYY-MM-DD (local)

  /** Level-up marker (for LevelUpModal + feedback). */
  lastLevelUpAt?: string | null; // ISO timestamp
  lastLevelUpFrom?: number;
  lastLevelUpTo?: number;

  /** Optional audit/debug field */
  lastXpGrant?: { amount: number; source: XpSource; at: string };
}

export interface Pillar {
  id: number;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'done';
  completion: number;
  ninety_percent_alert?: boolean;
  days_stuck?: number;
  last_activity_date?: string;
  done_definition: DoneDefinition;
  tasks: Task[];

  /**
   * Activation controls whether this goal counts as "active" (max 3 rule).
   * Optional for backward compatibility; defaults are applied on load via migrations.
   */
  activation?: GoalActivation;

  /**
   * Goal context
   * - type: the goal category (D-003)
   * - strategy: a short description of how to reach the goal
   * - aiTone: preferred communication style for AI assistance (D-031)
   *
   * Optional for backward compatibility with existing stored data.
   * Defaults are applied on load in `AppContext`.
   */
  type?: GoalType;
  /**
   * Goal strategy (PLAN_v2).
   *
   * IMPORTANT:
   * - New code should treat this as a structured `GoalStrategy`.
   * - Legacy stored data may still have a plain string here; it should be migrated into `strategyText`
   *   and replaced with a structured object during load/migrations (`utils/migrateData.ts`) and AppContext defaults.
   */
  strategy?: GoalStrategy | string;
  /**
   * Legacy / UI helper: plain-text strategy (optional).
   * Prefer storing a structured `GoalStrategy` in `strategy`.
   */
  strategyText?: string;
  aiTone?: GoalAiTone;
  aiContext?: GoalAIContext;

  /**
   * Rewards configured per goal (D-040).
   * Optional for backward compatibility with existing stored data.
   */
  rewards?: Reward[];
}

export interface ChecklistItem {
  item: string;
  completed: boolean;
}

export interface Phase {
  phase: number;
  name: string;
  deadline: string;
  status: 'not_started' | 'in_progress' | 'done';
  completion: number;
  checklist: ChecklistItem[];
}

export interface IfThenRule {
  id: number;
  name: string;
  condition: string;
  action: string;
  active: boolean;
}

export interface SprintDay {
  day: string; // Mon, Tue, etc.
  checked: boolean;
}

export interface Sprint {
  week: number;
  year: number;
  goal: string;
  progress: SprintDay[];
  done_tasks: string[]; // List of task names completed this week
  blocked_tasks: string[];
  completed_days?: SprintDay[]; // For AI service compatibility
}

export interface VoiceSettings {
  enabled: boolean;
  volume: number; // 0-100
  speed: number; // 0.8-1.2
}

export interface AISettings {
  apiKey: string;
  enabled: boolean;
  customSystemPrompt?: string;
}

// Goal / pillar system settings (PLAN/D-003)
export interface GoalSettings {
  /**
   * Maximum number of active goals (default: 3).
   * Applied by migrations; used for createPillar blocking and active/backlog enforcement.
   */
  maxActive: number;
}

export interface TimezoneSettings {
  /**
   * User's timezone (IANA timezone identifier, e.g., "Europe/Warsaw", "America/New_York").
   * Defaults to browser's timezone if not set.
   */
  timezone?: string;
  /**
   * Whether to use DST (Daylight Saving Time) adjustments.
   * Defaults to true (browser handles DST automatically).
   */
  useDST?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface CustomRule {
  id: string;
  name: string;
  trigger: 'time' | 'data' | 'manual';
  condition: string;
  action: 'voice' | 'ai_voice' | 'notification' | 'block_action';
  message: string;
  active: boolean;
  lastTriggered?: string;
}

export interface NotificationHistory {
  id: string;
  timestamp: string;
  type: 'checkin' | 'stuck' | 'deadline' | 'custom' | 'ai';
  message: string;
  response?: 'checked_in' | 'snoozed' | 'ignored' | 'acknowledged';
  ruleId?: string;
}

// ============================================================================
// IDEAS (PLAN 5.8) – personal knowledge base for planning
// ============================================================================

export interface Idea {
  id: string;
  title: string;
  description?: string;
  goalId?: number; // optional link to Pillar.id
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// EVENING PROTOCOL & DECLARATION SYSTEM
// ============================================================================

/**
 * Done Criterion - Individual checklist item for task completion
 */
export interface DoneCriterion {
  id: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
}

/**
 * Declaration Status - State machine for declaration lifecycle
 */
export type DeclarationStatus =
  | 'pending' // Before declared start time
  | 'active' // Within declared time window
  | 'in_progress' // Finish Mode session started
  | 'completed' // Task completed within time window
  | 'failed' // Time window passed without completion
  | 'cancelled'; // User explicitly cancelled

/**
 * Declaration - Commitment to work on a task during declared time window
 * Entity within EveningProtocol aggregate
 */
export interface Declaration {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Reference to parent protocol */
  protocolId: string;

  /** Task being declared */
  taskId: number;

  /** Goal the task belongs to */
  goalId: number;

  /** Done Criteria defined for this declaration (may differ from task default) */
  doneCriteria: DoneCriterion[];

  /** Declared time window */
  timeWindow: {
    start: string; // "09:00" (HH:mm format)
    end: string; // "12:00" (HH:mm format)
    timezone?: string; // Optional, defaults to user's timezone
  };

  /** Declaration lifecycle status */
  status: DeclarationStatus;

  /** Timestamps */
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;

  /** Agent evaluation */
  agentEvaluation: {
    checkedAt: string | null;
    penaltyPoints: number;
    reason: string | null;
    severity: 'none' | 'minor' | 'major' | 'critical';
  };

  /** User notes (optional) */
  notes?: string;
}

/**
 * Protocol Implementation Intention - Enhanced for Protocol context
 */
export interface ProtocolImplementationIntention {
  id: string;
  trigger: string;
  action: string;
  active: boolean;
  protocolId: string;
  goalId: number;
  taskId: number | null; // null = goal-level intention
  createdAt: string;
  lastTriggered: string | null;
}

/**
 * Evening Protocol - Root Aggregate
 *
 * Represents a user's evening planning session for the next day.
 * Immutable once completed (append-only pattern for audit).
 */
export interface EveningProtocol {
  /** Unique identifier (UUID v4) */
  id: string;

  /** ISO date string (date the protocol is FOR, not when created) */
  targetDate: string; // YYYY-MM-DD format

  /** ISO timestamp when protocol was created */
  createdAt: string;

  /** ISO timestamp when protocol was completed */
  completedAt: string | null;

  /** Protocol completion status */
  status: 'draft' | 'completed' | 'archived';

  /** Declarations made in this protocol */
  declarations: Declaration[];

  /** Implementation intentions (min 3 required) */
  implementationIntentions: ProtocolImplementationIntention[];

  /** Rules created/updated in this protocol (min 1 required) - references to CustomRule */
  rules: CustomRule[];

  /** Metadata for agent processing */
  metadata: {
    version: number; // Schema version for migrations
    goalIds: number[]; // Goals referenced in declarations
    totalDeclarations: number;
  };
}

/**
 * Agent Action - Record of agent decision
 */
export interface AgentAction {
  type: 'penalty' | 'notification' | 'reward_block';
  declarationId: string;
  points: number;
  reason: string;
  timestamp: string;
}

/**
 * Agent Check Record - History of agent checks
 */
export interface AgentCheckRecord {
  timestamp: string;
  declarationsChecked: number;
  failuresDetected: number;
  penaltiesApplied: number;
  actions: AgentAction[];
}

/**
 * Goal Agent - Autonomous agent monitoring declarations
 * Separate aggregate from EveningProtocol
 */
export interface GoalAgent {
  /** Goal this agent monitors */
  goalId: number;

  /** Agent configuration */
  config: {
    checkIntervalMinutes: number; // Default: 15
    penaltyPointsPerFailure: number; // Default: 5
    severityThresholds: {
      minor: number; // 1-2 failures
      major: number; // 3-5 failures
      critical: number; // 6+ failures
    };
    enabled: boolean;
  };

  /** Agent state */
  state: {
    lastCheckAt: string;
    totalPenaltiesApplied: number;
    consecutiveFailures: number;
    status: 'active' | 'paused' | 'disabled';
  };

  /** Monitoring history (last 30 days) */
  history: AgentCheckRecord[];
}

// ============================================================================
// WEEKLY REVIEW (Phase 3) – closing the week without guilt
// ============================================================================

export interface WeeklyReview {
  /** Stable identifier (UUID). */
  id: string;
  /** Week start (Monday) in local date key format: YYYY-MM-DD */
  weekStart: string;
  createdAt: string;
  updatedAt: string;
  wentWell: string;
  improve: string;
  decision: string;
}

export interface AppData {
  user: {
    id: string;
    name: string;
    last_checkin: string | null;
    streak: number;
  };
  /**
   * Gamification / stats aggregate (Phase 2 foundation).
   * Optional for backward compatibility with existing stored data.
   */
  userStats?: UserStats;
  pillars: Pillar[];
  phases: Phase[];
  rules: IfThenRule[];
  sprint: Sprint;
  customRules: CustomRule[];
  notificationHistory: NotificationHistory[];
  aiChatHistory: ChatMessage[];

  /**
   * Shared calendar / time blocks (TASK-103).
   * Optional for backward compatibility with existing stored data.
   */
  calendar?: SharedCalendar;

  /**
   * Finish Mode sessions
   * - currentFinishSession: one active session at a time (or null)
   * - finishSessionsHistory: append-only history used for stats and AI context
   *
   * Optional for backward compatibility with existing stored data.
   */
  currentFinishSession?: FinishSession | null;
  finishSessionsHistory?: FinishSession[];

  /**
   * Personal idea base (PLAN 5.8).
   * Optional for backward compatibility with existing stored data.
   */
  ideas?: Idea[];

  /**
   * Weekly reviews (Phase 3).
   * Optional for backward compatibility with existing stored data.
   */
  weeklyReviews?: WeeklyReview[];

  /**
   * Schema version for data migrations.
   * Current version: 1, New version: 2 (with Evening Protocol support)
   * Optional for backward compatibility.
   */
  schemaVersion?: number;

  /**
   * Evening Protocol system.
   * Optional for backward compatibility with existing stored data.
   */
  eveningProtocols?: EveningProtocol[];

  /**
   * Declarations (denormalized for efficient queries).
   * Optional for backward compatibility with existing stored data.
   */
  declarations?: Declaration[];

  /**
   * Goal Agents - autonomous agents monitoring declarations per goal.
   * Map: goalId -> GoalAgent
   * Optional for backward compatibility with existing stored data.
   */
  goalAgents?: Record<number, GoalAgent>;

  settings: {
    voice: VoiceSettings;
    ai: AISettings;
    goals: GoalSettings;
    timezone?: TimezoneSettings;
    /**
     * Gamification feedback (Phase 2).
     * Optional for backward compatibility.
     */
    gamification?: {
      soundEnabled: boolean;
      hapticsEnabled: boolean;
    };
  };
}

export type ViewState =
  | 'home'
  | 'today'
  | 'timer'
  | 'sprint'
  | 'calendar'
  | 'pillar_detail'
  | 'finish'
  | 'accountability'
  | 'settings'
  | 'rules'
  | 'ai_coach'
  | 'ideas'
  | 'evening_protocol'
  | 'weekly_review';

// Timer state interface
export interface TimerState {
  isRunning: boolean;
  timeRemaining: number;
  totalTime: number;
  mode: 'focus' | 'break' | 'long-break';
  cycles: number;
}

// NotificationCenter interface
export interface NotificationCenter {
  send: (type: string, message: string, id: string) => void;
  dismiss: (id: string) => void;
  getActive: () => NotificationHistory[];
  executeRuleAction: (rule: CustomRule) => void;
}
