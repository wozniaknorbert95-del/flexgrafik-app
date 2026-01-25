import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import {
  AppData,
  ViewState,
  NotificationCenter,
  TimerState,
  TaskInsight,
  FinishSession,
  type FinishSessionClassification,
  type FinishTaskStatus,
  type TaskStatus,
  type Reward,
  type RewardCondition,
  type RewardType,
  type Idea,
} from '../types';
import { NormalizedAppData } from '../types/normalized';
import { INITIAL_DATA } from '../constants';
import { loadAppData, debouncedSaveAppData } from '../utils/storageManager';
import { handleError } from '../utils/errorHandler';
import { useDebounce } from '../hooks/useDebounce';
// Normalized migration is currently disabled for stability (D-051 staged refactor).
import {
  analyzeTaskProgression,
  analyzePillarProgression,
  generateWeeklyProgressReport,
} from '../utils/progressionInsights';
import {
  updateTaskProgressWithHistory,
  getStuckTasks,
  detectStuckAt90,
} from '../utils/taskHelpers';
import { PROGRESS_UPDATE_DEBOUNCE_MS, API_REQUEST_TIMEOUT_MS } from '../utils/config';
import { computeBasicStats, type BasicStats } from '../utils/stats';
import { validateChatMessage } from '../utils/inputValidation';
import { buildAssistantChatPrompt } from '../utils/aiPrompts';
import { providerGenerateText } from '../utils/aiProvider';

// ============================================================================
// APP CONTEXT - Centralized State Management
// ============================================================================

interface AppContextType {
  // LEGACY DATA (for backward compatibility)
  data: AppData;

  // NORMALIZED DATA (for performance - Phase 2)
  normalizedData: NormalizedAppData | null;

  // FINISH MODE SESSIONS (foundation for stats + AI)
  currentFinishSession: FinishSession | null;
  finishSessionsHistory: FinishSession[];

  // IDEAS (PLAN 5.8)
  ideas: Idea[];

  // UI State
  currentView: ViewState;
  activeProjectId: number | null;
  isLoaded: boolean;
  notificationCenter: NotificationCenter | null;
  isTimerRunning: boolean;
  timerState: TimerState | null;
  stuckCount: number;

  // TODO: OPTIMISTIC UI - Phase 3 (temporarily disabled)

  // Migration status
  migrationStatus: 'not_started' | 'in_progress' | 'completed' | 'error';

  // Actions - LEGACY (update legacy data)
  setData: (data: AppData | ((prev: AppData) => AppData)) => void;

  // Actions - NORMALIZED (update normalized data)
  setNormalizedData: (
    data: NormalizedAppData | ((prev: NormalizedAppData) => NormalizedAppData)
  ) => void;

  // UI Actions
  setCurrentView: (view: ViewState) => void;
  setActiveProjectId: (id: number | null) => void;
  setIsTimerRunning: (running: boolean) => void;
  setTimerState: (state: TimerState | null) => void;

  // PROGRESSION INSIGHTS - ANTI-DIP SYSTEM
  insights: {
    stuckTasks: any[]; // Tasks stuck at 90%+
    completionRate: number; // Overall completion rate
    averageCompletionTime: number; // Average days to complete tasks
    weeklyReport: any; // Weekly progress summary
  };

  // BASIC STATS (MVP) - Finish Mode focused
  basicStats: BasicStats;

  // Handlers (previously passed as props)
  handlePillarClick: (id: number) => void;
  handleAlertClick: (type: 'stuck' | 'checkin', projectId?: number) => void;
  handleToggleTask: (taskId: number, newProgress?: number) => Promise<void>; // Phase 3: Now async for optimistic updates
  activateImplementationIntention: (taskId: number) => void;
  handleUpdateSettings: (updates: Partial<AppData['settings']>) => void;
  handleUpdateChatHistory: (history: AppData['aiChatHistory']) => void;
  sendAICoachMessage: (message: string) => Promise<void>;
  aiStatus: { state: 'online' | 'offline' | 'disabled'; updatedAt: string | null };

  // Finish Mode session API (UI wiring happens in later iteration)
  startFinishSession: (taskId: number, pillarId: number) => void;
  endFinishSession: (
    sessionId: string,
    payload: {
      status: 'completed' | 'aborted';
      userNote?: string;
      aiSummary?: string;
      classification?: FinishSessionClassification;
    }
  ) => void;

  // Tasks
  updateTask: (
    taskId: number,
    updates: Partial<{
      progress: number;
      status: TaskStatus;
      completedAt: string;
      stuckAtNinety: boolean;
    }>
  ) => void;

  // Goals / Pillars (D-003, D-031) - minimal API for creation + updates
  createPillar: (payload: {
    name: string;
    description?: string;
    type?: 'main' | 'secondary' | 'lab';
    strategy?: string;
    aiTone?: 'military' | 'psychoeducation' | 'raw_facts';
  }) => void;
  updatePillar: (
    pillarId: number,
    updates: Partial<{
      name: string;
      description: string;
      type: 'main' | 'secondary' | 'lab';
      strategy: string;
      aiTone: 'military' | 'psychoeducation' | 'raw_facts';
    }>
  ) => void;

  // Rewards (D-040)
  addReward: (
    pillarId: number,
    payload: {
      description: string;
      type: RewardType;
      condition: RewardCondition;
    }
  ) => void;
  updateReward: (
    pillarId: number,
    rewardId: string,
    updates: Partial<{
      description: string;
      type: RewardType;
      condition: RewardCondition;
    }>
  ) => void;
  removeReward: (pillarId: number, rewardId: string) => void;
  getRewardsWithStatus: (
    pillarId: number
  ) => Array<{ reward: Reward; status: 'earned' | 'not_yet'; reason: string }>;

