import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../contexts/AppContext';
import type { FinishTaskStatus, Pillar, Task } from '../types';
import { TaskCard } from './TaskCard';
import { analyzeTaskProgression, generateFinishSessionSummary } from '../utils/progressionInsights';
import {
  buildIdeaSuggestionPrompt,
  buildImplementationIntentionPrompt,
  buildFinishSessionInSessionPrompt,
  ollamaGenerateText,
} from '../utils/aiPrompts';

type GoalType = 'main' | 'secondary' | 'lab';

function getGoalTypeLabel(type?: string): string {
  if (!type) return 'not set';
  const normalized = type.toLowerCase().trim();
  if (normalized === 'main') return 'main';
  if (normalized === 'secondary') return 'secondary';
  if (normalized === 'lab') return 'lab';
  return type;
}

function getGoalTypeFromPillar(pillar: any): string | undefined {
  return pillar?.type ?? pillar?.goalType ?? pillar?.pillarType;
}

function getGoalStrategyFromPillar(pillar: any): string | undefined {
  return pillar?.strategy ?? pillar?.goalStrategy;
}

function findPillarForTask(data: any, taskId: number): Pillar | null {
  const pillars: Pillar[] = data?.pillars || [];
  for (const pillar of pillars) {
    if ((pillar.tasks || []).some((t) => t.id === taskId)) return pillar;
  }
  return null;
}

