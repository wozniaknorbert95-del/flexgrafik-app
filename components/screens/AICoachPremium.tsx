import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppData, ChatMessage } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { showError, showSuccess } from '../../utils/toastService';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  extractStrategyImportBlockText,
  STRATEGY_IMPORT_DRAFT_STORAGE_KEY,
} from '../../utils/strategyImport';
// import { NormalizedSelectors } from '../../types/normalized'; // TEMPORARILY DISABLED

// Using any to avoid runtime type references

interface AICoachProps {
  data: AppData;
  normalizedData?: any; // Phase 2: optional for gradual migration
  onSendMessage: (message: string) => Promise<void>;
  onBack: () => void;
}

type ResponseMode = 'strict' | 'psycho' | 'facts';

const RESPONSE_MODE_STORAGE_KEY = 'mc_chat_response_mode';

function getInitialResponseMode(): ResponseMode {
  try {
    const raw = localStorage.getItem(RESPONSE_MODE_STORAGE_KEY);
    if (raw === 'strict' || raw === 'psycho' || raw === 'facts') return raw;
  } catch {
    // ignore
  }
  return 'psycho';
}

const AICoachPremium: React.FC<AICoachProps> = ({
  data,
  normalizedData,
  onSendMessage,
  onBack,
}) => {
  const {
    aiStatus,
    setCurrentView,
    handleUpdateSettings,
    activeProjectId,
    setActiveProjectId,
    clearGoalAIHistory,
    sendGoalChatMessage,
    updatePillar,
  } = useAppContext();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Phase 2: Use normalized data if available, fallback to legacy
  const useNormalized = normalizedData !== null;

  const activeGoals = useMemo(() => {
    const pillars = Array.isArray((data as any)?.pillars) ? (data as any).pillars : [];
    return pillars.filter(
      (p: any) => p && p.status !== 'done' && (p.activation ?? 'active') === 'active'
    );
  }, [data]);

  const defaultGoalId = useMemo(() => {
    const main = activeGoals.find((p: any) => p.type === 'main') || null;
    return (activeProjectId ?? (main ? main.id : (activeGoals[0]?.id ?? null))) as number | null;
  }, [activeGoals, activeProjectId]);

  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(defaultGoalId);
  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] = useState(false);
  const [responseMode, setResponseMode] = useState<ResponseMode>(() => getInitialResponseMode());
  const [isEditInstructionsOpen, setIsEditInstructionsOpen] = useState(false);
  const [draftInstructions, setDraftInstructions] = useState<string>('');

  useEffect(() => {
    if (selectedGoalId == null && defaultGoalId != null) {
      setSelectedGoalId(defaultGoalId);
    }
  }, [defaultGoalId, selectedGoalId]);

  const selectedGoal = useMemo(() => {
    if (selectedGoalId == null) return null;
    return activeGoals.find((p: any) => Number(p.id) === Number(selectedGoalId)) || null;
  }, [activeGoals, selectedGoalId]);

  const strategyReadiness = useMemo(() => {
    const s =
      selectedGoal && typeof (selectedGoal as any).strategy === 'object'
        ? (selectedGoal as any).strategy
        : null;
    const vision = typeof s?.vision === 'string' ? s.vision.trim() : '';
    const successCriteria = Array.isArray(s?.successCriteria) ? s.successCriteria : [];
    const ifThenPlans = Array.isArray(s?.ifThenPlans) ? s.ifThenPlans : [];
    const obstacles = Array.isArray(s?.obstacles) ? s.obstacles : [];

    const tasks = Array.isArray((selectedGoal as any)?.tasks)
      ? ((selectedGoal as any).tasks as any[])
      : [];
    const tasksWithDoD = tasks.filter(
      (t) => typeof t?.definitionOfDone === 'string' && t.definitionOfDone.trim()
    ).length;

    const activeIfThen = ifThenPlans.filter((p: any) => Boolean(p?.isActive)).length;

    return {
      visionOk: Boolean(vision),
      successCriteriaCount: successCriteria.length,
      tasksCount: tasks.length,
      tasksWithDoD,
      ifThenCount: ifThenPlans.length,
      ifThenActiveCount: activeIfThen,
      obstaclesCount: obstacles.length,
    };
  }, [selectedGoal]);

  useEffect(() => {
    try {
      localStorage.setItem(RESPONSE_MODE_STORAGE_KEY, responseMode);
    } catch {
      // ignore
    }
  }, [responseMode]);

  useEffect(() => {
    if (!selectedGoal) return;
    const current =
      typeof (selectedGoal as any)?.aiContext?.customInstructions === 'string'
        ? String((selectedGoal as any).aiContext.customInstructions)
        : '';
    setDraftInstructions(current);
  }, [selectedGoalId]); // intentionally not dependent on whole object to avoid resetting while typing

  // TEMPORARILY DISABLED: Phase 2 normalized data - causing runtime errors
  // TODO: Fix normalized data access issues in production build
  const chatHistory = useMemo(() => {
    // Prefer per-goal conversation (FAZA 1/3), fallback to legacy global history
    const goalHistory = Array.isArray((selectedGoal as any)?.aiContext?.conversationHistory)
      ? ((selectedGoal as any).aiContext.conversationHistory as ChatMessage[])
      : [];
    if (selectedGoalId != null) return goalHistory;
    return data.aiChatHistory;
  }, [data.aiChatHistory, selectedGoal, selectedGoalId]);

  const isAiEnabled = Boolean((data as any)?.settings?.ai?.enabled);

  const saveStrategyImportDraft = useCallback((assistantMessage: string): boolean => {
    const block = extractStrategyImportBlockText(assistantMessage);
    if (!block) return false;
    try {
      localStorage.setItem(STRATEGY_IMPORT_DRAFT_STORAGE_KEY, block);
      return true;
    } catch {
      return false;
    }
  }, []);

  const copyStrategyImportBlock = useCallback(
    async (assistantMessage: string): Promise<boolean> => {
      const block = extractStrategyImportBlockText(assistantMessage);
      if (!block) return false;
      try {
        await navigator.clipboard.writeText(block);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  // Memoize scroll function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Only scroll when chat history length changes (not on every data change)
  const chatHistoryLength = useMemo(() => chatHistory.length, [chatHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistoryLength, scrollToBottom]);

  // Memoize submit handler
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const message = input.trim();
      setInput('');
      setIsLoading(true);

      try {
        if (selectedGoalId != null) {
          await sendGoalChatMessage({ goalId: Number(selectedGoalId), message, responseMode });
        } else {
          // Legacy fallback: if no goal selected (rare), use old global handler.
          await onSendMessage(message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, onSendMessage, responseMode, selectedGoalId, sendGoalChatMessage]
  );

  return (
    <div data-component="AICoach" className="min-h-screen pb-32 pt-8 px-6 flex flex-col">
      {/* Header */}
      <motion.div
        className="widget-container-narrow mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={onBack} className="btn-premium btn-cyan mb-8">
          ← Wróć
        </button>

        <div className="flex items-center gap-4 mb-3">
          <span className="text-5xl md:text-6xl neon-breath">🤖</span>
          <h1 className="text-4xl md:text-6xl font-extrabold uppercase tracking-wider text-gradient-gold">
            Asystent AI
          </h1>
        </div>
        <p className="text-sm md:text-base text-gray-300 leading-relaxed">
          Analiza i wsparcie decyzyjne w oparciu o Twoje dane z aplikacji
        </p>

        {/* Goal selector */}
        <div className="mt-4">
          <label className="block text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">
            Rozmawiasz o:
          </label>
          <select
            value={selectedGoalId ?? ''}
            onChange={(e) => {
              const next = e.target.value ? Number(e.target.value) : null;
              setSelectedGoalId(next);
              setActiveProjectId(next);
            }}
            className="w-full min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-neon-cyan"
          >
            {activeGoals.length === 0 && <option value="">Brak aktywnych celów</option>}
            {activeGoals.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.type === 'main' ? 'Cel główny' : p.type === 'lab' ? 'Lab' : 'Cel poboczny'} —{' '}
                {p.name}
              </option>
            ))}
          </select>
          {selectedGoal && (
            <div className="mt-2 text-[11px] text-gray-400">
              Kontekst: {selectedGoal.name} • Postęp: {Number(selectedGoal.completion ?? 0)}%
            </div>
          )}

          {/* Response mode badge/toggle */}
          <div className="mt-4">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">
              Tryb odpowiedzi (Strateg celu):
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setResponseMode('strict')}
                className={`btn-premium text-sm ${responseMode === 'strict' ? 'btn-magenta' : 'btn-cyan'}`}
                aria-pressed={responseMode === 'strict'}
              >
                Surowo
              </button>
              <button
                type="button"
                onClick={() => setResponseMode('psycho')}
                className={`btn-premium text-sm ${responseMode === 'psycho' ? 'btn-magenta' : 'btn-cyan'}`}
                aria-pressed={responseMode === 'psycho'}
              >
                Psychologicznie
              </button>
              <button
                type="button"
                onClick={() => setResponseMode('facts')}
                className={`btn-premium text-sm ${responseMode === 'facts' ? 'btn-magenta' : 'btn-cyan'}`}
                aria-pressed={responseMode === 'facts'}
              >
                Fakty
              </button>
            </div>
          </div>

          {/* Agent instructions editor */}
          {selectedGoalId != null && selectedGoal && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsEditInstructionsOpen((v) => !v)}
                className="btn-premium btn-cyan text-sm"
              >
                ✍️ Edytuj instrukcje agenta
              </button>

              {isEditInstructionsOpen && (
                <div className="mt-3 glass-card space-widget border border-white/10">
                  <label className="block text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">
                    Instrukcje (jak chcesz, żeby pomagał) — max 1200 znaków
                  </label>
                  <textarea
                    value={draftInstructions}
                    onChange={(e) => setDraftInstructions(e.target.value.slice(0, 1200))}
                    className="w-full min-h-[120px] px-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-neon-cyan"
                    placeholder="Np. Pilnuj Definicji DONE, nie dawaj 10 opcji naraz, dopytuj o przeszkody i If‑Then."
                  />
                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedGoalId == null) return;
                        updatePillar(Number(selectedGoalId), {
                          aiContext: { customInstructions: draftInstructions.trim() || undefined },
                        } as any);
                        showSuccess('Zapisano instrukcje agenta dla tego celu.', 2500);
                        setIsEditInstructionsOpen(false);
                      }}
                      className="btn-premium btn-magenta text-sm"
                    >
                      💾 Zapisz
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current =
                          typeof (selectedGoal as any)?.aiContext?.customInstructions === 'string'
                            ? String((selectedGoal as any).aiContext.customInstructions)
                            : '';
                        setDraftInstructions(current);
                        setIsEditInstructionsOpen(false);
                      }}
                      className="btn-premium btn-cyan text-sm"
                    >
                      Anuluj
                    </button>
                    <div className="text-[11px] text-gray-500 sm:ml-auto sm:self-center">
                      {draftInstructions.length}/1200
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Strategy readiness check */}
          {selectedGoal && (
            <div className="mt-5 glass-card space-widget border border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                    Gotowość strategii (szybki check)
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    Bez gamifikacji. Tylko sygnał: co brakuje do dowożenia.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setInput(
                      'Uzupełnij strategię w 5 minut. Najpierw wskaż braki, potem podaj minimalne uzupełnienia.'
                    )
                  }
                  className="btn-premium btn-magenta text-sm whitespace-nowrap"
                >
                  ⏱️ Uzupełnij strategię w 5 minut
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                  <div className="text-gray-300">
                    Wizja:{' '}
                    <span
                      className={strategyReadiness.visionOk ? 'text-green-300' : 'text-red-300'}
                    >
                      {strategyReadiness.visionOk ? 'OK' : 'Brak'}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                  <div className="text-gray-300">
                    Kryteria sukcesu:{' '}
                    <span className="text-white font-semibold">
                      {strategyReadiness.successCriteriaCount}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                  <div className="text-gray-300">
                    Zadania:{' '}
                    <span className="text-white font-semibold">{strategyReadiness.tasksCount}</span>{' '}
                    <span className="text-gray-500">/ z DoD:</span>{' '}
                    <span className="text-white font-semibold">
                      {strategyReadiness.tasksWithDoD}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                  <div className="text-gray-300">
                    If‑Then:{' '}
                    <span className="text-white font-semibold">
                      {strategyReadiness.ifThenCount}
                    </span>{' '}
                    <span className="text-gray-500">/ aktywne:</span>{' '}
                    <span className="text-white font-semibold">
                      {strategyReadiness.ifThenActiveCount}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 md:col-span-2">
                  <div className="text-gray-300">
                    Przeszkody:{' '}
                    <span className="text-white font-semibold">
                      {strategyReadiness.obstaclesCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedGoalId != null && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsClearHistoryConfirmOpen(true);
                }}
                className="btn-premium btn-cyan text-sm"
              >
                🧹 Wyczyść historię rozmów (cel)
              </button>
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={isClearHistoryConfirmOpen}
          title="Wyczyścić historię rozmów?"
          description="Usuniesz historię rozmów Asystenta AI tylko dla tego celu. Tej operacji nie da się cofnąć."
          confirmLabel="Wyczyść"
          cancelLabel="Anuluj"
          tone="danger"
          onCancel={() => setIsClearHistoryConfirmOpen(false)}
          onConfirm={() => {
            if (selectedGoalId == null) {
              setIsClearHistoryConfirmOpen(false);
              return;
            }
            clearGoalAIHistory(Number(selectedGoalId));
            showSuccess('Wyczyszczono historię rozmów dla tego celu.', 3500);
            setIsClearHistoryConfirmOpen(false);
          }}
        />

        {/* AI status banner */}
        <div
          className={`mt-4 rounded-widget border px-4 py-3 text-sm ${
            aiStatus.state === 'online'
              ? 'border-green-500/40 bg-green-500/10 text-green-200'
              : aiStatus.state === 'disabled'
                ? 'border-gray-500/30 bg-gray-500/10 text-gray-200'
                : 'border-red-500/40 bg-red-500/10 text-red-200'
          }`}
          role="status"
          aria-live="polite"
        >
          {aiStatus.state === 'online' && <span>🟢 AI włączone</span>}
          {aiStatus.state === 'offline' && <span>🔴 AI niedostępne (tryb awaryjny)</span>}
          {aiStatus.state === 'disabled' && (
            <span>⚪ AI wyłączone (Ustawienia ⚙ → Asystent AI → Włącz wsparcie AI)</span>
          )}
        </div>

        {/* Emergency: make it impossible to get stuck without a path */}
        {aiStatus.state === 'disabled' && (
          <div className="mt-3 flex flex-col md:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                // Local-first: enable AI flag (Ollama may still be offline; fallback will handle it).
                const currentAi = (data as any)?.settings?.ai ?? {};
                handleUpdateSettings({
                  ai: { ...currentAi, enabled: true },
                } as any);
              }}
              className="btn-premium btn-magenta"
            >
              ✅ Włącz AI teraz
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('settings')}
              className="btn-premium btn-cyan"
            >
              ⚙ Otwórz ustawienia
            </button>
          </div>
        )}
      </motion.div>

      {/* Messages */}
      <div className="widget-container-narrow flex-1 mb-8">
        <div className="glass-card space-widget-lg min-h-[500px] max-h-[600px] overflow-y-auto">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              {/* Icon & Title */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <span className="text-7xl block mb-4 neon-breath">🤖</span>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Asystent AI gotowy
                </h3>
                <p className="text-gray-400 text-sm md:text-base max-w-lg">
                  Zapytaj o priorytety, mikrokrok albo przebicie 90%.
                </p>
              </motion.div>

              {/* Suggested Prompts (production / finish-first) */}
              <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <motion.div
                  className="glass-card space-widget text-left cursor-pointer hover:scale-105 transition-transform border border-neon-cyan/40 hover:shadow-glow-cyan"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  onClick={() => setInput('Co powinienem dziś domknąć?')}
                >
                  <div className="text-3xl mb-2">🏁</div>
                  <h4 className="text-white font-bold text-sm mb-1">Co dziś domykamy?</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    "Co powinienem dziś domknąć?"
                  </p>
                </motion.div>

                <motion.div
                  className="glass-card space-widget text-left cursor-pointer hover:scale-105 transition-transform border border-neon-magenta/40 hover:shadow-glow-magenta"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 }}
                  onClick={() =>
                    setInput('Daj mi mikrokrok (5–10 min) dla taska, który mam teraz domknąć.')
                  }
                >
                  <div className="text-3xl mb-2">🧩</div>
                  <h4 className="text-white font-bold text-sm mb-1">Mikrokrok</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    "Daj mi mikrokrok (5–10 min) dla taska, który mam teraz domknąć."
                  </p>
                </motion.div>

                <motion.div
                  className="glass-card space-widget text-left cursor-pointer hover:scale-105 transition-transform border border-gold/40 hover:shadow-glow-gold"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => setInput('Co mnie teraz blokuje?')}
                >
                  <div className="text-3xl mb-2">🚧</div>
                  <h4 className="text-white font-bold text-sm mb-1">Co mnie blokuje?</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">"Co mnie teraz blokuje?"</p>
                </motion.div>

                <motion.div
                  className="glass-card glass-card-warning space-widget text-left cursor-pointer hover:scale-105 transition-transform"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  onClick={() => setInput('Jak przebić się przez 90% i zrobić realny finisz?')}
                >
                  <div className="text-3xl mb-2">🎯</div>
                  <h4 className="text-white font-bold text-sm mb-1">Przebicie 90%</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    "Jak przebić się przez 90% i zrobić realny finisz?"
                  </p>
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence>
                {chatHistory.map((msg, index) => (
                  <motion.div
                    key={index}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {/* Avatar */}
                    {msg.role === 'assistant' && (
                      <div className="w-12 h-12 rounded-widget flex items-center justify-center bg-gradient-to-br from-neon-cyan/25 to-neon-cyan/10 border-2 border-neon-cyan/60 shadow-glow-cyan flex-shrink-0">
                        <span className="text-2xl">🤖</span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[80%] md:max-w-[70%] rounded-widget p-5 md:p-6 backdrop-blur-xl ${
                        msg.role === 'user'
                          ? 'bg-neon-magenta/10 border-2 border-neon-magenta/60 shadow-glow-magenta'
                          : 'bg-gradient-to-br from-glass-medium to-glass-light border-2 border-neon-cyan/50 shadow-glow-cyan'
                      }`}
                    >
                      <div
                        className={`text-[10px] uppercase tracking-widest font-bold mb-3 flex items-center gap-2 ${
                          msg.role === 'user' ? 'text-neon-magenta' : 'text-neon-cyan'
                        }`}
                      >
                        {msg.role === 'user' ? '👤 UŻYTKOWNIK' : '🤖 ASYSTENT AI'}
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-500 font-normal">TERAZ</span>
                      </div>
                      <div className="text-white text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>

                      {(() => {
                        if (msg.role !== 'assistant') return null;
                        const block = extractStrategyImportBlockText(msg.content);
                        if (!block) return null;
                        return (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await copyStrategyImportBlock(msg.content);
                                if (ok) showSuccess('Skopiowano blok JSON do importu.', 2500);
                                else showError('Nie udało się skopiować do schowka.', 3000);
                              }}
                              className="btn-premium btn-cyan text-sm"
                            >
                              📋 Kopiuj JSON
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const ok = saveStrategyImportDraft(msg.content);
                                if (ok)
                                  showSuccess(
                                    'Zapisano do importu (otwórz cel → Import strategii).',
                                    3000
                                  );
                                else
                                  showError(
                                    'Nie udało się zapisać do importu (localStorage).',
                                    3000
                                  );
                              }}
                              className="btn-premium btn-magenta text-sm"
                            >
                              💾 Zapisz do importu
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* User Avatar */}
                    {msg.role === 'user' && (
                      <div className="w-12 h-12 rounded-widget flex items-center justify-center bg-gradient-to-br from-neon-magenta/40 to-neon-cyan/40 border-2 border-neon-magenta/60 shadow-glow-magenta flex-shrink-0">
                        <span className="text-2xl">👤</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  className="flex justify-start gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  {/* AI Avatar */}
                  <div className="w-12 h-12 rounded-widget flex items-center justify-center bg-gradient-to-br from-neon-cyan/25 to-neon-cyan/10 border-2 border-neon-cyan/60 shadow-glow-cyan flex-shrink-0">
                    <span className="text-2xl">🤖</span>
                  </div>

                  {/* Loading Bubble */}
                  <div className="bg-gradient-to-br from-glass-medium to-glass-light border-2 border-neon-cyan/40 shadow-glow-cyan rounded-widget p-5 backdrop-blur-xl">
                    <div className="text-[10px] uppercase tracking-widest font-bold mb-3 text-neon-cyan flex items-center gap-2">
                      🤖 ASYSTENT AI
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500 font-normal">ANALIZUJĘ…</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="w-3 h-3 rounded-full bg-neon-cyan shadow-glow-cyan"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-3 h-3 rounded-full bg-neon-cyan shadow-glow-cyan"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-3 h-3 rounded-full bg-neon-cyan shadow-glow-cyan"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                      />
                      <span className="text-gray-400 text-sm ml-2">Przetwarzam…</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Section */}
      <div className="widget-container-narrow">
        <motion.div
          className="glass-card glass-card-magenta space-widget"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-800">
            <button
              type="button"
              onClick={() =>
                setInput(
                  'Sprawdź moją strategię dla tego celu: wskaż największe braki (max 5) i zaproponuj minimalne poprawki. Nie twórz strategii od zera.'
                )
              }
              className="btn btn-ghost btn-primary btn-sm text-xs whitespace-nowrap"
            >
              🧠 Audyt strategii
            </button>
            <button
              type="button"
              onClick={() =>
                setInput('Zaproponuj 5 zadań dla tego celu + Definicje DONE (3 punkty na zadanie).')
              }
              className="btn btn-ghost btn-primary btn-sm text-xs whitespace-nowrap"
            >
              🧩 Zadania + DONE
            </button>
            <button
              type="button"
              onClick={() => setInput('Uzupełnij kryteria sukcesu dla tego celu (min. 7).')}
              className="btn btn-ghost btn-primary btn-sm text-xs whitespace-nowrap"
            >
              ✅ Kryteria sukcesu
            </button>
            <button
              type="button"
              onClick={() =>
                setInput(
                  'Doprecyzuj Definicję DONE dla istniejących zadań bez DONE (3 punkty na zadanie).'
                )
              }
              className="btn btn-ghost btn-primary btn-sm text-xs whitespace-nowrap"
            >
              🎯 DONE dla braków
            </button>
            <button
              type="button"
              onClick={() =>
                setInput(
                  'Wygeneruj intencje (Gdy–To) na jutro: min. 3. Oprzyj o If‑Then, przeszkody i zadania.'
                )
              }
              className="btn btn-ghost btn-secondary btn-sm text-xs whitespace-nowrap"
            >
              ⚡ Intencje (Gdy–To)
            </button>
            <button
              type="button"
              onClick={() =>
                setInput(
                  'Wygeneruj 1 regułę do protokołu (Nazwa / Wyzwalacz / Warunek / Akcja / Wiadomość).'
                )
              }
              className="btn btn-ghost btn-secondary btn-sm text-xs whitespace-nowrap"
            >
              🧷 1 reguła
            </button>
            <button
              type="button"
              onClick={() =>
                setInput(
                  'Co jutro deklarujemy dla tego celu? Podaj: Deklaracje (task + okno) / DONE / Intencje / Reguła.'
                )
              }
              className="btn btn-ghost btn-secondary btn-sm text-xs whitespace-nowrap"
            >
              📅 Deklaracje na jutro
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-lg pointer-events-none z-10">
                💬
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Wpisz pytanie…"
                disabled={isLoading}
                autoComplete="off"
                className="w-full bg-glass-heavy border border-gray-700/50 rounded-widget pl-12 pr-4 md:pr-24 py-4 text-white text-sm placeholder-gray-500 
                focus:border-neon-magenta focus:shadow-glow-magenta focus:outline-none 
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all appearance-none"
                style={{
                  WebkitAppearance: 'none',
                  boxShadow: 'none',
                  outline: 'none',
                }}
              />
              <div className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-600 uppercase tracking-wider pointer-events-none">
                ENTER ↵
              </div>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="btn btn-secondary btn-lg px-8 py-4 text-sm font-bold whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  <span className="hidden md:inline">Przetwarzam…</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  📤 <span>Wyślij</span>
                </span>
              )}
            </button>
          </form>

          {/* Hint Text */}
          <div className="mt-4 pt-3 border-t border-gray-800">
            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="text-gold font-semibold">Wskazówka:</span> użyj przycisków szybkich
              akcji albo wpisz pytanie własnymi słowami.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(AICoachPremium);
