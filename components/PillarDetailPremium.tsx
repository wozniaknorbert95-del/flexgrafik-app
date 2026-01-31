import React, { useMemo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import type { GoalAiTone, GoalAIContext, GoalStrategy, GoalType, Pillar } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { generateTaskId, calculateTaskStatus } from '../utils/taskHelpers';
import { buildIdeaSuggestionPrompt } from '../utils/aiPrompts';
import { providerGenerateText } from '../utils/aiProvider';
import { showError, showSuccess } from '../utils/toastService';
import { GoalStrategyEditor } from './GoalStrategyEditor';
import { AIToneSelector } from './AIToneSelector';
import { ConfirmDialog } from './common/ConfirmDialog';
import {
  buildGoalStrategyFromImport,
  getStrategyImportTemplateText,
  parseStrategyImportText,
  STRATEGY_IMPORT_DRAFT_STORAGE_KEY,
} from '../utils/strategyImport';
// import { NormalizedSelectors } from '../types/normalized'; // TEMPORARILY DISABLED
// import { OptimisticState } from '../utils/optimisticUpdates'; // TEMPORARILY DISABLED

// Using any to avoid runtime type references

interface PillarDetailProps {
  pillar: Pillar;
  normalizedData?: any; // Phase 2: optional for gradual migration
  optimisticState?: OptimisticState; // Phase 3: optimistic UI state - TEMPORARILY DISABLED
  onBack: () => void;
  onToggleTask: (taskId: number) => Promise<void>; // Phase 3: now async
  onEnterFinishMode: () => void;
}

const PillarDetailPremium: React.FC<PillarDetailProps> = ({
  pillar,
  normalizedData,
  optimisticState,
  onBack,
  onToggleTask,
  onEnterFinishMode,
}) => {
  const {
    data,
    setData,
    recomputePillarDerivedFields,
    updatePillar,
    addReward,
    removeReward,
    getRewardsWithStatus,
    ideas,
  } = useAppContext();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskType, setNewTaskType] = useState<'build' | 'close'>('build');
  const [newTaskDefinitionOfDone, setNewTaskDefinitionOfDone] = useState('');

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingDefinition, setEditingDefinition] = useState('');

  // Goal settings edit UI
  const [isGoalEditOpen, setIsGoalEditOpen] = useState(false);
  const [goalTypeDraft, setGoalTypeDraft] = useState<GoalType>('secondary');
  const [goalToneDraft, setGoalToneDraft] = useState<GoalAiTone>('psychoeducation');
  const [goalStrategyDraft, setGoalStrategyDraft] = useState<GoalStrategy>({
    vision: '',
    successCriteria: [],
    milestones: [],
    ifThenPlans: [],
    obstacles: [],
    structure: undefined,
    tactics: [],
    aiContext: { tone: 'psychoeducation' },
  });
  const [goalStrategyTextDraft, setGoalStrategyTextDraft] = useState('');
  const [goalAiCustomInstructionsDraft, setGoalAiCustomInstructionsDraft] = useState('');
  const [isGeneratingStrategyAI, setIsGeneratingStrategyAI] = useState(false);
  const [strategyAISuggestion, setStrategyAISuggestion] = useState('');

  // Strategy import (paste from external tool)
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string>('');
  const [importPreview, setImportPreview] = useState<{
    visionOk: boolean;
    successCriteria: number;
    milestones: number;
    ifThen: number;
    ifThenActive: number;
    obstacles: number;
    tasks: number;
    tasksWithDoD: number;
    tasksToAdd: number;
    tasksToUpdate: number;
    taskNamesToAdd: string[];
    taskNamesToUpdate: string[];
    taskNamesToRemoveIfReplace: string[];
  } | null>(null);
  const [isImportPreviewDetailsOpen, setIsImportPreviewDetailsOpen] = useState(false);
  const [tasksImportMode, setTasksImportMode] = useState<'merge' | 'replace' | 'strategy_only'>(
    'merge'
  );
  const [isReplaceConfirmOpen, setIsReplaceConfirmOpen] = useState(false);
  const [allowPartialStrategyImport, setAllowPartialStrategyImport] = useState(false);

  // Rewards UI (D-040)
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardType, setRewardType] = useState<'milestone' | 'process'>('process');
  const [rewardKind, setRewardKind] = useState<
    | 'milestone_completion_percent_at_least'
    | 'process_finish_sessions_completed_last_7_days_at_least'
    | 'process_stuck_to_done_last_7_days_at_least'
  >('process_finish_sessions_completed_last_7_days_at_least');
  const [rewardTarget, setRewardTarget] = useState<number>(1);

  // Phase 2: Use normalized data if available, fallback to legacy
  const useNormalized = normalizedData !== null;

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('🏗️ PillarDetail using data format:', useNormalized ? 'NORMALIZED' : 'LEGACY');
  }

  // TEMPORARILY DISABLED: Phase 3 optimistic UI - causing runtime errors
  // TODO: Re-enable after fixing NormalizedSelectors import issues
  const isTaskPending = useCallback((taskId: string) => {
    return false; // Always return false until optimistic UI is fixed
  }, []);

  // TEMPORARILY DISABLED: Phase 2 normalized data - causing runtime errors
  // TODO: Fix NormalizedSelectors import issues in production build
  const pillarData = useMemo(() => {
    // Legacy: direct prop
    return pillar;
  }, [pillar]);

  const pillarTasks = useMemo(() => {
    // Legacy: direct access
    return pillar.tasks || [];
  }, [pillar]);

  const timelineItems = useMemo(() => {
    const normalizeDateKey = (raw: unknown): string | null => {
      const s = typeof raw === 'string' ? raw.trim() : '';
      if (!s) return null;
      // Accept YYYY-MM-DD or full ISO datetime; keep local date key only.
      const key = s.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
      return key;
    };

    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
    const startOfWeekMonday = (d: Date) => {
      const date = new Date(d);
      const day = (date.getDay() + 6) % 7; // Monday=0
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - day);
      return date;
    };
    const weekStart = startOfWeekMonday(today);
    const weekStartIso = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(
      weekStart.getDate()
    ).padStart(2, '0')}`;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndIso = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(
      weekEnd.getDate()
    ).padStart(2, '0')}`;

    const items: Array<{
      kind: 'milestone' | 'task_due';
      dateIso: string;
      title: string;
      meta?: string;
      badge?: string;
      badgeClass: string;
    }> = [];

    const strategy = (pillarData as any)?.strategy;
    const milestones =
      strategy && typeof strategy === 'object' && Array.isArray((strategy as any).milestones)
        ? (strategy as any).milestones
        : [];
    for (const m of milestones) {
      const dateIso = normalizeDateKey((m as any)?.deadline);
      if (!dateIso) continue;
      const title = String((m as any)?.title ?? '').trim() || 'Milestone';
      const status = String((m as any)?.status ?? '').trim();
      const isOverdue = dateIso < todayIso && status !== 'done';
      const isThisWeek = dateIso >= weekStartIso && dateIso <= weekEndIso;
      items.push({
        kind: 'milestone',
        dateIso,
        title,
        meta: String((m as any)?.description ?? '').trim() || undefined,
        badge:
          status === 'done'
            ? 'zrobione'
            : isOverdue
              ? 'po terminie'
              : isThisWeek
                ? 'ten tydzień'
                : 'wkrótce',
        badgeClass:
          status === 'done'
            ? 'bg-green-500/15 border border-green-500/40 text-green-300'
            : isOverdue
              ? 'bg-red-500/15 border border-red-500/40 text-red-200'
              : isThisWeek
                ? 'bg-gold/10 border border-gold/30 text-gold'
                : 'bg-white/5 border border-white/10 text-gray-300',
      });
    }

    for (const t of pillarTasks || []) {
      const dateIso = normalizeDateKey((t as any)?.dueDate);
      if (!dateIso) continue;
      const title = String((t as any)?.name ?? '').trim() || 'Zadanie';
      const isDone =
        Number((t as any)?.progress ?? 0) >= 100 || String((t as any)?.status ?? '') === 'done';
      const isOverdue = dateIso < todayIso && !isDone;
      const isThisWeek = dateIso >= weekStartIso && dateIso <= weekEndIso;
      items.push({
        kind: 'task_due',
        dateIso,
        title,
        meta: isDone ? 'DONE' : undefined,
        badge: isDone ? 'done' : isOverdue ? 'po terminie' : isThisWeek ? 'ten tydzień' : 'termin',
        badgeClass: isDone
          ? 'bg-green-500/15 border border-green-500/40 text-green-300'
          : isOverdue
            ? 'bg-red-500/15 border border-red-500/40 text-red-200'
            : isThisWeek
              ? 'bg-gold/10 border border-gold/30 text-gold'
              : 'bg-white/5 border border-white/10 text-gray-300',
      });
    }

    items.sort((a, b) => a.dateIso.localeCompare(b.dateIso));
    return items;
  }, [pillarData, pillarTasks]);

  const taskTree = useMemo(() => {
    const strategy = (pillarData as any)?.strategy;
    const phases =
      strategy &&
      typeof strategy === 'object' &&
      (strategy as any)?.structure &&
      typeof (strategy as any).structure === 'object'
        ? ((strategy as any).structure.phases as any[])
        : [];

    if (!Array.isArray(phases) || phases.length === 0) return [];

    const byId = new Map<number, any>();
    for (const t of pillarTasks || []) {
      const id = Number((t as any)?.id);
      if (Number.isFinite(id)) byId.set(id, t);
    }

    const sorted = [...phases].filter(Boolean);
    sorted.sort((a, b) => {
      const oa = typeof a?.order === 'number' ? a.order : 9999;
      const ob = typeof b?.order === 'number' ? b.order : 9999;
      if (oa !== ob) return oa - ob;
      return String(a?.title ?? '').localeCompare(String(b?.title ?? ''));
    });

    return sorted.map((ph) => {
      const ids = Array.isArray(ph?.taskIds) ? ph.taskIds : [];
      const tasks = ids.map((id: any) => byId.get(Number(id))).filter(Boolean);
      return { phase: ph, tasks };
    });
  }, [pillarData, pillarTasks]);

  const otherMainPillar = useMemo(() => {
    return data.pillars.find((p) => p.id !== pillar.id && p.type === 'main') || null;
  }, [data.pillars, pillar.id]);

  const openGoalEdit = useCallback(() => {
    setGoalTypeDraft((pillarData.type ?? 'secondary') as GoalType);
    const baseTone =
      ((pillarData as any)?.strategy?.aiContext?.tone as GoalAiTone) ??
      ((pillarData as any)?.aiContext?.tone as GoalAiTone) ??
      ((pillarData as any)?.aiTone as GoalAiTone) ??
      'psychoeducation';
    setGoalToneDraft(baseTone);

    const baseCustom =
      (typeof (pillarData as any)?.aiContext?.customInstructions === 'string'
        ? (pillarData as any).aiContext.customInstructions
        : '') || '';
    setGoalAiCustomInstructionsDraft(baseCustom);

    const legacyText =
      (typeof (pillarData as any)?.strategyText === 'string'
        ? (pillarData as any).strategyText
        : '') ||
      (typeof (pillarData as any)?.strategy === 'string' ? (pillarData as any).strategy : '');
    setGoalStrategyTextDraft(String(legacyText || ''));

    const rawStrategy = (pillarData as any)?.strategy;
    const structured: GoalStrategy =
      rawStrategy && typeof rawStrategy === 'object'
        ? rawStrategy
        : {
            vision: '',
            successCriteria: [],
            milestones: [],
            ifThenPlans: [],
            obstacles: [],
            structure: undefined,
            tactics: [],
            // NOTE: strategy.aiContext is legacy/mirror. We do not edit it in UI.
            aiContext: { tone: baseTone },
          };

    setGoalStrategyDraft({
      ...(structured as any),
      vision: typeof structured.vision === 'string' ? structured.vision : '',
      successCriteria: Array.isArray(structured.successCriteria) ? structured.successCriteria : [],
      milestones: Array.isArray(structured.milestones) ? structured.milestones : [],
      ifThenPlans: Array.isArray(structured.ifThenPlans) ? structured.ifThenPlans : [],
      obstacles: Array.isArray(structured.obstacles) ? structured.obstacles : [],
      structure:
        (structured as any).structure && typeof (structured as any).structure === 'object'
          ? (structured as any).structure
          : undefined,
      tactics: Array.isArray((structured as any).tactics) ? (structured as any).tactics : [],
      aiContext: structured.aiContext,
    });

    setIsGoalEditOpen(true);
    setStrategyAISuggestion('');
  }, [pillarData.aiTone, pillarData.strategy, pillarData.type]);

  const saveGoalEdit = useCallback(() => {
    const trimmedCustom = goalAiCustomInstructionsDraft.trim();
    const nextAiContext: Partial<GoalAIContext> = {
      ...(trimmedCustom ? { customInstructions: trimmedCustom } : {}),
    };

    const nextStrategy: GoalStrategy = {
      ...goalStrategyDraft,
      // strategy.aiContext is deprecated/mirror: do not write customInstructions here to avoid 2 sources of truth.
      aiContext:
        goalStrategyDraft.aiContext && typeof (goalStrategyDraft.aiContext as any) === 'object'
          ? { tone: goalToneDraft }
          : { tone: goalToneDraft },
    };

    // PLAN_v2: minimalna walidacja strategii (żeby nie utrwalać pustych strategii).
    const hasVision = Boolean(String(nextStrategy.vision || '').trim());
    const criteria = Array.isArray(nextStrategy.successCriteria)
      ? nextStrategy.successCriteria
      : [];
    const hasAtLeastOneCriterion = criteria.some(
      (c) => String((c as any)?.description || '').trim().length > 0
    );
    if (!hasVision || !hasAtLeastOneCriterion) {
      showError('Strategia musi mieć wizję i co najmniej 1 kryterium sukcesu.', 6000);
      return;
    }

    updatePillar(pillar.id, {
      type: goalTypeDraft,
      aiTone: goalToneDraft,
      aiContext: nextAiContext,
      strategy: nextStrategy,
      strategyText: goalStrategyTextDraft.trim(),
    });
    setIsGoalEditOpen(false);
    setStrategyAISuggestion('');
  }, [
    goalAiCustomInstructionsDraft,
    goalStrategyDraft,
    goalStrategyTextDraft,
    goalToneDraft,
    goalTypeDraft,
    pillar.id,
    updatePillar,
  ]);

  const computeImportPreviewFromText = useCallback(
    (text: string) => {
      const parsed = parseStrategyImportText(text);
      if (!parsed.ok) {
        setImportError(parsed.error);
        setImportPreview(null);
        return null;
      }

      const payload = parsed.payload;
      const tasks = payload.tasks || [];
      const tasksWithDoD = tasks.filter(
        (t) => typeof t.definitionOfDone === 'string' && t.definitionOfDone.trim()
      ).length;

      const existingTasks = Array.isArray(pillar.tasks) ? pillar.tasks : [];
      const byKey = new Map<string, any>();
      for (const t of existingTasks) {
        const key = String(t?.name ?? '')
          .trim()
          .toLowerCase();
        if (!key) continue;
        if (!byKey.has(key)) byKey.set(key, t);
      }

      let toAdd = 0;
      let toUpdate = 0;
      const namesToAdd: string[] = [];
      const namesToUpdate: string[] = [];
      for (const t of tasks) {
        const key = String(t?.name ?? '')
          .trim()
          .toLowerCase();
        const rawName = String(t?.name ?? '').trim();
        if (!key || !rawName) continue;
        if (byKey.has(key)) {
          toUpdate++;
          namesToUpdate.push(rawName);
        } else {
          toAdd++;
          namesToAdd.push(rawName);
        }
      }

      const namesToRemoveIfReplace = existingTasks
        .map((t) => String((t as any)?.name ?? '').trim())
        .filter(Boolean);

      const preview = {
        visionOk: Boolean(String(payload.vision || '').trim()),
        successCriteria: (payload.successCriteria || []).length,
        milestones: (payload.milestones || []).length,
        ifThen: (payload.ifThenPlans || []).length,
        ifThenActive: (payload.ifThenPlans || []).filter((p) => p && p.isActive !== false).length,
        obstacles: (payload.obstacles || []).length,
        tasks: tasks.length,
        tasksWithDoD,
        tasksToAdd: toAdd,
        tasksToUpdate: toUpdate,
        taskNamesToAdd: namesToAdd.slice(0, 20),
        taskNamesToUpdate: namesToUpdate.slice(0, 20),
        taskNamesToRemoveIfReplace: namesToRemoveIfReplace.slice(0, 20),
      };

      setImportError('');
      setImportPreview(preview);
      setIsImportPreviewDetailsOpen(false);
      return { parsed, preview };
    },
    [pillar.tasks]
  );

  const computeImportPreview = useCallback(() => {
    return computeImportPreviewFromText(importText);
  }, [computeImportPreviewFromText, importText]);

  const applyImportToGoal = useCallback(
    (mode: 'merge' | 'replace' | 'strategy_only') => {
      const res = computeImportPreview();
      if (!res) return;

      const payload = res.parsed.payload;
      const nextStrategy = buildGoalStrategyFromImport(payload);

      // Minimal validation (same as saveGoalEdit intention)
      const hasVision = Boolean(String(nextStrategy.vision || '').trim());
      const hasAtLeastOneCriterion = (nextStrategy.successCriteria || []).some((c: any) =>
        String(c?.description || '').trim()
      );
      if (!allowPartialStrategyImport && (!hasVision || !hasAtLeastOneCriterion)) {
        showError('Import wymaga: wizja + co najmniej 1 kryterium sukcesu.', 6000);
        return;
      }

      const now = new Date().toISOString();
      const importedTasks = payload.tasks || [];

      setData((prev) => {
        return {
          ...prev,
          pillars: prev.pillars.map((p) => {
            if (p.id !== pillar.id) return p;

            // Strategy-only: do not touch tasks at all.
            if (mode === 'strategy_only') {
              const nextPillar: any = { ...p, strategy: nextStrategy };
              return recomputePillarDerivedFields(nextPillar as any);
            }

            const existingTasks = Array.isArray(p.tasks) ? p.tasks : [];
            const existingByKey = new Map<string, any>();
            for (const t of existingTasks) {
              const key = String(t?.name ?? '')
                .trim()
                .toLowerCase();
              if (!key) continue;
              if (!existingByKey.has(key)) existingByKey.set(key, t);
            }

            const buildNewTask = (it: any) => {
              const name = String(it?.name ?? '')
                .trim()
                .slice(0, 200);
              const type = it?.type === 'close' ? 'close' : 'build';
              const definitionOfDone =
                typeof it?.definitionOfDone === 'string' ? it.definitionOfDone.trim() : '';
              const ii = it?.implementationIntention;
              const implementationIntention =
                ii &&
                typeof ii === 'object' &&
                typeof ii.trigger === 'string' &&
                typeof ii.action === 'string'
                  ? {
                      trigger: String(ii.trigger).trim(),
                      action: String(ii.action).trim(),
                      active: ii.active === false ? false : true,
                      lastTriggered: null,
                    }
                  : undefined;

              return {
                id: generateTaskId(),
                name,
                type,
                definitionOfDone: definitionOfDone || undefined,
                progress: 0,
                priority: 'medium',
                status: calculateTaskStatus(0),
                stuckAtNinety: false,
                lastProgressUpdate: now,
                createdAt: now,
                ...(implementationIntention ? { implementationIntention } : {}),
              };
            };

            const nextTasks =
              mode === 'replace'
                ? importedTasks
                    .map((it) => buildNewTask(it))
                    .filter((t) => String(t.name || '').trim().length > 0)
                : (() => {
                    const updated = existingTasks.map((t) => t);
                    const updatedByKey = new Map<string, number>();
                    for (let i = 0; i < updated.length; i++) {
                      const key = String(updated[i]?.name ?? '')
                        .trim()
                        .toLowerCase();
                      if (!key) continue;
                      if (!updatedByKey.has(key)) updatedByKey.set(key, i);
                    }

                    for (const it of importedTasks) {
                      const key = String(it?.name ?? '')
                        .trim()
                        .toLowerCase();
                      if (!key) continue;
                      const idx = updatedByKey.get(key);
                      if (idx == null) {
                        updated.push(buildNewTask(it));
                        continue;
                      }

                      // Update only imported fields; keep progress/status/history intact.
                      const current = updated[idx];
                      const nextType = it?.type === 'close' ? 'close' : 'build';
                      const nextDoD =
                        typeof it?.definitionOfDone === 'string'
                          ? it.definitionOfDone.trim()
                          : undefined;
                      const ii = it?.implementationIntention;
                      const nextII =
                        ii &&
                        typeof ii === 'object' &&
                        typeof ii.trigger === 'string' &&
                        typeof ii.action === 'string'
                          ? {
                              trigger: String(ii.trigger).trim(),
                              action: String(ii.action).trim(),
                              active: ii.active === false ? false : true,
                              lastTriggered:
                                current?.implementationIntention?.lastTriggered ?? null,
                            }
                          : current?.implementationIntention;

                      updated[idx] = {
                        ...current,
                        type: nextType,
                        ...(nextDoD !== undefined
                          ? { definitionOfDone: nextDoD || undefined }
                          : {}),
                        ...(nextII ? { implementationIntention: nextII } : {}),
                      };
                    }
                    return updated;
                  })();

            const nextPillar: any = {
              ...p,
              // Apply structured strategy
              strategy: nextStrategy,
              // Keep legacy text as-is (user may store external narrative there)
            };

            // Recompute derived fields, as tasks may change.
            return recomputePillarDerivedFields({ ...nextPillar, tasks: nextTasks } as any);
          }),
        };
      });

      showSuccess(
        mode === 'replace'
          ? 'Zastosowano import: strategia + zadania zostały nadpisane.'
          : mode === 'strategy_only'
            ? 'Zastosowano import: zaktualizowano tylko strategię (bez zmian w zadaniach).'
            : 'Zastosowano import: strategia + zadania (merge) zostały zaktualizowane.',
        3500
      );
      setImportError('');
      setIsImportOpen(false);
      setIsReplaceConfirmOpen(false);
    },
    [
      allowPartialStrategyImport,
      calculateTaskStatus,
      computeImportPreview,
      pillar.id,
      recomputePillarDerivedFields,
      setData,
    ]
  );

  const relevantIdeasForPillar = useMemo(() => {
    const list = Array.isArray(ideas) ? ideas : [];
    const pid = pillar.id;
    const filtered = list.filter((i) => i.goalId == null || Number(i.goalId) === pid);
    const sorted = [...filtered].sort((a: any, b: any) => {
      const aMs = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bMs = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return (Number.isFinite(bMs) ? bMs : 0) - (Number.isFinite(aMs) ? aMs : 0);
    });
    return sorted.slice(0, 8);
  }, [ideas, pillar.id]);

  const rewardsWithStatus = useMemo(() => {
    return getRewardsWithStatus(pillar.id);
  }, [getRewardsWithStatus, pillar.id]);

  const canAddReward = rewardDescription.trim().length > 0 && rewardTarget >= 1;

  const handleAddReward = useCallback(() => {
    const description = rewardDescription.trim();
    if (!description) return;

    const safeTarget = Math.max(1, Math.floor(Number(rewardTarget) || 1));

    if (rewardKind === 'milestone_completion_percent_at_least') {
      const percent = Math.max(0, Math.min(100, safeTarget));
      addReward(pillar.id, {
        description,
        type: 'milestone',
        condition: { kind: rewardKind, percent },
      });
    } else if (rewardKind === 'process_finish_sessions_completed_last_7_days_at_least') {
      addReward(pillar.id, {
        description,
        type: 'process',
        condition: { kind: rewardKind, count: safeTarget },
      });
    } else {
      addReward(pillar.id, {
        description,
        type: 'process',
        condition: { kind: rewardKind, count: safeTarget },
      });
    }

    setRewardDescription('');
    setRewardTarget(1);
    setIsRewardsOpen(false);
  }, [addReward, pillar.id, rewardDescription, rewardKind, rewardTarget]);

  // Phase 3: Async toggle handler with optimistic UI
  const handleToggle = useCallback(
    async (taskId: number) => {
      try {
        await onToggleTask(taskId);
      } catch (error) {
        console.error('Failed to toggle task:', error);
        // Error already handled in context
      }
    },
    [onToggleTask]
  );

  const handleAddTask = useCallback(() => {
    const name = newTaskName.trim();
    if (!name) return;

    const now = new Date().toISOString();
    const progress = 0;

    const definitionOfDone = newTaskDefinitionOfDone.trim();

    const newTask = {
      id: generateTaskId(),
      name,
      type: newTaskType,
      definitionOfDone: definitionOfDone,
      progress,
      priority: 'medium',
      status: calculateTaskStatus(progress),
      stuckAtNinety: false,
      lastProgressUpdate: now,
      createdAt: now,
    };

    setData((prev) => ({
      ...prev,
      pillars: prev.pillars.map((p) => {
        if (p.id !== pillar.id) return p;
        const next = { ...p, tasks: [...(p.tasks || []), newTask] };
        return recomputePillarDerivedFields(next as any);
      }),
    }));

    setNewTaskName('');
    setNewTaskType('build');
    setNewTaskDefinitionOfDone('');
    setIsAddOpen(false);
  }, [
    newTaskName,
    newTaskType,
    newTaskDefinitionOfDone,
    setData,
    pillar.id,
    recomputePillarDerivedFields,
  ]);

  const startEditingDefinition = useCallback((task: any) => {
    setEditingTaskId(task.id);
    setEditingDefinition(typeof task.definitionOfDone === 'string' ? task.definitionOfDone : '');
  }, []);

  const cancelEditingDefinition = useCallback(() => {
    setEditingTaskId(null);
    setEditingDefinition('');
  }, []);

  const saveEditingDefinition = useCallback(() => {
    if (editingTaskId == null) return;

    const value = editingDefinition.trim();

    setData((prev) => ({
      ...prev,
      pillars: prev.pillars.map((p) => {
        if (p.id !== pillar.id) return p;
        const updatedTasks = (p.tasks || []).map((t) =>
          t.id === editingTaskId ? { ...t, definitionOfDone: value } : t
        );
        return recomputePillarDerivedFields({ ...(p as any), tasks: updatedTasks } as any);
      }),
    }));

    cancelEditingDefinition();
  }, [
    editingTaskId,
    editingDefinition,
    setData,
    pillar.id,
    cancelEditingDefinition,
    recomputePillarDerivedFields,
  ]);

  return (
    <div data-component="PillarDetail" className="min-h-screen pb-32 pt-8 px-6">
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={onBack} className="btn-premium btn-cyan mb-8">
          ← Wróć
        </button>

        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-6xl font-extrabold uppercase tracking-wider mb-4 text-gradient-gold">
              {pillarData.name}
            </h1>
            <p className="text-sm text-gray-400 uppercase tracking-wider">
              /// {pillarData.description}
            </p>
          </div>

          <div className="ml-8 text-right">
            <div
              className={`text-6xl font-bold mb-2 ${
                pillarData.completion === 100
                  ? 'text-green-400 text-glow-cyan'
                  : pillarData.ninety_percent_alert
                    ? 'text-red-400 text-glow-magenta'
                    : 'text-glow-cyan'
              }`}
            >
              {pillarData.completion}%
            </div>
            {pillarData.ninety_percent_alert && (
              <span className="px-3 py-1 rounded-widget-sm bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-bold uppercase">
                ⚠️ Utknęło
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Goal settings (type / strategy / aiTone) */}
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-3">
          <span className="text-3xl">⚙️</span>
          <span>Ustawienia celu</span>
        </h2>

        <div className="glass-card space-widget">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wider">
                Typ / strategia / ton AI
              </p>
              <p className="text-xs text-gray-400">
                Te pola ustawiają fokus oraz sposób, w jaki AI mówi o tym celu.
              </p>
            </div>

            {!isGoalEditOpen ? (
              <button onClick={openGoalEdit} className="btn-premium btn-cyan">
                Edytuj
              </button>
            ) : (
              <button onClick={() => setIsGoalEditOpen(false)} className="btn-premium btn-cyan">
                Zamknij
              </button>
            )}
          </div>

          {isGoalEditOpen && (
            <div className="mt-4 space-y-3">
              {/* Strategy Import */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-white uppercase tracking-wider">
                      Import strategii (wklej)
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Wklej strategię wygenerowaną w innym narzędziu. Aplikacja rozłoży ją na pola
                      celu.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsImportOpen((v) => !v)}
                    className="btn-premium btn-cyan"
                  >
                    {isImportOpen ? 'Zamknij import' : 'Otwórz import'}
                  </button>
                </div>

                {isImportOpen && (
                  <div className="mt-4 space-y-3">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                      Wklej tekst z blokiem JSON
                    </label>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                        Albo wczytaj plik (.json / .txt)
                      </label>
                      <input
                        type="file"
                        accept=".json,.txt,application/json,text/plain"
                        className="w-full text-sm text-gray-300"
                        onChange={(e) => {
                          const file =
                            e.target.files && e.target.files[0] ? e.target.files[0] : null;
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const text = typeof reader.result === 'string' ? reader.result : '';
                            if (!text.trim()) {
                              showError('Plik jest pusty.', 3000);
                              return;
                            }
                            setImportText(text);
                            setImportError('');
                            setImportPreview(null);
                            // Compute preview immediately for convenience.
                            computeImportPreviewFromText(text);
                            showSuccess(`Wczytano plik: ${file.name}`, 2500);
                          };
                          reader.onerror = () => {
                            showError('Nie udało się wczytać pliku.', 3000);
                          };
                          reader.readAsText(file);
                        }}
                      />
                      <div className="text-[11px] text-gray-500">
                        Format: czysty JSON lub tekst zawierający blok{' '}
                        <span className="text-gray-200">---JSON_START---</span>…
                        <span className="text-gray-200">---JSON_END---</span>.
                      </div>
                    </div>
                    <textarea
                      value={importText}
                      onChange={(e) => {
                        setImportText(e.target.value);
                        setImportError('');
                        setImportPreview(null);
                      }}
                      className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan"
                      placeholder={`Wklej tekst z:\n---JSON_START---\n{ "vision": "...", "successCriteria": [...], "tasks": [...] }\n---JSON_END---`}
                      rows={8}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const tpl = getStrategyImportTemplateText();
                          setImportText(tpl);
                          setImportError('');
                          setImportPreview(null);
                          showSuccess('Wstawiono szablon importu (możesz go edytować).', 2500);
                        }}
                        className="btn-premium btn-cyan text-sm"
                      >
                        🧩 Wstaw szablon
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            const draft =
                              localStorage.getItem(STRATEGY_IMPORT_DRAFT_STORAGE_KEY) || '';
                            if (!draft.trim()) {
                              showError(
                                'Brak zapisanego importu z czatu. Wróć do Asystenta AI i kliknij „Zapisz do importu”.',
                                4500
                              );
                              return;
                            }
                            setImportText(draft);
                            setImportError('');
                            setImportPreview(null);
                            showSuccess('Wczytano import zapisany z czatu.', 2500);
                          } catch {
                            showError('Nie udało się wczytać (localStorage).', 3000);
                          }
                        }}
                        className="btn-premium btn-cyan text-sm"
                      >
                        🤖 Wczytaj z czatu (AI)
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(getStrategyImportTemplateText());
                            showSuccess('Skopiowano szablon importu do schowka.', 2500);
                          } catch {
                            showError(
                              'Nie udało się skopiować do schowka (uprawnienia przeglądarki).',
                              3500
                            );
                          }
                        }}
                        className="btn-premium btn-cyan text-sm"
                      >
                        📋 Kopiuj szablon
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            localStorage.removeItem(STRATEGY_IMPORT_DRAFT_STORAGE_KEY);
                            showSuccess('Wyczyszczono bufor importu z czatu.', 2500);
                          } catch {
                            showError('Nie udało się wyczyścić bufora (localStorage).', 3000);
                          }
                        }}
                        className="btn-premium btn-cyan text-sm"
                      >
                        🧹 Wyczyść bufor
                      </button>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-gray-300">
                      <input
                        type="checkbox"
                        checked={allowPartialStrategyImport}
                        onChange={(e) => setAllowPartialStrategyImport(e.target.checked)}
                      />
                      Pozwól zapisać częściową strategię (bez wymagania: wizja + 1 kryterium)
                    </label>

                    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                          Zadania:
                        </span>
                        <button
                          type="button"
                          onClick={() => setTasksImportMode('strategy_only')}
                          className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition ${
                            tasksImportMode === 'strategy_only'
                              ? 'bg-white/10 border-white/20 text-white'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          nie zmieniaj
                        </button>
                        <button
                          type="button"
                          onClick={() => setTasksImportMode('merge')}
                          className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition ${
                            tasksImportMode === 'merge'
                              ? 'bg-green-500/15 border-green-500/50 text-green-300'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          merge (bez utraty progresu)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTasksImportMode('replace')}
                          className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition ${
                            tasksImportMode === 'replace'
                              ? 'bg-red-500/15 border-red-500/50 text-red-300'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          nadpisz
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => computeImportPreview()}
                          className="btn-premium btn-cyan"
                        >
                          Podgląd zmian
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (tasksImportMode === 'replace') {
                              setIsReplaceConfirmOpen(true);
                              return;
                            }
                            applyImportToGoal(
                              tasksImportMode === 'strategy_only' ? 'strategy_only' : 'merge'
                            );
                          }}
                          className="btn-premium btn-magenta"
                          disabled={!importText.trim()}
                        >
                          Zastosuj do celu
                        </button>
                      </div>
                    </div>

                    {importError && (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                        {importError}
                      </div>
                    )}

                    {importPreview && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-200">
                        <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                          Podgląd (skrót)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>Wizja: {importPreview.visionOk ? 'OK' : 'Brak'}</div>
                          <div>Kryteria sukcesu: {importPreview.successCriteria}</div>
                          <div>Milestones: {importPreview.milestones}</div>
                          <div>
                            If‑Then: {importPreview.ifThen} (aktywne: {importPreview.ifThenActive})
                          </div>
                          <div>Przeszkody: {importPreview.obstacles}</div>
                          <div>
                            Zadania: {importPreview.tasks} (z DoD: {importPreview.tasksWithDoD})
                            {tasksImportMode === 'strategy_only'
                              ? ' — tryb: bez zmian w zadaniach'
                              : ` — dodaj: ${importPreview.tasksToAdd}, zaktualizuj: ${importPreview.tasksToUpdate}`}
                          </div>
                        </div>
                        {tasksImportMode !== 'strategy_only' && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => setIsImportPreviewDetailsOpen((v) => !v)}
                              className="btn-premium btn-cyan text-sm"
                            >
                              {isImportPreviewDetailsOpen
                                ? 'Ukryj listy zadań'
                                : 'Pokaż listy zadań'}
                            </button>
                          </div>
                        )}

                        {isImportPreviewDetailsOpen && tasksImportMode !== 'strategy_only' && (
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {tasksImportMode === 'replace' ? (
                              <div className="md:col-span-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
                                <div className="text-red-200 font-bold uppercase tracking-wider mb-2">
                                  Znikną (nadpisz)
                                </div>
                                <div className="text-red-100">
                                  {(importPreview.taskNamesToRemoveIfReplace.length
                                    ? importPreview.taskNamesToRemoveIfReplace
                                    : ['(brak)']
                                  ).map((n, i) => (
                                    <div key={`${n}_${i}`}>- {n}</div>
                                  ))}
                                  {Array.isArray(pillar.tasks) &&
                                    pillar.tasks.length >
                                      importPreview.taskNamesToRemoveIfReplace.length && (
                                      <div className="mt-1 text-red-200/80">
                                        …i{' '}
                                        {pillar.tasks.length -
                                          importPreview.taskNamesToRemoveIfReplace.length}{' '}
                                        więcej
                                      </div>
                                    )}
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                                  <div className="text-gray-300 font-bold uppercase tracking-wider mb-2">
                                    Do dodania
                                  </div>
                                  <div className="text-gray-200">
                                    {(importPreview.taskNamesToAdd.length
                                      ? importPreview.taskNamesToAdd
                                      : ['(brak)']
                                    ).map((n, i) => (
                                      <div key={`${n}_${i}`}>- {n}</div>
                                    ))}
                                    {importPreview.tasksToAdd >
                                      importPreview.taskNamesToAdd.length && (
                                      <div className="mt-1 text-gray-400">
                                        …i{' '}
                                        {importPreview.tasksToAdd -
                                          importPreview.taskNamesToAdd.length}{' '}
                                        więcej
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                                  <div className="text-gray-300 font-bold uppercase tracking-wider mb-2">
                                    Do aktualizacji
                                  </div>
                                  <div className="text-gray-200">
                                    {(importPreview.taskNamesToUpdate.length
                                      ? importPreview.taskNamesToUpdate
                                      : ['(brak)']
                                    ).map((n, i) => (
                                      <div key={`${n}_${i}`}>- {n}</div>
                                    ))}
                                    {importPreview.tasksToUpdate >
                                      importPreview.taskNamesToUpdate.length && (
                                      <div className="mt-1 text-gray-400">
                                        …i{' '}
                                        {importPreview.tasksToUpdate -
                                          importPreview.taskNamesToUpdate.length}{' '}
                                        więcej
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        <div className="text-[11px] text-gray-500 mt-2">
                          {tasksImportMode === 'strategy_only'
                            ? 'Tryb „nie zmieniaj” aktualizuje tylko strategię. Zadania pozostają bez zmian.'
                            : 'Merge aktualizuje tylko: typ/DoD/If‑Then taska. Progres i status zostają bez zmian.'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <ConfirmDialog
                  isOpen={isReplaceConfirmOpen}
                  title="Nadpisać zadania tego celu?"
                  description="Tryb „nadpisz” usunie obecne zadania w tym celu i zastąpi je zadaniami z importu. To może oznaczać utratę progresu. Jeśli nie jesteś pewny — wybierz „merge”."
                  confirmLabel="Nadpisz"
                  cancelLabel="Anuluj"
                  tone="danger"
                  onCancel={() => setIsReplaceConfirmOpen(false)}
                  onConfirm={() => applyImportToGoal('replace')}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Typ celu
                </label>
                <select
                  value={goalTypeDraft}
                  onChange={(e) => setGoalTypeDraft(e.target.value as GoalType)}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="main">główny</option>
                  <option value="secondary">poboczny</option>
                  <option value="lab">laboratorium</option>
                </select>

                {goalTypeDraft === 'main' && otherMainPillar && (
                  <div className="text-[11px] text-yellow-200/90">
                    Poprzedni cel główny („{otherMainPillar.name}”) zostanie zmieniony na secondary.
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Ton AI
                </label>
                <AIToneSelector
                  value={goalToneDraft}
                  onChange={(tone) => {
                    setGoalToneDraft(tone);
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Instrukcje agenta (opcjonalnie)
                </label>
                <textarea
                  value={goalAiCustomInstructionsDraft}
                  onChange={(e) => {
                    const next = e.target.value.slice(0, 800);
                    setGoalAiCustomInstructionsDraft(next);
                  }}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan"
                  placeholder="Np. „Nie używaj słowa ‘musisz’. Daj 1–2 kroki na 10 min.”"
                  rows={3}
                />
                <div className="text-[11px] text-gray-400">
                  Zapisywane w{' '}
                  <span className="text-gray-200 font-semibold">
                    Pillar.aiContext.customInstructions
                  </span>
                  . Nie edytujemy{' '}
                  <span className="text-gray-200 font-semibold">strategy.aiContext</span>{' '}
                  (legacy/mirror).
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Strategia (legacy – tekst)
                </label>
                <textarea
                  value={goalStrategyTextDraft}
                  onChange={(e) => setGoalStrategyTextDraft(e.target.value.slice(0, 1200))}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-magenta"
                  placeholder="Jeśli masz starą strategię jako tekst, trzymaj ją tutaj (nie zginie)."
                  rows={3}
                />
                <div className="text-[11px] text-gray-400">
                  To pole jest kompatybilne ze starym modelem. Docelowo przenieś treść do wizji /
                  kryteriów / planów.
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Strategia (PLAN_v2 – struktura)
                </label>
                <GoalStrategyEditor
                  strategy={goalStrategyDraft}
                  availableTasks={(pillarTasks || []).map((t) => ({ id: t.id, name: t.name }))}
                  onChange={(next) => {
                    setGoalStrategyDraft(next);
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={saveGoalEdit} className="btn-premium btn-magenta">
                  Zapisz
                </button>
                <button
                  onClick={() => {
                    setIsGoalEditOpen(false);
                  }}
                  className="btn-premium btn-cyan"
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Rewards (D-040) */}
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.09 }}
      >
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-3">
          <span className="text-3xl">🎁</span>
          <span>Nagrody</span>
        </h2>

        <div className="glass-card space-widget">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wider">
                Nagrody procesowe i kamieni milowych (anti‑90%)
              </p>
              <p className="text-xs text-gray-400">
                Nagrody mają wynikać z faktów (DONE + sesje), nie z hype’u.
              </p>
            </div>

            <button onClick={() => setIsRewardsOpen((v) => !v)} className="btn-premium btn-cyan">
              {isRewardsOpen ? 'Zamknij' : '➕ Dodaj nagrodę'}
            </button>
          </div>

          {/* List */}
          <div className="mt-4 space-y-3">
            {rewardsWithStatus.length === 0 ? (
              <div className="text-sm text-gray-400">Brak nagród dla tego celu.</div>
            ) : (
              rewardsWithStatus.map(({ reward, status, reason }) => (
                <div
                  key={reward.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs uppercase tracking-wider font-bold text-gray-300">
                        {reward.type}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded border font-bold uppercase tracking-wider ${
                          status === 'earned'
                            ? 'bg-green-500/15 border-green-500/50 text-green-300'
                            : 'bg-white/5 border-white/10 text-gray-300'
                        }`}
                      >
                        {status === 'earned' ? 'zdobyte' : 'jeszcze nie'}
                      </span>
                    </div>

                    <div className="text-white font-semibold">{reward.description}</div>
                    <div className="text-xs text-gray-400 mt-1">{reason}</div>
                  </div>

                  <button
                    onClick={() => removeReward(pillar.id, reward.id)}
                    className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 hover:bg-red-500/15"
                  >
                    Usuń
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add form */}
          {isRewardsOpen && (
            <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Opis
                </label>
                <input
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value.slice(0, 200))}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="np. kawa + 30 min przerwy bez poczucia winy"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Typ
                  </label>
                  <select
                    value={rewardType}
                    onChange={(e) => {
                      const nextType = e.target.value as 'milestone' | 'process';
                      setRewardType(nextType);
                      setRewardKind(
                        nextType === 'milestone'
                          ? 'milestone_completion_percent_at_least'
                          : 'process_finish_sessions_completed_last_7_days_at_least'
                      );
                    }}
                    className="w-full mt-2 p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="process">procesowa</option>
                    <option value="milestone">kamień milowy</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Warunek
                  </label>
                  <select
                    value={rewardKind}
                    onChange={(e) => setRewardKind(e.target.value as any)}
                    className="w-full mt-2 p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                  >
                    {rewardType === 'milestone' ? (
                      <option value="milestone_completion_percent_at_least">
                        ukończenie celu (%) ≥
                      </option>
                    ) : (
                      <>
                        <option value="process_finish_sessions_completed_last_7_days_at_least">
                          sesje Trybu Domykania (7 dni) ≥
                        </option>
                        <option value="process_stuck_to_done_last_7_days_at_least">
                          utknęło→DONE (7 dni) ≥
                        </option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Cel
                  </label>
                  <input
                    type="number"
                    min={rewardType === 'milestone' ? 0 : 1}
                    max={rewardType === 'milestone' ? 100 : 999}
                    value={rewardTarget}
                    onChange={(e) => setRewardTarget(Number(e.target.value))}
                    className="w-full mt-2 p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setIsRewardsOpen(false);
                    setRewardDescription('');
                    setRewardTarget(1);
                  }}
                  className="btn-premium btn-cyan"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddReward}
                  disabled={!canAddReward}
                  className="btn-premium btn-magenta disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Dodaj
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Definition of Done */}
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-2xl font-bold text-gradient-neon uppercase tracking-wider mb-6 flex items-center gap-3">
          <span className="text-3xl">🎯</span>
          <span>Definicja DONE</span>
        </h2>

        <div className="space-y-4">
          <div
            className={`glass-card space-widget ${pillar.completion >= 33 ? 'glass-card-cyan' : ''}`}
          >
            <h3 className="text-sm font-bold text-glow-cyan uppercase tracking-wider mb-2">
              1. DONE techniczne
            </h3>
            <p className={`text-sm ${pillar.completion >= 33 ? 'text-white' : 'text-gray-400'}`}>
              "{pillar.done_definition.tech}"
            </p>
          </div>

          <div
            className={`glass-card space-widget ${pillar.completion >= 66 ? 'glass-card-magenta' : ''}`}
          >
            <h3 className="text-sm font-bold text-glow-magenta uppercase tracking-wider mb-2">
              2. DONE „na żywo”
            </h3>
            <p className={`text-sm ${pillar.completion >= 66 ? 'text-white' : 'text-gray-400'}`}>
              "{pillar.done_definition.live}"
            </p>
          </div>

          <div
            className={`glass-card space-widget ${pillar.completion >= 90 ? 'glass-card-gold' : ''}`}
          >
            <h3 className="text-sm font-bold text-glow-gold uppercase tracking-wider mb-2">
              3. DONE bitewne
            </h3>
            <p className={`text-sm ${pillar.completion >= 90 ? 'text-white' : 'text-gray-400'}`}>
              "{pillar.done_definition.battle}"
            </p>
          </div>
        </div>
      </motion.div>

      {/* Timeline */}
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-3">
          <span className="text-3xl">⏳</span>
          <span>Oś czasu</span>
        </h2>

        <div className="glass-card space-widget border border-white/10">
          {timelineItems.length === 0 ? (
            <div className="text-sm text-gray-400">
              Brak terminów. Dodaj deadline w milestone (strategia) albo ustaw `dueDate` w zadaniu.
            </div>
          ) : (
            <div className="space-y-3">
              {timelineItems.slice(0, 14).map((it, idx) => (
                <div
                  key={`${it.kind}_${it.dateIso}_${idx}`}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400 font-semibold">{it.dateIso}</span>
                      <span
                        className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${it.badgeClass}`}
                      >
                        {it.kind === 'milestone' ? 'kamień' : 'zadanie'}
                        {it.badge ? ` • ${it.badge}` : ''}
                      </span>
                    </div>
                    <div className="text-white font-semibold mt-1 break-words">{it.title}</div>
                    {it.meta ? <div className="text-xs text-gray-400 mt-1">{it.meta}</div> : null}
                  </div>
                </div>
              ))}
              {timelineItems.length > 14 && (
                <div className="text-xs text-gray-500">
                  …i {timelineItems.length - 14} kolejnych terminów.
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Task Tree (Strategy phases) */}
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-3">
          <span className="text-3xl">🧭</span>
          <span>Drzewo zadań</span>
        </h2>

        <div className="glass-card space-widget border border-white/10">
          {taskTree.length === 0 ? (
            <div className="text-sm text-gray-400">
              Brak etapów w strategii. Wejdź w „Ustawienia celu” → „Strategia (PLAN_v2 – struktura)”
              i dodaj etapy, a potem przypnij zadania do etapów.
            </div>
          ) : (
            <div className="space-y-3">
              {taskTree.map((node, idx) => (
                <div
                  key={`${String(node.phase?.id ?? idx)}`}
                  className="p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white font-bold break-words">
                        {String(node.phase?.title ?? '').trim() || `Etap ${idx + 1}`}
                      </div>
                      {node.phase?.description ? (
                        <div className="text-xs text-gray-400 mt-1">
                          {String(node.phase.description).slice(0, 240)}
                        </div>
                      ) : null}
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded border border-white/10 bg-white/5 text-gray-300 font-bold uppercase tracking-wider">
                      {node.tasks.length} zadań
                    </span>
                  </div>

                  {node.tasks.length === 0 ? (
                    <div className="mt-2 text-sm text-gray-400">Brak przypiętych zadań.</div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {node.tasks.slice(0, 10).map((t: any) => {
                        const progress = Number(t?.progress ?? 0);
                        const isDone = progress >= 100 || String(t?.status ?? '') === 'done';
                        return (
                          <div
                            key={String(t?.id)}
                            className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white/5 border border-white/10"
                          >
                            <div className="min-w-0">
                              <div
                                className={`text-sm ${isDone ? 'text-gray-500 line-through' : 'text-white'} break-words`}
                              >
                                {String(t?.name ?? '').trim() || 'Zadanie'}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-1 rounded border font-bold uppercase tracking-wider ${
                                isDone
                                  ? 'bg-green-500/15 border-green-500/40 text-green-300'
                                  : progress >= 90
                                    ? 'bg-gold/10 border-gold/30 text-gold'
                                    : 'bg-white/5 border-white/10 text-gray-300'
                              }`}
                            >
                              {isDone
                                ? 'done'
                                : `${Math.max(0, Math.min(100, Math.round(progress)))}%`}
                            </span>
                          </div>
                        );
                      })}
                      {node.tasks.length > 10 && (
                        <div className="text-xs text-gray-500">
                          …i {node.tasks.length - 10} więcej.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Tasks */}
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-3">
          <span className="text-3xl">📋</span>
          <span>Zadania</span>
        </h2>

        {/* Minimal Add Task (with Definition of DONE) */}
        <div className="glass-card space-widget mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wider">Dodaj zadanie</p>
              <p className="text-xs text-gray-400">
                Opcjonalne, ale zalecane: określ, kiedy to zadanie jest obiektywnie DONE.
              </p>
            </div>
            <button onClick={() => setIsAddOpen((v) => !v)} className="btn-premium btn-cyan">
              {isAddOpen ? 'Zamknij' : '➕ Nowe zadanie'}
            </button>
          </div>

          {isAddOpen && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Nazwa zadania
                </label>
                <input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value.slice(0, 200))}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="np. Deploy na hosting"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Typ
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewTaskType('build')}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition ${
                      newTaskType === 'build'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    budowanie
                  </button>
                  <button
                    onClick={() => setNewTaskType('close')}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition ${
                      newTaskType === 'close'
                        ? 'bg-red-500/20 border-red-500/50 text-red-300'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    domykanie
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Definicja DONE
                </label>
                <textarea
                  value={newTaskDefinitionOfDone}
                  onChange={(e) => setNewTaskDefinitionOfDone(e.target.value.slice(0, 500))}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="Kiedy to zadanie jest obiektywnie skończone? (krótko, konkretnie)"
                  rows={3}
                />
                <p className="text-[11px] text-gray-500">
                  Tip: opisz konkretny warunek w jednym zdaniu (bez ogólników).
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskName.trim()}
                  className="btn-premium btn-magenta disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Dodaj
                </button>
                <button
                  onClick={() => {
                    setNewTaskName('');
                    setNewTaskType('build');
                    setNewTaskDefinitionOfDone('');
                    setIsAddOpen(false);
                  }}
                  className="btn-premium btn-cyan"
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {pillarTasks.map((task, idx) => (
            <motion.div
              key={idx}
              className="glass-card space-widget"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * idx }}
              whileHover={{ scale: 1.02, x: 4 }}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleToggle(task.id)}
                  disabled={false}
                  className={`w-10 h-10 rounded-lg border-3 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                    task.progress >= 100
                      ? 'bg-gradient-to-br from-neon-cyan to-cyan-400 border-neon-cyan shadow-lg shadow-cyan-500/50'
                      : 'border-gray-300 hover:border-neon-cyan hover:shadow-lg hover:shadow-cyan-500/30 bg-white/5'
                  }`}
                >
                  {task.progress >= 100 && (
                    <span className="text-black font-bold text-lg animate-pulse">✓</span>
                  )}
                  {task.progress < 100 && (
                    <span className="text-gray-400 text-xs opacity-60">○</span>
                  )}
                </button>

                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      task.progress >= 100 ? 'text-gray-500 line-through' : 'text-white'
                    }`}
                  >
                    {task.name}
                  </p>

                  {/* Task-level Definition of DONE */}
                  <div className="mt-1">
                    {editingTaskId === task.id ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editingDefinition}
                          onChange={(e) => setEditingDefinition(e.target.value.slice(0, 500))}
                          className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 text-xs"
                          placeholder="Zdefiniuj DONE (krótko i konkretnie)"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveEditingDefinition}
                            className="px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-xs font-bold uppercase tracking-wider"
                          >
                            Zapisz DONE
                          </button>
                          <button
                            onClick={cancelEditingDefinition}
                            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider"
                          >
                            Anuluj
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs text-gray-400">
                          <span className="text-gray-500 font-semibold uppercase tracking-wider mr-2">
                            DONE
                          </span>
                          {task.definitionOfDone &&
                          String(task.definitionOfDone).trim().length > 0 ? (
                            `"${String(task.definitionOfDone).trim()}"`
                          ) : (
                            <span className="italic text-gray-500">brak</span>
                          )}
                        </p>
                        <button
                          onClick={() => startEditingDefinition(task)}
                          className="text-[11px] px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                        >
                          Edytuj DONE
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <span
                  className={`text-xs px-2 py-1 rounded-widget-sm font-bold uppercase ${
                    task.type === 'close'
                      ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                      : 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                  }`}
                >
                  {task.type}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <div className="widget-container-narrow">
        <button
          onClick={onEnterFinishMode}
          className="btn-premium btn-magenta w-full text-lg py-6 mb-4"
        >
          🔥 WEJDŹ W FINISH MODE
        </button>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(PillarDetailPremium);
