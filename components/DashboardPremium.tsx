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

  console.log('🎯 DashboardPremium: Full component loaded');

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

  return (
    <motion.div
      className="pb-32 pt-8 px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div
        className="widget-container mb-16"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1
          className="text-6xl md:text-7xl font-black uppercase tracking-widest mb-4 text-neon-magenta"
        >
          Dashboard
        </h1>
        <p className="text-white text-lg font-semibold tracking-wide">
          Na czym dziś się skupić, żeby realnie domknąć rzeczy? (PLAN 5.2)
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
              <span className="font-black text-2xl">START FINISH MODE</span>
              <span className="text-base opacity-95 font-semibold">
                {todaysFocus.length > 0
                  ? `Top finisz: ${todaysFocus[0].taskName} (${Math.round(todaysFocus[0].taskProgress)}%)`
                  : 'Wybierz task i domknij go (25 min)'}
              </span>
            </div>
          </button>
        </div>

        {/* AI Assistant entry (PLAN 5.4) */}
        <div className="text-center mb-6">
          <button
            onClick={() => setCurrentView('ai_coach')}
            className="glass-card glass-card-warning w-full max-w-md text-lg py-6 px-6 hover:scale-105 transition-all duration-300 shadow-xl relative overflow-hidden flex items-center justify-center gap-3"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/15 via-transparent to-neon-cyan/10 rounded-lg"></div>
            <span className="text-3xl relative z-10">🤖</span>
            <div className="flex flex-col items-start relative z-10">
              <span className="font-black text-lg text-white">AI ASSISTANT</span>
              <span className="text-sm opacity-90 text-gray-200">
                Chat + priorytety + anti‑90%
              </span>
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
                Rekomendowane finisze na dziś (stuck@90 / main goal / odwlekane)
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
                Brak jasnych rekomendacji. Wybierz 1 task i odpal Finish Mode na 25 min.
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
                        <div className="text-xs text-gray-400 mt-1">🏗️ {rec.pillarName}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="text-sm font-black text-gold">{Math.round(rec.taskProgress)}%</div>
                        <div className="text-xs text-gray-400">🏁 Start</div>
                      </div>
                    </div>

                    <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-neon-magenta to-neon-cyan"
                        style={{ width: `${Math.max(0, Math.min(100, rec.taskProgress))}%` }}
                      />
                    </div>

                    {rec.reasons.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {rec.reasons.map((r, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-200"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mt-8">
          <div className="glass-card text-center py-6 px-4 border-2 border-neon-cyan/50 rounded-widget">
            <div
              className="text-4xl font-black mb-2 text-neon-cyan"
            >
              {activeProjects}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Active Missions
            </div>
          </div>
          <div
            className={`glass-card text-center py-6 px-4 rounded-widget ${stuckCount > 0 ? 'glass-card-warning' : ''}`}
          >
            <div
              className={`text-4xl font-black mb-2 text-neon-magenta ${stuckCount > 0 ? 'animate-pulse' : ''}`}
            >
              {stuckCount}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Critical Alerts
            </div>
          </div>
          <div className="glass-card text-center py-6 px-4 border-2 border-gold/50 rounded-widget">
            <div className="text-4xl font-black mb-2 text-gold">
              {data?.user?.streak || 0}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">Day Streak</div>
          </div>
        </div>

        {/* Finish Mode (7d) - MVP stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-8">
          <div className="glass-card text-center py-6 px-4 border-2 border-gold/40 rounded-widget">
            <div className="text-4xl font-black mb-2 text-gold">
              {basicStats.mainGoalStreakDays}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              {basicStats.mainGoalStreakDays === 0
                ? 'Start a MAIN goal session today'
                : 'Main Goal Streak (days)'}
            </div>
          </div>
          <div className="glass-card glass-card-success text-center py-6 px-4 rounded-widget">
            <div className="text-4xl font-black mb-2 text-success-400">
              {basicStats.finishSessionsLast7DaysCount}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Finish Sessions (7d)
            </div>
          </div>
          <div className="glass-card text-center py-6 px-4 border-2 border-neon-cyan/30 rounded-widget">
            <div className="text-4xl font-black mb-2 text-neon-cyan">
              {basicStats.finishSessionsLast7DaysTotalMinutes}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Finish Minutes (7d)
            </div>
          </div>
          <div className="glass-card glass-card-success text-center py-6 px-4 rounded-widget">
            <div className="text-4xl font-black mb-2 text-success-400">
              {basicStats.tasksCompletedLast7DaysCount ?? 0}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Tasks Done (7d)
            </div>
          </div>
          <div className="glass-card text-center py-6 px-4 border-2 border-neon-cyan/30 rounded-widget">
            <div className="text-4xl font-black mb-2 text-neon-cyan">
              {basicStats.finishSessionsLast7DaysAvgMinutes.toFixed(1)}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Avg Session (7d)
            </div>
          </div>
          <div className="glass-card text-center py-6 px-4 border-2 border-neon-cyan/30 rounded-widget">
            <div className="text-4xl font-black mb-2 text-neon-cyan">
              {basicStats.finishSessionsLast7DaysMedianMinutes.toFixed(1)}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Median Session (7d)
            </div>
          </div>
          <div className="glass-card glass-card-warning text-center py-6 px-4 rounded-widget">
            <div className="text-4xl font-black mb-2 text-warning-300">
              {basicStats.finishSessionsLast7DaysUniqueTasks}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Unique Tasks (7d)
            </div>
          </div>

          {/* Stuck → Done rate (7d) */}
          <div className="glass-card glass-card-error text-center py-6 px-4 rounded-widget">
            <div className="text-4xl font-black mb-2 text-error-400">
              {basicStats.stuckTasksClassifiedLast7DaysCount &&
              basicStats.stuckTasksClassifiedLast7DaysCount > 0
                ? `${Math.round((basicStats.stuckToDoneRateLast7Days ?? 0) * 100)}%`
                : '—'}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Stuck→Done (7d)
            </div>
            <div className="text-xs text-gray-300 mt-1">
              {basicStats.stuckToDoneLast7DaysCount ?? 0}/
              {basicStats.stuckTasksClassifiedLast7DaysCount ?? 0} tasks
            </div>
          </div>
        </div>
      </motion.div>

      {/* HIERARCHY LEVEL 2: Alerts - Critical attention needed */}
      {insights.stuckTasks.length > 0 && (
        <motion.div
          className="widget-container mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <span className="text-5xl animate-bounce">🚨</span>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-widest text-neon-magenta">
                Critical Alerts
              </h2>
              <p className="text-lg text-white font-semibold mt-2">Immediate action required</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.stuckTasks.slice(0, 4).map((task) => {
              // Find the pillar this task belongs to
              const pillar = data.pillars.find((p) => p.tasks.some((t) => t.id === task.id));
              if (!pillar) return null;

              // Check if task is stuck (for UI styling)
              const isStuck =
                task.progress >= 90 && task.progress < 100 && task.daysInCurrentState > 3;

              return (
                <motion.button
                  key={task.id}
                  className={`glass-card p-8 cursor-pointer text-left w-full hover:scale-105 transition-all duration-300 focus:outline-none shadow-xl relative overflow-hidden rounded-widget ${
                    isStuck ? 'glass-card-error' : 'glass-card-warning'
                  }`}
                  onClick={() => handlePillarClick(pillar.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${
                      isStuck
                        ? 'from-red-900/20 via-transparent to-red-800/10'
                        : 'from-neon-magenta/10 via-transparent to-neon-cyan/5'
                    }`}
                  ></div>
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <h3
                      className="text-2xl font-black line-clamp-2 break-words"
                      style={{ wordBreak: 'break-word' }}
                    >
                      {task.name}
                    </h3>
                    <span className="text-4xl flex-shrink-0">
                      {isStuck ? '💀' : '🚨'}
                    </span>
                  </div>
                  <p
                    className={`text-lg font-bold mb-3 ${
                      isStuck ? 'text-red-400' : 'text-neon-magenta'
                    }`}
                  >
                    {isStuck ? 'STUCK' : 'Stuck'} at {task.progress}% for{' '}
                    {task.daysInCurrentState || 0} days
                  </p>
                  <div className="flex items-center justify-between text-base text-white font-semibold relative z-10">
                    <span>🏗️ {pillar.name}</span>
                    <span className={`text-sm font-black uppercase tracking-wider ${isStuck ? 'text-error-300' : 'text-neon-magenta'}`}>
                      • {isStuck ? 'BREAK THE DIP' : 'RESOLVE NOW'}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* HIERARCHY LEVEL 3: Mission Overview - All projects */}
      <motion.div
        id="mission-overview"
        className="widget-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🎯</span>
            <div>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-magenta">
                Mission Overview
              </h2>
              <p className="text-lg text-white font-semibold mt-2">
                {activeProjects} active • {data?.pillars?.length || 0} total missions
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
              {isCreateOpen ? 'Close' : '➕ New mission'}
            </button>
            <div className="text-xs text-gray-400">
              Active goals: {activePillarsForDisplay.length}/{maxActiveGoals}
              {hiddenBacklogCount > 0 ? ` • Backlog: ${hiddenBacklogCount}` : ''}
            </div>
          </div>
        </div>

        {isCreateOpen && (
          <div className="glass-card p-6 mb-8" style={{ borderRadius: '16px' }}>
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
          {activePillarsForDisplay.map((pillar) => (
            <motion.div
              key={pillar.id}
              className="glass-card p-12 cursor-pointer text-left w-full hover:scale-105 transition-all duration-300 shadow-xl relative overflow-hidden border-2 border-neon-cyan/50 rounded-widget min-h-[240px]"
              role="button"
              tabIndex={0}
              onClick={() => handlePillarClick(pillar.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePillarClick(pillar.id);
                }
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-neon-cyan/5"></div>
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3
                  className="text-2xl font-black text-white line-clamp-2 break-words leading-tight uppercase tracking-wider"
                  style={{ wordBreak: 'break-word' }}
                >
                  {pillar.name.toUpperCase()}
                </h3>
                <div className="flex items-center gap-2">
                  {/* Goal type badge (PLAN 5.2: highlight MAIN goal) */}
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      pillar.type === 'main'
                        ? 'bg-gold/10 border-gold/50 text-gold'
                        : 'bg-white/5 border-white/10 text-white/80'
                    }`}
                    style={pillar.type === 'main' ? { boxShadow: 'var(--glow-gold)' } : undefined}
                    aria-label={`Goal type: ${pillar.type ?? 'secondary'}`}
                    title={`Goal type: ${pillar.type ?? 'secondary'}`}
                  >
                    {pillar.type === 'main'
                      ? 'MAIN'
                      : pillar.type === 'lab'
                        ? 'LAB'
                        : 'SECONDARY'}
                  </span>
                  <span
                    className={`text-2xl font-bold ${pillar.completion === 100 ? 'text-neon-cyan' : 'text-transparent'}`}
                  >
                    {pillar.completion === 100 ? '100%' : ''}
                  </span>
                  <span className="text-4xl flex-shrink-0">
                    {pillar.completion === 100
                      ? '✅'
                      : pillar.status === 'in_progress'
                        ? '🔥'
                        : '⏸️'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6 relative z-10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg text-white font-medium">Progress</span>
                  <span className="text-2xl font-bold text-neon-cyan">
                    {pillar.completion}%
                  </span>
                </div>
                <div className="w-full rounded-full h-6 shadow-inner bg-white/10 border border-white/20">
                  <div
                    className={`h-6 rounded-full transition-all duration-700 shadow-2xl relative overflow-hidden ${
                      pillar.completion >= 90
                        ? 'bg-gradient-to-r from-neon-magenta to-neon-cyan'
                        : pillar.completion >= 50
                          ? 'bg-gradient-to-r from-neon-cyan to-cyan-400'
                          : pillar.completion > 0
                            ? 'bg-gradient-to-r from-neutral-600 to-neutral-400'
                            : 'bg-gradient-to-r from-neutral-800 to-neutral-600'
                    }`}
                    style={{
                      width: `${Math.max(pillar.completion, 8)}%`,
                      minWidth: pillar.completion === 0 ? '24px' : 'auto',
                    }}
                  >
                    <div className="absolute inset-0 shadow-inner"></div>
                  </div>
                </div>
              </div>

              {/* Task Count */}
              <div className="flex items-center justify-between text-lg text-white font-bold relative z-10">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📋</span>
                  <span>{pillar.tasks.length} Total Tasks</span>
                </div>
                <span
                  className="px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 bg-neon-magenta/10 border border-neon-magenta/30 text-neon-magenta hover:shadow-glow-secondary-xs"
                >
                  VIEW →
                </span>
              </div>
            </motion.div>
          ))}
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
                          type: {pillar.type ?? 'secondary'} • status: {pillar.status}
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
