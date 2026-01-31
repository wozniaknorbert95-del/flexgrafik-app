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
  type ImplementationIntention,
  type GoalAIContext,
  type GoalAiTone,
  type GoalStrategy,
  type Pillar,
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
import { buildAssistantChatPrompt, buildGoalStrategistChatPrompt } from '../utils/aiPrompts';
import { providerGenerateText } from '../utils/aiProvider';
import { secureStorage } from '../utils/secureStorage';
import { triggerLevelUpFeedback, triggerTaskCompleteFeedback } from '../utils/feedbackService';
import { evaluateNewAchievementUnlocks, getBadgeInfo } from '../utils/achievementEngine';
import { showSuccess } from '../utils/toastService';

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

  // Derived fields helper (critical for stable UX)
  recomputePillarDerivedFields: (pillar: Pillar) => Pillar;

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
  activateImplementationIntention: (
    taskId: number,
    intentionData?: Pick<ImplementationIntention, 'trigger' | 'action' | 'active'>
  ) => Promise<void>;
  handleUpdateSettings: (updates: Partial<AppData['settings']>) => void;
  handleUpdateChatHistory: (history: AppData['aiChatHistory']) => void;
  sendAICoachMessage: (message: string) => Promise<void>;
  sendGoalChatMessage: (payload: {
    goalId: number;
    message: string;
    responseMode: 'strict' | 'psycho' | 'facts';
  }) => Promise<void>;
  clearGoalAIHistory: (goalId: number) => void;
  aiStatus: { state: 'online' | 'offline' | 'disabled'; updatedAt: string | null };

  // Finish Mode session API (UI wiring happens in later iteration)
  startFinishSession: (taskId: number, pillarId: number, meta?: { microStep?: string }) => void;
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
    /**
     * Strategy can be provided as legacy text (string) or as a structured object.
     * AppContext will persist the structured object and keep legacy text in `strategyText`.
     */
    strategy?: string | GoalStrategy;
    /** Optional legacy helper text (kept for backward compatibility). */
    strategyText?: string;
    aiTone?: 'military' | 'psychoeducation' | 'raw_facts';
  }) => void;
  updatePillar: (
    pillarId: number,
    updates: Partial<{
      name: string;
      description: string;
      type: 'main' | 'secondary' | 'lab';
      /** Strategy updates can be legacy text or structured object. */
      strategy: string | GoalStrategy;
      /** Optional legacy helper text (kept for backward compatibility). */
      strategyText: string;
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
  // Gamification foundation (Phase 2): deterministic constants (local-first).
  const XP_PER_FOCUS_MINUTE = 1;
  const XP_PER_TASK_COMPLETION = 50;
  const XP_DAILY_BONUS = 100;
  const MAX_XP_EVENTS = 1000;
  const MAX_COMPLETED_TASK_IDS = 5000;

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

  const ensureUserStatsDefaults = useCallback(
    (d: AppData): AppData => {
      const hasStats = (d as any)?.userStats != null;
      const raw = (d as any)?.userStats ?? {};

      const asNonNegInt = (value: unknown, fallback: number): number => {
        const n = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(n)) return fallback;
        return Math.max(0, Math.floor(n));
      };

      const asLevel = (value: unknown, fallback: number): number => {
        const n = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(n)) return fallback;
        return Math.max(1, Math.floor(n));
      };

      const lastActivityDate =
        typeof raw.lastActivityDate === 'string' && raw.lastActivityDate.trim()
          ? raw.lastActivityDate.trim()
          : null;

      const achievementsUnlocked = Array.isArray(raw.achievementsUnlocked)
        ? raw.achievementsUnlocked
        : undefined;

      const lastXpGrant =
        raw.lastXpGrant && typeof raw.lastXpGrant === 'object'
          ? {
              amount: asNonNegInt((raw.lastXpGrant as any).amount, 0),
              source: (raw.lastXpGrant as any).source,
              at:
                typeof (raw.lastXpGrant as any).at === 'string' ? (raw.lastXpGrant as any).at : '',
            }
          : undefined;

      const xpEvents =
        Array.isArray(raw.xpEvents) && raw.xpEvents.length > 0
          ? raw.xpEvents.slice(Math.max(0, raw.xpEvents.length - MAX_XP_EVENTS))
          : undefined;

      const completedTaskIds =
        Array.isArray(raw.completedTaskIds) && raw.completedTaskIds.length > 0
          ? raw.completedTaskIds
              .map((v: any) => Number(v))
              .filter((n: any) => Number.isFinite(n))
              .slice(Math.max(0, raw.completedTaskIds.length - MAX_COMPLETED_TASK_IDS))
          : undefined;

      const lastDailyXpDate =
        typeof raw.lastDailyXpDate === 'string' && raw.lastDailyXpDate.trim()
          ? raw.lastDailyXpDate.trim()
          : null;

      const lastLevelUpAt =
        typeof raw.lastLevelUpAt === 'string' && raw.lastLevelUpAt.trim()
          ? raw.lastLevelUpAt.trim()
          : null;
      const lastLevelUpFrom =
        raw.lastLevelUpFrom !== undefined && Number.isFinite(Number(raw.lastLevelUpFrom))
          ? Math.max(1, Math.floor(Number(raw.lastLevelUpFrom)))
          : undefined;
      const lastLevelUpTo =
        raw.lastLevelUpTo !== undefined && Number.isFinite(Number(raw.lastLevelUpTo))
          ? Math.max(1, Math.floor(Number(raw.lastLevelUpTo)))
          : undefined;

      // Backfill computed stats ONLY when userStats is missing (for existing users with history).
      const computed = (() => {
        if (hasStats) return null;

        const sessions: FinishSession[] = Array.isArray((d as any).finishSessionsHistory)
          ? ((d as any).finishSessionsHistory as FinishSession[])
          : [];

        const completedSessions = sessions.filter((s: any) => s && s.status === 'completed');
        let totalMinutes = 0;
        for (const s of completedSessions) {
          const st = new Date(String((s as any).startTime || '')).getTime();
          const en = new Date(String((s as any).endTime || '')).getTime();
          if (!Number.isFinite(st) || !Number.isFinite(en) || en < st) continue;
          totalMinutes += Math.max(0, Math.floor((en - st) / 60000));
        }

        const pillars = Array.isArray((d as any).pillars) ? ((d as any).pillars as any[]) : [];
        const allTasks = pillars.flatMap((p: any) => (Array.isArray(p?.tasks) ? p.tasks : []));
        const doneTaskIds = new Set<number>();
        for (const t of allTasks) {
          const id = Number(t?.id);
          if (!Number.isFinite(id)) continue;
          const progress = Number(t?.progress ?? 0);
          const status = String(t?.status ?? '');
          if (status === 'done' || progress >= 100) {
            doneTaskIds.add(id);
          }
        }

        const xp = totalMinutes * XP_PER_FOCUS_MINUTE;
        const level = Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp))));
        const nextLevelXp = Math.max(0, (level + 1) * (level + 1) - xp);

        // Streaks: align with BasicStats MVP definition (main goal sessions).
        const now = new Date();
        const mainPillarIds = new Set<number>(
          pillars.filter((p: any) => p?.type === 'main').map((p: any) => Number(p.id))
        );
        const dayKeys: string[] = [];
        const daySet = new Set<string>();
        let lastEndMs = -1;
        for (const s of completedSessions) {
          const pid = Number((s as any).pillarId);
          if (!Number.isFinite(pid) || !mainPillarIds.has(pid)) continue;
          const endIso = (s as any).endTime;
          if (typeof endIso !== 'string' || !endIso) continue;
          const endedAt = new Date(endIso);
          const endMs = endedAt.getTime();
          if (!Number.isFinite(endMs)) continue;
          if (endMs > lastEndMs) lastEndMs = endMs;
          const key = `${endedAt.getFullYear()}-${String(endedAt.getMonth() + 1).padStart(2, '0')}-${String(
            endedAt.getDate()
          ).padStart(2, '0')}`;
          if (!daySet.has(key)) {
            daySet.add(key);
            dayKeys.push(key);
          }
        }

        // current streak: consecutive days up to today
        const toKey = (dt: Date) =>
          `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        let currentStreakDays = 0;
        const cursor = new Date(now);
        while (daySet.has(toKey(cursor))) {
          currentStreakDays += 1;
          cursor.setDate(cursor.getDate() - 1);
        }

        // longest streak: scan sorted unique days
        const sorted = [...daySet].sort();
        let longestStreakDays = 0;
        let run = 0;
        let prevDate: Date | null = null;
        for (const k of sorted) {
          const dt = new Date(`${k}T00:00:00`);
          if (!Number.isFinite(dt.getTime())) continue;
          if (!prevDate) {
            run = 1;
          } else {
            const diffDays = Math.round(
              (dt.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
            );
            run = diffDays === 1 ? run + 1 : 1;
          }
          prevDate = dt;
          if (run > longestStreakDays) longestStreakDays = run;
        }

        const lastActivityDate = lastEndMs > 0 ? toKey(new Date(lastEndMs)) : null;

        return {
          totalFocusMinutes: totalMinutes,
          finishSessionsCompleted: completedSessions.length,
          tasksCompleted: doneTaskIds.size,
          xp,
          level,
          nextLevelXp,
          currentStreakDays,
          longestStreakDays,
          lastActivityDate,
          completedTaskIds: Array.from(doneTaskIds).slice(0, MAX_COMPLETED_TASK_IDS),
          xpEvents: [],
        };
      })();

      const resolvedXp = asNonNegInt(raw.xp, computed?.xp ?? 0);
      const resolvedLevel = asLevel(
        raw.level,
        computed?.level ?? Math.max(1, Math.floor(Math.sqrt(Math.max(0, resolvedXp))))
      );
      const resolvedNextLevelXp = asNonNegInt(
        (raw as any).nextLevelXp,
        computed?.nextLevelXp ?? Math.max(0, (resolvedLevel + 1) * (resolvedLevel + 1) - resolvedXp)
      );

      return {
        ...d,
        userStats: {
          totalFocusMinutes: asNonNegInt(raw.totalFocusMinutes, computed?.totalFocusMinutes ?? 0),
          finishSessionsCompleted: asNonNegInt(
            raw.finishSessionsCompleted,
            computed?.finishSessionsCompleted ?? 0
          ),
          tasksCompleted: asNonNegInt(raw.tasksCompleted, computed?.tasksCompleted ?? 0),
          xp: resolvedXp,
          level: resolvedLevel,
          nextLevelXp: resolvedNextLevelXp,
          currentStreakDays: asNonNegInt(raw.currentStreakDays, computed?.currentStreakDays ?? 0),
          longestStreakDays: asNonNegInt(raw.longestStreakDays, computed?.longestStreakDays ?? 0),
          lastActivityDate: lastActivityDate ?? computed?.lastActivityDate ?? null,
          ...(achievementsUnlocked ? { achievementsUnlocked } : {}),
          ...(xpEvents ? { xpEvents } : computed?.xpEvents ? { xpEvents: computed.xpEvents } : {}),
          ...(completedTaskIds
            ? { completedTaskIds }
            : computed?.completedTaskIds
              ? { completedTaskIds: computed.completedTaskIds }
              : {}),
          ...(lastDailyXpDate ? { lastDailyXpDate } : {}),
          ...(lastLevelUpAt ? { lastLevelUpAt } : {}),
          ...(lastLevelUpFrom !== undefined ? { lastLevelUpFrom } : {}),
          ...(lastLevelUpTo !== undefined ? { lastLevelUpTo } : {}),
          ...(lastXpGrant ? { lastXpGrant } : {}),
        },
      } as AppData;
    },
    [MAX_COMPLETED_TASK_IDS, MAX_XP_EVENTS, XP_PER_FOCUS_MINUTE]
  );

  const ensureFinishSessionDefaults = useCallback(
    (d: AppData): AppData => {
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

        const rawTone = (p?.aiContext?.tone ?? p?.aiTone) as any;
        const aiTone: GoalAiTone = validAiTones.has(rawTone) ? rawTone : 'psychoeducation';

        const customInstructions =
          typeof p?.aiContext?.customInstructions === 'string'
            ? p.aiContext.customInstructions
            : undefined;

        const conversationHistory = Array.isArray(p?.aiContext?.conversationHistory)
          ? p.aiContext.conversationHistory
          : [];

        const aiContext: GoalAIContext = {
          tone: aiTone,
          ...(customInstructions ? { customInstructions } : {}),
          conversationHistory,
        };

        const legacyStrategyText =
          typeof p?.strategyText === 'string'
            ? String(p.strategyText)
            : (() => {
                // If `strategy` is a JSON string (legacy experimental storage), avoid polluting user-facing text.
                if (typeof p?.strategy !== 'string') return '';
                const s = String(p.strategy).trim();
                if (s.startsWith('{') && s.endsWith('}')) return '';
                return s;
              })();

        const rawStrategy = p?.strategy;
        const strategyObj: GoalStrategy = (() => {
          const build = (raw: any): GoalStrategy => {
            const baseObj = raw && typeof raw === 'object' ? raw : {};
            const vision = typeof baseObj.vision === 'string' ? baseObj.vision : '';
            const successCriteria = Array.isArray(baseObj.successCriteria)
              ? baseObj.successCriteria
              : [];
            const milestones = Array.isArray(baseObj.milestones) ? baseObj.milestones : [];
            const ifThenPlans = Array.isArray(baseObj.ifThenPlans) ? baseObj.ifThenPlans : [];
            const obstacles = Array.isArray(baseObj.obstacles) ? baseObj.obstacles : [];
            const structure =
              baseObj.structure && typeof baseObj.structure === 'object'
                ? baseObj.structure
                : undefined;
            const tactics = Array.isArray(baseObj.tactics) ? baseObj.tactics : [];

            const strategyAiContext =
              baseObj.aiContext && typeof baseObj.aiContext === 'object'
                ? {
                    tone: validAiTones.has(baseObj.aiContext.tone)
                      ? baseObj.aiContext.tone
                      : aiTone,
                    ...(typeof baseObj.aiContext.customInstructions === 'string'
                      ? { customInstructions: baseObj.aiContext.customInstructions }
                      : customInstructions
                        ? { customInstructions }
                        : {}),
                  }
                : { tone: aiTone, ...(customInstructions ? { customInstructions } : {}) };

            // IMPORTANT: spread baseObj FIRST to preserve extra fields, then override normalized keys.
            return {
              ...(baseObj as any),
              vision,
              successCriteria,
              milestones,
              ifThenPlans,
              obstacles,
              ...(structure ? { structure } : {}),
              tactics,
              aiContext: strategyAiContext,
            } as GoalStrategy;
          };

          // Structured strategy object – keep it and normalize minimal shape (without dropping extra keys).
          if (rawStrategy && typeof rawStrategy === 'object') {
            return build(rawStrategy);
          }

          // Legacy string: try to parse JSON (some older builds stored structured strategy as string).
          if (typeof rawStrategy === 'string') {
            const s = rawStrategy.trim();
            if (s.startsWith('{') && s.endsWith('}')) {
              try {
                const parsed = JSON.parse(s);
                if (parsed && typeof parsed === 'object') {
                  return build(parsed);
                }
              } catch {
                // ignore parse errors, fallback below
              }
            }
          }

          // Missing/legacy: create an empty structured strategy (local-first, safe defaults).
          return build({
            vision: '',
            successCriteria: [],
            milestones: [],
            ifThenPlans: [],
            obstacles: [],
            structure: undefined,
            tactics: [],
            aiContext: { tone: aiTone, ...(customInstructions ? { customInstructions } : {}) },
          });
        })();

        return {
          ...p,
          type,
          aiTone,
          aiContext,
          strategy: strategyObj,
          ...(legacyStrategyText ? { strategyText: legacyStrategyText } : {}),
        };
      });

      const base = {
        ...d,
        pillars: nextPillars,
        currentFinishSession: (d as any).currentFinishSession ?? null,
        finishSessionsHistory: Array.isArray((d as any).finishSessionsHistory)
          ? (d as any).finishSessionsHistory
          : [],
        ideas: Array.isArray((d as any).ideas) ? (d as any).ideas : [],
        settings: {
          ...(d as any).settings,
          gamification: (d as any)?.settings?.gamification ?? {
            soundEnabled: true,
            hapticsEnabled: true,
          },
        },
      } as AppData;

      return ensureUserStatsDefaults(base);
    },
    [ensureUserStatsDefaults]
  );

  const getSafeUserStats = useCallback(
    (d: AppData) => {
      return ensureUserStatsDefaults(d).userStats as any;
    },
    [ensureUserStatsDefaults]
  );

  const toLocalDateKey = useCallback((date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const isTaskDone = useCallback((task: any): boolean => {
    if (!task) return false;
    const status = String(task.status ?? '');
    const progress = Number(task.progress ?? 0);
    return status === 'done' || progress >= 100;
  }, []);

  const computeLevelFromXp = useCallback((xp: number): number => {
    const safeXp = Number.isFinite(xp) ? xp : 0;
    return Math.max(1, Math.floor(Math.sqrt(Math.max(0, safeXp))));
  }, []);

  const computeNextLevelXp = useCallback((xp: number, level: number): number => {
    const safeXp = Number.isFinite(xp) ? xp : 0;
    const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
    const nextThreshold = (safeLevel + 1) * (safeLevel + 1);
    return Math.max(0, nextThreshold - Math.max(0, safeXp));
  }, []);

  const computeMainGoalStreakDaysFromHistory = useCallback(
    (pillars: Pillar[], history: FinishSession[], now: Date): number => {
      const mainIds = new Set<number>(
        (pillars || []).filter((p: any) => p?.type === 'main').map((p: any) => Number(p.id))
      );
      if (mainIds.size === 0) return 0;

      const daySet = new Set<string>();
      for (const s of history || []) {
        if (!s || (s as any).status !== 'completed') continue;
        if (!mainIds.has(Number((s as any).pillarId))) continue;
        const endTime = (s as any).endTime;
        if (typeof endTime !== 'string' || !endTime) continue;
        const endedAt = new Date(endTime);
        if (Number.isNaN(endedAt.getTime())) continue;
        daySet.add(toLocalDateKey(endedAt));
      }

      let streak = 0;
      const cursor = new Date(now);
      while (daySet.has(toLocalDateKey(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak;
    },
    [toLocalDateKey]
  );

  const appendXpEvent = useCallback(
    (
      stats: any,
      payload: {
        amount: number;
        source: 'finish_session_minutes' | 'task_completed' | 'manual_adjustment';
        at: string;
        meta?: any;
        xpTotalAfter?: number;
      }
    ) => {
      const prev = Array.isArray(stats?.xpEvents) ? stats.xpEvents : [];
      const id = `xp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const next = [
        ...prev,
        {
          id,
          amount: Math.max(0, Math.floor(Number(payload.amount) || 0)),
          source: payload.source,
          at: payload.at,
          ...(payload.xpTotalAfter !== undefined ? { xpTotalAfter: payload.xpTotalAfter } : {}),
          ...(payload.meta ? { meta: payload.meta } : {}),
        },
      ];
      return { ...stats, xpEvents: next.slice(Math.max(0, next.length - MAX_XP_EVENTS)) };
    },
    [MAX_XP_EVENTS]
  );

  const grantDailyBonusIfNeeded = useCallback(
    (stats: any, atIso: string) => {
      const dateKey = toLocalDateKey(new Date(atIso));
      const last = typeof stats?.lastDailyXpDate === 'string' ? stats.lastDailyXpDate : null;
      if (last === dateKey) return stats;

      const oldLevel = Number(stats?.level ?? 1) || 1;
      const nextXp = Number(stats?.xp ?? 0) + XP_DAILY_BONUS;
      const nextLevel = computeLevelFromXp(nextXp);
      const nextLevelXp = computeNextLevelXp(nextXp, nextLevel);

      let nextStats = {
        ...stats,
        xp: nextXp,
        level: nextLevel,
        nextLevelXp,
        lastDailyXpDate: dateKey,
        lastXpGrant: { amount: XP_DAILY_BONUS, source: 'daily_bonus', at: atIso },
      };

      if (nextLevel > oldLevel) {
        nextStats = {
          ...nextStats,
          lastLevelUpAt: atIso,
          lastLevelUpFrom: oldLevel,
          lastLevelUpTo: nextLevel,
        };
      }

      nextStats = appendXpEvent(nextStats, {
        amount: XP_DAILY_BONUS,
        source: 'daily_bonus',
        at: atIso,
        xpTotalAfter: nextXp,
        meta: { dateKey },
      });

      return nextStats;
    },
    [XP_DAILY_BONUS, appendXpEvent, computeLevelFromXp, computeNextLevelXp, toLocalDateKey]
  );

  const grantXp = useCallback(
    (
      stats: any,
      payload: {
        amount: number;
        source: 'finish_session_minutes' | 'task_completed' | 'manual_adjustment';
        at: string;
        meta?: any;
      }
    ) => {
      const amount = Math.max(0, Math.floor(Number(payload.amount) || 0));
      if (amount <= 0) return stats;

      const atIso = payload.at;
      const oldLevel = Number(stats?.level ?? 1) || 1;
      const nextXp = Number(stats?.xp ?? 0) + amount;
      const nextLevel = computeLevelFromXp(nextXp);
      const nextLevelXp = computeNextLevelXp(nextXp, nextLevel);

      let nextStats = {
        ...stats,
        xp: nextXp,
        level: nextLevel,
        nextLevelXp,
        lastXpGrant: { amount, source: payload.source, at: atIso },
      };

      if (nextLevel > oldLevel) {
        nextStats = {
          ...nextStats,
          lastLevelUpAt: atIso,
          lastLevelUpFrom: oldLevel,
          lastLevelUpTo: nextLevel,
        };
      }

      nextStats = appendXpEvent(nextStats, {
        amount,
        source: payload.source,
        at: atIso,
        xpTotalAfter: nextXp,
        meta: payload.meta,
      });

      return nextStats;
    },
    [appendXpEvent, computeLevelFromXp, computeNextLevelXp]
  );

  const applyAchievementUnlocks = useCallback((prevStats: any, nextStats: any) => {
    const prev = prevStats || ({} as any);
    const next = nextStats || ({} as any);
    const lastEvent =
      Array.isArray(next?.xpEvents) && next.xpEvents.length > 0
        ? next.xpEvents[next.xpEvents.length - 1]
        : null;
    const unlocks = evaluateNewAchievementUnlocks({ prevStats: prev, nextStats: next, lastEvent });
    if (unlocks.length === 0) return { nextStats: next, newlyUnlocked: [] as any[] };

    const existing = Array.isArray(next.achievementsUnlocked) ? next.achievementsUnlocked : [];
    const nowIso = new Date().toISOString();
    const appended = unlocks.map((u) => ({
      achievementId: u.achievementId,
      unlockedAt: nowIso,
      reason: u.reason,
    }));

    return {
      nextStats: { ...next, achievementsUnlocked: [...existing, ...appended] },
      newlyUnlocked: appended,
    };
  }, []);

  const registerTaskCompletionOnce = useCallback(
    (stats: any, taskId: number, atIso: string, meta?: any) => {
      const id = Number(taskId);
      if (!Number.isFinite(id)) return stats;
      const prevIds: number[] = Array.isArray(stats?.completedTaskIds)
        ? (stats.completedTaskIds as any[]).map((v) => Number(v)).filter((n) => Number.isFinite(n))
        : [];
      if (prevIds.some((x) => Number(x) === id)) return stats;

      const nextIds = [...prevIds, id].slice(
        Math.max(0, prevIds.length + 1 - MAX_COMPLETED_TASK_IDS)
      );
      let nextStats = {
        ...stats,
        tasksCompleted: Number(stats?.tasksCompleted ?? 0) + 1,
        completedTaskIds: nextIds,
      };

      // Task completion grants XP (Phase 2 spec)
      nextStats = grantXp(nextStats, {
        amount: XP_PER_TASK_COMPLETION,
        source: 'task_completed',
        at: atIso,
        meta: { taskId: id, ...(meta || {}) },
      });

      return nextStats;
    },
    [MAX_COMPLETED_TASK_IDS, XP_PER_TASK_COMPLETION, grantXp]
  );

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

  const recomputePillarDerivedFields = useCallback((pillar: Pillar): Pillar => {
    const now = new Date().toISOString();
    const tasks = Array.isArray((pillar as any).tasks) ? ((pillar as any).tasks as any[]) : [];
    const totalTasks = tasks.length;

    if (totalTasks === 0) {
      return {
        ...pillar,
        completion: 0,
        // With no tasks, this goal is not "in progress" yet.
        status: (pillar as any).status === 'done' ? 'done' : 'not_started',
        ninety_percent_alert: false,
        last_activity_date: now,
      } as Pillar;
    }

    const doneTasks = tasks.filter(
      (t) => t && (t.status === 'done' || Number(t.progress) === 100)
    ).length;
    const completion = Math.round((doneTasks / totalTasks) * 100);

    // Anti‑90%: treat 70–99% unfinished as needing attention (stuck alert)
    const stuckTasks = tasks.filter(
      (t) => t && Number(t.progress) >= 70 && Number(t.progress) < 100 && t.status !== 'done'
    ).length;
    const ninety_percent_alert = stuckTasks > 0;

    const status: Pillar['status'] =
      completion === 100 ? 'done' : totalTasks > 0 ? 'in_progress' : 'not_started';

    return {
      ...pillar,
      completion,
      status,
      ninety_percent_alert,
      last_activity_date: now,
    } as Pillar;
  }, []);

  // Computed (CRITICAL): count stuck TASKS (not pillars), only in active goals
  const stuckCount = useMemo(() => {
    const pillars = Array.isArray(data?.pillars) ? (data.pillars as any[]) : [];
    return pillars.reduce((count, p) => {
      const activation = (p?.activation ?? 'active') as string;
      if (activation !== 'active') return count;
      if (p?.status === 'done') return count;
      const tasks = Array.isArray(p?.tasks) ? (p.tasks as any[]) : [];
      const stuckTasks = tasks.filter(
        (t) => t && Number(t.progress) >= 70 && Number(t.progress) < 100 && t.status !== 'done'
      ).length;
      return count + stuckTasks;
    }, 0);
  }, [data?.pillars]);

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
        let didCompleteTask = false;
        let didLevelUp = false;
        let unlockedBadges: Array<{ achievementId: string; unlockedAt: string; reason?: string }> =
          [];

        setData((prev) => {
          const statsBefore = getSafeUserStats(prev);
          const levelBefore = Number(statsBefore?.level ?? 1) || 1;

          const newPillars = prev.pillars.map((pillar) => {
            const tasks = Array.isArray((pillar as any).tasks)
              ? ((pillar as any).tasks as any[])
              : [];
            const contains = tasks.some(
              (t) => t && (t.id === taskId || String(t.id) === String(taskId))
            );
            if (!contains) return pillar;

            const updatedTasks = tasks.map((task) => {
              const taskIdMatches = task.id === taskId || String(task.id) === String(taskId);
              if (!taskIdMatches) return task;

              const wasDone = isTaskDone(task);
              const updatedTask = updateTaskProgressWithHistory(task, targetProgress);
              const willBeDone = isTaskDone(updatedTask);
              if (!wasDone && willBeDone) didCompleteTask = true;
              if (targetProgress >= 90 && targetProgress < 100) {
                updatedTask.stuckAtNinety = detectStuckAt90(updatedTask);
              } else if (targetProgress === 100) {
                updatedTask.stuckAtNinety = false;
              }
              return updatedTask;
            });

            return recomputePillarDerivedFields({ ...(pillar as any), tasks: updatedTasks } as any);
          });

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

          const nowIso = new Date().toISOString();
          const prevStats = getSafeUserStats(prev);
          let nextStats = prevStats;
          if (didCompleteTask) {
            nextStats = grantDailyBonusIfNeeded(nextStats, nowIso);
            nextStats = registerTaskCompletionOnce(nextStats, Number(taskId), nowIso);
          }
          const levelAfter = Number(nextStats?.level ?? 1) || 1;
          didLevelUp = levelAfter > levelBefore;

          const achievementResult = applyAchievementUnlocks(prevStats, nextStats);
          nextStats = achievementResult.nextStats;
          unlockedBadges = achievementResult.newlyUnlocked;

          return {
            ...prev,
            pillars: newPillars,
            insights: newInsights,
            userStats: nextStats,
          };
        });

        // Feedback (only on explicit user action).
        const g = (data as any)?.settings?.gamification ?? {
          soundEnabled: true,
          hapticsEnabled: true,
        };
        if (didCompleteTask) {
          triggerTaskCompleteFeedback({
            soundEnabled: Boolean(g.soundEnabled),
            hapticsEnabled: Boolean(g.hapticsEnabled),
          });
        }
        if (didLevelUp) {
          triggerLevelUpFeedback({
            soundEnabled: Boolean(g.soundEnabled),
            hapticsEnabled: Boolean(g.hapticsEnabled),
          });
        }
        if (unlockedBadges.length > 0) {
          // Show only the first one to avoid spam.
          const info = getBadgeInfo(String(unlockedBadges[0].achievementId || ''));
          const desc = info.desc ? ` — ${info.desc}` : '';
          showSuccess(`🏅 ${info.icon} ${info.title}${desc}`, 4000);
        }

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
    [
      data.pillars,
      getSafeUserStats,
      grantDailyBonusIfNeeded,
      applyAchievementUnlocks,
      isTaskDone,
      recomputePillarDerivedFields,
      registerTaskCompletionOnce,
    ]
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
      intentionData?: Pick<ImplementationIntention, 'trigger' | 'action' | 'active'>
    ): Promise<void> => {
      try {
        // Update local state
        setData((prev) => {
          const nextPillars = prev.pillars.map((pillar) => {
            const tasks = Array.isArray((pillar as any).tasks)
              ? ((pillar as any).tasks as any[])
              : [];
            const contains = tasks.some((t) => t && Number(t.id) === Number(taskId));
            if (!contains) return pillar;

            const updatedTasks = tasks.map((task) => {
              if (Number(task.id) !== Number(taskId)) return task;
              return {
                ...task,
                implementationIntention: {
                  trigger: intentionData?.trigger || task.implementationIntention?.trigger || '',
                  action: intentionData?.action || task.implementationIntention?.action || '',
                  active: intentionData?.active ?? true,
                  lastTriggered: new Date().toISOString(),
                },
              };
            });

            return recomputePillarDerivedFields({ ...(pillar as any), tasks: updatedTasks } as any);
          });

          return { ...prev, pillars: nextPillars };
        });
      } catch (error) {
        console.error('Failed to activate implementation intention:', error);
        throw error; // Re-throw to handle in component
      }
    },
    [recomputePillarDerivedFields]
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
      setData((prev) => {
        let didCompleteTask = false;

        const nextPillars = prev.pillars.map((pillar) => {
          const tasks = Array.isArray((pillar as any).tasks)
            ? ((pillar as any).tasks as any[])
            : [];
          const contains = tasks.some((t) => t && Number(t.id) === Number(taskId));
          if (!contains) return pillar;

          const updatedTasks = tasks.map((task) => {
            if (Number(task.id) !== Number(taskId)) return task;

            let nextTask = task;
            const wasDone = isTaskDone(task);

            if (updates.progress !== undefined) {
              nextTask = updateTaskProgressWithHistory(nextTask, updates.progress);
            }

            if (updates.status !== undefined) {
              nextTask = { ...nextTask, status: updates.status };
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

            const willBeDone = isTaskDone(nextTask);
            if (!wasDone && willBeDone) didCompleteTask = true;
            return nextTask;
          });

          return recomputePillarDerivedFields({ ...(pillar as any), tasks: updatedTasks } as any);
        });

        const nowIso = new Date().toISOString();
        const prevStats = getSafeUserStats(prev);
        let nextStats = prevStats;
        if (didCompleteTask) {
          nextStats = grantDailyBonusIfNeeded(nextStats, nowIso);
          nextStats = registerTaskCompletionOnce(nextStats, Number(taskId), nowIso);
        }

        return { ...prev, pillars: nextPillars, userStats: nextStats };
      });
    },
    [
      getSafeUserStats,
      grantDailyBonusIfNeeded,
      isTaskDone,
      recomputePillarDerivedFields,
      registerTaskCompletionOnce,
    ]
  );

  const startFinishSession = useCallback(
    (taskId: number, pillarId: number, meta?: { microStep?: string }) => {
      const now = new Date().toISOString();
      const microStep = (() => {
        const s = typeof meta?.microStep === 'string' ? meta.microStep.trim() : '';
        return s ? s.slice(0, 200) : undefined;
      })();
      const newSession: FinishSession = {
        id: createFinishSessionId(),
        taskId,
        pillarId,
        startTime: now,
        endTime: null,
        status: 'in_progress',
        ...(microStep ? { microStep } : {}),
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

        // Update declaration status to 'in_progress' if exists
        const declarations = Array.isArray((prev as any).declarations)
          ? (prev as any).declarations
          : [];
        const updatedDeclarations = declarations.map((d: any) => {
          if (
            d.taskId === taskId &&
            d.goalId === pillarId &&
            (d.status === 'pending' || d.status === 'active')
          ) {
            return {
              ...d,
              status: 'in_progress',
              startedAt: d.startedAt || now,
            };
          }
          return d;
        });

        return {
          ...prev,
          currentFinishSession: newSession,
          finishSessionsHistory: nextHistory,
          declarations: updatedDeclarations,
        } as AppData;
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

      let didLevelUp = false;
      let unlockedBadges: Array<{ achievementId: string; unlockedAt: string; reason?: string }> =
        [];
      setData((prev) => {
        const current = (prev as any).currentFinishSession as FinishSession | null | undefined;
        if (!current || current.id !== sessionId) {
          return prev;
        }

        const didCompleteSession = payload.status === 'completed';
        const focusMinutes = (() => {
          if (!didCompleteSession) return 0;
          const startMs = new Date(current.startTime).getTime();
          const endMs = new Date(now).getTime();
          if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
          return Math.max(0, Math.floor((endMs - startMs) / 60000));
        })();

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

        const prevTask =
          prev.pillars
            .find((p: any) => Number(p.id) === Number(current.pillarId))
            ?.tasks?.find((t: any) => Number(t.id) === Number(current.taskId)) ?? null;
        const wasTaskDone = isTaskDone(prevTask);

        const nextPillars = classification
          ? prev.pillars.map((pillar) => {
              if (pillar.id !== current.pillarId) return pillar;

              const updatedTasks = pillar.tasks.map((task) => {
                if (task.id !== current.taskId) return task;

                const cls = classification.status;

                // DONE implies progress=100 + completion timestamp.
                if (cls === 'done') {
                  const progressed = updateTaskProgressWithHistory(task, 100);
                  return {
                    ...progressed,
                    status: 'done',
                    completedAt: task.completedAt ?? now,
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
              });

              return recomputePillarDerivedFields({
                ...(pillar as any),
                tasks: updatedTasks,
              } as any);
            })
          : prev.pillars;

        const nextTask =
          nextPillars
            .find((p: any) => Number(p.id) === Number(current.pillarId))
            ?.tasks?.find((t: any) => Number(t.id) === Number(current.taskId)) ?? null;
        const willBeTaskDone = isTaskDone(nextTask);
        const didCompleteTask = !wasTaskDone && willBeTaskDone;

        // Update declaration status if task is completed
        const declarations = Array.isArray((prev as any).declarations)
          ? (prev as any).declarations
          : [];
        let updatedDeclarations = declarations;

        if (payload.status === 'completed') {
          // Find declaration for this task
          const declaration = declarations.find(
            (d: any) => d.taskId === current.taskId && d.goalId === current.pillarId
          );

          if (declaration && declaration.status !== 'completed') {
            // Check if task is actually completed (progress >= 100 or status === 'done')
            const pillar = nextPillars.find((p: any) => p.id === current.pillarId);
            const task = pillar?.tasks?.find((t: any) => t.id === current.taskId);

            const isTaskCompleted =
              task &&
              (task.progress >= 100 || task.status === 'done' || task.status === 'completed');

            if (isTaskCompleted) {
              // Check Done Criteria if defined
              const doneCriteria = declaration.doneCriteria || [];
              const allCriteriaMet =
                doneCriteria.length === 0 || doneCriteria.every((c: any) => c.completed === true);

              if (allCriteriaMet) {
                updatedDeclarations = declarations.map((d: any) => {
                  if (d.id === declaration.id) {
                    return {
                      ...d,
                      status: 'completed',
                      completedAt: d.completedAt || now,
                    };
                  }
                  return d;
                });
              }
            }
          }
        }

        const prevStats = getSafeUserStats(prev);
        const levelBefore = Number(prevStats?.level ?? 1) || 1;
        let nextStats = prevStats;

        // If something meaningful happened today, grant daily bonus once.
        if (didCompleteSession || didCompleteTask) {
          nextStats = grantDailyBonusIfNeeded(nextStats, now);
        }

        // Task completion (only once lifetime) + task XP
        if (didCompleteTask) {
          nextStats = registerTaskCompletionOnce(nextStats, Number(current.taskId), now, {
            pillarId: Number(current.pillarId),
          });
        }

        if (didCompleteSession) {
          // Focus XP
          if (focusMinutes > 0) {
            nextStats = grantXp(nextStats, {
              amount: focusMinutes * XP_PER_FOCUS_MINUTE,
              source: 'finish_session_minutes',
              at: now,
              meta: {
                sessionId: String(sessionId),
                taskId: Number(current.taskId),
                pillarId: Number(current.pillarId),
                minutes: focusMinutes,
              },
            });
          }

          // Session counters + streaks
          const streakDays = computeMainGoalStreakDaysFromHistory(
            nextPillars,
            nextHistory,
            new Date(now)
          );
          const longest = Math.max(Number(nextStats.longestStreakDays ?? 0), streakDays);
          const lastActivityDate = toLocalDateKey(new Date(now));

          nextStats = {
            ...nextStats,
            totalFocusMinutes: Number(nextStats.totalFocusMinutes ?? 0) + focusMinutes,
            finishSessionsCompleted: Number(nextStats.finishSessionsCompleted ?? 0) + 1,
            currentStreakDays: streakDays,
            longestStreakDays: longest,
            lastActivityDate,
          };
        }

        // Safety: keep nextLevelXp coherent even if older data had it missing.
        const coercedLevel = computeLevelFromXp(Number(nextStats.xp ?? 0));
        const coercedNextLevelXp = computeNextLevelXp(Number(nextStats.xp ?? 0), coercedLevel);
        nextStats = { ...nextStats, level: coercedLevel, nextLevelXp: coercedNextLevelXp };

        const levelAfter = Number(nextStats?.level ?? 1) || 1;
        didLevelUp = levelAfter > levelBefore;

        const achievementResult = applyAchievementUnlocks(prevStats, nextStats);
        nextStats = achievementResult.nextStats;
        unlockedBadges = achievementResult.newlyUnlocked;

        const nextStatsWithLedger = nextStats;

        const nextLegacyUser = didCompleteSession
          ? {
              ...prev.user,
              streak: Number(
                (nextStatsWithLedger as any).currentStreakDays ?? prev.user.streak ?? 0
              ),
            }
          : prev.user;

        return {
          ...prev,
          currentFinishSession: null,
          finishSessionsHistory: nextHistory,
          pillars: nextPillars,
          declarations: updatedDeclarations,
          user: nextLegacyUser,
          userStats: nextStatsWithLedger,
        } as AppData;
      });

      // Feedback: level-up fanfare (user pressed a button).
      if (didLevelUp) {
        const g = (data as any)?.settings?.gamification ?? {
          soundEnabled: true,
          hapticsEnabled: true,
        };
        triggerLevelUpFeedback({
          soundEnabled: Boolean(g.soundEnabled),
          hapticsEnabled: Boolean(g.hapticsEnabled),
        });
      }
      if (unlockedBadges.length > 0) {
        const info = getBadgeInfo(String(unlockedBadges[0].achievementId || ''));
        const desc = info.desc ? ` — ${info.desc}` : '';
        showSuccess(`🏅 ${info.icon} ${info.title}${desc}`, 4000);
      }
    },
    [
      XP_PER_FOCUS_MINUTE,
      computeLevelFromXp,
      computeMainGoalStreakDaysFromHistory,
      computeNextLevelXp,
      getSafeUserStats,
      grantDailyBonusIfNeeded,
      grantXp,
      applyAchievementUnlocks,
      isTaskDone,
      recomputePillarDerivedFields,
      registerTaskCompletionOnce,
      setData,
      toLocalDateKey,
    ]
  );

  const handleUpdateSettings = useCallback((updates: Partial<AppData['settings']>) => {
    setData((prev) => {
      const nextAi = {
        ...((prev.settings as any)?.ai ?? {}),
        ...((updates as any)?.ai ?? {}),
      };

      // SECURITY: API key lives in secureStorage, not in AppData exports.
      if (typeof nextAi?.apiKey === 'string') {
        nextAi.apiKey = '';
      }

      return {
        ...prev,
        settings: { ...prev.settings, ...updates, ai: nextAi },
      };
    });
  }, []);

  const handleUpdateChatHistory = useCallback((history: AppData['aiChatHistory']) => {
    setData((prev) => ({
      ...prev,
      aiChatHistory: history,
    }));
  }, []);

  const [aiStatus, setAiStatus] = useState<{
    state: 'online' | 'offline' | 'disabled';
    updatedAt: string | null;
  }>(() => ({
    state: data?.settings?.ai?.enabled ? 'offline' : 'disabled',
    updatedAt: null,
  }));

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
          const next = [
            ...prevHistory,
            { id: makeId(), role: 'assistant', content: err, timestamp: now },
          ];
          const MAX = 120;
          return { ...prev, aiChatHistory: next.slice(Math.max(0, next.length - MAX)) };
        });
        return;
      }

      const message = (validation.sanitized || '').trim();
      if (!message) return;

      const now = new Date().toISOString();
      const makeId = () => `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const MAX_GLOBAL = 120;
      const MAX_PER_GOAL = 120;

      // Build prompt based on a local snapshot (includes the user's new message).
      const snapshot = (() => {
        const d = data;
        const activeId = activeProjectId;
        const pillarId =
          activeId ?? (d.pillars.find((p: any) => p.type === 'main') as any)?.id ?? null;

        const userMsg = { id: makeId(), role: 'user', content: message, timestamp: now };

        const prevGlobal = Array.isArray((d as any).aiChatHistory) ? (d as any).aiChatHistory : [];
        const nextGlobal = [...prevGlobal, userMsg].slice(
          Math.max(0, prevGlobal.length + 1 - MAX_GLOBAL)
        );

        const nextPillars = Array.isArray((d as any).pillars)
          ? (d as any).pillars.map((p: any) => {
              if (!pillarId || Number(p?.id) !== Number(pillarId)) return p;
              const existing = p?.aiContext || {};
              const history = Array.isArray(existing.conversationHistory)
                ? existing.conversationHistory
                : [];
              const nextHistory = [...history, userMsg].slice(
                Math.max(0, history.length + 1 - MAX_PER_GOAL)
              );
              return {
                ...p,
                aiContext: {
                  ...(existing || {}),
                  tone: (existing.tone ?? p.aiTone ?? 'psychoeducation') as any,
                  conversationHistory: nextHistory,
                },
              };
            })
          : [];

        const dForPrompt = {
          ...(d as any),
          aiChatHistory: nextGlobal,
          pillars: nextPillars,
        } as AppData;

        return { d: dForPrompt, pillarId, userMsg };
      })();

      // Optimistically persist the user's message both globally (legacy) and per-goal.
      setData((prev) => {
        const prevGlobal = Array.isArray((prev as any).aiChatHistory)
          ? (prev as any).aiChatHistory
          : [];
        const nextGlobal = [...prevGlobal, snapshot.userMsg].slice(
          Math.max(0, prevGlobal.length + 1 - MAX_GLOBAL)
        );

        const pillarId = snapshot.pillarId;
        const nextPillars = Array.isArray((prev as any).pillars)
          ? (prev as any).pillars.map((p: any) => {
              if (!pillarId || Number(p?.id) !== Number(pillarId)) return p;
              const existing = p?.aiContext || {};
              const history = Array.isArray(existing.conversationHistory)
                ? existing.conversationHistory
                : [];
              const nextHistory = [...history, snapshot.userMsg].slice(
                Math.max(0, history.length + 1 - MAX_PER_GOAL)
              );
              return {
                ...p,
                aiContext: {
                  ...(existing || {}),
                  tone: (existing.tone ?? p.aiTone ?? 'psychoeducation') as any,
                  conversationHistory: nextHistory,
                },
              };
            })
          : [];

        return { ...(prev as any), aiChatHistory: nextGlobal, pillars: nextPillars } as AppData;
      });

      // If AI is disabled in settings, return a deterministic response.
      const aiEnabled = Boolean((snapshot.d as any)?.settings?.ai?.enabled);
      let assistantText: string | null = null;

      if (!aiEnabled) {
        setAiStatus({ state: 'disabled', updatedAt: new Date().toISOString() });
        assistantText =
          'AI jest wyłączone. Otwórz Ustawienia (⚙) → Asystent AI → włącz wsparcie AI i ustaw klucz API.';
      } else {
        const apiKey =
          secureStorage.getApiKey() ||
          String((snapshot.d as any)?.settings?.ai?.apiKey ?? '').trim();
        if (!apiKey) {
          setAiStatus({ state: 'offline', updatedAt: new Date().toISOString() });
          assistantText =
            'AI jest włączone, ale brakuje klucza API. Otwórz Ustawienia (⚙) → Asystent AI → wklej klucz API.';
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
        const assistantMsg = {
          id: makeId(),
          role: 'assistant',
          content: assistantText as string,
          timestamp: new Date().toISOString(),
        };

        const prevGlobal = Array.isArray((prev as any).aiChatHistory)
          ? (prev as any).aiChatHistory
          : [];
        const nextGlobal = [...prevGlobal, assistantMsg].slice(
          Math.max(0, prevGlobal.length + 1 - MAX_GLOBAL)
        );

        const pillarId = snapshot.pillarId;
        const nextPillars = Array.isArray((prev as any).pillars)
          ? (prev as any).pillars.map((p: any) => {
              if (!pillarId || Number(p?.id) !== Number(pillarId)) return p;
              const existing = p?.aiContext || {};
              const history = Array.isArray(existing.conversationHistory)
                ? existing.conversationHistory
                : [];
              const nextHistory = [...history, assistantMsg].slice(
                Math.max(0, history.length + 1 - MAX_PER_GOAL)
              );
              return {
                ...p,
                aiContext: {
                  ...(existing || {}),
                  tone: (existing.tone ?? p.aiTone ?? 'psychoeducation') as any,
                  conversationHistory: nextHistory,
                },
              };
            })
          : [];

        return { ...(prev as any), aiChatHistory: nextGlobal, pillars: nextPillars } as AppData;
      });
    },
    [activeProjectId, data]
  );

  /**
   * Goal Strategist chat (new chat): per-goal history + per-goal context.
   * ARCH: 1 agent = 1 source of truth config => Pillar.aiContext (customInstructions + conversationHistory).
   * responseMode is UI-only; not persisted in types.ts (optional localStorage in UI).
   */
  const sendGoalChatMessage = useCallback(
    async (payload: {
      goalId: number;
      message: string;
      responseMode: 'strict' | 'psycho' | 'facts';
    }) => {
      const goalId = Number(payload.goalId);
      if (!Number.isFinite(goalId)) return;

      const validation = validateChatMessage(payload.message);
      if (!validation.isValid) {
        const err = validation.error || 'Invalid message';
        // Best-effort: append assistant error only to this goal history (do not touch global legacy history).
        setData((prev) => {
          const now = new Date().toISOString();
          const makeId = () => `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
          const assistantMsg = { id: makeId(), role: 'assistant', content: err, timestamp: now };
          const MAX_PER_GOAL = 120;

          const nextPillars = Array.isArray((prev as any).pillars)
            ? (prev as any).pillars.map((p: any) => {
                if (Number(p?.id) !== goalId) return p;
                const existing = p?.aiContext || {};
                const history = Array.isArray(existing.conversationHistory)
                  ? existing.conversationHistory
                  : [];
                const nextHistory = [...history, assistantMsg].slice(
                  Math.max(0, history.length + 1 - MAX_PER_GOAL)
                );
                return {
                  ...p,
                  aiContext: {
                    ...(existing || {}),
                    tone: (existing.tone ?? p.aiTone ?? 'psychoeducation') as any,
                    conversationHistory: nextHistory,
                  },
                };
              })
            : [];

          return { ...(prev as any), pillars: nextPillars } as AppData;
        });
        return;
      }

      const message = (validation.sanitized || '').trim();
      if (!message) return;

      const now = new Date().toISOString();
      const makeId = () => `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const MAX_PER_GOAL = 120;

      // Build prompt based on a local snapshot (includes the user's new message).
      const snapshot = (() => {
        const d = data;
        const userMsg = { id: makeId(), role: 'user', content: message, timestamp: now };

        const nextPillars = Array.isArray((d as any).pillars)
          ? (d as any).pillars.map((p: any) => {
              if (Number(p?.id) !== goalId) return p;
              const existing = p?.aiContext || {};
              const history = Array.isArray(existing.conversationHistory)
                ? existing.conversationHistory
                : [];
              const nextHistory = [...history, userMsg].slice(
                Math.max(0, history.length + 1 - MAX_PER_GOAL)
              );
              return {
                ...p,
                aiContext: {
                  ...(existing || {}),
                  tone: (existing.tone ?? p.aiTone ?? 'psychoeducation') as any,
                  conversationHistory: nextHistory,
                },
              };
            })
          : [];

        const dForPrompt = {
          ...(d as any),
          pillars: nextPillars,
        } as AppData;

        return { d: dForPrompt, userMsg };
      })();

      // Optimistically persist the user's message for this goal.
      setData((prev) => {
        const nextPillars = Array.isArray((prev as any).pillars)
          ? (prev as any).pillars.map((p: any) => {
              if (Number(p?.id) !== goalId) return p;
              const existing = p?.aiContext || {};
              const history = Array.isArray(existing.conversationHistory)
                ? existing.conversationHistory
                : [];
              const nextHistory = [...history, snapshot.userMsg].slice(
                Math.max(0, history.length + 1 - MAX_PER_GOAL)
              );
              return {
                ...p,
                aiContext: {
                  ...(existing || {}),
                  tone: (existing.tone ?? p.aiTone ?? 'psychoeducation') as any,
                  conversationHistory: nextHistory,
                },
              };
            })
          : [];

        return { ...(prev as any), pillars: nextPillars } as AppData;
      });

      // Determine if AI is enabled.
      const aiEnabled = Boolean((snapshot.d as any)?.settings?.ai?.enabled);
      let assistantText: string | null = null;

      if (!aiEnabled) {
        setAiStatus({ state: 'disabled', updatedAt: new Date().toISOString() });
        assistantText =
          'AI jest wyłączone. Otwórz Ustawienia (⚙) → Asystent AI → włącz wsparcie AI i ustaw klucz API.';
      } else {
        const apiKey =
          secureStorage.getApiKey() ||
          String((snapshot.d as any)?.settings?.ai?.apiKey ?? '').trim();
        if (!apiKey) {
          setAiStatus({ state: 'offline', updatedAt: new Date().toISOString() });
          assistantText =
            'AI jest włączone, ale brakuje klucza API. Otwórz Ustawienia (⚙) → Asystent AI → wklej klucz API.';
        } else {
          const prompt = buildGoalStrategistChatPrompt({
            data: snapshot.d,
            goalId,
            message,
            responseMode: payload.responseMode,
          });

          assistantText = await providerGenerateText(
            { apiKey, prompt, temperature: 0.55, maxTokens: 900, maxLen: 1200 },
            { timeoutMs: API_REQUEST_TIMEOUT_MS }
          );

          if (!assistantText) {
            setAiStatus({ state: 'offline', updatedAt: new Date().toISOString() });
            assistantText =
              'AI niedostępne (provider offline / timeout). Mikrokrok: wybierz 1 zadanie z tego celu i dopisz 3 punkty Definicji DONE.';
          } else {
            setAiStatus({ state: 'online', updatedAt: new Date().toISOString() });
          }
        }
      }

      // Append assistant response to this goal history.
      setData((prev) => {
        const assistantMsg = {
          id: makeId(),
          role: 'assistant',
          content: (assistantText as string) || '',
          timestamp: new Date().toISOString(),
        };

        const nextPillars = Array.isArray((prev as any).pillars)
          ? (prev as any).pillars.map((p: any) => {
              if (Number(p?.id) !== goalId) return p;
              const existing = p?.aiContext || {};
              const history = Array.isArray(existing.conversationHistory)
                ? existing.conversationHistory
                : [];
              const nextHistory = [...history, assistantMsg].slice(
                Math.max(0, history.length + 1 - MAX_PER_GOAL)
              );
              return {
                ...p,
                aiContext: {
                  ...(existing || {}),
                  tone: (existing.tone ?? p.aiTone ?? 'psychoeducation') as any,
                  conversationHistory: nextHistory,
                },
              };
            })
          : [];

        return { ...(prev as any), pillars: nextPillars } as AppData;
      });
    },
    [data]
  );

  const clearGoalAIHistory = useCallback((goalId: number) => {
    const id = Number(goalId);
    if (!Number.isFinite(id)) return;

    setData((prev) => {
      const nextPillars = (prev.pillars || []).map((p: any) => {
        if (Number(p?.id) !== id) return p;
        const existing = p?.aiContext || {};
        const tone = (existing.tone ?? p.aiTone ?? 'psychoeducation') as any;
        return {
          ...p,
          aiContext: {
            ...(existing || {}),
            tone,
            conversationHistory: [],
          },
        };
      });
      return { ...prev, pillars: nextPillars } as AppData;
    });
  }, []);

  // ============================================================================
  // GOALS / PILLARS (D-003, D-031) - minimal helpers
  // ============================================================================

  const createPillar = useCallback(
    (payload: {
      name: string;
      description?: string;
      type?: 'main' | 'secondary' | 'lab';
      strategy?: string | GoalStrategy;
      strategyText?: string;
      aiTone?: 'military' | 'psychoeducation' | 'raw_facts';
      aiCustomInstructions?: string;
    }) => {
      const name = payload.name?.trim();
      if (!name) return;

      setData((prev) => {
        // D-003: max 3 active goals (finish-first)
        // We treat "active" as: status !== 'done' AND activation === 'active'.
        const maxActive = Number((prev as any)?.settings?.goals?.maxActive ?? 3) || 3;
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
        const tone: GoalAiTone = (payload.aiTone ?? 'psychoeducation') as any;
        const customInstructions =
          typeof payload.aiCustomInstructions === 'string'
            ? payload.aiCustomInstructions.trim()
            : '';

        const legacyStrategyText =
          typeof payload.strategyText === 'string'
            ? payload.strategyText.trim()
            : typeof payload.strategy === 'string'
              ? payload.strategy.trim()
              : '';

        const strategyObj: GoalStrategy =
          payload.strategy && typeof payload.strategy === 'object'
            ? payload.strategy
            : {
                vision: '',
                successCriteria: [],
                milestones: [],
                ifThenPlans: [],
                obstacles: [],
                aiContext: { tone, ...(customInstructions ? { customInstructions } : {}) },
              };

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
          strategy: strategyObj,
          ...(legacyStrategyText ? { strategyText: legacyStrategyText } : {}),
          aiTone: tone,
          aiContext: {
            tone,
            ...(customInstructions ? { customInstructions } : {}),
            conversationHistory: [],
          },
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
        strategy: string | GoalStrategy;
        strategyText: string;
        aiTone: 'military' | 'psychoeducation' | 'raw_facts';
        activation: 'active' | 'backlog';
        aiContext: Partial<GoalAIContext>;
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
          const targetAlreadyActive = Boolean(
            target && (target.activation ?? 'active') === 'active'
          );

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

            const validAiTones = new Set(['military', 'psychoeducation', 'raw_facts']);

            const nextAiTone: GoalAiTone =
              updates.aiTone !== undefined
                ? (updates.aiTone as any)
                : (p.aiTone as any) || (p.aiContext as any)?.tone || 'psychoeducation';

            const nextAiContext: GoalAIContext = (() => {
              const existing: any = p.aiContext || {};
              const existingHistory = Array.isArray(existing.conversationHistory)
                ? existing.conversationHistory
                : [];
              const merged = { ...existing, ...(updates.aiContext ?? {}) };
              const customInstructions =
                typeof merged.customInstructions === 'string'
                  ? merged.customInstructions
                  : undefined;
              return {
                tone: validAiTones.has(merged.tone) ? merged.tone : nextAiTone,
                ...(customInstructions ? { customInstructions } : {}),
                conversationHistory: existingHistory,
              };
            })();

            const nextStrategyText =
              updates.strategyText !== undefined
                ? String(updates.strategyText)
                : typeof updates.strategy === 'string'
                  ? String(updates.strategy)
                  : (p as any).strategyText;

            const nextStrategy: GoalStrategy = (() => {
              const existing =
                p.strategy && typeof p.strategy === 'object' ? (p.strategy as any) : null;

              if (updates.strategy && typeof updates.strategy === 'object') {
                return updates.strategy;
              }

              // If caller only provided legacy string, keep existing structured object (or create default)
              if (existing) {
                const sAi =
                  existing.aiContext && typeof existing.aiContext === 'object'
                    ? existing.aiContext
                    : {};
                return {
                  vision: typeof existing.vision === 'string' ? existing.vision : '',
                  successCriteria: Array.isArray(existing.successCriteria)
                    ? existing.successCriteria
                    : [],
                  milestones: Array.isArray(existing.milestones) ? existing.milestones : [],
                  ifThenPlans: Array.isArray(existing.ifThenPlans) ? existing.ifThenPlans : [],
                  obstacles: Array.isArray(existing.obstacles) ? existing.obstacles : [],
                  aiContext: {
                    tone: validAiTones.has(sAi.tone) ? sAi.tone : nextAiTone,
                    ...(typeof sAi.customInstructions === 'string'
                      ? { customInstructions: sAi.customInstructions }
                      : nextAiContext.customInstructions
                        ? { customInstructions: nextAiContext.customInstructions }
                        : {}),
                  },
                };
              }

              return {
                vision: '',
                successCriteria: [],
                milestones: [],
                ifThenPlans: [],
                obstacles: [],
                aiContext: {
                  tone: nextAiTone,
                  ...(nextAiContext.customInstructions
                    ? { customInstructions: nextAiContext.customInstructions }
                    : {}),
                },
              };
            })();

            return {
              ...p,
              ...(updates.name !== undefined ? { name: updates.name } : {}),
              ...(updates.description !== undefined ? { description: updates.description } : {}),
              ...(updates.type !== undefined ? { type: updates.type } : {}),
              ...(updates.strategy !== undefined ? { strategy: nextStrategy } : {}),
              ...(nextStrategyText !== undefined ? { strategyText: nextStrategyText } : {}),
              ...(updates.aiTone !== undefined ? { aiTone: updates.aiTone } : {}),
              ...(updates.activation !== undefined ? { activation: updates.activation } : {}),
              ...(updates.aiContext !== undefined ? { aiContext: nextAiContext } : {}),
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

      const apiKey =
        secureStorage.getApiKey() || String((data as any)?.settings?.ai?.apiKey ?? '').trim();

      try {
        const name =
          String(task?.name ?? '')
            .trim()
            .slice(0, 140) || 'zadaniu';
        const progress = Math.max(0, Math.min(100, Math.round(Number(task?.progress ?? 0) || 0)));
        const done = String(task?.definitionOfDone ?? '')
          .trim()
          .slice(0, 140);

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
          setData((prev) => {
            const nextPillars = prev.pillars.map((p) => {
              const tasks = Array.isArray((p as any).tasks) ? ((p as any).tasks as any[]) : [];
              const contains = tasks.some((t) => t && Number(t.id) === Number(task.id));
              if (!contains) return p;

              const updatedTasks = tasks.map((t) =>
                t.id === task.id ? { ...(t as any), aiNudge, aiNudgeGeneratedAt: now } : t
              );

              return recomputePillarDerivedFields({ ...(p as any), tasks: updatedTasks } as any);
            });

            return { ...prev, pillars: nextPillars };
          });
        }
      } catch (error) {
        console.warn('AI nudge generation failed (provider), skipped:', error);
      }
    },
    [data, recomputePillarDerivedFields]
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
    recomputePillarDerivedFields,

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
    sendGoalChatMessage,
    clearGoalAIHistory,
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
