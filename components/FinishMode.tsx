import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  FinishTaskStatus,
  GoalStrategy,
  GoalStrategyStructurePhase,
  GoalStrategyTactic,
  Pillar,
  Task,
} from '../types';
import { useAppContext } from '../contexts/AppContext';
import { ConfirmDialog } from './common/ConfirmDialog';
import { filterActiveNotDonePillars } from '../utils/goalHelpers';
import { isPillar } from '../utils/typeGuards';
import { secureStorage } from '../utils/secureStorage';
import { generateMicrostep, generateResiliencePlan, generateStrategy } from '../utils/aiService';
import { buildFinishSessionInSessionPrompt } from '../utils/aiPrompts';
import { providerGenerateText } from '../utils/aiProvider';
import { Sparkles } from 'lucide-react';

const SESSION_RECOMMENDED_MINUTES = 25;
const MICROSTEP_DRAFT_KEY_PREFIX = 'fg_finish_microstep_';

const formatMmSs = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

const AccordionSection: React.FC<{
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, isOpen, onToggle, children }) => {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-4 flex items-start justify-between gap-3 hover:bg-white/5 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <div className="text-white font-bold">{title}</div>
          {subtitle ? <div className="text-[11px] text-gray-400 mt-1">{subtitle}</div> : null}
        </div>
        <div className="text-neon-cyan font-black text-xl leading-none">{isOpen ? '−' : '+'}</div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="px-4 pb-4"
          >
            <div className="pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function findPillarForTask(pillars: Pillar[], taskId: number): Pillar | null {
  for (const pillar of pillars) {
    if ((pillar.tasks || []).some((t) => t.id === taskId)) return pillar;
  }
  return null;
}

function getGoalTypeLabel(type?: string): string {
  if (!type) return 'brak';
  const normalized = type.toLowerCase().trim();
  if (normalized === 'main') return 'main';
  if (normalized === 'secondary') return 'secondary';
  if (normalized === 'lab') return 'lab';
  return type;
}

