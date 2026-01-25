import React, { useMemo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import type { GoalAiTone, GoalType, Pillar } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { generateTaskId, calculateTaskStatus } from '../utils/taskHelpers';
import { buildIdeaSuggestionPrompt, ollamaGenerateText } from '../utils/aiPrompts';
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
  const { data, setData, updatePillar, addReward, removeReward, getRewardsWithStatus, ideas } =
    useAppContext();

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
  const [goalStrategyDraft, setGoalStrategyDraft] = useState('');
  const [isGeneratingStrategyAI, setIsGeneratingStrategyAI] = useState(false);
  const [strategyAISuggestion, setStrategyAISuggestion] = useState('');

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

  console.log('🏗️ PillarDetail using data format:', useNormalized ? 'NORMALIZED' : 'LEGACY');

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

  const otherMainPillar = useMemo(() => {
    return data.pillars.find((p) => p.id !== pillar.id && p.type === 'main') || null;
  }, [data.pillars, pillar.id]);

  const openGoalEdit = useCallback(() => {
    setGoalTypeDraft((pillarData.type ?? 'secondary') as GoalType);
    setGoalToneDraft((pillarData.aiTone ?? 'psychoeducation') as GoalAiTone);
    setGoalStrategyDraft((pillarData.strategy ?? '').toString());
    setIsGoalEditOpen(true);
    setStrategyAISuggestion('');
  }, [pillarData.aiTone, pillarData.strategy, pillarData.type]);

  const saveGoalEdit = useCallback(() => {
    updatePillar(pillar.id, {
      type: goalTypeDraft,
      aiTone: goalToneDraft,
      strategy: goalStrategyDraft.trim(),
    });
    setIsGoalEditOpen(false);
    setStrategyAISuggestion('');
  }, [goalStrategyDraft, goalToneDraft, goalTypeDraft, pillar.id, updatePillar]);

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
      pillars: prev.pillars.map((p) =>
        p.id === pillar.id ? { ...p, tasks: [...(p.tasks || []), newTask] } : p
      ),
    }));

    setNewTaskName('');
    setNewTaskType('build');
    setNewTaskDefinitionOfDone('');
    setIsAddOpen(false);
  }, [newTaskName, newTaskType, newTaskDefinitionOfDone, setData, pillar.id]);

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
        return {
          ...p,
          tasks: (p.tasks || []).map((t) =>
            t.id === editingTaskId ? { ...t, definitionOfDone: value } : t
          ),
        };
      }),
    }));

    cancelEditingDefinition();
  }, [editingTaskId, editingDefinition, setData, pillar.id, cancelEditingDefinition]);

  return (
    <div data-component="PillarDetail" className="min-h-screen pb-32 pt-8 px-6">
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={onBack} className="btn-premium btn-cyan mb-8">
          ← Back
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
                ⚠️ Stuck
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
          <span>Goal settings</span>
        </h2>

        <div className="glass-card space-widget">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wider">
                Type / strategy / AI tone
              </p>
              <p className="text-xs text-gray-400">
                These fields shape focus + how AI talks about this goal.
              </p>
            </div>

            {!isGoalEditOpen ? (
              <button onClick={openGoalEdit} className="btn-premium btn-cyan">
                Edit
              </button>
            ) : (
              <button onClick={() => setIsGoalEditOpen(false)} className="btn-premium btn-cyan">
                Close
              </button>
            )}
          </div>

          {isGoalEditOpen && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Goal type
                </label>
                <select
                  value={goalTypeDraft}
                  onChange={(e) => setGoalTypeDraft(e.target.value as GoalType)}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="main">main</option>
                  <option value="secondary">secondary</option>
                  <option value="lab">lab</option>
                </select>

                {goalTypeDraft === 'main' && otherMainPillar && (
                  <div className="text-[11px] text-yellow-200/90">
                    Poprzedni cel główny („{otherMainPillar.name}”) zostanie zmieniony na secondary.
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Strategy
                </label>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] text-gray-400">
                    AI can use your Ideas Vault to propose a concrete strategy.
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsGeneratingStrategyAI(true);
                      try {
                        const prompt = buildIdeaSuggestionPrompt({
                          pillar: pillarData as any,
                          task: null,
                          ideas: relevantIdeasForPillar,
                          useCase: 'goal_planning',
                        });
                        const text = await ollamaGenerateText(
                          { prompt, temperature: 0.6, topP: 0.9, numPredict: 180, maxLen: 420 },
                          { timeoutMs: 12_000 }
                        );
                        setStrategyAISuggestion(text || '');
                      } finally {
                        setIsGeneratingStrategyAI(false);
                      }
                    }}
                    disabled={isGeneratingStrategyAI}
                    className="px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingStrategyAI ? 'Generuję…' : '🤖 Suggest'}
                  </button>
                </div>
                <textarea
                  value={goalStrategyDraft}
                  onChange={(e) => setGoalStrategyDraft(e.target.value.slice(0, 800))}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="Krótko: jak dojść do tego celu (konkret, bez waty)."
                  rows={3}
                />
                {strategyAISuggestion && (
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-[11px] text-gray-300 uppercase tracking-wider font-semibold mb-1">
                      AI suggestion
                    </div>
                    <div className="text-sm text-gray-200 whitespace-pre-wrap break-words">
                      {strategyAISuggestion}
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setStrategyAISuggestion('')}
                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGoalStrategyDraft(strategyAISuggestion.slice(0, 800));
                        }}
                        className="px-3 py-2 rounded-lg bg-green-500/15 border border-green-500/40 text-green-200 text-xs font-bold uppercase tracking-wider"
                      >
                        Copy → strategy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  AI tone
                </label>
                <select
                  value={goalToneDraft}
                  onChange={(e) => setGoalToneDraft(e.target.value as GoalAiTone)}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="military">military</option>
                  <option value="psychoeducation">psychoeducation</option>
                  <option value="raw_facts">raw_facts</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button onClick={saveGoalEdit} className="btn-premium btn-magenta">
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsGoalEditOpen(false);
                  }}
                  className="btn-premium btn-cyan"
                >
                  Cancel
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
          <span>Rewards</span>
        </h2>

        <div className="glass-card space-widget">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wider">
                Process & milestone rewards (anti‑90%)
              </p>
              <p className="text-xs text-gray-400">
                Rewards should follow facts (DONE + sessions), not hype.
              </p>
            </div>

            <button onClick={() => setIsRewardsOpen((v) => !v)} className="btn-premium btn-cyan">
              {isRewardsOpen ? 'Close' : '➕ Add reward'}
            </button>
          </div>

          {/* List */}
          <div className="mt-4 space-y-3">
            {rewardsWithStatus.length === 0 ? (
              <div className="text-sm text-gray-400">No rewards yet for this goal.</div>
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
                        {status === 'earned' ? 'earned' : 'not yet'}
                      </span>
                    </div>

                    <div className="text-white font-semibold">{reward.description}</div>
                    <div className="text-xs text-gray-400 mt-1">{reason}</div>
                  </div>

                  <button
                    onClick={() => removeReward(pillar.id, reward.id)}
                    className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 hover:bg-red-500/15"
                  >
                    Remove
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
                  Description
                </label>
                <input
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value.slice(0, 200))}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="e.g. Coffee + 30 min guilt-free break"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Type
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
                    <option value="process">process</option>
                    <option value="milestone">milestone</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Condition
                  </label>
                  <select
                    value={rewardKind}
                    onChange={(e) => setRewardKind(e.target.value as any)}
                    className="w-full mt-2 p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                  >
                    {rewardType === 'milestone' ? (
                      <option value="milestone_completion_percent_at_least">completion % ≥</option>
                    ) : (
                      <>
                        <option value="process_finish_sessions_completed_last_7_days_at_least">
                          finish sessions (7d) ≥
                        </option>
                        <option value="process_stuck_to_done_last_7_days_at_least">
                          stuck→done (7d) ≥
                        </option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Target
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
                  Cancel
                </button>
                <button
                  onClick={handleAddReward}
                  disabled={!canAddReward}
                  className="btn-premium btn-magenta disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add
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
          <span>Definition of Done</span>
        </h2>

        <div className="space-y-4">
          <div
            className={`glass-card space-widget ${pillar.completion >= 33 ? 'glass-card-cyan' : ''}`}
          >
            <h3 className="text-sm font-bold text-glow-cyan uppercase tracking-wider mb-2">
              1. Tech Done
            </h3>
            <p className={`text-sm ${pillar.completion >= 33 ? 'text-white' : 'text-gray-400'}`}>
              "{pillar.done_definition.tech}"
            </p>
          </div>

          <div
            className={`glass-card space-widget ${pillar.completion >= 66 ? 'glass-card-magenta' : ''}`}
          >
            <h3 className="text-sm font-bold text-glow-magenta uppercase tracking-wider mb-2">
              2. Live Done
            </h3>
            <p className={`text-sm ${pillar.completion >= 66 ? 'text-white' : 'text-gray-400'}`}>
              "{pillar.done_definition.live}"
            </p>
          </div>

          <div
            className={`glass-card space-widget ${pillar.completion >= 90 ? 'glass-card-gold' : ''}`}
          >
            <h3 className="text-sm font-bold text-glow-gold uppercase tracking-wider mb-2">
              3. Battle Done
            </h3>
            <p className={`text-sm ${pillar.completion >= 90 ? 'text-white' : 'text-gray-400'}`}>
              "{pillar.done_definition.battle}"
            </p>
          </div>
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
          <span>Tasks</span>
        </h2>

        {/* Minimal Add Task (with Definition of DONE) */}
        <div className="glass-card space-widget mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wider">Add task</p>
              <p className="text-xs text-gray-400">
                Optional but recommended: define when this task is objectively DONE.
              </p>
            </div>
            <button onClick={() => setIsAddOpen((v) => !v)} className="btn-premium btn-cyan">
              {isAddOpen ? 'Close' : '➕ New task'}
            </button>
          </div>

          {isAddOpen && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Task name
                </label>
                <input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value.slice(0, 200))}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="e.g. Deploy na hosting"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Type
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
                    build
                  </button>
                  <button
                    onClick={() => setNewTaskType('close')}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition ${
                      newTaskType === 'close'
                        ? 'bg-red-500/20 border-red-500/50 text-red-300'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    close
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Definition of DONE
                </label>
                <textarea
                  value={newTaskDefinitionOfDone}
                  onChange={(e) => setNewTaskDefinitionOfDone(e.target.value.slice(0, 500))}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="When is this task objectively finished? (short, concrete)"
                  rows={3}
                />
                <p className="text-[11px] text-gray-500">
                  Tip: write a concrete checklist in one sentence (no vagueness).
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskName.trim()}
                  className="btn-premium btn-magenta disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add
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
                  Cancel
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
                          placeholder="Define DONE (short & concrete)"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveEditingDefinition}
                            className="px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-xs font-bold uppercase tracking-wider"
                          >
                            Save DONE
                          </button>
                          <button
                            onClick={cancelEditingDefinition}
                            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider"
                          >
                            Cancel
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
                            <span className="italic text-gray-500">not defined</span>
                          )}
                        </p>
                        <button
                          onClick={() => startEditingDefinition(task)}
                          className="text-[11px] px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                        >
                          Edit DONE
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
          🔥 ENTER FINISH MODE
        </button>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(PillarDetailPremium);