  // Ideas (PLAN 5.8)
  addIdea: (payload: {
    title: string;
    description?: string;
    goalId?: number;
    tags?: string[];
  }) => void;
  updateIdea: (
    ideaId: string,
    updates: Partial<{
      title: string;
      description: string;
      goalId: number | null;
      tags: string[];
    }>
  ) => void;
  removeIdea: (ideaId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const createRewardId = useCallback((): string => {
    try {
      if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
        return (crypto as any).randomUUID();
      }
    } catch (_) {
      // ignore
    }
    return `reward_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }, []);

  const createIdeaId = useCallback((): string => {
    try {
      if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
        return (crypto as any).randomUUID();
      }
    } catch (_) {
      // ignore
    }
    return `idea_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }, []);

  const isValidIsoDate = useCallback((value: unknown): value is string => {
    return (
      typeof value === 'string' && value.length > 0 && !Number.isNaN(new Date(value).getTime())
    );
  }, []);

  const withinLastDays = useCallback((iso: string, days: number, nowMs: number): boolean => {
    const t = new Date(iso).getTime();
    const windowMs = days * 24 * 60 * 60 * 1000;
    return nowMs - t >= 0 && nowMs - t <= windowMs;
  }, []);

  const ensureFinishSessionDefaults = useCallback((d: AppData): AppData => {
    const validGoalTypes = new Set(['main', 'secondary', 'lab']);
    const validAiTones = new Set(['military', 'psychoeducation', 'raw_facts']);

    const pillars = Array.isArray((d as any).pillars) ? (d as any).pillars : [];
    const isLegacyGoalTyping =
      pillars.length > 0 && pillars.every((p: any) => !validGoalTypes.has(p?.type));

    const nextPillars = pillars.map((p: any, idx: number) => {
      const rawType = p?.type;
      const type = validGoalTypes.has(rawType)
        ? rawType
        : isLegacyGoalTyping
          ? idx === 0
            ? 'main'
            : 'secondary'
          : 'secondary';

      const rawTone = p?.aiTone;
      const aiTone = validAiTones.has(rawTone) ? rawTone : 'psychoeducation';

      const strategy = typeof p?.strategy === 'string' ? p.strategy : '';

      return {
        ...p,
        type,
        strategy,
        aiTone,
      };
    });

    return {
      ...d,
      pillars: nextPillars,
      currentFinishSession: (d as any).currentFinishSession ?? null,
      finishSessionsHistory: Array.isArray((d as any).finishSessionsHistory)
        ? (d as any).finishSessionsHistory
        : [],
      ideas: Array.isArray((d as any).ideas) ? (d as any).ideas : [],
    };
  }, []);

  const createPillarId = useCallback((pillars: { id: number }[]): number => {
    const max = pillars.reduce((acc, p) => Math.max(acc, Number(p.id) || 0), 0);
    return max + 1;
  }, []);