export const FinishMode: React.FC = () => {
  const {
    data,
    setCurrentView,
    setActiveProjectId,
    activeProjectId,
    currentFinishSession,
    startFinishSession,
    endFinishSession,
    activateImplementationIntention,
    updatePillar,
  } = useAppContext();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [microStep, setMicroStep] = useState('');
  const [isGeneratingMicroStep, setIsGeneratingMicroStep] = useState(false);
  const [strategyDraft, setStrategyDraft] = useState('');
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [isSavingStrategy, setIsSavingStrategy] = useState(false);

  const [supportSectionsOpen, setSupportSectionsOpen] = useState<Record<string, boolean>>(() => ({
    done: false,
    strategy: false,
    stuck: false,
    ifthen: false,
    ai: false,
  }));

  const toggleSupportSection = (key: string) => {
    setSupportSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // End-session question
  const [showEndForm, setShowEndForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<FinishTaskStatus | null>(null);
  const [classificationNote, setClassificationNote] = useState('');
  const [isSavingEndForm, setIsSavingEndForm] = useState(false);

  // In-session AI helper
  const [inSessionSupport, setInSessionSupport] = useState('');
  const [isGeneratingInSessionSupport, setIsGeneratingInSessionSupport] = useState(false);

  const [showIntentionForm, setShowIntentionForm] = useState(false);

  // Other-session interrupt confirm
  const [isInterruptConfirmOpen, setIsInterruptConfirmOpen] = useState(false);

  // Lightweight tick while session active (React state only)
  const [nowTick, setNowTick] = useState(() => Date.now());

  const pillars = Array.isArray(data?.pillars) ? data.pillars : [];
  const settingsAi = (data as any)?.settings?.ai;
  const aiEnabled = Boolean(settingsAi?.enabled);
  const aiApiKey = (secureStorage.getApiKey() || String(settingsAi?.apiKey ?? '').trim()).trim();
  const canUseAI = aiEnabled && Boolean(aiApiKey);
  const aiHint = !aiEnabled
    ? 'AI jest wyłączone w Ustawieniach.'
    : !aiApiKey
      ? 'Wymagany klucz AI w Ustawieniach (⚙).'
      : '';

  const selectableTasks = useMemo(() => {
    const activePillars = filterActiveNotDonePillars(pillars);
    const list: Array<{ task: Task; pillar: Pillar }> = [];

    for (const p of activePillars.filter(isPillar)) {
      const tasks = Array.isArray(p.tasks) ? (p.tasks as Task[]) : [];
      for (const t of tasks) {
        if (!t) continue;
        if (t.progress >= 100 || t.status === 'done' || t.status === 'abandoned') continue;
        list.push({ task: t, pillar: p });
      }
    }

    // Prefer close tasks and higher progress (finish-first)
    return list.sort((a, b) => {
      const aClose = a.task.type === 'close' ? 1 : 0;
      const bClose = b.task.type === 'close' ? 1 : 0;
      if (aClose !== bClose) return bClose - aClose;
      const byProgress = Number(b.task.progress ?? 0) - Number(a.task.progress ?? 0);
      if (byProgress !== 0) return byProgress;
      const byPillar = String(a.pillar.name || '').localeCompare(String(b.pillar.name || ''));
      if (byPillar !== 0) return byPillar;
      return Number(a.task.id) - Number(b.task.id);
    });
  }, [pillars]);

  const activeSession =
    currentFinishSession &&
    currentFinishSession.status === 'in_progress' &&
    currentFinishSession.endTime == null
      ? currentFinishSession
      : null;

  const activeSessionMicroStep = useMemo(() => {
    const raw = (activeSession as any)?.microStep;
    return typeof raw === 'string' ? raw.trim() : '';
  }, [activeSession]);

  const clearMicroStepDraft = (taskId?: number | null) => {
    const id = Number(taskId);
    if (!Number.isFinite(id)) return;
    try {
      const key = `${MICROSTEP_DRAFT_KEY_PREFIX}${id}`;
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  };

  // If there is an active finish session: auto-select its task
  useEffect(() => {
    if (!activeSession) return;
    const sessionTask = pillars.flatMap((p) => p.tasks).find((t) => t.id === activeSession.taskId);
    if (sessionTask) setSelectedTask(sessionTask as Task);
  }, [activeSession?.id, activeSession?.taskId, pillars]);

  // Load microStep from: active session -> local draft -> empty (per selected task)
  useEffect(() => {
    if (!selectedTask) return;
    // If there is an active session for this task, prefer its stored microStep.
    if (activeSession && activeSession.taskId === selectedTask.id) {
      setMicroStep(activeSessionMicroStep);
      return;
    }
    try {
      const key = `${MICROSTEP_DRAFT_KEY_PREFIX}${selectedTask.id}`;
      const draft = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (draft && typeof draft === 'string') {
        setMicroStep(draft.trim().slice(0, 160));
      } else {
        setMicroStep('');
      }
    } catch {
      setMicroStep('');
    }
  }, [activeSession?.id, activeSessionMicroStep, selectedTask?.id]);

  const selectedPillar = useMemo(() => {
    if (!selectedTask) return null;
    return findPillarForTask(pillars, selectedTask.id);
  }, [pillars, selectedTask]);

  const goalTypeLabel = useMemo(() => {
    const raw =
      (selectedPillar as any)?.type ??
      (selectedPillar as any)?.goalType ??
      (selectedPillar as any)?.pillarType;
    return getGoalTypeLabel(raw);
  }, [selectedPillar]);

  const definitionOfDone = (selectedTask?.definitionOfDone || '').trim();

  const selectedGoalStrategy = useMemo<GoalStrategy | null>(() => {
    if (!selectedPillar) return null;
    const raw = (selectedPillar as any)?.strategy;
    if (raw && typeof raw === 'object') return raw as GoalStrategy;
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (s.startsWith('{') && s.endsWith('}')) {
        try {
          const parsed = JSON.parse(s);
          if (parsed && typeof parsed === 'object') return parsed as GoalStrategy;
        } catch {
          // ignore
        }
      }
    }
    return null;
  }, [selectedPillar]);

  const strategyVision = useMemo(() => {
    const fromObj =
      typeof (selectedGoalStrategy as any)?.vision === 'string'
        ? (selectedGoalStrategy as any).vision
        : '';
    const fromText =
      typeof (selectedPillar as any)?.strategyText === 'string'
        ? String((selectedPillar as any).strategyText)
        : '';
    return (fromObj || fromText || '').trim();
  }, [selectedGoalStrategy, selectedPillar]);

  useEffect(() => {
    setStrategyDraft(strategyVision);
    setIsGeneratingStrategy(false);
    setIsSavingStrategy(false);
  }, [(selectedPillar as any)?.id, strategyVision]);

  const strategyObstacles = useMemo(() => {
    const list = Array.isArray((selectedGoalStrategy as any)?.obstacles)
      ? (selectedGoalStrategy as any).obstacles
      : [];
    return list;
  }, [selectedGoalStrategy]);

  const strategyStructureSummary = useMemo(() => {
    return String((selectedGoalStrategy as any)?.structure?.summary ?? '').trim();
  }, [selectedGoalStrategy]);

  const strategyStructurePhases = useMemo<GoalStrategyStructurePhase[]>(() => {
    const phases = Array.isArray((selectedGoalStrategy as any)?.structure?.phases)
      ? ((selectedGoalStrategy as any).structure.phases as GoalStrategyStructurePhase[])
      : [];
    return [...phases].sort((a, b) => {
      const ao = typeof (a as any).order === 'number' ? (a as any).order : 9999;
      const bo = typeof (b as any).order === 'number' ? (b as any).order : 9999;
      if (ao !== bo) return ao - bo;
      return String(a?.title ?? '').localeCompare(String(b?.title ?? ''));
    });
  }, [selectedGoalStrategy]);

  const strategyTactics = useMemo<GoalStrategyTactic[]>(() => {
    const tactics = Array.isArray((selectedGoalStrategy as any)?.tactics)
      ? ((selectedGoalStrategy as any).tactics as GoalStrategyTactic[])
      : [];
    return [...tactics].sort((a, b) => {
      const aa = (a as any).isActive === false ? 0 : 1;
      const ba = (b as any).isActive === false ? 0 : 1;
      if (aa !== ba) return ba - aa; // active first
      return String(a?.title ?? '').localeCompare(String(b?.title ?? ''));
    });
  }, [selectedGoalStrategy]);

  const isSessionForSelectedTask = Boolean(
    activeSession && selectedTask && activeSession.taskId === selectedTask.id
  );
  const isOtherSessionActive = Boolean(
    activeSession && selectedTask && activeSession.taskId !== selectedTask.id
  );

  const otherSessionTaskName = useMemo(() => {
    if (!activeSession) return null;
    const t = pillars.flatMap((p) => p.tasks).find((x) => x.id === activeSession.taskId);
    return (t as any)?.name || null;
  }, [activeSession?.taskId, pillars]);

  // Tick while the selected task session is active
  useEffect(() => {
    if (!isSessionForSelectedTask || !activeSession) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeSession?.id, isSessionForSelectedTask]);

  const sessionDurationMinutes = useMemo(() => {
    if (!isSessionForSelectedTask || !activeSession) return null;
    const startMs = new Date(activeSession.startTime).getTime();
    if (Number.isNaN(startMs)) return null;
    return Math.max(0, Math.floor((nowTick - startMs) / (1000 * 60)));
  }, [activeSession?.startTime, isSessionForSelectedTask, nowTick]);

  const sessionRemainingSeconds = useMemo(() => {
    if (!isSessionForSelectedTask || !activeSession) return null;
    const startMs = new Date(activeSession.startTime).getTime();
    if (Number.isNaN(startMs)) return null;
    const elapsedSeconds = Math.max(0, Math.floor((nowTick - startMs) / 1000));
    return Math.max(0, SESSION_RECOMMENDED_MINUTES * 60 - elapsedSeconds);
  }, [activeSession?.startTime, isSessionForSelectedTask, nowTick]);

  const isSessionTimeUp = Boolean(
    isSessionForSelectedTask && activeSession && sessionRemainingSeconds === 0
  );

  // If DONE is missing, open DONE accordion in setup.
  useEffect(() => {
    if (!selectedTask) return;
    if (isSessionForSelectedTask) return;
    if (definitionOfDone) return;
    setSupportSectionsOpen((prev) => ({ ...prev, done: true }));
  }, [definitionOfDone, isSessionForSelectedTask, selectedTask?.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-6 bg-dark-bg"
    >
      {/* Top-bar navigation (dock is hidden in Finish Mode) */}
      <div className="sticky top-0 z-40 -mx-6 mb-6">
        <div
          className="bg-black/50 backdrop-blur border-b border-white/10"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="h-12 px-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentView('home')}
              className="text-sm font-bold text-gray-200 hover:text-white"
            >
              ← Wróć
            </button>
            <div className="text-xs text-gray-300 font-bold uppercase tracking-wider">
              Domykanie
            </div>
            <div className="w-[50px]" />
          </div>
        </div>
      </div>

      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
          TRYB DOMYKANIA
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Task → Mikrokrok → Sesja. Jedna rzecz naraz.
        </p>
      </motion.div>

      {/* Session-first card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.12 }}
      >
        <div className="glass-card p-6 border border-white/10">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">
              Tryb sesji
            </div>
            {selectedTask && !isSessionForSelectedTask ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedTask(null);
                  setMicroStep('');
                  setShowEndForm(false);
                  setSelectedStatus(null);
                  setClassificationNote('');
                  setInSessionSupport('');
                }}
                className="text-xs font-bold text-gray-300 hover:text-white"
              >
                ← Zmień zadanie
              </button>
            ) : null}
          </div>

          {!selectedTask ? (
            <>
              <div className="text-sm text-gray-300 mb-4">
                Wybierz 1 zadanie do domknięcia. To ma zająć 30 sekund.
              </div>
              <div className="space-y-3">
                {selectableTasks.slice(0, 12).map(({ task, pillar }) => (
                  <button
                    key={`${pillar.id}_${task.id}`}
                    type="button"
                    onClick={() => {
                      setSelectedTask(task);
                      setActiveProjectId(pillar.id);
                      setMicroStep('');
                      setShowEndForm(false);
                      setSelectedStatus(null);
                      setClassificationNote('');
                      setInSessionSupport('');
                    }}
                    className="w-full text-left p-4 rounded-lg bg-white/5 border border-white/10 hover:border-neon-cyan/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-bold break-words">{task.name}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Cel: {pillar.name} • {Math.round(Number(task.progress ?? 0))}% • typ:{' '}
                          {task.type === 'close' ? 'domykanie' : 'budowanie'}
                        </div>
                      </div>
                      <div className="text-neon-cyan font-black text-xl">→</div>
                    </div>
                  </button>
                ))}
              </div>

              {selectableTasks.length === 0 ? (
                <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-white font-bold mb-1">Brak zadań do domknięcia.</div>
                  <div className="text-sm text-gray-300">
                    Dodaj przynajmniej 1 zadanie z Definicją DONE w widoku celu, a potem wróć tutaj.
                  </div>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const active = pillars.filter(
                          (p: any) =>
                            p && p.status !== 'done' && (p.activation ?? 'active') === 'active'
                        );
                        const byMain = active.find((p: any) => p.type === 'main') || null;
                        const targetId = Number(
                          activeProjectId ?? (byMain ? byMain.id : (active[0]?.id ?? null))
                        );
                        if (Number.isFinite(targetId)) {
                          setActiveProjectId(targetId);
                          setCurrentView('pillar_detail');
                        } else {
                          setCurrentView('home');
                        }
                      }}
                      className="btn-premium btn-magenta"
                    >
                      Otwórz cel i dodaj zadanie
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentView('home')}
                      className="btn-premium btn-cyan"
                    >
                      ← Pulpit
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {/* A: Task */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold text-white break-words">{selectedTask.name}</h2>
                  <div className="text-sm text-gray-300 mt-2">
                    <span className="font-semibold text-cyan-300">Cel:</span>{' '}
                    {selectedPillar ? (
                      selectedPillar.name
                    ) : (
                      <span className="italic text-gray-500">nieznany</span>
                    )}{' '}
                    <span className="text-gray-500">•</span>{' '}
                    <span className="font-semibold text-purple-300">Typ:</span>{' '}
                    <span className="uppercase tracking-wider">{goalTypeLabel}</span>{' '}
                    <span className="text-gray-500">•</span>{' '}
                    <span className="font-semibold text-green-300">Postęp:</span>{' '}
                    {selectedTask.progress}%
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                    Sesja ({SESSION_RECOMMENDED_MINUTES} min)
                  </div>
                  {isSessionForSelectedTask && activeSession ? (
                    <div className="p-3 rounded-lg bg-black/30 border border-neon-cyan/25 text-right min-w-[220px]">
                      <div className="text-[11px] text-gray-300 uppercase tracking-wider font-semibold">
                        Pozostało
                      </div>
                      <div className="text-3xl font-black text-neon-cyan">
                        {formatMmSs(sessionRemainingSeconds ?? 0)}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        Start: {new Date(activeSession.startTime).toLocaleTimeString()}
                        {sessionDurationMinutes != null ? ` • ${sessionDurationMinutes} min` : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-400 text-right">
                      Brak aktywnej sesji dla tego zadania.
                    </div>
                  )}
                </div>
              </div>

              {/* A: Mikrokrok */}
              <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs text-gray-300 uppercase tracking-wider font-semibold mb-2">
                  Mikrokrok (5 min)
                </div>
                <textarea
                  value={microStep}
                  onChange={(e) => {
                    const next = e.target.value.slice(0, 160);
                    setMicroStep(next);
                    if (!selectedTask) return;
                    if (isSessionForSelectedTask) return; // during session we keep the stored session microStep
                    try {
                      const key = `${MICROSTEP_DRAFT_KEY_PREFIX}${selectedTask.id}`;
                      if (typeof window !== 'undefined') window.localStorage.setItem(key, next);
                    } catch {
                      // ignore
                    }
                  }}
                  rows={2}
                  disabled={isSessionForSelectedTask}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 text-sm disabled:opacity-60"
                  placeholder="Jaki jest pierwszy krok na 5 minut?"
                />
                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedTask || !selectedPillar) return;
                      setIsGeneratingMicroStep(true);
                      try {
                        if (!canUseAI) {
                          setMicroStep(
                            microStep ||
                              (aiEnabled
                                ? 'Brak klucza AI. Mikrokrok: doprecyzuj DONE (1 zdanie) i zrób pierwszy punkt.'
                                : 'AI wyłączone. Mikrokrok: 5 minut tylko na 1 brakujący element DONE.')
                          );
                          return;
                        }

                        const text = await generateMicrostep({
                          apiKey: aiApiKey,
                          taskName: selectedTask.name,
                          context: {
                            goalName: selectedPillar?.name,
                            progress: selectedTask.progress,
                            definitionOfDone: (selectedTask.definitionOfDone || '').trim(),
                            strategyVision,
                          },
                        });
                        if (text) setMicroStep(String(text).trim().slice(0, 160));
                      } finally {
                        setIsGeneratingMicroStep(false);
                      }
                    }}
                    disabled={isGeneratingMicroStep || isSessionForSelectedTask}
                    className="btn-premium btn-cyan text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!canUseAI ? aiHint : undefined}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Sparkles size={16} />
                      <span>{isGeneratingMicroStep ? 'Myślę…' : 'Sugestia (Coach)'}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedTask) clearMicroStepDraft(selectedTask.id);
                      setMicroStep('');
                    }}
                    disabled={isSessionForSelectedTask}
                    className="btn-premium btn-cyan text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Wyczyść
                  </button>
                </div>
                {!canUseAI && aiHint ? (
                  <div className="mt-2 text-[11px] text-gray-400">{aiHint}</div>
                ) : null}
              </div>

              {/* A: Timer / Start / Stop */}
              <div className="mt-4">
                {isSessionForSelectedTask && activeSession ? (
                  <>
                    {isSessionTimeUp && (
                      <div className="p-4 rounded-lg bg-black/30 border border-gold/25">
                        <div className="text-white font-bold">
                          ⏱️ {SESSION_RECOMMENDED_MINUTES} min minęło. Udało się?
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              endFinishSession(activeSession.id, {
                                status: 'completed',
                                classification: { status: 'done' },
                              });
                              clearMicroStepDraft(activeSession.taskId);
                              setMicroStep('');
                              setShowEndForm(false);
                              setSelectedStatus(null);
                              setClassificationNote('');
                              setSelectedTask(null);
                            }}
                            className="btn-premium btn-magenta"
                          >
                            DONE
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              endFinishSession(activeSession.id, {
                                status: 'completed',
                                classification: { status: 'in_progress' },
                              });
                              setMicroStep('');
                              setShowEndForm(false);
                              setSelectedStatus(null);
                              setClassificationNote('');
                            }}
                            className="btn-premium btn-cyan"
                          >
                            Jeszcze nie
                          </button>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-2">
                          Jeśli „Jeszcze nie” — dopisz nowy mikrokrok i zrób kolejne{' '}
                          {SESSION_RECOMMENDED_MINUTES} min.
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowEndForm((v) => !v)}
                      className="btn-premium btn-cyan w-full mt-3"
                    >
                      Zakończ sesję (DONE / Postęp / Utknąłem)
                    </button>

                    {showEndForm && (
                      <div className="mt-3 p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                        <div className="text-[11px] text-gray-300 uppercase tracking-wider font-semibold">
                          Udało się?
                        </div>

                        <div
                          className="grid grid-cols-1 gap-2"
                          role="radiogroup"
                          aria-label="Status po sesji"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedStatus('done')}
                            className={`w-full min-h-[44px] px-3 py-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${
                              selectedStatus === 'done'
                                ? 'bg-success-500/20 border-success-500/60 text-success-200'
                                : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                            }`}
                            aria-pressed={selectedStatus === 'done'}
                          >
                            DONE
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedStatus('in_progress')}
                            className={`w-full min-h-[44px] px-3 py-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${
                              selectedStatus === 'in_progress'
                                ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-200'
                                : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                            }`}
                            aria-pressed={selectedStatus === 'in_progress'}
                          >
                            Jeszcze nie
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedStatus('stuck')}
                            className={`w-full min-h-[44px] px-3 py-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${
                              selectedStatus === 'stuck'
                                ? 'bg-error-500/15 border-error-500/60 text-error-200'
                                : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                            }`}
                            aria-pressed={selectedStatus === 'stuck'}
                          >
                            Utknąłem
                          </button>
                        </div>

                        <label className="block text-[11px] text-gray-300 uppercase tracking-wider font-semibold">
                          Notatka (1 zdanie)
                        </label>
                        <textarea
                          value={classificationNote}
                          onChange={(e) => setClassificationNote(e.target.value.slice(0, 200))}
                          rows={2}
                          className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 text-xs"
                          placeholder="Np. następny krok: ..."
                        />

                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            disabled={!selectedStatus || isSavingEndForm}
                            onClick={async () => {
                              if (!selectedStatus || !activeSession) return;
                              setIsSavingEndForm(true);
                              try {
                                endFinishSession(activeSession.id, {
                                  status: 'completed',
                                  userNote: classificationNote.trim() || undefined,
                                  classification: {
                                    status: selectedStatus,
                                    note: classificationNote.trim() || undefined,
                                  },
                                });
                              } finally {
                                setIsSavingEndForm(false);
                                setShowEndForm(false);
                                const status = selectedStatus;
                                setSelectedStatus(null);
                                setClassificationNote('');
                                setMicroStep('');
                                if (status === 'done') {
                                  clearMicroStepDraft(activeSession.taskId);
                                  setSelectedTask(null);
                                }
                              }
                            }}
                            className="min-h-[44px] px-3 py-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSavingEndForm ? 'Zapisuję…' : 'Zapisz'}
                          </button>
                          <button
                            type="button"
                            disabled={isSavingEndForm}
                            onClick={() => {
                              setShowEndForm(false);
                              setSelectedStatus(null);
                              setClassificationNote('');
                            }}
                            className="min-h-[44px] px-3 py-3 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <div className="mb-2 text-xs text-yellow-200/90">
                        Inna sesja jest aktywna
                        {otherSessionTaskName ? ` („${otherSessionTaskName}”)` : ''}. Start tutaj ją
                        przerwie.
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedTask || !selectedPillar) return;
                        if (isOtherSessionActive) {
                          setIsInterruptConfirmOpen(true);
                          return;
                        }
                        startFinishSession(selectedTask.id, selectedPillar.id, { microStep });
                        setShowEndForm(false);
                        setSelectedStatus(null);
                        setClassificationNote('');
                      }}
                      className="btn-premium btn-magenta w-full"
                    >
                      Start sesję ({SESSION_RECOMMENDED_MINUTES} min)
                    </button>
                    <ConfirmDialog
                      isOpen={isInterruptConfirmOpen}
                      title="Przerwać inną sesję?"
                      description="Inna sesja Trybu Domykania jest aktywna dla innego zadania. Jeśli rozpoczniesz tutaj, tamta sesja zostanie przerwana."
                      confirmLabel="Tak, rozpocznij tutaj"
                      cancelLabel="Wróć"
                      tone="danger"
                      onCancel={() => setIsInterruptConfirmOpen(false)}
                      onConfirm={() => {
                        setIsInterruptConfirmOpen(false);
                        if (!selectedTask || !selectedPillar) return;
                        startFinishSession(selectedTask.id, selectedPillar.id, { microStep });
                        setShowEndForm(false);
                        setSelectedStatus(null);
                        setClassificationNote('');
                      }}
                    />
                  </>
                )}
              </div>

              {/* B: Support accordions */}
              <div className="mt-6 space-y-3">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                  Wsparcie (opcjonalnie)
                </div>

                <AccordionSection
                  title="Definicja DONE"
                  subtitle="Nie odhaczaj „prawie”. Zrób DONE według kryteriów."
                  isOpen={Boolean(supportSectionsOpen.done)}
                  onToggle={() => toggleSupportSection('done')}
                >
                  {definitionOfDone ? (
                    <div className="text-sm text-white whitespace-pre-wrap">{definitionOfDone}</div>
                  ) : (
                    <div className="text-sm text-red-200">
                      <div className="font-semibold">Brak definicji DONE.</div>
                      <div className="text-red-200/90 mt-1">
                        Dopisz 3 konkretne punkty w zadaniu.
                      </div>
                    </div>
                  )}
                  <div className="mt-4">
                    <DoneCriteria task={selectedTask} />
                  </div>
                </AccordionSection>

                <AccordionSection
                  title="Strategia (Jak to zrobić?)"
                  subtitle="Jedna linia: po co i jak podejść."
                  isOpen={Boolean(supportSectionsOpen.strategy)}
                  onToggle={() => toggleSupportSection('strategy')}
                >
                  <div className="text-[11px] text-gray-400 mb-2">
                    Architekt: 2–3 punkty. Bez emocji. Konkret.
                  </div>

                  <textarea
                    value={strategyDraft}
                    onChange={(e) => setStrategyDraft(e.target.value.slice(0, 420))}
                    rows={4}
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 text-sm"
                    placeholder="Np.\n- 1) Zrób X\n- 2) Zrób Y\n- STOP, gdy DONE spełnione"
                  />

                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      disabled={!selectedTask || !selectedPillar || isGeneratingStrategy}
                      title={!canUseAI ? aiHint : undefined}
                      onClick={async () => {
                        if (!selectedTask || !selectedPillar) return;
                        setIsGeneratingStrategy(true);
                        try {
                          if (!canUseAI) {
                            const fallback = definitionOfDone
                              ? `- Sprawdź DONE i wybierz 1 brakujący punkt\n- Zrób go teraz (bez dopieszczania)\n- STOP, gdy DONE spełnione`
                              : `- Dopisz 3 punkty Definicji DONE\n- Zrób pierwszy punkt w 5–10 min\n- STOP, gdy DONE spełnione`;
                            setStrategyDraft((prev) =>
                              String(prev || '').trim() ? prev : fallback
                            );
                            return;
                          }
                          const text = await generateStrategy({
                            apiKey: aiApiKey,
                            taskName: selectedTask.name,
                            context: {
                              goalName: selectedPillar.name,
                              progress: selectedTask.progress,
                              definitionOfDone: (selectedTask.definitionOfDone || '').trim(),
                            },
                          });
                          if (text) setStrategyDraft(String(text).trim().slice(0, 420));
                        } finally {
                          setIsGeneratingStrategy(false);
                        }
                      }}
                      className="btn-premium btn-cyan text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Sparkles size={16} />
                        <span>{isGeneratingStrategy ? 'Myślę…' : 'Generuj (Architekt)'}</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={!selectedPillar || isSavingStrategy}
                      onClick={async () => {
                        if (!selectedPillar) return;
                        setIsSavingStrategy(true);
                        try {
                          const next = String(strategyDraft || '').trim();
                          const raw = (selectedPillar as any)?.strategy;
                          if (raw && typeof raw === 'object') {
                            updatePillar((selectedPillar as any).id, {
                              strategy: { ...(raw as any), vision: next } as any,
                            });
                          } else {
                            updatePillar((selectedPillar as any).id, { strategyText: next });
                          }
                        } finally {
                          setIsSavingStrategy(false);
                        }
                      }}
                      className="btn-premium btn-magenta text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingStrategy ? 'Zapisuję…' : 'Zapisz strategię'}
                    </button>
                  </div>

                  {!canUseAI && aiHint ? (
                    <div className="mt-2 text-[11px] text-gray-400">{aiHint}</div>
                  ) : null}

                  {/* PLAN_v2: structure + tactics */}
                  <div className="mt-4 space-y-3">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                      PLAN_v2: Struktura i taktyki
                    </div>

                    {/* Structure summary */}
                    <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                      <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                        Struktura (skrót)
                      </div>
                      {strategyStructureSummary ? (
                        <div className="mt-2 text-sm text-gray-200 whitespace-pre-wrap">
                          {strategyStructureSummary}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-gray-500 italic">
                          Brak. Dodaj w edycji celu → Strategia → Struktura.
                        </div>
                      )}
                    </div>

                    {/* Phases */}
                    <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                          Etapy (phases)
                        </div>
                        {strategyStructurePhases.length > 0 ? (
                          <div className="text-[11px] text-gray-500">
                            {strategyStructurePhases.length} szt.
                          </div>
                        ) : null}
                      </div>
                      {strategyStructurePhases.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {strategyStructurePhases.slice(0, 6).map((ph, idx) => (
                            <div
                              key={ph.id || idx}
                              className="p-3 rounded-lg bg-white/5 border border-white/10"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-white text-sm font-semibold break-words">
                                    {String(ph.title || '').trim() || 'Etap'}
                                  </div>
                                  <div className="text-[11px] text-gray-400 mt-1">
                                    Status: {String((ph as any).status ?? 'not_started')}
                                    {typeof (ph as any).order === 'number'
                                      ? ` • #${(ph as any).order}`
                                      : ''}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled={isSessionForSelectedTask}
                                  onClick={() => {
                                    const title = String(ph.title || '').trim();
                                    const desc = String((ph as any).description || '').trim();
                                    const base = title ? `Etap: ${title}` : 'Etap: (nienazwany)';
                                    const hint = desc ? ` — ${desc}` : '';
                                    setMicroStep(`${base}${hint}`.slice(0, 160));
                                  }}
                                  className="min-h-[36px] px-3 rounded-lg bg-white/5 border border-white/10 text-gray-200 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={
                                    isSessionForSelectedTask
                                      ? 'Sesja trwa — zatrzymaj, żeby zmienić mikrokrok.'
                                      : 'Ustaw jako mikrokrok'
                                  }
                                >
                                  Ustaw mikrokrok
                                </button>
                              </div>
                              {String((ph as any).description || '').trim() ? (
                                <div className="mt-2 text-xs text-gray-300 whitespace-pre-wrap">
                                  {String((ph as any).description || '').trim()}
                                </div>
                              ) : null}
                            </div>
                          ))}
                          {strategyStructurePhases.length > 6 ? (
                            <div className="text-[11px] text-gray-500">
                              + {strategyStructurePhases.length - 6} więcej (zobacz w edycji celu)
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-gray-500 italic">
                          Brak etapów. Dodaj w edycji celu → Strategia → Struktura.
                        </div>
                      )}
                    </div>

                    {/* Tactics */}
                    <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                          Taktyki (tactics)
                        </div>
                        {strategyTactics.length > 0 ? (
                          <div className="text-[11px] text-gray-500">
                            {strategyTactics.length} szt.
                          </div>
                        ) : null}
                      </div>
                      {strategyTactics.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {strategyTactics.slice(0, 6).map((t, idx) => {
                            const isActive = (t as any).isActive !== false;
                            const tags = Array.isArray((t as any).tags) ? (t as any).tags : [];
                            return (
                              <div
                                key={t.id || idx}
                                className="p-3 rounded-lg bg-white/5 border border-white/10"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-white text-sm font-semibold break-words">
                                      {String(t.title || '').trim() || 'Taktyka'}
                                    </div>
                                    <div className="text-[11px] mt-1">
                                      <span
                                        className={
                                          isActive
                                            ? 'text-green-300 font-bold'
                                            : 'text-gray-500 font-bold'
                                        }
                                      >
                                        {isActive ? 'Aktywna' : 'Wyłączona'}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={isSessionForSelectedTask || !isActive}
                                    onClick={() => {
                                      const title = String(t.title || '').trim();
                                      const desc = String((t as any).description || '').trim();
                                      const base = title ? `Taktyka: ${title}` : 'Taktyka';
                                      const hint = desc ? ` — ${desc}` : '';
                                      setMicroStep(`${base}${hint}`.slice(0, 160));
                                    }}
                                    className="min-h-[36px] px-3 rounded-lg bg-white/5 border border-white/10 text-gray-200 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={
                                      !isActive
                                        ? 'Taktyka jest wyłączona.'
                                        : isSessionForSelectedTask
                                          ? 'Sesja trwa — zatrzymaj, żeby zmienić mikrokrok.'
                                          : 'Ustaw jako mikrokrok'
                                    }
                                  >
                                    Ustaw mikrokrok
                                  </button>
                                </div>
                                {String((t as any).description || '').trim() ? (
                                  <div className="mt-2 text-xs text-gray-300 whitespace-pre-wrap">
                                    {String((t as any).description || '').trim()}
                                  </div>
                                ) : null}
                                {tags.length > 0 ? (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {tags.slice(0, 8).map((tag: any, i: number) => (
                                      <span
                                        key={`${String(t.id || idx)}_${i}`}
                                        className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300"
                                      >
                                        {String(tag)}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                          {strategyTactics.length > 6 ? (
                            <div className="text-[11px] text-gray-500">
                              + {strategyTactics.length - 6} więcej (zobacz w edycji celu)
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-gray-500 italic">
                          Brak taktyk. Dodaj w edycji celu → Strategia → Taktyki.
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionSection>

                <AccordionSection
                  title="Dlaczego to wisi?"
                  subtitle="Boję się zacząć / utknąłem — wybierz 1 przeszkodę."
                  isOpen={Boolean(supportSectionsOpen.stuck)}
                  onToggle={() => toggleSupportSection('stuck')}
                >
                  <div className="text-sm text-gray-300">
                    To normalne, że mózg odpala opór przy finiszu. Nie walcz z tym — zrób mikrokrok.
                  </div>
                  {Array.isArray(strategyObstacles) && strategyObstacles.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {strategyObstacles.slice(0, 6).map((o: any) => (
                        <div
                          key={String(o?.id ?? `${Math.random()}`)}
                          className="p-3 rounded-lg bg-black/30 border border-white/10"
                        >
                          <div className="text-white text-sm font-semibold">
                            {String(o?.description ?? '').trim() || 'Przeszkoda'}
                          </div>
                          {String(o?.countermeasure ?? '').trim() ? (
                            <div className="text-xs text-gray-300 mt-1">
                              Plan B: {String(o.countermeasure).trim()}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-gray-500 italic">
                      Brak zapisanych przeszkód dla tego celu.
                    </div>
                  )}
                </AccordionSection>

                <AccordionSection
                  title="Plan awaryjny (Gdy–To)"
                  subtitle="Zabezpiecz się przed porzuceniem: 1 prosty plan."
                  isOpen={Boolean(supportSectionsOpen.ifthen)}
                  onToggle={() => toggleSupportSection('ifthen')}
                >
                  <ImplementationIntentionForm
                    onSubmit={(taskId: number, payload) =>
                      activateImplementationIntention(taskId, payload)
                    }
                    isVisible={showIntentionForm}
                    onToggleVisibility={() => setShowIntentionForm((v) => !v)}
                  />
                </AccordionSection>

                <AccordionSection
                  title="Wsparcie AI (tu i teraz)"
                  subtitle="Jedno pytanie. Jedna odpowiedź."
                  isOpen={Boolean(supportSectionsOpen.ai)}
                  onToggle={() => toggleSupportSection('ai')}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedTask || !selectedPillar || !activeSession) {
                          setInSessionSupport(
                            'Najpierw rozpocznij sesję, a potem poproś o wsparcie.'
                          );
                          return;
                        }
                        setIsGeneratingInSessionSupport(true);
                        try {
                          const aiEnabled = Boolean((data as any)?.settings?.ai?.enabled);
                          if (!aiEnabled) {
                            setInSessionSupport(
                              'AI jest wyłączone. Włącz w Ustawieniach (⚙) → Asystent AI.'
                            );
                            return;
                          }
                          const apiKey =
                            secureStorage.getApiKey() ||
                            String((data as any)?.settings?.ai?.apiKey ?? '').trim();
                          if (!apiKey) {
                            setInSessionSupport(
                              'AI włączone, ale brakuje klucza API (Ustawienia → Asystent AI).'
                            );
                            return;
                          }
                          const prompt = buildFinishSessionInSessionPrompt({
                            pillar: selectedPillar,
                            task: selectedTask,
                            sessionStartTime: activeSession.startTime,
                            sessionMinutes: sessionDurationMinutes,
                            microStep: (activeSession as any)?.microStep || microStep,
                            ideas: (data as any)?.ideas ?? [],
                            request: 'what_now',
                          });
                          const text = await providerGenerateText(
                            { apiKey, prompt, temperature: 0.6, maxTokens: 280, maxLen: 520 },
                            { timeoutMs: 12_000 }
                          );
                          setInSessionSupport(
                            (text || '').trim() ||
                              (definitionOfDone
                                ? `Tu i teraz: zrób 1 brakujący element DONE: ${definitionOfDone}`
                                : 'Tu i teraz: doprecyzuj DONE i zrób pierwszy punkt.')
                          );
                        } finally {
                          setIsGeneratingInSessionSupport(false);
                        }
                      }}
                      disabled={isGeneratingInSessionSupport}
                      className="min-h-[44px] px-3 py-3 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingInSessionSupport ? 'Generuję…' : '💡 Co robić teraz?'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedTask || !selectedPillar || !activeSession) {
                          setInSessionSupport(
                            'Najpierw rozpocznij sesję, a potem poproś o mikrokrok.'
                          );
                          return;
                        }
                        setIsGeneratingInSessionSupport(true);
                        try {
                          const aiEnabled = Boolean((data as any)?.settings?.ai?.enabled);
                          if (!aiEnabled) {
                            setInSessionSupport(
                              'AI jest wyłączone. Mikrokrok: 5 min — zrób 1 punkt DONE.'
                            );
                            return;
                          }
                          const apiKey =
                            secureStorage.getApiKey() ||
                            String((data as any)?.settings?.ai?.apiKey ?? '').trim();
                          if (!apiKey) {
                            setInSessionSupport(
                              'AI włączone, ale brakuje klucza API (Ustawienia → Asystent AI).'
                            );
                            return;
                          }
                          const prompt = buildFinishSessionInSessionPrompt({
                            pillar: selectedPillar,
                            task: selectedTask,
                            sessionStartTime: activeSession.startTime,
                            sessionMinutes: sessionDurationMinutes,
                            microStep: (activeSession as any)?.microStep || microStep,
                            ideas: (data as any)?.ideas ?? [],
                            request: 'micro_step',
                          });
                          const text = await providerGenerateText(
                            { apiKey, prompt, temperature: 0.6, maxTokens: 220, maxLen: 420 },
                            { timeoutMs: 12_000 }
                          );
                          setInSessionSupport(
                            (text || '').trim() ||
                              'Mikrokrok (5–10 min): wybierz 1 element DONE i doprowadź go do „odhaczone”.'
                          );
                        } finally {
                          setIsGeneratingInSessionSupport(false);
                        }
                      }}
                      disabled={isGeneratingInSessionSupport}
                      className="min-h-[44px] px-3 py-3 rounded-lg bg-purple-500/15 border border-purple-400/40 text-purple-200 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingInSessionSupport ? 'Generuję…' : '🧩 Mikrokrok (5–10 min)'}
                    </button>
                  </div>

                  {inSessionSupport && (
                    <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-xs text-gray-200 whitespace-pre-wrap break-words">
                        {inSessionSupport}
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setInSessionSupport('')}
                          className="min-h-[44px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-[11px] font-bold uppercase tracking-wider"
                        >
                          Wyczyść
                        </button>
                      </div>
                    </div>
                  )}
                </AccordionSection>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Back Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center mt-8"
      >
        <button onClick={() => setCurrentView('home')} className="btn btn-ghost btn-primary btn-lg">
          ← Wróć
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
  const { setData, updateTask, recomputePillarDerivedFields } = useAppContext();

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
        { id: 1, text: 'Zrobione jest to, co miało powstać (rdzeń)', completed: false },
        { id: 2, text: 'Działa w praktyce (krótki test)', completed: false },
        { id: 3, text: 'Nazwane i zapisane: co jest DONE', completed: false },
        { id: 4, text: 'Bez blokujących błędów', completed: false }
      );
    } else if (task.type === 'close') {
      defaultCriteria.push(
        { id: 1, text: 'Ostatni krok wykonany (to, co domyka sprawę)', completed: false },
        { id: 2, text: 'Wysłane / przekazane tam, gdzie trzeba', completed: false },
        { id: 3, text: 'Zamknięte luźne końcówki (1–2 drobiazgi)', completed: false },
        { id: 4, text: 'Zapisane: co zostało domknięte (krótko)', completed: false }
      );
    } else {
      defaultCriteria.push(
        { id: 1, text: 'Zrobiony pierwszy sensowny wynik', completed: false },
        { id: 2, text: 'Jasne, co jest „następne”', completed: false },
        { id: 3, text: 'Nie ma blokujących zależności', completed: false },
        { id: 4, text: 'Zapisane: 1 zdanie podsumowania', completed: false }
      );
    }

    return defaultCriteria;
  });

  const saveCriteriaLocal = async (newCriteria: any[]) => {
    // Local-first: persist into AppData (IndexedDB/localStorage via storageManager).
    setData((prev) => ({
      ...prev,
      pillars: prev.pillars.map((p) => {
        const tasks = Array.isArray((p as any).tasks) ? ((p as any).tasks as any[]) : [];
        const contains = tasks.some((t) => t && Number(t.id) === Number(task.id));
        if (!contains) return p;

        const updatedTasks = tasks.map((t) =>
          t.id === task.id ? { ...(t as any), doneCriteria: newCriteria } : t
        );

        return recomputePillarDerivedFields({ ...(p as any), tasks: updatedTasks } as any);
      }),
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
          Checklist DONE
        </h3>
        <span className="text-sm text-gray-400">
          {completedCount}/{totalCount} zrobione
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
              className={`w-11 h-11 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                criterion.completed
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-400 hover:border-cyan-400'
              }`}
              aria-label={criterion.completed ? 'Odhacz kryterium DONE' : 'Zaznacz kryterium DONE'}
            >
              {criterion.completed && <span className="text-white text-sm">✓</span>}
            </button>

            <input
              type="text"
              value={criterion.text}
              onChange={(e) => updateCriterion(criterion.id, e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500"
              placeholder="Wpisz kryterium ukończenia…"
            />

            <button
              onClick={() => removeCriterion(criterion.id)}
              className="w-11 h-11 flex-shrink-0 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors flex items-center justify-center"
              aria-label="Usuń kryterium"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </div>

      <button
        onClick={addCriterion}
        className="w-full min-h-[44px] py-3 px-4 rounded-lg border-2 border-dashed border-gray-500 hover:border-cyan-400 text-gray-400 hover:text-cyan-400 transition-all duration-200"
      >
        + Dodaj kryterium
      </button>

      {completedCount === totalCount && totalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 p-4 rounded-lg text-center glass-card glass-card-success"
          style={{ boxShadow: 'var(--glow-gold)' }}
        >
          <div className="text-2xl mb-2">🎉</div>
          <div className="text-white font-bold">Wszystkie kryteria spełnione!</div>
          <div className="text-gold text-sm font-semibold">
            Możesz oznaczyć zadanie jako ukończone
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Plan awaryjny (Gdy–To)
interface ImplementationIntentionFormProps {
  onSubmit: (
    taskId: number,
    payload: { trigger: string; action: string; active: boolean }
  ) => void | Promise<void>;
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
    { trigger: "pomyślę 'to już prawie gotowe'", action: 'sprawdzę wszystkie kryteria DONE' },
    { trigger: 'zechcę sprawdzić social media', action: 'przypomnę sobie, że jestem blisko końca' },
    { trigger: 'usłyszę powiadomienie', action: 'zignoruję je i wrócę do zadania' },
    { trigger: 'poczuję zmęczenie', action: 'zrobię 5-minutową przerwę i wrócę' },
    { trigger: 'zechcę zacząć nowe zadanie', action: 'domknę obecne, potem zacznę nowe' },
  ];

  const generateAISuggestion = async () => {
    if (!selectedTask) return;

    setIsGeneratingAI(true);
    try {
      const settingsAi = (data as any)?.settings?.ai;
      const aiEnabled = Boolean(settingsAi?.enabled);
      const apiKey = (secureStorage.getApiKey() || String(settingsAi?.apiKey ?? '').trim()).trim();
      if (!aiEnabled || !apiKey) {
        setAiSuggestion(
          aiEnabled
            ? 'Brak klucza AI (Ustawienia → Asystent AI).'
            : 'AI jest wyłączone (Ustawienia → Asystent AI).'
        );
        return;
      }

      const pillar = findPillarForTask((data as any)?.pillars || [], selectedTask.id);
      const obstacleFromGoal = String(
        (pillar as any)?.strategy?.obstacles?.[0]?.description ?? ''
      ).trim();
      const obstacle = trigger.trim() || obstacleFromGoal || 'poczuję opór / rozproszenie';

      const suggestion = await generateResiliencePlan({
        apiKey,
        taskName: selectedTask.name,
        obstacle,
        context: { goalName: (pillar as any)?.name },
      });

      if (suggestion) {
        setAiSuggestion(suggestion);
        const match = suggestion.match(/Jeśli\\s+(.+?),\\s+to\\s+(.+)/i);
        if (match) {
          setTrigger(match[1].trim());
          setAction(match[2].trim());
        }
      }
    } catch (error) {
      console.warn('AI integration failed:', error);
      setAiSuggestion('AI niedostępne — używam szablonów poniżej.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedTask && trigger.trim() && action.trim()) {
      await Promise.resolve(
        onSubmit(selectedTask.id, {
          trigger: trigger.trim(),
          action: action.trim(),
          active: true,
        })
      );
      setSelectedTask(null);
      setTrigger('');
      setAction('');
      setAiSuggestion('');
      onToggleVisibility();
    }
  };

  if (!isVisible) {
    return (
      <button onClick={onToggleVisibility} className="btn btn-primary btn-lg w-full">
        🧷 Plan awaryjny (Gdy–To)
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
      <div>
        <label className="block text-sm font-bold text-white mb-2">Wybierz zadanie (90–99%):</label>
        <select
          value={selectedTask?.id || ''}
          onChange={(e) => {
            const task = (data as any).pillars
              .flatMap((p: any) => p.tasks)
              .find((t: any) => t.id === parseInt(e.target.value));
            setSelectedTask((task as Task) || null);
          }}
          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
        >
          <option value="">Wybierz zadanie (90%+)…</option>
          {(data as any).pillars.flatMap((pillar: any) =>
            (pillar.tasks || [])
              .filter((task: any) => task.progress >= 90 && task.progress < 100)
              .map((task: any) => (
                <option key={task.id} value={task.id}>
                  {task.name} ({task.progress}%)
                </option>
              ))
          )}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold text-white">Szybkie szablony (Gdy–To):</label>
          <button
            onClick={generateAISuggestion}
            disabled={!selectedTask || isGeneratingAI}
            className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 text-xs flex items-center gap-1"
          >
            <span>🛡️</span>
            {isGeneratingAI ? 'Myślę…' : 'Generuj (Stoik)'}
          </button>
        </div>

        {aiSuggestion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ai-suggestion p-3 rounded-lg mb-4 border"
          >
            <div className="text-sm text-cyan-300 font-medium mb-1">🛡️ Stoik:</div>
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
                setAiSuggestion('');
              }}
              className="text-left p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
            >
              <div className="text-sm text-gray-300">
                <strong>Jeśli:</strong> {template.trigger}
                <br />
                <strong>To:</strong> {template.action}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-white mb-2">Jeśli (sytuacja):</label>
          <textarea
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
            placeholder="np. czuję zmęczenie…"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-white mb-2">
            To (automatyczna reakcja):
          </label>
          <textarea
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
            placeholder="np. robię 5-min przerwę i wracam do zadania…"
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onToggleVisibility}
          className="flex-1 py-3 px-4 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
        >
          Anuluj
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedTask || !trigger.trim() || !action.trim()}
          className="btn btn-success btn-md flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Aktywuj plan
        </button>
      </div>
    </motion.div>
  );
};

export default React.memo(FinishMode);