export const FinishMode: React.FC = () => {
  const {
    data,
    insights,
    ideas,
    activateImplementationIntention,
    setCurrentView,
    activeProjectId,
    currentFinishSession,
    startFinishSession,
    endFinishSession,
  } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showIntentionForm, setShowIntentionForm] = useState(false);

  // End-session classification UI (minimal, no AI yet)
  const [showEndForm, setShowEndForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<FinishTaskStatus | null>(null);
  const [classificationNote, setClassificationNote] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // AI idea suggestion (optional helper)
  const [ideaSuggestion, setIdeaSuggestion] = useState<string>('');
  const [isGeneratingIdeaSuggestion, setIsGeneratingIdeaSuggestion] = useState(false);

  // In-session AI support (PLAN 5.3)
  const [inSessionSupport, setInSessionSupport] = useState<string>('');
  const [isGeneratingInSessionSupport, setIsGeneratingInSessionSupport] = useState(false);

  // Lightweight timer for "duration since start" display
  const [nowTick, setNowTick] = useState(() => Date.now());

  const stuckTasksWithInsights = insights.stuckTasks.map((task) => ({
    task,
    insight: analyzeTaskProgression(task),
  }));

  const selectedPillar = useMemo(() => {
    if (!selectedTask) return null;
    return findPillarForTask(data, selectedTask.id);
  }, [data, selectedTask]);

  const relevantIdeas = useMemo(() => {
    const list = Array.isArray(ideas) ? ideas : [];
    if (!selectedPillar) return list.filter((i) => i.goalId == null).slice(0, 8);
    const pid = selectedPillar.id;
    const filtered = list.filter((i) => i.goalId == null || Number(i.goalId) === pid);
    // sort by updatedAt/createdAt desc
    const sorted = [...filtered].sort((a: any, b: any) => {
      const aMs = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bMs = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return (Number.isFinite(bMs) ? bMs : 0) - (Number.isFinite(aMs) ? aMs : 0);
    });
    return sorted.slice(0, 8);
  }, [ideas, selectedPillar]);

  const selectedInsight = useMemo(() => {
    if (!selectedTask) return null;
    return stuckTasksWithInsights.find((x) => x.task?.id === selectedTask.id)?.insight || null;
  }, [selectedTask, stuckTasksWithInsights]);

  // Best-effort default selection when entering Finish Mode:
  // - if user came from pillar detail: pick first stuck task in that pillar
  // - if only 1 stuck task exists: auto-select it
  useEffect(() => {
    if (selectedTask) return;
    if (!stuckTasksWithInsights.length) return;

    // If there's an active Finish session, prioritize its task
    if (currentFinishSession?.status === 'in_progress' && currentFinishSession.endTime == null) {
      const sessionTask = data.pillars
        .flatMap((p) => p.tasks)
        .find((t) => t.id === currentFinishSession.taskId);
      if (sessionTask) {
        setSelectedTask(sessionTask);
        return;
      }
    }

    if (activeProjectId != null) {
      const pillar = data.pillars.find((p) => p.id === activeProjectId);
      if (pillar) {
        const byPillar = stuckTasksWithInsights.find((x) =>
          pillar.tasks?.some((t) => t.id === x.task.id)
        );
        if (byPillar) {
          setSelectedTask(byPillar.task);
          return;
        }
      }
    }

    if (stuckTasksWithInsights.length === 1) {
      setSelectedTask(stuckTasksWithInsights[0].task);
    }
  }, [activeProjectId, currentFinishSession, data.pillars, selectedTask, stuckTasksWithInsights]);

  const goalTypeLabel = useMemo(() => {
    if (!selectedPillar) return 'not set';
    return getGoalTypeLabel(getGoalTypeFromPillar(selectedPillar));
  }, [selectedPillar]);

  const goalStrategy = useMemo(() => {
    if (!selectedPillar) return '';
    return (getGoalStrategyFromPillar(selectedPillar) || '').trim();
  }, [selectedPillar]);

  const definitionOfDone = (selectedTask?.definitionOfDone || '').trim();

  const activeSession =
    currentFinishSession &&
    currentFinishSession.status === 'in_progress' &&
    currentFinishSession.endTime == null
      ? currentFinishSession
      : null;

  const isSessionForSelectedTask = Boolean(
    activeSession && selectedTask && activeSession.taskId === selectedTask.id
  );
  const isOtherSessionActive = Boolean(
    activeSession && selectedTask && activeSession.taskId !== selectedTask.id
  );

  const otherSessionTaskName = useMemo(() => {
    if (!activeSession) return null;
    const t = data.pillars.flatMap((p) => p.tasks).find((x) => x.id === activeSession.taskId);
    return t?.name || null;
  }, [activeSession, data.pillars]);

  // Update timer while the selected task session is active (no per-second ticking)
  useEffect(() => {
    if (!isSessionForSelectedTask || !activeSession) return;
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [activeSession, isSessionForSelectedTask]);

  const sessionDurationLabel = useMemo(() => {
    if (!isSessionForSelectedTask || !activeSession) return null;
    const start = new Date(activeSession.startTime).getTime();
    if (Number.isNaN(start)) return null;
    const minutes = Math.max(0, Math.floor((nowTick - start) / (1000 * 60)));
    if (minutes < 1) return 'just started';
    if (minutes === 1) return '1 min';
    return `${minutes} min`;
  }, [activeSession, isSessionForSelectedTask, nowTick]);

  const sessionDurationMinutes = useMemo(() => {
    if (!isSessionForSelectedTask || !activeSession) return null;
    const start = new Date(activeSession.startTime).getTime();
    if (Number.isNaN(start)) return null;
    return Math.max(0, Math.floor((nowTick - start) / (1000 * 60)));
  }, [activeSession, isSessionForSelectedTask, nowTick]);

  // Reset in-session support when switching tasks / ending session
  useEffect(() => {
    if (!isSessionForSelectedTask) {
      setInSessionSupport('');
      setIsGeneratingInSessionSupport(false);
    }
  }, [isSessionForSelectedTask, selectedTask?.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-6"
      style={{
        background: 'linear-gradient(135deg, #0F0F23 0%, #1A1A2E 50%, #16213E 100%)',
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
          FINISH MODE
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Break through the final 10%. These tasks are stuck at the finish line - let's get them
          done with psychology-backed strategies.
        </p>
      </motion.div>

      {/* Session Header (selected task context) */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-8"
      >
        <div className="glass-card p-6 border border-white/10">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                Session header
              </div>
              {selectedTask ? (
                <>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedTask.name}</h2>

                  <div className="text-sm text-gray-300 mb-4">
                    <span className="font-semibold text-cyan-300">Goal:</span>{' '}
                    {selectedPillar ? (
                      selectedPillar.name
                    ) : (
                      <span className="italic text-gray-500">unknown</span>
                    )}{' '}
                    <span className="text-gray-500">•</span>{' '}
                    <span className="font-semibold text-purple-300">Type:</span>{' '}
                    <span className="uppercase tracking-wider">{goalTypeLabel}</span>{' '}
                    <span className="text-gray-500">•</span>{' '}
                    <span className="font-semibold text-green-300">Progress:</span>{' '}
                    {selectedTask.progress}%
                    {selectedInsight?.daysInCurrentState != null && (
                      <>
                        {' '}
                        <span className="text-gray-500">•</span>{' '}
                        <span className="text-gray-400">
                          {selectedInsight.daysInCurrentState}d in current state
                        </span>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strategy */}
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                        Strategy (why / how)
                      </div>
                      {goalStrategy ? (
                        <p className="text-sm text-gray-200 whitespace-pre-wrap">
                          {goalStrategy.length > 240
                            ? `${goalStrategy.slice(0, 240)}…`
                            : goalStrategy}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          No strategy saved for this goal yet.
                        </p>
                      )}
                    </div>

                    {/* Definition of DONE */}
                    <div
                      className={`p-4 rounded-lg border ${
                        definitionOfDone
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-red-500/10 border-red-500/30'
                      }`}
                    >
                      <div className="text-xs text-gray-200 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                        <span>✅</span>
                        Definition of DONE
                      </div>

                      {definitionOfDone ? (
                        <p className="text-sm text-white whitespace-pre-wrap">{definitionOfDone}</p>
                      ) : (
                        <div className="text-sm text-red-200">
                          <p className="font-semibold mb-1">No Definition of DONE.</p>
                          <p className="text-red-200/90">
                            This increases the 90% syndrome risk. Define a concrete “done” condition
                            in the goal/task view.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-gray-300">
                  <p className="mb-1">Select a stuck task to start Finish Mode.</p>
                  <p className="text-sm text-gray-500">
                    You’ll see goal context + objective DONE definition here.
                  </p>
                </div>
              )}
            </div>

            {/* Session controls (wired to AppContext) */}
            <div className="flex flex-col items-end gap-3">
              <div className="text-xs text-gray-400 uppercase tracking-wider">Session</div>

              {selectedTask && selectedPillar ? (
                <>
                  {isSessionForSelectedTask ? (
                    <>
                      <button
                        onClick={() => setShowEndForm((v) => !v)}
                        className="py-3 px-4 rounded-lg font-bold text-white transition-all duration-200"
                        style={{
                          background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.25)',
                        }}
                      >
                        End session
                      </button>

                      <div className="text-xs text-green-200/90 text-right">
                        Active since {new Date(activeSession!.startTime).toLocaleTimeString()}
                        {sessionDurationLabel ? ` • ${sessionDurationLabel}` : ''}
                      </div>

                      {/* In-session AI support (PLAN 5.3) */}
                      <div className="mt-2 w-[280px] max-w-full space-y-2">
                        <div className="text-[11px] text-gray-300 uppercase tracking-wider font-semibold">
                          Wsparcie w sesji (tu i teraz)
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedTask || !selectedPillar || !activeSession) return;
                              setIsGeneratingInSessionSupport(true);
                              try {
                                const aiEnabled = Boolean((data as any)?.settings?.ai?.enabled);
                                if (!aiEnabled) {
                                  setInSessionSupport(
                                    'AI jest wyłączone. Włącz w Settings → AI, albo użyj Definicji DONE jako checklisty na teraz.'
                                  );
                                  return;
                                }

                                const prompt = buildFinishSessionInSessionPrompt({
                                  pillar: selectedPillar,
                                  task: selectedTask,
                                  sessionStartTime: activeSession.startTime,
                                  sessionMinutes: sessionDurationMinutes,
                                  ideas: relevantIdeas,
                                  request: 'what_now',
                                });
                                const text = await ollamaGenerateText(
                                  { prompt, temperature: 0.6, topP: 0.9, numPredict: 140, maxLen: 520 },
                                  { timeoutMs: 12_000 }
                                );
                                if (!text) {
                                  const done = definitionOfDone ? `DONE: ${definitionOfDone}` : 'Brak DONE → doprecyzuj 1 zdaniem.';
                                  setInSessionSupport(
                                    `AI niedostępne. Tu i teraz: ${done} Następny mikrokrok: zrób 5 min tylko na “ostatnie brakujące 10%”.`
                                  );
                                } else {
                                  setInSessionSupport(text);
                                }
                              } finally {
                                setIsGeneratingInSessionSupport(false);
                              }
                            }}
                            disabled={isGeneratingInSessionSupport}
                            className="px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isGeneratingInSessionSupport ? 'Generuję…' : '💡 Co robić teraz?'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedTask || !selectedPillar || !activeSession) return;
                              setIsGeneratingInSessionSupport(true);
                              try {
                                const aiEnabled = Boolean((data as any)?.settings?.ai?.enabled);
                                if (!aiEnabled) {
                                  setInSessionSupport(
                                    'AI jest wyłączone. Mikrokrok: 5 min — przeczytaj DONE i wypisz 1 brakujący punkt.'
                                  );
                                  return;
                                }

                                const prompt = buildFinishSessionInSessionPrompt({
                                  pillar: selectedPillar,
                                  task: selectedTask,
                                  sessionStartTime: activeSession.startTime,
                                  sessionMinutes: sessionDurationMinutes,
                                  ideas: relevantIdeas,
                                  request: 'micro_step',
                                });
                                const text = await ollamaGenerateText(
                                  { prompt, temperature: 0.6, topP: 0.9, numPredict: 120, maxLen: 420 },
                                  { timeoutMs: 12_000 }
                                );
                                if (!text) {
                                  setInSessionSupport(
                                    `AI niedostępne. Mikrokrok (5–10 min): wybierz 1 element z Definicji DONE i doprowadź go do “gotowe/odhaczone”.`
                                  );
                                } else {
                                  setInSessionSupport(text);
                                }
                              } finally {
                                setIsGeneratingInSessionSupport(false);
                              }
                            }}
                            disabled={isGeneratingInSessionSupport}
                            className="px-3 py-2 rounded-lg bg-purple-500/15 border border-purple-400/40 text-purple-200 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isGeneratingInSessionSupport ? 'Generuję…' : '🧩 Mikrokrok (5–10 min)'}
                          </button>
                        </div>

                        {inSessionSupport && (
                          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                            <div className="text-xs text-gray-200 whitespace-pre-wrap break-words">
                              {inSessionSupport}
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => setInSessionSupport('')}
                                className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-[11px] font-bold uppercase tracking-wider"
                              >
                                Wyczyść
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {showEndForm && (
                        <div className="mt-2 w-[280px] max-w-full space-y-2">
                          <div className="space-y-2">
                            <div className="text-[11px] text-gray-300 uppercase tracking-wider font-semibold">
                              Klasyfikacja po sesji
                            </div>

                            <div
                              className="grid grid-cols-1 gap-2"
                              role="radiogroup"
                              aria-label="Task classification"
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedStatus('done')}
                                className={`w-full px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${
                                  selectedStatus === 'done'
                                    ? 'bg-green-500/20 border-green-500/60 text-green-200'
                                    : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                                }`}
                                aria-pressed={selectedStatus === 'done'}
                              >
                                DONE (zadanie zakończone)
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedStatus('in_progress')}
                                className={`w-full px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${
                                  selectedStatus === 'in_progress'
                                    ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-200'
                                    : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                                }`}
                                aria-pressed={selectedStatus === 'in_progress'}
                              >
                                W TRAKCIE (określ następny krok)
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedStatus('stuck')}
                                className={`w-full px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${
                                  selectedStatus === 'stuck'
                                    ? 'bg-red-500/15 border-red-400/60 text-red-200'
                                    : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                                }`}
                                aria-pressed={selectedStatus === 'stuck'}
                              >
                                ZABLOKOWANE (stuck)
                              </button>
                            </div>
                          </div>

                          <label className="block text-[11px] text-gray-300 uppercase tracking-wider font-semibold">
                            Notatka / uzasadnienie (krótko)
                          </label>
                          <textarea
                            value={classificationNote}
                            onChange={(e) => setClassificationNote(e.target.value.slice(0, 500))}
                            rows={3}
                            className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 text-xs"
                            placeholder="Np. co zrobiłem, co blokuje, jaki jest następny krok."
                          />

                          {/* AI idea suggestion (optional) */}
                          <div className="pt-2 border-t border-white/10">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="text-[11px] text-gray-300 uppercase tracking-wider font-semibold">
                                Pomysły → sugestia AI (opcjonalnie)
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!selectedPillar || !selectedTask) return;
                                  setIsGeneratingIdeaSuggestion(true);
                                  try {
                                    const prompt = buildIdeaSuggestionPrompt({
                                      pillar: selectedPillar,
                                      task: selectedTask,
                                      ideas: relevantIdeas,
                                      useCase: 'finish_mode',
                                    });
                                    const text = await ollamaGenerateText(
                                      {
                                        prompt,
                                        temperature: 0.6,
                                        topP: 0.9,
                                        numPredict: 120,
                                        maxLen: 220,
                                      },
                                      { timeoutMs: 12_000 }
                                    );
                                    setIdeaSuggestion(text || 'Brak pasującego pomysłu.');
                                  } finally {
                                    setIsGeneratingIdeaSuggestion(false);
                                  }
                                }}
                                disabled={
                                  isGeneratingIdeaSuggestion || !selectedPillar || !selectedTask
                                }
                                className="px-2 py-1 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isGeneratingIdeaSuggestion ? 'Generuję…' : '🤖 Sugestia'}
                              </button>
                            </div>

                            {ideaSuggestion && (
                              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                <div className="text-xs text-gray-200 whitespace-pre-wrap break-words">
                                  {ideaSuggestion}
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                  <button
                                    type="button"
                                    onClick={() => setIdeaSuggestion('')}
                                    className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-[11px] font-bold uppercase tracking-wider"
                                  >
                                    Wyczyść
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = (classificationNote || '').trim();
                                      const append = ideaSuggestion.trim();
                                      const merged = next ? `${next}\n${append}` : append;
                                      setClassificationNote(merged.slice(0, 500));
                                    }}
                                    className="px-2 py-1 rounded-lg bg-green-500/15 border border-green-500/40 text-green-200 text-[11px] font-bold uppercase tracking-wider"
                                  >
                                    Wklej do notatki
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                if (!selectedStatus) return;
                                const run = async () => {
                                  try {
                                    setIsGeneratingSummary(true);
                                    const summary = await generateFinishSessionSummary({
                                      pillar: selectedPillar,
                                      task: selectedTask!,
                                      classification: {
                                        status: selectedStatus,
                                        note: classificationNote || undefined,
                                      },
                                      userNote: classificationNote || undefined,
                                      sessionStartTime: activeSession!.startTime,
                                      sessionEndTime: new Date().toISOString(),
                                    });

                                    endFinishSession(activeSession!.id, {
                                      status: 'completed',
                                      userNote: classificationNote || undefined,
                                      aiSummary: summary || undefined,
                                      classification: {
                                        status: selectedStatus,
                                        note: classificationNote || undefined,
                                      },
                                    });
                                  } finally {
                                    setIsGeneratingSummary(false);
                                    setClassificationNote('');
                                    setSelectedStatus(null);
                                    setShowEndForm(false);
                                    setIdeaSuggestion('');
                                  }
                                };

                                run();
                              }}
                              disabled={!selectedStatus}
                              className="px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isGeneratingSummary ? 'Generuję…' : 'Zapisz'}
                            </button>
                            <button
                              onClick={() => {
                                setShowEndForm(false);
                                setClassificationNote('');
                                setSelectedStatus(null);
                                setIdeaSuggestion('');
                              }}
                              disabled={isGeneratingSummary}
                              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Anuluj
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {isOtherSessionActive && (
                        <div className="text-xs text-yellow-200/90 text-right max-w-[280px]">
                          Another session is active
                          {otherSessionTaskName ? ` for: "${otherSessionTaskName}"` : ''}. Starting
                          here will abort it.
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (!selectedTask || !selectedPillar) return;
                          if (isOtherSessionActive) {
                            const ok = confirm(
                              'Another Finish session is active for a different task. Start here and abort the other one?'
                            );
                            if (!ok) return;
                          }
                          startFinishSession(selectedTask.id, selectedPillar.id);
                          setShowEndForm(false);
                          setClassificationNote('');
                          setSelectedStatus(null);
                        }}
                        className="py-3 px-4 rounded-lg font-bold text-white transition-all duration-200"
                        style={{
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
                        }}
                      >
                        Start session
                      </button>
                      <div className="text-xs text-gray-400 text-right max-w-[280px]">
                        No active session for this task.
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-400 text-right max-w-[280px]">
                  Select a task to start a session.
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-cyan-400 mb-2">{insights.stuckTasks.length}</div>
          <div className="text-sm text-gray-300">Tasks Stuck at 90%+</div>
        </div>

        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-purple-400 mb-2">{insights.completionRate}%</div>
          <div className="text-sm text-gray-300">Overall Completion Rate</div>
        </div>

        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-green-400 mb-2">
            {insights.averageCompletionTime}
          </div>
          <div className="text-sm text-gray-300">Avg Days to Complete</div>
        </div>
      </motion.div>

      {/* Stuck Tasks List */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <span className="text-3xl">🎯</span>
          Stuck Tasks - Break the Finish Line Barrier
        </h2>

        {stuckTasksWithInsights.length === 0 ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card p-8 text-center"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-green-400 mb-2">All Clear! No Stuck Tasks</h3>
            <p className="text-gray-300">
              Great job! All your tasks are progressing well. Keep up the momentum!
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stuckTasksWithInsights.map(({ task, insight }) => (
              <motion.div
                key={task.id}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <TaskCard
                  task={task}
                  insight={insight}
                  onClick={() => {
                    setSelectedTask(task);
                    setShowEndForm(false);
                    setClassificationNote('');
                    setSelectedStatus(null);
                  }}
                  showImplementationIntention={true}
                />

                {/* Done Criteria for selected task */}
                {selectedTask?.id === task.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4"
                  >
                    <DoneCriteria task={task} />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Implementation Intention Section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <span className="text-3xl">🧠</span>
          Implementation Intentions - Automatic Success Triggers
        </h2>

        <div className="glass-card p-6">
          <p className="text-gray-300 mb-4">
            Implementation Intentions are "if-then" plans that automatically kick in when you face
            completion barriers. They're proven to increase success rates by up to 300%!
          </p>

          <ImplementationIntentionForm
            onSubmit={activateImplementationIntention}
            isVisible={showIntentionForm}
            onToggleVisibility={() => setShowIntentionForm(!showIntentionForm)}
          />
        </div>
      </motion.div>

      {/* Psychology Tips */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <div className="glass-card p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
            <span>🎯</span>
            Zeigarnik Effect
          </h3>
          <p className="text-gray-300 text-sm">
            Incomplete tasks create mental tension. Use this to your advantage - break stuck tasks
            into micro-steps to maintain momentum.
          </p>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
            <span>🚀</span>
            Endowed Progress Effect
          </h3>
          <p className="text-gray-300 text-sm">
            Getting to 90% creates a sense of entitlement to completion. You're already invested -
            finish what you started!
          </p>
        </div>
      </motion.div>

      {/* Back Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center mt-8"
      >
        <button
          onClick={() => setCurrentView('home')}
          className="py-3 px-8 rounded-lg font-bold text-white transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
            boxShadow: '0 4px 16px rgba(107, 114, 128, 0.3)',
          }}
        >
          ← Back to Dashboard
        </button>
      </motion.div>
    </motion.div>
  );
};

// Done Criteria Component
interface DoneCriteriaProps {
  task: any;
}

export const DoneCriteria: React.FC<DoneCriteriaProps> = ({ task }) => {
  const { setData, updateTask } = useAppContext();

  // Load criteria from task data or use defaults
  const [criteria, setCriteria] = useState(() => {
    // If task has doneCriteria from database, use those
    if (task.doneCriteria && Array.isArray(task.doneCriteria)) {
      return task.doneCriteria.map((criterion: any, index: number) => ({
        id: criterion.id || Date.now() + index,
        text: criterion.text || criterion.description || '',
        completed: criterion.completed || false,
      }));
    }

    // Default criteria based on task type
    const defaultCriteria = [];
    if (task.type === 'build') {
      defaultCriteria.push(
        { id: 1, text: 'All features implemented and tested', completed: false },
        { id: 2, text: 'Code reviewed and approved', completed: false },
        { id: 3, text: 'Documentation updated', completed: false },
        { id: 4, text: 'No critical bugs remaining', completed: false }
      );
    } else if (task.type === 'close') {
      defaultCriteria.push(
        { id: 1, text: 'All deliverables submitted', completed: false },
        { id: 2, text: 'Client feedback received', completed: false },
        { id: 3, text: 'Final review completed', completed: false },
        { id: 4, text: 'Project archived properly', completed: false }
      );
    } else {
      defaultCriteria.push(
        { id: 1, text: 'Core functionality complete', completed: false },
        { id: 2, text: 'Quality checks passed', completed: false },
        { id: 3, text: 'Ready for next phase', completed: false },
        { id: 4, text: 'All dependencies resolved', completed: false }
      );
    }

    return defaultCriteria;
  });

  const saveCriteriaLocal = async (newCriteria: any[]) => {
    // Local-first: persist into AppData (IndexedDB/localStorage via storageManager).
    setData((prev) => ({
      ...prev,
      pillars: prev.pillars.map((p) => ({
        ...p,
        tasks: (p.tasks || []).map((t) =>
          t.id === task.id ? { ...(t as any), doneCriteria: newCriteria } : t
        ),
      })),
    }));
  };

  const addCriterion = async () => {
    const newCriterion = {
      id: Date.now(),
      text: '',
      completed: false,
    };
    const newCriteria = [...criteria, newCriterion];
    setCriteria(newCriteria);
    await saveCriteriaLocal(newCriteria);
  };

  const updateCriterion = async (id: number, text: string) => {
    const newCriteria = criteria.map((criterion) =>
      criterion.id === id ? { ...criterion, text } : criterion
    );
    setCriteria(newCriteria);
    await saveCriteriaLocal(newCriteria);
  };

  const removeCriterion = async (id: number) => {
    const newCriteria = criteria.filter((criterion) => criterion.id !== id);
    setCriteria(newCriteria);
    await saveCriteriaLocal(newCriteria);
  };

  const toggleCriterion = async (id: number) => {
    const newCriteria = criteria.map((criterion) =>
      criterion.id === id ? { ...criterion, completed: !criterion.completed } : criterion
    );
    setCriteria(newCriteria);
    await saveCriteriaLocal(newCriteria);
  };

  const completedCount = criteria.filter((c) => c.completed).length;
  const totalCount = criteria.length;
  const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Auto-update task progress based on criteria completion
  React.useEffect(() => {
    const updateTaskProgress = async () => {
      if (completionPercentage >= 90 && task.progress < 100) {
        try {
          // Local-first: update progress in AppContext (also persists locally)
          const nextProgress = Math.min(100, 90 + completionPercentage - 90);
          updateTask(task.id, { progress: nextProgress });
        } catch (error) {
          console.error('Failed to update task progress:', error);
        }
      }
    };

    updateTaskProgress();
  }, [completionPercentage, criteria, task.id, task.progress, updateTask]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span>✅</span>
          DONE Criteria Checklist
        </h3>
        <span className="text-sm text-gray-400">
          {completedCount}/{totalCount} completed
        </span>
      </div>

      <div className="space-y-3 mb-4">
        {criteria.map((criterion) => (
          <motion.div
            key={criterion.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <button
              onClick={() => toggleCriterion(criterion.id)}
              className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                criterion.completed
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-400 hover:border-cyan-400'
              }`}
            >
              {criterion.completed && <span className="text-white text-sm">✓</span>}
            </button>

            <input
              type="text"
              value={criterion.text}
              onChange={(e) => updateCriterion(criterion.id, e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500"
              placeholder="Enter completion criterion..."
            />

            <button
              onClick={() => removeCriterion(criterion.id)}
              className="text-gray-500 hover:text-red-400 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </div>

      <button
        onClick={addCriterion}
        className="w-full py-2 px-4 rounded-lg border-2 border-dashed border-gray-500 hover:border-cyan-400 text-gray-400 hover:text-cyan-400 transition-all duration-200"
      >
        + Add Criterion
      </button>

      {completedCount === totalCount && totalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 p-4 rounded-lg text-center"
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
          }}
        >
          <div className="text-2xl mb-2">🎉</div>
          <div className="text-white font-bold">All Criteria Met!</div>
          <div className="text-green-100 text-sm">Ready to mark as complete</div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Implementation Intention Form Component
interface ImplementationIntentionFormProps {
  onSubmit: (taskId: number) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export const ImplementationIntentionForm: React.FC<ImplementationIntentionFormProps> = ({
  onSubmit,
  isVisible,
  onToggleVisibility,
}) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [trigger, setTrigger] = useState('');
  const [action, setAction] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const { data } = useAppContext();

  const templates = [
    {
      trigger: "pomyślę 'to już prawie gotowe'",
      action: 'sprawdzę wszystkie kryteria DONE',
    },
    {
      trigger: 'zechcę sprawdzić social media',
      action: 'przypomnę sobie, że jestem blisko końca',
    },
    {
      trigger: 'usłyszę powiadomienie',
      action: 'zignoruję je i skupię się na zadaniu',
    },
    {
      trigger: 'poczuję zmęczenie',
      action: 'zrobię 5-minutową przerwę i wrócę',
    },
    {
      trigger: 'zechcę zacząć nowe zadanie',
      action: 'dokończę obecne, potem zacznę nowe',
    },
  ];

  const generateAISuggestion = async () => {
    if (!selectedTask) return;

    setIsGeneratingAI(true);
    try {
      const pillar = findPillarForTask(data, selectedTask.id);
      const prompt = buildImplementationIntentionPrompt({
        pillar,
        task: selectedTask,
        ideas: data?.ideas ?? [],
      });
      const suggestion = await ollamaGenerateText(
        { prompt, temperature: 0.8, topP: 0.9, numPredict: 80, maxLen: 160 },
        { timeoutMs: 12_000 }
      );

      if (suggestion) {
        setAiSuggestion(suggestion);
        // Try to parse and auto-fill if it's in the right format
        const match = suggestion.match(/Jeśli\s+(.+?),\s+to\s+(.+)/i);
        if (match) {
          setTrigger(match[1].trim());
          setAction(match[2].trim());
        }
      }
    } catch (error) {
      console.warn('Ollama integration failed:', error);
      setAiSuggestion('AI unavailable - using fallback templates above');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = () => {
    if (selectedTask && trigger.trim() && action.trim()) {
      onSubmit(selectedTask.id);
      // Reset form
      setSelectedTask(null);
      setTrigger('');
      setAction('');
      setAiSuggestion('');
      onToggleVisibility();
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="w-full py-3 px-6 rounded-lg font-bold text-white transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, #00F3FF 0%, #0099CC 100%)',
          boxShadow: '0 4px 16px rgba(0, 243, 255, 0.3)',
        }}
      >
        🧠 Create Implementation Intention
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-4"
    >
      {/* Task Selection */}
      <div>
        <label className="block text-sm font-bold text-white mb-2">Choose a stuck task:</label>
        <select
          value={selectedTask?.id || ''}
          onChange={(e) => {
            const task = data.pillars
              .flatMap((p) => p.tasks)
              .find((t) => t.id === parseInt(e.target.value));
            setSelectedTask((task as Task) || null);
          }}
          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
        >
          <option value="">Select a task...</option>
          {data.pillars.flatMap((pillar) =>
            pillar.tasks
              .filter((task) => task.progress >= 90 && task.progress < 100)
              .map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name} ({task.progress}%)
                </option>
              ))
          )}
        </select>
      </div>

      {/* Templates */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold text-white">Quick templates:</label>
          <button
            onClick={generateAISuggestion}
            disabled={!selectedTask || isGeneratingAI}
            className="px-3 py-1 rounded-lg text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1"
            style={{
              background: 'linear-gradient(135deg, #00F3FF 0%, #0099CC 100%)',
              boxShadow: '0 2px 8px rgba(0, 243, 255, 0.3)',
            }}
          >
            <span>🤖</span>
            {isGeneratingAI ? 'Generating...' : 'AI Suggest'}
          </button>
        </div>

        {/* AI Suggestion Display */}
        {aiSuggestion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ai-suggestion p-3 rounded-lg mb-4 border"
          >
            <div className="text-sm text-cyan-300 font-medium mb-1">🤖 AI Suggestion:</div>
            <div className="text-sm text-white">{aiSuggestion}</div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-2">
          {templates.map((template, index) => (
            <button
              key={index}
              onClick={() => {
                setTrigger(template.trigger);
                setAction(template.action);
                setAiSuggestion(''); // Clear AI suggestion when using template
              }}
              className="text-left p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
            >
              <div className="text-sm text-gray-300">
                <strong>If:</strong> {template.trigger}
                <br />
                <strong>Then:</strong> {template.action}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-white mb-2">If (situation):</label>
          <textarea
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
            placeholder="e.g., I feel tired..."
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-white mb-2">
            Then (automatic response):
          </label>
          <textarea
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
            placeholder="e.g., take a 5-min break and continue..."
            rows={3}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onToggleVisibility}
          className="flex-1 py-3 px-4 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedTask || !trigger.trim() || !action.trim()}
          className="flex-1 py-3 px-4 rounded-lg font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
          }}
        >
          Activate Intention
        </button>
      </div>
    </motion.div>
  );
};

export default FinishMode;
