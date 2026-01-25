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
   * Goal context
   * - type: the goal category (D-003)
   * - strategy: a short description of how to reach the goal
   * - aiTone: preferred communication style for AI assistance (D-031)
   *
   * Optional for backward compatibility with existing stored data.
   * Defaults are applied on load in `AppContext`.
   */
  type?: GoalType;
  strategy?: string;
  aiTone?: GoalAiTone;

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

export interface AppData {
  user: {
    id: string;
    name: string;
    last_checkin: string | null;
    streak: number;
  };
  pillars: Pillar[];
  phases: Phase[];
  rules: IfThenRule[];
  sprint: Sprint;
  customRules: CustomRule[];
  notificationHistory: NotificationHistory[];
  aiChatHistory: ChatMessage[];

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

  settings: {
    voice: VoiceSettings;
    ai: AISettings;
  };
}

export type ViewState =
  | 'home'
  | 'today'
  | 'timer'
  | 'sprint'
  | 'pillar_detail'
  | 'finish'
  | 'accountability'
  | 'settings'
  | 'rules'
  | 'ai_coach';

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
  executeRuleAction?: (rule: CustomRule) => void;
}