  const createFinishSessionId = useCallback((): string => {
    try {
      // Browser-first; ok in most modern runtimes
      if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
        return (crypto as any).randomUUID();
      }
    } catch (_) {
      // ignore
    }
    return `finish_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }, []);

  // LEGACY DATA (backward compatibility)
  const [data, setData] = useState<AppData>(() => ensureFinishSessionDefaults(INITIAL_DATA));

  // NORMALIZED DATA (Phase 2 performance)
  const [normalizedData, setNormalizedData] = useState<NormalizedAppData | null>(null);

  // UI State
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [notificationCenter, setNotificationCenter] = useState<NotificationCenter | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerState, setTimerState] = useState<TimerState | null>(null);

  // Migration status
  const [migrationStatus, setMigrationStatus] = useState<
    'not_started' | 'in_progress' | 'completed' | 'error'
  >('not_started');

  // Debouncing refs for race condition prevention
  const progressUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<string, { progress: number; timestamp: number }>>(new Map());

  // TODO: OPTIMISTIC UI STATE - Phase 3 (temporarily disabled)

  // Computed
  const stuckCount = data.pillars.filter((p) => p.ninety_percent_alert).length;

  // PROGRESSION INSIGHTS - ANTI-DIP SYSTEM
  const insights = useMemo(() => {
    // Use optimized stuck task detection
    const stuckTasks = getStuckTasks(data.pillars);

    // Calculate overall completion rate
    const allTasks = data.pillars.flatMap((pillar) => pillar.tasks);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((task) => task.progress === 100).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate average completion time
    const completedTasksWithTime = allTasks.filter(
      (task) => task.completedAt && task.createdAt && task.progress === 100
    );
    const averageCompletionTime =
      completedTasksWithTime.length > 0
        ? Math.round(
            completedTasksWithTime.reduce((acc, task) => {
              const created = new Date(task.createdAt);
              const completed = new Date(task.completedAt!);
              const days = Math.floor(
                (completed.getTime() - created.getTime()) / (1000 * 3600 * 24)
              );
              return acc + days;
            }, 0) / completedTasksWithTime.length
          )
        : 0;

    // Generate weekly report
    const weeklyReport = generateWeeklyProgressReport(data.pillars);

    return {
      stuckTasks,
      completionRate,
      averageCompletionTime,
      weeklyReport,
    };
  }, [data.pillars]);

  // BASIC STATS (MVP) - derived from persisted data, cheap to compute
  const basicStats = useMemo(
    () => computeBasicStats(data),
    [data.pillars, data.finishSessionsHistory]
  );

  // Debounced data for persistence
  const debouncedData = useDebounce(data, 500);

  // Initialize data with migration support (async for IndexedDB)
  useEffect(() => {
    const initializeData = async () => {
      try {
        const loadedData = await loadAppData();
        const loadedWithSessions = ensureFinishSessionDefaults(loadedData);
        // Normalized data migration is intentionally disabled for stability.
        // Keep the app local-first and predictable (PLAN: stability > novelty).
        setNormalizedData(null);
        setData(loadedWithSessions);
        setMigrationStatus('not_started');

        console.log('✅ App data loaded successfully');
      } catch (error) {
        handleError(error, {
          component: 'AppContext',
          action: 'initializeData',
          userMessage: 'Problem z ładowaniem danych. Używam ustawień domyślnych.',
        });
        setData(ensureFinishSessionDefaults(INITIAL_DATA));
        setMigrationStatus('error');
      } finally {
        setIsLoaded(true);
      }
    };

    initializeData();
  }, [ensureFinishSessionDefaults]);

  // Persist data (debounced, async)
  useEffect(() => {
    if (isLoaded) {
      debouncedSaveAppData(debouncedData);
    }
  }, [debouncedData, isLoaded]);

  // Initialize notification center
  useEffect(() => {
    if (isLoaded) {
      import('../utils/notificationCenter').then((module) => {
        const center = module.getNotificationCenter(data, setData);
        setNotificationCenter(center);
      });
    }
  }, [isLoaded]); // Only once on load

  // ============================================================================
  // HANDLERS (Previously passed as props - now centralized)
  // ============================================================================

  const handlePillarClick = useCallback((id: number) => {
    setActiveProjectId(id);
    setCurrentView('pillar_detail');
  }, []);

  const handleAlertClick = useCallback((type: 'stuck' | 'checkin', projectId?: number) => {
    if (type === 'stuck' && projectId) {
      setActiveProjectId(projectId);
      setCurrentView('pillar_detail');
    } else if (type === 'checkin') {
      setCurrentView('today');
    }
  }, []);

  const handleToggleTask = useCallback(
    async (taskId: number | string, newProgress?: number) => {
      try {
        // Find the current task for reference
        const currentTask = data.pillars
          .flatMap((p) => p.tasks)
          .find((t) => t.id === taskId || String(t.id) === String(taskId));
        if (!currentTask) return;

        // Determine target progress (support both toggle and direct progress setting)
        const targetProgress =
          newProgress !== undefined ? newProgress : currentTask.progress >= 100 ? 0 : 100;

        // Update UI state immediately (optimistic update)
        setData((prev) => {
          const newPillars = prev.pillars.map((pillar) => ({
            ...pillar,
            tasks: pillar.tasks.map((task) => {
              const taskIdMatches = task.id === taskId || String(task.id) === String(taskId);

              if (taskIdMatches) {
                // Use enhanced update function with progress history
                const updatedTask = updateTaskProgressWithHistory(task, targetProgress);

                // Update stuck flag based on detectStuckAt90 result
                if (targetProgress >= 90 && targetProgress < 100) {
                  updatedTask.stuckAtNinety = detectStuckAt90(updatedTask);
                } else if (targetProgress === 100) {
                  // Edge case: task completed - immediately clear stuck flag
                  updatedTask.stuckAtNinety = false;
                }

                return updatedTask;
              }
              return task;
            }),
          }));

          // Update insights immediately after task change
          const newInsights = {
            stuckTasks: getStuckTasks(newPillars),
            completionRate: Math.round(
              (newPillars.flatMap((p) => p.tasks).filter((t) => t.progress === 100).length /
                newPillars.flatMap((p) => p.tasks).length) *
                100
            ),
            averageCompletionTime: Math.round(
              newPillars
                .flatMap((p) => p.tasks)
                .filter((t) => t.completedAt && t.createdAt)
                .reduce((acc, t) => {
                  const created = new Date(t.createdAt!);
                  const completed = new Date(t.completedAt!);
                  return acc + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
                }, 0) /
                Math.max(1, newPillars.flatMap((p) => p.tasks).filter((t) => t.completedAt).length)
            ),
            weeklyReport: generateWeeklyProgressReport(newPillars),
          };

          return {
            ...prev,
            pillars: newPillars,
            insights: newInsights,
          };
        });

        // Store pending update for debounced execution
        const taskKey = String(taskId);
        pendingUpdatesRef.current.set(taskKey, {
          progress: targetProgress,
          timestamp: Date.now(),
        });

        // Clear existing timeout for this task
        if (progressUpdateTimeoutRef.current) {
          clearTimeout(progressUpdateTimeoutRef.current);
        }

        // Set debounced update
        progressUpdateTimeoutRef.current = setTimeout(async () => {
          const pendingUpdate = pendingUpdatesRef.current.get(taskKey);
          if (!pendingUpdate) return;

          try {
            // Execute only the latest pending update
            await executeProgressUpdate(taskKey, pendingUpdate.progress);

            // Check if task became stuck and trigger Ollama AI nudge
            const updatedTask = updateTaskProgressWithHistory(currentTask, pendingUpdate.progress);
            if (detectStuckAt90(updatedTask) && !currentTask.stuckAtNinety) {
              // Trigger Ollama AI nudge in background (don't await)
              triggerOllamaNudge(updatedTask).catch((err) =>
                console.warn('Failed to generate AI nudge:', err)
              );
            }

            // Remove from pending updates
            pendingUpdatesRef.current.delete(taskKey);
          } catch (error) {
            console.error(`Failed to persist progress update for task ${taskKey}:`, error);
            // Could implement retry logic here
          }
        }, PROGRESS_UPDATE_DEBOUNCE_MS);
      } catch (error) {
        console.error('Failed to update task:', error);
        throw error;
      }
    },
    [data.pillars]
  );

  // Helper function to execute progress update with timeout
  const executeProgressUpdate = useCallback(async (taskId: string, progress: number) => {
    // Local-first: progress updates are persisted via storageManager (IndexedDB/localStorage).
    // We intentionally do NOT call any /api backend here (D-010).
    void taskId;
    void progress;
  }, []);

  const activateImplementationIntention = useCallback(
    async (
      taskId: number,
      intentionData?: { trigger: string; action: string; active: boolean }
    ) => {
      try {
        // Update local state
        setData((prev) => ({
          ...prev,
          pillars: prev.pillars.map((pillar) => ({
            ...pillar,
            tasks: pillar.tasks.map((task) => {
              if (task.id === taskId) {
                return {
                  ...task,
                  implementationIntention: {
                    trigger: intentionData?.trigger || task.implementationIntention?.trigger || '',
                    action: intentionData?.action || task.implementationIntention?.action || '',
                    active: intentionData?.active ?? true,
                    lastTriggered: new Date().toISOString(),
                  },
                };
              }
              return task;
            }),
          })),
        }));
      } catch (error) {
        console.error('Failed to activate implementation intention:', error);
        throw error; // Re-throw to handle in component
      }
    },
    []
  );

  // ============================================================================
  // FINISH MODE SESSION API (foundation only; UI wiring happens later)
  // ============================================================================

  const updateTask = useCallback(
    (
      taskId: number,
      updates: Partial<{
        progress: number;
        status: TaskStatus;
        completedAt: string;
        stuckAtNinety: boolean;
      }>
    ) => {
      setData((prev) => ({
        ...prev,
        pillars: prev.pillars.map((pillar) => ({
          ...pillar,
          tasks: pillar.tasks.map((task) => {
            if (task.id !== taskId) return task;

            let nextTask = task;

            if (updates.progress !== undefined) {
              nextTask = updateTaskProgressWithHistory(nextTask, updates.progress);
            }

            if (updates.status !== undefined) {
              nextTask = { ...nextTask, status: updates.status };
              // Keep status ↔ progress consistent for "done"
              if (updates.status === 'done') {
                nextTask = updateTaskProgressWithHistory(nextTask, 100);
              }
            }

            if (updates.completedAt !== undefined) {
              nextTask = { ...nextTask, completedAt: updates.completedAt };
            }

            if (updates.stuckAtNinety !== undefined) {
              nextTask = {
                ...nextTask,
                stuckAtNinety: updates.stuckAtNinety,
                status:
                  nextTask.status === 'done' || nextTask.status === 'abandoned'
                    ? nextTask.status
                    : updates.stuckAtNinety
                      ? 'stuck'
                      : nextTask.status,
              };
            }

            return nextTask;
          }),
        })),
      }));
    },
    []
  );

  const startFinishSession = useCallback(
    (taskId: number, pillarId: number) => {
      const now = new Date().toISOString();
      const newSession: FinishSession = {
        id: createFinishSessionId(),
        taskId,
        pillarId,
        startTime: now,
        endTime: null,
        status: 'in_progress',
      };

      setData((prev) => {
        const prevHistory = Array.isArray((prev as any).finishSessionsHistory)
          ? (prev as any).finishSessionsHistory
          : [];
        const current = (prev as any).currentFinishSession as FinishSession | null | undefined;

        let nextHistory = prevHistory;

        // If a session is already running, end it as aborted (minimal, predictable behavior)
        if (current && current.status === 'in_progress' && current.endTime == null) {
          const aborted: FinishSession = {
            ...current,
            endTime: now,
            status: 'aborted',
          };
          nextHistory = [...prevHistory, aborted];
        }

        // Keep history bounded (IndexedDB/localStorage size protection)
        const MAX_HISTORY = 500;
        if (nextHistory.length > MAX_HISTORY) {
          nextHistory = nextHistory.slice(nextHistory.length - MAX_HISTORY);
        }

        return {
          ...prev,
          currentFinishSession: newSession,
          finishSessionsHistory: nextHistory,
        };
      });
    },
    [createFinishSessionId]
  );

  const endFinishSession = useCallback(
    (
      sessionId: string,
      payload: {
        status: 'completed' | 'aborted';
        userNote?: string;
        aiSummary?: string;
        classification?: FinishSessionClassification;
      }
    ) => {
      const now = new Date().toISOString();
      const userNote = payload.userNote?.trim() || undefined;
      const aiSummary = payload.aiSummary?.trim() || undefined;
      const classification = payload.classification
        ? {
            status: payload.classification.status,
            note: payload.classification.note?.trim() || undefined,
          }
        : undefined;

      setData((prev) => {
        const current = (prev as any).currentFinishSession as FinishSession | null | undefined;
        if (!current || current.id !== sessionId) {
          return prev;
        }

        const ended: FinishSession = {
          ...current,
          endTime: now,
          status: payload.status,
          userNote,
          aiSummary,
          classification,
        };

        const prevHistory = Array.isArray((prev as any).finishSessionsHistory)
          ? (prev as any).finishSessionsHistory
          : [];
        let nextHistory = [...prevHistory, ended];
        const MAX_HISTORY = 500;
        if (nextHistory.length > MAX_HISTORY) {
          nextHistory = nextHistory.slice(nextHistory.length - MAX_HISTORY);
        }

        const nextPillars = classification
          ? prev.pillars.map((pillar) => ({
              ...pillar,
              tasks: pillar.tasks.map((task) => {
                if (task.id !== current.taskId) return task;

                const cls = classification.status;

                // DONE implies progress=100 + completion timestamp.
                if (cls === 'done') {
                  const progressed = updateTaskProgressWithHistory(task, 100);
                  return {
                    ...progressed,
                    status: 'done',
                    // Preserve existing completedAt if already set
                    completedAt: task.completedAt ?? now,
                    // Redundant safety: ensure stuck flag is cleared when done
                    stuckAtNinety: false,
                  };
                }

                if (cls === 'stuck') {
                  return {
                    ...task,
                    status: 'stuck',
                  };
                }

                // cls === 'in_progress' → active
                return {
                  ...task,
                  status: 'active',
                };
              }),
            }))
          : prev.pillars;

        return {
          ...prev,
          currentFinishSession: null,
          finishSessionsHistory: nextHistory,
          pillars: nextPillars,
        };
      });
    },
    []
  );

  const handleUpdateSettings = useCallback((updates: Partial<AppData['settings']>) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));
  }, []);

  const handleUpdateChatHistory = useCallback((history: AppData['aiChatHistory']) => {
    setData((prev) => ({
      ...prev,
      aiChatHistory: history,
    }));
  }, []);

  const [aiStatus, setAiStatus] = useState<{ state: 'online' | 'offline' | 'disabled'; updatedAt: string | null }>(
    () => ({
      state: data?.settings?.ai?.enabled ? 'offline' : 'disabled',
      updatedAt: null,
    })
  );

  useEffect(() => {
    const enabled = Boolean((data as any)?.settings?.ai?.enabled);
    setAiStatus((prev) => ({
      state: enabled ? (prev.state === 'disabled' ? 'offline' : prev.state) : 'disabled',
      updatedAt: prev.updatedAt,
    }));
  }, [data?.settings?.ai?.enabled]);

  const sendAICoachMessage = useCallback(
    async (rawMessage: string) => {
      const validation = validateChatMessage(rawMessage);
      if (!validation.isValid) {
        // Don't crash the UI on invalid input; respond as assistant.
        const err = validation.error || 'Invalid message';
        setData((prev) => {
          const prevHistory = Array.isArray((prev as any).aiChatHistory)
            ? (prev as any).aiChatHistory
            : [];
          const now = new Date().toISOString();
          const makeId = () => `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
          const next = [...prevHistory, { id: makeId(), role: 'assistant', content: err, timestamp: now }];
          const MAX = 120;
          return { ...prev, aiChatHistory: next.slice(Math.max(0, next.length - MAX)) };
        });
        return;
      }

      const message = (validation.sanitized || '').trim();
      if (!message) return;

      const now = new Date().toISOString();
      const makeId = () => `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      // Optimistically append user message.
      setData((prev) => {
        const prevHistory = Array.isArray((prev as any).aiChatHistory) ? (prev as any).aiChatHistory : [];
        const next = [
          ...prevHistory,
          { id: makeId(), role: 'user', content: message, timestamp: now },
        ];
        const MAX = 120;
        return { ...prev, aiChatHistory: next.slice(Math.max(0, next.length - MAX)) };
      });

      // Build prompt based on the latest snapshot of context.
      const snapshot = (() => {
        const d = data;
        const activeId = activeProjectId;
        const pillarId = activeId ?? (d.pillars.find((p: any) => p.type === 'main') as any)?.id ?? null;
        return { d, pillarId };
      })();

      // If AI is disabled in settings, return a deterministic response.
      const aiEnabled = Boolean((snapshot.d as any)?.settings?.ai?.enabled);
      let assistantText: string | null = null;

      if (!aiEnabled) {
        setAiStatus({ state: 'disabled', updatedAt: new Date().toISOString() });
        assistantText =
          'AI jest wyłączone. Otwórz Config (⚙) → AI Assistant → Enable AI Support i ustaw API key (Groq).';
      } else {
        const apiKey = String((snapshot.d as any)?.settings?.ai?.apiKey ?? '').trim();
        if (!apiKey) {
          setAiStatus({ state: 'offline', updatedAt: new Date().toISOString() });
          assistantText =
            'AI jest włączone, ale brakuje API key. Otwórz Config (⚙) → AI Assistant → wklej API key (Groq).';
        } else {
        const prompt = buildAssistantChatPrompt({
          data: snapshot.d,
          message,
          primaryPillarId: snapshot.pillarId,
        });

          assistantText = await providerGenerateText(
            { apiKey, prompt, temperature: 0.6, maxTokens: 700, maxLen: 700 },
            { timeoutMs: 12_000 }
          );

          // Local-first fallback if provider/timeout fails.
          if (!assistantText) {
            setAiStatus({ state: 'offline', updatedAt: new Date().toISOString() });
            const maxActive = Number((snapshot.d as any)?.settings?.goals?.maxActive ?? 3) || 3;
            const activeCount = (snapshot.d.pillars || []).filter(
              (p: any) => p.status !== 'done' && (p.activation ?? 'active') === 'active'
            ).length;
            assistantText = `AI niedostępne (provider offline / timeout). Fakty: masz ${activeCount}/${maxActive} aktywne cele. Następny krok: wybierz 1 task i wejdź w Finish Mode na 25 min, z twardą Definicją DONE.`;
          } else {
            setAiStatus({ state: 'online', updatedAt: new Date().toISOString() });
          }
        }
      }

      // Append assistant response.
      setData((prev) => {
        const prevHistory = Array.isArray((prev as any).aiChatHistory) ? (prev as any).aiChatHistory : [];
        const next = [
          ...prevHistory,
          { id: makeId(), role: 'assistant', content: assistantText as string, timestamp: new Date().toISOString() },
        ];
        const MAX = 120;
        return { ...prev, aiChatHistory: next.slice(Math.max(0, next.length - MAX)) };
      });
    },
    [activeProjectId, data]
  );

  // ============================================================================
  // GOALS / PILLARS (D-003, D-031) - minimal helpers
  // ============================================================================

  const createPillar = useCallback(
    (payload: {
      name: string;
      description?: string;
      type?: 'main' | 'secondary' | 'lab';
      strategy?: string;
      aiTone?: 'military' | 'psychoeducation' | 'raw_facts';
    }) => {
      const name = payload.name?.trim();
      if (!name) return;

      setData((prev) => {
        // D-003: max 3 active goals (finish-first)
        // We treat "active" as: status !== 'done' AND activation === 'active'.
        const maxActive =
          Number((prev as any)?.settings?.goals?.maxActive ?? 3) || 3;
        const activeCount = (prev.pillars || []).filter(
          (p: any) => p.status !== 'done' && (p.activation ?? 'active') === 'active'
        ).length;
        const MAX_ACTIVE_GOALS = maxActive;
        if (activeCount >= MAX_ACTIVE_GOALS) {
          const msg =
            `Limit ${MAX_ACTIVE_GOALS} aktywnych celów (D-003). ` +
            `Masz teraz ${activeCount}/${MAX_ACTIVE_GOALS}. ` +
            `Najpierw zakończ (DONE) lub przenieś do backlogu jeden cel, zanim dodasz kolejny.`;
          console.warn(`🚫 createPillar blocked: ${msg}`);
          // Best-effort UX: push a visible notification (local-first).
          notificationCenter?.send('custom', msg, 'rule_max_3_goals');
          return prev;
        }

        const nextId = createPillarId(prev.pillars);
        const newPillar = {
          id: nextId,
          name,
          description: payload.description?.trim() || '',
          status: 'not_started' as const,
          completion: 0,
          ninety_percent_alert: false,
          days_stuck: 0,
          last_activity_date: new Date().toISOString(),
          done_definition: { tech: '', live: '', battle: '' },
          tasks: [],
          activation: 'active' as const,
          type: payload.type ?? 'secondary',
          strategy: payload.strategy?.trim() || '',
          aiTone: payload.aiTone ?? 'psychoeducation',
          rewards: [],
        };

        return {
          ...prev,
          // D-003: max 1 main goal - if new one is main, downgrade existing main -> secondary
          pillars: [
            ...(newPillar.type === 'main'
              ? prev.pillars.map((p) => (p.type === 'main' ? { ...p, type: 'secondary' } : p))
              : prev.pillars),
            newPillar,
          ],
        };
      });
    },
    [createPillarId, notificationCenter]
  );

  const updatePillar = useCallback(
    (
      pillarId: number,
      updates: Partial<{
        name: string;
        description: string;
        type: 'main' | 'secondary' | 'lab';
        strategy: string;
        aiTone: 'military' | 'psychoeducation' | 'raw_facts';
        activation: 'active' | 'backlog';
      }>
    ) => {
      setData((prev) => {
        // D-003: activation changes must respect maxActive.
        if (updates.activation === 'active') {
          const maxActive = Number((prev as any)?.settings?.goals?.maxActive ?? 3) || 3;
          const currentActiveCount = (prev.pillars || []).filter(
            (p: any) => p.status !== 'done' && (p.activation ?? 'active') === 'active'
          ).length;
          const target = prev.pillars.find((p: any) => p.id === pillarId) as any;
          const targetAlreadyActive = Boolean(target && (target.activation ?? 'active') === 'active');

          if (!targetAlreadyActive && currentActiveCount >= maxActive) {
            const msg =
              `Limit ${maxActive} aktywnych celów (D-003). ` +
              `Masz teraz ${currentActiveCount}/${maxActive}. ` +
              `Najpierw przenieś inny cel do backlogu albo zakończ (DONE).`;
            notificationCenter?.send('custom', msg, 'rule_max_active_goals_activation');
            return prev;
          }
        }

        return {
          ...prev,
          pillars: prev.pillars.map((p) => {
            // Enforce "max 1 main goal" (D-003): if we're setting this pillar to main,
            // automatically downgrade any other main pillar to secondary.
            if (updates.type === 'main' && p.id !== pillarId && p.type === 'main') {
              return { ...p, type: 'secondary' };
            }

            if (p.id !== pillarId) return p;

            return {
              ...p,
              ...(updates.name !== undefined ? { name: updates.name } : {}),
              ...(updates.description !== undefined ? { description: updates.description } : {}),
              ...(updates.type !== undefined ? { type: updates.type } : {}),
              ...(updates.strategy !== undefined ? { strategy: updates.strategy } : {}),
              ...(updates.aiTone !== undefined ? { aiTone: updates.aiTone } : {}),
              ...(updates.activation !== undefined ? { activation: updates.activation } : {}),
            };
          }),
        };
      });
    },
    [notificationCenter]
  );

  const addReward = useCallback(
    (
      pillarId: number,
      payload: { description: string; type: RewardType; condition: RewardCondition }
    ) => {
      const description = payload.description?.trim();
      if (!description) return;

      const now = new Date().toISOString();
      const reward: Reward = {
        id: createRewardId(),
        description,
        type: payload.type,
        condition: payload.condition,
        createdAt: now,
      };

      setData((prev) => ({
        ...prev,
        pillars: prev.pillars.map((p) => {
          if (p.id !== pillarId) return p;
          const existing = Array.isArray((p as any).rewards)
            ? ((p as any).rewards as Reward[])
            : [];
          return { ...p, rewards: [...existing, reward] };
        }),
      }));
    },
    [createRewardId]
  );

  const updateReward = useCallback(
    (
      pillarId: number,
      rewardId: string,
      updates: Partial<{ description: string; type: RewardType; condition: RewardCondition }>
    ) => {
      setData((prev) => ({
        ...prev,
        pillars: prev.pillars.map((p) => {
          if (p.id !== pillarId) return p;
          const existing = Array.isArray((p as any).rewards)
            ? ((p as any).rewards as Reward[])
            : [];
          const nextRewards = existing.map((r) => {
            if (r.id !== rewardId) return r;
            return {
              ...r,
              ...(updates.description !== undefined ? { description: updates.description } : {}),
              ...(updates.type !== undefined ? { type: updates.type } : {}),
              ...(updates.condition !== undefined ? { condition: updates.condition } : {}),
            };
          });
          return { ...p, rewards: nextRewards };
        }),
      }));
    },
    []
  );

  const removeReward = useCallback((pillarId: number, rewardId: string) => {
    setData((prev) => ({
      ...prev,
      pillars: prev.pillars.map((p) => {
        if (p.id !== pillarId) return p;
        const existing = Array.isArray((p as any).rewards) ? ((p as any).rewards as Reward[]) : [];
        return { ...p, rewards: existing.filter((r) => r.id !== rewardId) };
      }),
    }));
  }, []);

  const getRewardsWithStatus = useCallback(
    (pillarId: number) => {
      const nowMs = Date.now();
      const pillar = data.pillars.find((p) => p.id === pillarId) as any;
      if (!pillar) return [];

      const rewards: Reward[] = Array.isArray(pillar.rewards) ? pillar.rewards : [];
      if (rewards.length === 0) return [];

      const sessions: FinishSession[] = data.finishSessionsHistory ?? [];
      const completedLast7ForPillar = sessions.filter((s) => {
        if (s.status !== 'completed') return false;
        if (s.pillarId !== pillarId) return false;
        if (!isValidIsoDate(s.endTime)) return false;
        return withinLastDays(s.endTime, 7, nowMs);
      });

      const finishSessionsCompletedLast7 = completedLast7ForPillar.length;

      // Stuck -> Done tasks (last 7 days, based on classification sequence inside the window)
      const eventsByTask = new Map<
        number,
        Array<{ endMs: number; status: 'done' | 'in_progress' | 'stuck' }>
      >();
      for (const s of completedLast7ForPillar) {
        const status = (s as any).classification?.status as
          | 'done'
          | 'in_progress'
          | 'stuck'
          | undefined;
        if (!status) continue;
        const taskId = Number(s.taskId);
        const endMs = new Date(s.endTime as string).getTime();
        if (!Number.isFinite(taskId) || !Number.isFinite(endMs)) continue;
        const list = eventsByTask.get(taskId) ?? [];
        list.push({ endMs, status });
        eventsByTask.set(taskId, list);
      }

      const stuckToDoneTaskIds = new Set<number>();
      for (const [taskId, events] of eventsByTask.entries()) {
        events.sort((a, b) => a.endMs - b.endMs);
        let sawStuck = false;
        for (const e of events) {
          if (e.status === 'stuck') {
            sawStuck = true;
            continue;
          }
          if (!sawStuck) continue;
          if (e.status === 'done') {
            stuckToDoneTaskIds.add(taskId);
            break;
          }
        }
      }

      const stuckToDoneLast7 = stuckToDoneTaskIds.size;

      const evaluate = (reward: Reward): { status: 'earned' | 'not_yet'; reason: string } => {
        const c = reward.condition;

        if (c.kind === 'milestone_completion_percent_at_least') {
          const threshold = Math.max(0, Math.min(100, Number(c.percent ?? 0)));
          const completion = Number(pillar.completion ?? 0);
          if (completion >= threshold) {
            return { status: 'earned', reason: `completion ${completion}% ≥ ${threshold}%` };
          }
          return { status: 'not_yet', reason: `completion ${completion}% / ${threshold}%` };
        }

        if (c.kind === 'process_finish_sessions_completed_last_7_days_at_least') {
          const target = Math.max(1, Number(c.count ?? 1));
          if (finishSessionsCompletedLast7 >= target) {
            return {
              status: 'earned',
              reason: `finish sessions (7d) ${finishSessionsCompletedLast7} ≥ ${target}`,
            };
          }
          return {
            status: 'not_yet',
            reason: `finish sessions (7d) ${finishSessionsCompletedLast7} / ${target}`,
          };
        }

        if (c.kind === 'process_stuck_to_done_last_7_days_at_least') {
          const target = Math.max(1, Number(c.count ?? 1));
          if (stuckToDoneLast7 >= target) {
            return { status: 'earned', reason: `stuck→done (7d) ${stuckToDoneLast7} ≥ ${target}` };
          }
          return { status: 'not_yet', reason: `stuck→done (7d) ${stuckToDoneLast7} / ${target}` };
        }

        return { status: 'not_yet', reason: 'unknown condition' };
      };

      return rewards.map((reward) => ({ reward, ...evaluate(reward) }));
    },
    [data.finishSessionsHistory, data.pillars, isValidIsoDate, withinLastDays]
  );

  // ============================================================================
  // IDEAS (PLAN 5.8) – personal knowledge base
  // ============================================================================

  const addIdea = useCallback(
    (payload: { title: string; description?: string; goalId?: number; tags?: string[] }) => {
      const title = payload.title?.trim();
      if (!title) return;

      const now = new Date().toISOString();
      const rawTags = Array.isArray(payload.tags) ? payload.tags : [];
      const tags = Array.from(
        new Set(
          rawTags
            .map((t) => (typeof t === 'string' ? t.trim() : ''))
            .filter(Boolean)
            .slice(0, 12)
        )
      );

      const goalId = Number.isFinite(Number(payload.goalId)) ? Number(payload.goalId) : undefined;

      const idea: Idea = {
        id: createIdeaId(),
        title: title.slice(0, 120),
        description: payload.description?.trim()?.slice(0, 2000) || undefined,
        goalId,
        tags: tags.length > 0 ? tags : undefined,
        createdAt: now,
        updatedAt: now,
      };

      setData((prev) => ({
        ...prev,
        ideas: [
          ...(Array.isArray((prev as any).ideas) ? ((prev as any).ideas as Idea[]) : []),
          idea,
        ],
      }));
    },
    [createIdeaId]
  );

  const updateIdea = useCallback(
    (
      ideaId: string,
      updates: Partial<{
        title: string;
        description: string;
        goalId: number | null;
        tags: string[];
      }>
    ) => {
      if (!ideaId) return;
      const now = new Date().toISOString();

      setData((prev) => {
        const existing = Array.isArray((prev as any).ideas) ? ((prev as any).ideas as Idea[]) : [];
        if (existing.length === 0) return prev;

        const nextIdeas = existing.map((i) => {
          if (i.id !== ideaId) return i;

          const nextTitle =
            updates.title !== undefined ? updates.title.trim().slice(0, 120) : i.title;
          if (!nextTitle) return i; // don't allow blank titles

          const nextDesc =
            updates.description !== undefined
              ? updates.description.trim().slice(0, 2000) || undefined
              : i.description;

          const nextGoalId =
            updates.goalId !== undefined
              ? updates.goalId === null
                ? undefined
                : Number(updates.goalId)
              : i.goalId;

          const nextTags =
            updates.tags !== undefined
              ? Array.from(
                  new Set(
                    updates.tags.map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean)
                  )
                ).slice(0, 12)
              : (i.tags ?? undefined);

          return {
            ...i,
            title: nextTitle,
            description: nextDesc,
            goalId: Number.isFinite(Number(nextGoalId)) ? Number(nextGoalId) : undefined,
            tags: nextTags.length > 0 ? nextTags : undefined,
            updatedAt: now,
          };
        });

        return { ...prev, ideas: nextIdeas };
      });
    },
    []
  );

  const removeIdea = useCallback((ideaId: string) => {
    if (!ideaId) return;
    setData((prev) => ({
      ...prev,
      ideas: (Array.isArray((prev as any).ideas) ? ((prev as any).ideas as Idea[]) : []).filter(
        (i) => i.id !== ideaId
      ),
    }));
  }, []);

  // AI Nudge Trigger (Settings-driven; no hardcoded Ollama)
  const triggerOllamaNudge = useCallback(
    async (task: any) => {
      // AC: if AI disabled → do not do any AI calls (and do not spam errors).
      const aiEnabled = Boolean((data as any)?.settings?.ai?.enabled);
      if (!aiEnabled) return;

      const apiKey = String((data as any)?.settings?.ai?.apiKey ?? '').trim();

      try {
        const name = String(task?.name ?? '').trim().slice(0, 140) || 'zadaniu';
        const progress = Math.max(0, Math.min(100, Math.round(Number(task?.progress ?? 0) || 0)));
        const done = String(task?.definitionOfDone ?? '').trim().slice(0, 140);

        const prompt = `Użytkownik utknął na ${progress}% w zadaniu "${name}".
