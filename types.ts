export type TaskType = 'build' | 'close';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'not-started' | 'in-progress' | 'near-completion' | 'done';

export interface Task {
  id: string; // Add unique ID for tracking
  name: string;
  type: TaskType; // Keep existing 'build' | 'close'

  // NEW FIELDS - CORE FUNCTIONALITY:
  progress: number; // 0-100 percentage
  priority: TaskPriority; // For AI sorting
  status: TaskStatus; // Auto-calculated from progress

  // OPTIONAL FIELDS:
  dueDate?: string; // ISO date string
  createdAt: string; // Track when task was added
  completedAt?: string; // Track when task finished

  // DEPRECATED (keep for migration):
  done: boolean; // Will be calculated from progress >= 100
}

export interface DoneDefinition {
  tech: string;
  live: string;
  battle: string;
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
}

export interface ChecklistItem {
  item: string;
  done: boolean;
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
  settings: {
    voice: VoiceSettings;
    ai: AISettings;
  };
}

export type ViewState = 'home' | 'today' | 'finish' | 'sprint' | 'pillar_detail' | 'phase_detail' | 'accountability' | 'settings' | 'rules' | 'ai_coach';
