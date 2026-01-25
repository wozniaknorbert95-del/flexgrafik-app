import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../contexts/AppContext';
import { getTodaysFinishRecommendations } from '../utils/recommendations';

const DashboardPremium: React.FC = () => {
  const {
    data,
    handlePillarClick,
    setCurrentView,
    setActiveProjectId,
    startFinishSession,
    finishSessionsHistory,
    stuckCount,
    insights,
    basicStats,
    createPillar,
    updatePillar,
    ideas,
    addIdea,
    removeIdea,
  } = useAppContext();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalType, setNewGoalType] = useState<'main' | 'secondary' | 'lab'>('secondary');
  const [createError, setCreateError] = useState<string>('');
  const [showBacklogGoals, setShowBacklogGoals] = useState(false);

  // Ideas (PLAN 5.8)
  const [isIdeaCreateOpen, setIsIdeaCreateOpen] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [ideaTagsCsv, setIdeaTagsCsv] = useState('');
  const [ideaGoalId, setIdeaGoalId] = useState<number | 'none'>('none');

  const [ideaSearch, setIdeaSearch] = useState('');
  const [ideaFilterGoalId, setIdeaFilterGoalId] = useState<number | 'all'>('all');
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const todaysFocus = useMemo(() => {
    return getTodaysFinishRecommendations({
      // PLAN 5.2: focus on ACTIVE goals only (backlog is intentionally out of the main loop)
      pillars: (data?.pillars ?? []).filter(
        (p: any) => p && p.status !== 'done' && (p.activation ?? 'active') === 'active'
      ),
      finishSessionsHistory: finishSessionsHistory ?? [],
      limit: 5,
    });
  }, [data?.pillars, finishSessionsHistory]);

  // Simple calculations without complex dependencies
  const todayTasksCount = useMemo(() => {
    return (
      data?.pillars?.flatMap((pillar) => pillar.tasks.filter((task) => task.progress < 100))
        .length || 0
    );
  }, [data?.pillars]);

  const activeProjects = useMemo(() => {
    return data?.pillars?.filter((p) => p.status === 'in_progress').length || 0;
  }, [data?.pillars]);

  const activeGoalsCount = useMemo(() => {
    return (
      data?.pillars?.filter((p: any) => p.status !== 'done' && (p.activation ?? 'active') === 'active')
        .length || 0
    );
  }, [data?.pillars]);

  // PLAN 5.2 / D-003: dashboard powinien eksponować max 3 aktywne cele (main/secondary/lab).
  // Jeśli danych jest więcej (np. stary seed / import), pokazujemy pozostałe jako backlog (ukryte domyślnie),
  // ale nie kasujemy danych.
  const goalBuckets = useMemo(() => {
    const all = Array.isArray(data?.pillars) ? data.pillars : [];
    const maxActive = Number((data as any)?.settings?.goals?.maxActive ?? 3) || 3;
    const notDone = all.filter((p: any) => p?.status !== 'done');
    const done = all.filter((p: any) => p?.status === 'done');

    const typeRank = (t: any): number => {
      if (t === 'main') return 0;
      if (t === 'secondary') return 1;
      if (t === 'lab') return 2;
      return 3;
    };

    const sortGoals = (list: any[]) =>
      [...list].sort((a: any, b: any) => {
      const byType = typeRank(a?.type) - typeRank(b?.type);
      if (byType !== 0) return byType;
      const byCompletion = Number(b?.completion ?? 0) - Number(a?.completion ?? 0);
      if (byCompletion !== 0) return byCompletion;
      const aMs = new Date(a?.last_activity_date ?? 0).getTime();
      const bMs = new Date(b?.last_activity_date ?? 0).getTime();
      return (Number.isFinite(bMs) ? bMs : 0) - (Number.isFinite(aMs) ? aMs : 0);
    });

    const active = sortGoals(
      notDone.filter((p: any) => (p?.activation ?? 'active') === 'active')
    ).slice(0, Math.max(1, Math.min(10, Math.floor(maxActive))));
    const backlog = sortGoals(
      notDone.filter((p: any) => (p?.activation ?? 'active') !== 'active')
    );
    return { active, backlog, done, maxActive };
  }, [data?.pillars]);

  const activePillarsForDisplay = goalBuckets.active;
  const backlogPillarsForDisplay = goalBuckets.backlog;
  const hiddenBacklogCount = backlogPillarsForDisplay.length;
  const maxActiveGoals = (goalBuckets as any).maxActive ?? 3;
  const hasBacklogOnly = activePillarsForDisplay.length === 0 && hiddenBacklogCount > 0;
  const totalGoalsCount = Array.isArray((data as any)?.pillars) ? (data as any).pillars.length : 0;
  const visibleGoalsCount = activePillarsForDisplay.length;
  const activeVisibleGoalsCount =
    activePillarsForDisplay.filter((p: any) => (p?.status ?? 'in_progress') === 'in_progress').length;
  const pausedVisibleGoalsCount = Math.max(0, visibleGoalsCount - activeVisibleGoalsCount);

  // If migration moved goals to backlog, guide the user by default.
  useEffect(() => {
    if (hasBacklogOnly && !showBacklogGoals) {
      setShowBacklogGoals(true);
    }
  }, [hasBacklogOnly, showBacklogGoals]);

  const pillarNameById = useMemo(() => {
    const map = new Map<number, string>();
    (data?.pillars ?? []).forEach((p) => map.set(p.id, p.name));
    return map;
  }, [data?.pillars]);

  const filteredIdeas = useMemo(() => {
    const list = Array.isArray(ideas) ? ideas : [];
    const search = ideaSearch.trim().toLowerCase();
    const goalFilter = ideaFilterGoalId;

    const sorted = [...list].sort((a: any, b: any) => {
      const aMs = new Date(a?.updatedAt ?? a?.createdAt ?? 0).getTime();
      const bMs = new Date(b?.updatedAt ?? b?.createdAt ?? 0).getTime();
      return (Number.isFinite(bMs) ? bMs : 0) - (Number.isFinite(aMs) ? aMs : 0);
    });

    return sorted.filter((idea: any) => {
      if (goalFilter !== 'all') {
        const gid = Number(idea?.goalId);
        if (!Number.isFinite(gid) || gid !== goalFilter) return false;
      }

      if (!search) return true;

      const title = String(idea?.title ?? '').toLowerCase();
      const desc = String(idea?.description ?? '').toLowerCase();
      const tags = Array.isArray(idea?.tags) ? idea.tags.join(' ').toLowerCase() : '';

      return title.includes(search) || desc.includes(search) || tags.includes(search);
    });
  }, [ideas, ideaFilterGoalId, ideaSearch]);

  const canAddIdea = ideaTitle.trim().length > 0;
  const hasAnyStats =
    Number(basicStats?.finishSessionsLast7DaysCount ?? 0) > 0 ||
    Number(basicStats?.finishSessionsLast7DaysTotalMinutes ?? 0) > 0 ||
    Number(basicStats?.tasksCompletedLast7DaysCount ?? 0) > 0 ||
    Number(basicStats?.stuckTasksClassifiedLast7DaysCount ?? 0) > 0;

  const getHumanRecommendationReasons = (reasons: string[]): string[] => {
    const list = Array.isArray(reasons) ? reasons : [];
    const out: string[] = [];

    for (const r of list) {
      const s = String(r || '').trim();
      if (!s) continue;

      // Keep only user-facing reasons (no internal labels like "main goal" / "typ: close").
      if (s.startsWith('stuck@90')) {
        const m = s.match(/,\s*(\d+)d\b/);
        out.push(m?.[1] ? `utknięte 90% (${m[1]}d)` : 'utknięte 90%');
        continue;
      }
      if (s.startsWith('odwlekane')) {
        const m = s.match(/\((\d+)d\b/);
        out.push(m?.[1] ? `odkładane (${m[1]}d)` : 'odkładane');
        continue;
      }
      if (s === 'priority: critical') {
        out.push('priorytet: krytyczny');
        continue;
      }
      if (s === 'priority: high') {
        out.push('priorytet: wysoki');
        continue;
      }
    }

    // Return max 2 reasons, ordered by importance.
    const priority = (x: string) => {
      if (x.startsWith('utknięte 90%')) return 0;
      if (x.startsWith('priorytet:')) return 1;
      if (x.startsWith('odkładane')) return 2;
      return 3;
    };

    return out.sort((a, b) => priority(a) - priority(b)).slice(0, 2);
  };

  return (
    <motion.div
      className="pb-32 pt-8 px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div
        className="widget-container mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1
          className="text-4xl md:text-5xl font-black uppercase tracking-widest mb-2 text-neon-magenta"
        >
          Dashboard
        </h1>
        <p className="text-white text-base md:text-lg font-semibold tracking-wide">
          Na czym dziś się skupić, żeby realnie domknąć rzeczy?
        </p>
      </motion.div>

      {/* Onboarding / empty-loop guidance (PLAN: finish-first, minimum complexity) */}
      {activePillarsForDisplay.length === 0 && totalGoalsCount === 0 && (
        <motion.div
          className="widget-container mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
        >
          <div className="glass-card p-6" style={{ borderRadius: '16px' }}>
            <div className="text-white font-black text-xl mb-2">Start here</div>
            <div className="text-sm text-gray-300">
              1) Dodaj pierwszy cel (main/secondary/lab) → 2) Dodaj 1 task z Definicją DONE → 3) Wejdź w Finish
              Mode i domknij.
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  setCreateError('');
                  setIsCreateOpen(true);
                  setTimeout(() => {
                    document.getElementById('mission-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 0);
                }}
                className="btn-premium btn-magenta"
              >
                ➕ Add your first goal
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Backlog-only guidance (common after migration / finish-first) */}
      {hasBacklogOnly && (
        <motion.div
          className="widget-container mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
        >
          <div className="glass-card p-6" style={{ borderRadius: '16px' }}>
            <div className="text-white font-black text-xl mb-2">Masz cele w backlogu</div>
            <div className="text-sm text-gray-300">
              Żeby wrócić do działania, aktywuj 1 cel (limit {maxActiveGoals}) i dodaj/wybierz task do domknięcia.
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  setShowBacklogGoals(true);
                  setTimeout(() => {
                    document.getElementById('mission-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 0);
                }}
                className="btn-premium btn-magenta"
              >
                ✅ Pokaż backlog i aktywuj cel
              </button>
              <button onClick={() => setCurrentView('finish')} className="btn-premium btn-cyan">
                🏁 Finish Mode
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* PLAN 5.2: 3 active goals should be first (action context). */}
      <motion.div
        id="mission-overview"
        className="widget-container mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-magenta">
                Twoje cele
              </h2>
              <p className="text-sm text-gray-300 mt-1">
                Cele: {visibleGoalsCount} • aktywne: {activeVisibleGoalsCount}
                {pausedVisibleGoalsCount > 0 ? ` • pauza: ${pausedVisibleGoalsCount}` : ''}
                {hiddenBacklogCount > 0 ? ` • backlog: ${hiddenBacklogCount}` : ''}
                {` • limit: ${maxActiveGoals}`}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => {
                setCreateError('');
                setIsCreateOpen((v) => !v);
              }}
              className="btn-premium btn-cyan"
            >
              {isCreateOpen ? 'Close' : '➕ New goal'}
            </button>
          </div>
        </div>

        {isCreateOpen && (
          <div className="glass-card p-6 mb-6" style={{ borderRadius: '16px' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                  Goal name
                </label>
                <input
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value.slice(0, 120))}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="e.g. FlexGrafik OS launch"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                  Type
                </label>
                <select
                  value={newGoalType}
                  onChange={(e) => setNewGoalType(e.target.value as any)}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="main">main</option>
                  <option value="secondary">secondary</option>
                  <option value="lab">lab</option>
                </select>
              </div>
            </div>

            {activeGoalsCount >= maxActiveGoals && (
              <div className="mt-3 text-sm text-red-200">
                Limit {maxActiveGoals} aktywnych celów. Zakończ (done) lub przenieś do backlogu jeden z
                obecnych, żeby dodać nowy.
              </div>
            )}

            {createError && <div className="mt-3 text-sm text-red-200">{createError}</div>}

            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setCreateError('');
                  setNewGoalName('');
                  setNewGoalType('secondary');
                }}
                className="btn-premium btn-cyan"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = newGoalName.trim();
                  if (!name) return;
                  if (activeGoalsCount >= maxActiveGoals) {
                    setCreateError(`Nie można dodać ${maxActiveGoals + 1}. aktywnego celu.`);
                    return;
                  }
                  createPillar({ name, type: newGoalType });
                  setNewGoalName('');
                  setNewGoalType('secondary');
                  setCreateError('');
                  setIsCreateOpen(false);
                }}
                disabled={!newGoalName.trim() || activeGoalsCount >= maxActiveGoals}
                className="btn-premium btn-magenta disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Active goals grid (max 3) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activePillarsForDisplay.map((pillar) => {
            const type = (pillar as any)?.type === 'main' || (pillar as any)?.type === 'lab' ? (pillar as any).type : 'secondary';
            const accentText =
              type === 'main' ? 'text-gold' : type === 'lab' ? 'text-neon-magenta' : 'text-neon-cyan';
            const accentBorder = type === 'main' ? 'border-gold/40' : type === 'lab' ? 'border-neon-magenta/25' : 'border-neon-cyan/25';
            const fillClass =
              pillar.completion > 0
                ? type === 'main'
                  ? 'bg-gradient-to-r from-gold to-gold'
                  : type === 'lab'
                    ? 'bg-gradient-to-r from-neon-magenta to-neon-magenta'
                    : 'bg-gradient-to-r from-neon-cyan to-neon-cyan'
                : 'bg-gradient-to-r from-neutral-800 to-neutral-700';

            return (
              <motion.div
                key={pillar.id}
                className={`glass-card p-6 md:p-8 cursor-pointer text-left w-full hover:scale-[1.02] transition-all duration-200 shadow-xl relative overflow-hidden rounded-widget min-h-[180px] border ${
                  type === 'main' ? 'border-gold/40' : 'border-white/10'
                }`}
                role="button"
                tabIndex={0}
                onClick={() => handlePillarClick(pillar.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePillarClick(pillar.id);
                  }
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-neon-cyan/5"></div>
                <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
                  <div className="min-w-0">
                    <h3
                      className="text-xl font-black text-white line-clamp-2 break-words leading-tight uppercase tracking-wider"
                      style={{ wordBreak: 'break-word' }}
                    >
                      {pillar.name.toUpperCase()}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {/* Goal type badge (PLAN 5.2: highlight MAIN goal) */}
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          pillar.type === 'main'
                            ? 'bg-gold/10 border-gold/50 text-gold'
                            : pillar.type === 'lab'
                              ? 'bg-neon-magenta/10 border-neon-magenta/30 text-neon-magenta'
                              : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'
                        }`}
                        style={pillar.type === 'main' ? { boxShadow: 'var(--glow-gold)' } : undefined}
                        aria-label={`Goal type: ${pillar.type ?? 'secondary'}`}
                        title={`Goal type: ${pillar.type ?? 'secondary'}`}
                      >
                        {pillar.type === 'main' ? 'MAIN' : pillar.type === 'lab' ? 'LAB' : 'SECONDARY'}
                      </span>

                      {/* Status label (no ambiguous 🔥) */}
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          pillar.completion === 100
                            ? 'bg-[color:color-mix(in_srgb,var(--accent-success)_12%,transparent)] border-[color:color-mix(in_srgb,var(--accent-success)_45%,transparent)] text-[var(--accent-success)]'
                            : pillar.status === 'in_progress'
                              ? 'bg-neon-cyan/10 border-neon-cyan/40 text-neon-cyan'
                              : 'bg-white/5 border-white/10 text-white/70'
                        }`}
                      >
                        {pillar.completion === 100
                          ? 'DONE'
                          : pillar.status === 'in_progress'
                            ? 'W TRAKCIE'
                            : 'PAUZA'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`text-2xl font-bold ${pillar.completion === 100 ? 'text-neon-cyan' : 'text-transparent'}`}>
                      {pillar.completion === 100 ? '100%' : ''}
                    </span>
                    <span className="text-3xl flex-shrink-0">{pillar.completion === 100 ? '✅' : ''}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/90 font-semibold">Progress</span>
                    <span className={`text-lg font-black ${accentText}`}>{pillar.completion}%</span>
                  </div>
                  <div className={`w-full rounded-full h-3 bg-white/10 border ${accentBorder} overflow-hidden`}>
                    <div
                      className={`h-3 ${fillClass}`}
                      style={{
                        width: `${Math.max(pillar.completion, 8)}%`,
                        minWidth: pillar.completion === 0 ? '24px' : 'auto',
                      }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between text-sm text-white/90 font-semibold relative z-10">
                  <span className="flex items-center gap-2">
                    <span>📋</span>
                    <span>{pillar.tasks.length} tasków</span>
                  </span>
                  <span className="text-neon-magenta/90 font-black uppercase tracking-wider">Otwórz →</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Backlog goals (hidden by default) */}
        {hiddenBacklogCount > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowBacklogGoals((v) => !v)}
              className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 text-sm font-bold uppercase tracking-wider"
            >
              {showBacklogGoals ? 'Hide backlog' : `Show backlog (${hiddenBacklogCount})`}
            </button>

            {showBacklogGoals && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {backlogPillarsForDisplay.map((pillar: any) => (
                  <div
                    key={`backlog_${pillar.id}`}
                    className="glass-card p-5 text-left hover:bg-white/10 transition-all rounded-widget border border-white/10"
                    role="button"
                    tabIndex={0}
                    onClick={() => handlePillarClick(pillar.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePillarClick(pillar.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white font-bold break-words line-clamp-2">
                          {String(pillar.name || '').toUpperCase()}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          status: {pillar.status}
                        </div>
                      </div>
                      <div className="text-sm font-black text-neon-cyan flex-shrink-0">
                        {Math.round(Number(pillar.completion ?? 0))}%
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-gray-400">
                        Backlog → poza głównym loopem. Aktywuj, jeśli wracasz do tego celu.
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeGoalsCount >= maxActiveGoals) {
                            setCreateError(
                              `Limit ${maxActiveGoals} aktywnych celów. Zrób miejsce lub zakończ cel.`
                            );
                            return;
                          }
                          updatePillar(pillar.id, { activation: 'active' });
                        }}
                        disabled={activeGoalsCount >= maxActiveGoals}
                        className="min-h-[44px] px-3 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10"
                      >
                        ✅ Activate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Main CTA Button */}
      <motion.div
        className="widget-container mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-center mb-8">
          <button
            onClick={() => {
              const top = todaysFocus[0] || null;
              if (top) {
                setActiveProjectId(top.pillarId);
                startFinishSession(top.taskId, top.pillarId);
              }
              setCurrentView('finish');
            }}
            className="btn-premium btn-magenta w-full max-w-lg text-xl md:text-2xl py-10 px-8 hover:scale-105 transition-all duration-300 shadow-2xl shadow-neon-magenta/40 relative overflow-hidden flex items-center justify-center gap-4"
            style={{ borderRadius: '16px', alignItems: 'center' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-neon-magenta/20 via-transparent to-neon-cyan/20 rounded-xl"></div>
            <span className="text-5xl relative z-10">🏁</span>
            <div className="flex flex-col items-start relative z-10">
              <span className="font-black text-2xl">DOMKNIJ TERAZ</span>
              {todaysFocus.length > 0 ? (
                <span className="text-base opacity-95 font-semibold">
                  Domknij teraz: {todaysFocus[0].taskName}
                  <span className="block text-sm text-gray-200 font-bold mt-1">
                    📍 {todaysFocus[0].pillarName}
                    {getHumanRecommendationReasons(todaysFocus[0].reasons)[0]
                      ? ` • ${getHumanRecommendationReasons(todaysFocus[0].reasons)[0]}`
                      : ''}
                  </span>
                </span>
              ) : (
                <span className="text-base opacity-95 font-semibold">
                  Brak tasków bliskich finiszu (≥50%). Popracuj nad postępem albo wybierz task ręcznie w Finish Mode.
                </span>
              )}
            </div>
          </button>
        </div>

        {/* PLAN 5.2: Today's Focus must be obvious (action-first). */}
        <motion.div
          className="widget-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <span className="text-4xl">🎯</span>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-neon-cyan">
                Na czym dziś się skupić?
              </h2>
              <p className="text-sm text-gray-300 mt-1">
                Rekomendowane finisze na dziś (stuck@90 / wpływ / odwlekane)
              </p>
            </div>
            <div className="hidden md:block">
              <button onClick={() => setCurrentView('finish')} className="btn-premium btn-magenta">
                🏁 Finish Mode
              </button>
            </div>
          </div>

          <div className="glass-card p-6" style={{ borderRadius: '16px' }}>
            {todaysFocus.length === 0 ? (
              <div className="text-gray-300">
                Brak tasków bliskich finiszu (≥50%). Popracuj nad postępem albo wybierz 1 task ręcznie.
                <div className="mt-4">
                  <button onClick={() => setCurrentView('finish')} className="btn-premium btn-magenta">
                    🏁 Open Finish Mode
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {todaysFocus.map((rec) => (
                  <button
                    key={`${rec.pillarId}_${rec.taskId}`}
                    className="w-full text-left glass-card p-5 hover:scale-[1.01] transition-all duration-200 border border-gold/25"
                    onClick={() => {
                      setActiveProjectId(rec.pillarId);
                      startFinishSession(rec.taskId, rec.pillarId);
                      setCurrentView('finish');
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-white font-black text-lg break-words line-clamp-2">
                          {rec.taskName}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-200">
                            📍 {rec.pillarName}
                          </span>
                          {getHumanRecommendationReasons(rec.reasons).map((hr, idx) => (
                            <span
                              key={`${rec.pillarId}_${rec.taskId}_reason_${idx}`}
                              className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-200"
                            >
                              {hr}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="text-sm font-black text-gold">{Math.round(rec.taskProgress)}%</div>
                      </div>
                    </div>

                    <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-neon-magenta to-neon-cyan"
                        style={{ width: `${Math.max(0, Math.min(100, rec.taskProgress))}%` }}
                      />
                    </div>

                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* AI Assistant (secondary) */}
        <div className="widget-container mt-8">
          <div className="glass-card p-5 border border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm text-gray-400 uppercase tracking-wider font-semibold">
                Potrzebujesz pomocy?
              </div>
              <div className="text-white font-bold">
                AI może pomóc w priorytecie i mikrokroku (anti‑90%).
              </div>
            </div>
            <button onClick={() => setCurrentView('ai_coach')} className="btn-premium btn-cyan">
              🧠 Otwórz AI
            </button>
          </div>
        </div>

        {/* Stats (7d) — accordion (default collapsed) */}
        <div className="widget-container mt-8">
          <button
            type="button"
            className="w-full glass-card p-5 border border-white/10 flex items-center justify-between gap-4 min-h-[44px]"
            onClick={() => setIsStatsOpen((v) => !v)}
            aria-expanded={isStatsOpen}
          >
            <div className="text-left">
              <div className="text-sm text-gray-400 uppercase tracking-wider font-semibold">
                📊 Statystyki 7D
              </div>
              <div className="text-white font-bold">
                Stuck→Done:{' '}
                {basicStats.stuckTasksClassifiedLast7DaysCount &&
                basicStats.stuckTasksClassifiedLast7DaysCount > 0
                  ? `${Math.round((basicStats.stuckToDoneRateLast7Days ?? 0) * 100)}%`
                  : '—'}
              </div>
            </div>
            <div className="text-gray-300 font-black">{isStatsOpen ? '▲' : '▼'}</div>
          </button>

          {isStatsOpen && (
            <div className="mt-3 glass-card p-6 border border-white/10">
              {!hasAnyStats && (
                <div className="mb-5 text-sm text-gray-300">
                  Zacznij sesję Finish Mode, żeby zobaczyć statystyki z ostatnich 7 dni.
                </div>
              )}

              {/* Primary metric */}
              <div className="glass-card p-6 border border-gold/40 mb-6">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Stuck→Done (7d)
                </div>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div className="text-4xl md:text-5xl font-black text-gold">
                    {basicStats.stuckTasksClassifiedLast7DaysCount &&
                    basicStats.stuckTasksClassifiedLast7DaysCount > 0
                      ? `${Math.round((basicStats.stuckToDoneRateLast7Days ?? 0) * 100)}%`
                      : '—'}
                  </div>
                  {basicStats.stuckTasksClassifiedLast7DaysCount &&
                  basicStats.stuckTasksClassifiedLast7DaysCount > 0 ? (
                    <div className="text-sm text-gray-300">
                      {basicStats.stuckToDoneLast7DaysCount ?? 0}/
                      {basicStats.stuckTasksClassifiedLast7DaysCount ?? 0} tasks
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Brak danych</div>
                  )}
                </div>
              </div>

              {/* Secondary metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass-card p-4 border border-white/10">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Sessions</div>
                  <div className="text-2xl font-black text-white">
                    {basicStats.finishSessionsLast7DaysCount ?? 0}
                  </div>
                </div>
                <div className="glass-card p-4 border border-white/10">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Minutes</div>
                  <div className="text-2xl font-black text-white">
                    {Math.round(Number(basicStats.finishSessionsLast7DaysTotalMinutes ?? 0))}
                  </div>
                </div>
                <div className="glass-card p-4 border border-white/10">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Tasks done</div>
                  <div className="text-2xl font-black text-white">
                    {basicStats.tasksCompletedLast7DaysCount ?? 0}
                  </div>
                </div>
                <div className="glass-card p-4 border border-white/10">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Avg (min)</div>
                  <div className="text-2xl font-black text-white">
                    {Number(basicStats.finishSessionsLast7DaysAvgMinutes ?? 0).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* HIERARCHY LEVEL 4: Ideas Vault (PLAN 5.8) */}
      <motion.div
        className="widget-container mt-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <span className="text-4xl">💡</span>
            <div>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-magenta to-neon-cyan">
                Ideas Vault
              </h2>
              <p className="text-lg text-white font-semibold mt-2">
                {filteredIdeas.length} ideas • personal knowledge base
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button onClick={() => setIsIdeaCreateOpen((v) => !v)} className="btn-premium btn-cyan">
              {isIdeaCreateOpen ? 'Close' : '➕ New idea'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-6 mb-8" style={{ borderRadius: '16px' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                Search
              </label>
              <input
                value={ideaSearch}
                onChange={(e) => setIdeaSearch(e.target.value.slice(0, 120))}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                placeholder="title / description / tags…"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                Goal
              </label>
              <select
                value={ideaFilterGoalId}
                onChange={(e) => {
                  const v = e.target.value;
                  setIdeaFilterGoalId(v === 'all' ? 'all' : Number(v));
                }}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="all">all</option>
                {(data?.pillars ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Create form */}
        {isIdeaCreateOpen && (
          <div className="glass-card p-6 mb-8" style={{ borderRadius: '16px' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                  Title
                </label>
                <input
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value.slice(0, 120))}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="e.g. Next micro-feature for Sprint 3"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                  Optional goal
                </label>
                <select
                  value={ideaGoalId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setIdeaGoalId(v === 'none' ? 'none' : Number(v));
                  }}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="none">none</option>
                  {(data?.pillars ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                Description (optional)
              </label>
              <textarea
                value={ideaDescription}
                onChange={(e) => setIdeaDescription(e.target.value.slice(0, 2000))}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                placeholder="context / why it matters / next step…"
                rows={3}
              />
            </div>

            <div className="mt-4">
              <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                Tags (comma-separated)
              </label>
              <input
                value={ideaTagsCsv}
                onChange={(e) => setIdeaTagsCsv(e.target.value.slice(0, 240))}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                placeholder="e.g. AI, UX, sprint, reward"
              />
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => {
                  setIsIdeaCreateOpen(false);
                  setIdeaTitle('');
                  setIdeaDescription('');
                  setIdeaTagsCsv('');
                  setIdeaGoalId('none');
                }}
                className="btn-premium btn-cyan"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const title = ideaTitle.trim();
                  if (!title) return;
                  const tags = ideaTagsCsv
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);

                  addIdea({
                    title,
                    description: ideaDescription.trim() || undefined,
                    goalId: ideaGoalId === 'none' ? undefined : ideaGoalId,
                    tags: tags.length > 0 ? tags : undefined,
                  });

                  setIdeaTitle('');
                  setIdeaDescription('');
                  setIdeaTagsCsv('');
                  setIdeaGoalId('none');
                  setIsIdeaCreateOpen(false);
                }}
                disabled={!canAddIdea}
                className="btn-premium btn-magenta disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {filteredIdeas.length === 0 ? (
          <div className="glass-card space-widget-lg text-center">
            <span className="text-6xl mb-4 block">🗃️</span>
            <p className="text-white text-xl mb-2">No ideas yet</p>
            <p className="text-sm text-gray-400">
              Add your first idea to build a planning library.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIdeas.slice(0, 30).map((idea: any) => {
              const goalLabel = idea.goalId ? pillarNameById.get(Number(idea.goalId)) : null;
              const tags: string[] = Array.isArray(idea.tags) ? idea.tags : [];
              return (
                <div
                  key={idea.id}
                  className="glass-card space-widget hover:border-neon-cyan/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <div className="text-lg font-bold text-white break-words">{idea.title}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                        {goalLabel ? `Goal: ${goalLabel}` : 'Goal: none'} •{' '}
                        {new Date(idea.updatedAt ?? idea.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => removeIdea(idea.id)}
                      className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 hover:bg-red-500/15 flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>

                  {idea.description && (
                    <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">
                      {idea.description}
                    </p>
                  )}

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {tags.slice(0, 8).map((t) => (
                        <span
                          key={`${idea.id}_${t}`}
                          className="text-[11px] px-2 py-1 rounded border border-white/10 bg-white/5 text-gray-200"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredIdeas.length > 30 && (
              <p className="text-xs text-center text-gray-500 mt-4">
                Showing first 30 of {filteredIdeas.length} ideas (use search/filter).
              </p>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default DashboardPremium;