Daj mu jedną, brutalnie szczerą poradę w stylu Navy SEALs, jak dobić do 100%.
Max 20 słów. Bez waty.`;

        const aiNudgeFromProvider = apiKey
          ? await providerGenerateText(
              { apiKey, prompt, temperature: 0.9, maxTokens: 120, maxLen: 180 },
              { timeoutMs: 10_000 }
            )
          : null;

        // AC: AI enabled without key → deterministic fallback, no fetch errors.
        const aiNudge =
          (aiNudgeFromProvider || '').trim() ||
          `Masz ${progress}%. Mikrokrok: ${done ? `zrób 1 brakujący punkt DONE („${done}”).` : 'doprecyzuj 1 zdaniem Definicję DONE i zrób pierwszy punkt.'}`;

        if (aiNudge && aiNudge.length <= 200) {
          // Local-first: persist nudge inside task for later display (no backend dependency).
          const now = new Date().toISOString();
          setData((prev) => ({
            ...prev,
            pillars: prev.pillars.map((p) => ({
              ...p,
              tasks: (p.tasks || []).map((t) =>
                t.id === task.id ? { ...(t as any), aiNudge, aiNudgeGeneratedAt: now } : t
              ),
            })),
          }));
        }
      } catch (error) {
        console.warn('AI nudge generation failed (provider), skipped:', error);
      }
    },
    [data]
  );

  // Context value
  const value: AppContextType = {
    // LEGACY DATA (backward compatibility)
    data,
    normalizedData,
    migrationStatus,

    // Finish Mode sessions
    currentFinishSession: data.currentFinishSession ?? null,
    finishSessionsHistory: data.finishSessionsHistory ?? [],
    ideas: data.ideas ?? [],

    // UI State
    currentView,
    activeProjectId,
    isLoaded,
    notificationCenter,
    isTimerRunning,
    timerState,
    stuckCount,

    // PROGRESSION INSIGHTS
    insights,
    basicStats,

    // Actions - LEGACY
    setData,

    // Actions - NORMALIZED
    setNormalizedData,

    // UI Actions
    setCurrentView,
    setActiveProjectId,
    setIsTimerRunning,
    setTimerState,

    // Handlers
    handlePillarClick,
    handleAlertClick,
    handleToggleTask,
    activateImplementationIntention,
    handleUpdateSettings,
    handleUpdateChatHistory,
    sendAICoachMessage,
    aiStatus,

    // Finish Mode session API
    startFinishSession,
    endFinishSession,
    updateTask,

    // Goals / Pillars
    createPillar,
    updatePillar,

    // Rewards
    addReward,
    updateReward,
    removeReward,
    getRewardsWithStatus,

    // Ideas
    addIdea,
    updateIdea,
    removeIdea,
  };

  // Expose context globally for testing
  if (typeof window !== 'undefined') {
    (window as any).appContext = value;
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ============================================================================
// HOOK - useAppContext
// ============================================================================

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export default AppContext;
