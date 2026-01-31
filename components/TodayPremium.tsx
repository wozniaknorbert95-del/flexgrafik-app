import React, { useMemo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../contexts/AppContext';
import { generateDailyPriority } from '../utils/dailyPriority';
import { ConfirmDialog } from './common/ConfirmDialog';

const TodayPremium: React.FC = () => {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // eslint-disable-next-line no-console
    console.log('🎯 TodayPremium: Component loaded');
  }
  const { data, normalizedData, handleToggleTask, setCurrentView, setActiveProjectId } =
    useAppContext();
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log('📊 Today data check:', {
      dataExists: !!data,
      pillarsExist: !!data?.pillars,
      pillarsLength: data?.pillars?.length || 0,
    });
  }

  // Phase 2: Use normalized data if available, fallback to legacy
  const useNormalized = normalizedData !== null;

  if (isDev) {
    // eslint-disable-next-line no-console
    console.log('📋 Today using data format:', useNormalized ? 'NORMALIZED' : 'LEGACY');
  }

  // TEMPORARILY DISABLED: Phase 3 optimistic UI - causing runtime errors
  // TODO: Re-enable after fixing NormalizedSelectors import issues
  const isTaskPending = useCallback((taskId: string) => {
    return false; // Always return false until optimistic UI is fixed
  }, []);

  const activePillars = useMemo(() => {
    return (data?.pillars ?? []).filter(
      (p: any) => p && p.status !== 'done' && (p.activation ?? 'active') === 'active'
    );
  }, [data.pillars]);

  // Memoize expensive daily priority computation (finish-first: active goals only)
  const dailyPriority = useMemo(
    () => generateDailyPriority({ ...data, pillars: activePillars } as any),
    [activePillars, data, data.sprint]
  );

  // TEMPORARILY DISABLED: Phase 2C normalized data - causing runtime errors
  // TODO: Fix NormalizedSelectors import issues in production build
  const todayTasks = useMemo(() => {
    return activePillars
      .flatMap((pillar) =>
        pillar.tasks.filter((task) => task.progress < 100).map((task) => ({ ...task, pillar }))
      )
      .slice(0, 5);
  }, [activePillars]);

  const todayDeclarationTaskIds = useMemo(() => {
    const protocols = Array.isArray((data as any)?.eveningProtocols)
      ? (data as any).eveningProtocols
      : [];
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayIso = `${y}-${m}-${d}`;

    const todays = protocols
      .filter((p: any) => p && String(p.targetDate || '').slice(0, 10) === todayIso)
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );

    const decl = Array.isArray(todays[0]?.declarations) ? todays[0].declarations : [];
    const ids = new Set<number>();
    for (const x of decl) {
      const taskId = Number(x?.taskId);
      if (Number.isFinite(taskId)) ids.add(taskId);
    }
    return ids;
  }, [data]);

  const taskTypeLabel = (t: string): string => {
    if (t === 'close') return 'domykanie';
    if (t === 'build') return 'budowanie';
    return t;
  };

  // Phase 3: Async toggle handler with optimistic UI
  const handleToggle = useCallback(
    async (taskId: number) => {
      try {
        await handleToggleTask(taskId);
      } catch (error) {
        if (isDev) {
          // eslint-disable-next-line no-console
          console.error('❌ Failed to toggle task:', error);
        }
        // Error already handled in context
      }
    },
    [handleToggleTask, isDev]
  );

  const [isDoneConfirmOpen, setIsDoneConfirmOpen] = useState(false);
  const [pendingDoneTaskId, setPendingDoneTaskId] = useState<number | null>(null);
  const [pendingDoneTaskName, setPendingDoneTaskName] = useState<string>('');

  const openDoneConfirm = useCallback((taskId: number, taskName: string) => {
    setPendingDoneTaskId(taskId);
    setPendingDoneTaskName(taskName);
    setIsDoneConfirmOpen(true);
  }, []);

  return (
    <div data-component="Today" className="min-h-screen pb-32 pt-8 px-6">
      <ConfirmDialog
        isOpen={isDoneConfirmOpen}
        title="Oznaczyć jako DONE?"
        description={
          pendingDoneTaskName
            ? `Zanim odhaczysz: upewnij się, że Definicja DONE jest spełniona dla „${pendingDoneTaskName}”.`
            : 'Zanim odhaczysz: upewnij się, że Definicja DONE jest spełniona.'
        }
        confirmLabel="Tak, oznacz DONE"
        cancelLabel="Wróć"
        tone="danger"
        onCancel={() => {
          setIsDoneConfirmOpen(false);
          setPendingDoneTaskId(null);
          setPendingDoneTaskName('');
        }}
        onConfirm={async () => {
          if (pendingDoneTaskId == null) {
            setIsDoneConfirmOpen(false);
            return;
          }
          const id = pendingDoneTaskId;
          setIsDoneConfirmOpen(false);
          setPendingDoneTaskId(null);
          setPendingDoneTaskName('');
          await handleToggle(id);
        }}
      />

      {/* Header */}
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={() => setCurrentView('home')} className="btn-premium btn-cyan mb-8">
          ← Wróć
        </button>

        <div className="flex items-center gap-4 mb-4">
          <span className="text-6xl">📋</span>
          <h1 className="text-6xl font-extrabold uppercase tracking-wider text-gradient-gold">
            Dziś
          </h1>
        </div>
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          /// 1 priorytet + max 2 dodatkowe (razem 1–3)
        </p>
      </motion.div>

      {/* Daily Priority */}
      {dailyPriority && (
        <motion.div
          className="widget-container-narrow mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="glass-card glass-card-magenta space-widget-lg">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-5xl">🎯</span>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-glow-magenta mb-2">Priorytet na dziś</h2>
                <p className="text-sm text-gray-400">{dailyPriority.pillar.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Jeśli zrobisz tylko to jedno, dzień jest wygrany.
                </p>
              </div>
            </div>

            <div className="bg-obsidian-light rounded-widget-sm p-6 mb-4">
              <h3 className="text-xl font-bold text-white mb-3">{dailyPriority.task.name}</h3>
              <div className="mt-2 text-xs text-gray-400">
                Jeśli utkniesz: wejdź w Domykanie i zrób mikrokrok 5–10 min.
              </div>

              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveProjectId(dailyPriority.pillar.id);
                    setCurrentView('finish');
                  }}
                  className="btn-premium btn-magenta w-full"
                >
                  Start Domykania (25 min) →
                </button>
                <button
                  type="button"
                  onClick={() => openDoneConfirm(dailyPriority.task.id, dailyPriority.task.name)}
                  className="btn-premium btn-cyan w-full text-sm"
                >
                  Oznacz jako DONE (z potwierdzeniem)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 uppercase tracking-wider">
                Powód: {dailyPriority.reason}
              </span>
              <span className="text-glow-magenta font-bold">
                {dailyPriority.pillar.completion}%
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Today's Tasks */}
      <motion.div
        className="widget-container-narrow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-4 mb-8">
          <span className="text-3xl">✅</span>
          <h2 className="text-3xl font-bold uppercase tracking-wider text-gradient-neon">
            Otwarte zadania
          </h2>
          <span className="text-gray-500">({todayTasks.length})</span>
        </div>
        <div className="text-xs text-gray-400 mb-4">
          Cel na dziś: 1–3 zadania. Jeśli masz więcej — wybierz jedno i zacznij Domykanie.
        </div>

        {todayTasks.length === 0 ? (
          <div className="glass-card space-widget-lg text-center">
            <span className="text-6xl mb-4 block">🎉</span>
            <h3 className="text-2xl font-bold text-white mb-3">Dziś jest lekko.</h3>
            <p className="text-gray-400 mb-6">
              Nie masz otwartych zadań. Jeśli to pora wieczorna — zaplanuj jutro (max 3).
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={() => setCurrentView('evening_protocol')}
                className="btn-premium btn-magenta"
              >
                Wieczorem: Protokół wieczorny →
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('home')}
                className="btn-premium btn-cyan"
              >
                Dodaj zadanie w celu →
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {todayTasks.map((task, index) => (
              <motion.div
                key={`${task.pillar.id}-${task.name}`}
                className="glass-card glass-card-cyan space-widget"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                whileHover={{ scale: 1.02, x: 4 }}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setActiveProjectId(task.pillar.id);
                  setCurrentView('finish');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveProjectId(task.pillar.id);
                    setCurrentView('finish');
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDoneConfirm(task.id, task.name);
                    }}
                    disabled={false}
                    className={`w-10 h-10 rounded-lg border-3 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      task.progress >= 100
                        ? 'bg-gradient-to-br from-neon-cyan to-neon-cyan border-neon-cyan shadow-glow-cyan'
                        : 'border-white/20 hover:border-neon-cyan hover:shadow-glow-cyan bg-white/5'
                    }`}
                  >
                    {task.progress >= 100 && (
                      <span className="text-black font-bold text-lg">✓</span>
                    )}
                    {task.progress < 100 && (
                      <span className="text-gray-400 text-xs opacity-60">○</span>
                    )}
                  </button>

                  <div className="flex-1">
                    <h3
                      className={`text-base font-medium mb-2 ${
                        task.progress >= 100 ? 'text-gray-500 line-through' : 'text-white'
                      }`}
                    >
                      {task.name}{' '}
                      {todayDeclarationTaskIds.has(Number(task.id)) && (
                        <span className="ml-2 text-[10px] px-2 py-1 rounded border border-gold/40 bg-gold/10 text-gold uppercase tracking-wider font-bold">
                          Z deklaracji
                        </span>
                      )}
                    </h3>

                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">{task.pillar.name}</span>
                      <span
                        className={`px-2 py-1 rounded-widget-sm text-xs font-bold uppercase ${
                          task.type === 'close'
                            ? 'bg-[color:color-mix(in_srgb,var(--accent-danger)_18%,transparent)] border border-[color:color-mix(in_srgb,var(--accent-danger)_50%,transparent)] text-[var(--accent-danger)]'
                            : 'bg-[color:color-mix(in_srgb,var(--accent-cyan)_18%,transparent)] border border-[color:color-mix(in_srgb,var(--accent-cyan)_50%,transparent)] text-[var(--accent-cyan)]'
                        }`}
                      >
                        {taskTypeLabel(String(task.type || ''))}
                      </span>
                    </div>
                    <div className="mt-3 text-[11px] text-gray-400">
                      Kliknij kartę, żeby wejść w Domykanie. Odhaczaj tylko, gdy DONE jest
                      spełnione.
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Progress Summary */}
      <motion.div
        className="widget-container-narrow mt-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="glass-card space-widget">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-glow-cyan mb-2">
                {todayTasks.filter((t) => t.progress >= 100).length}
              </div>
              <div className="text-xs uppercase tracking-wider text-gray-500">Zrobione</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-glow-magenta mb-2">
                {todayTasks.filter((t) => t.progress < 100).length}
              </div>
              <div className="text-xs uppercase tracking-wider text-gray-500">Pozostałe</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gradient-gold mb-2">
                {todayTasks.length > 0
                  ? Math.round(
                      (todayTasks.filter((t) => t.progress >= 100).length / todayTasks.length) * 100
                    )
                  : 100}
                %
              </div>
              <div className="text-xs uppercase tracking-wider text-gray-500">Postęp</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(TodayPremium);
