import React, { useMemo, useState } from 'react';
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
      pillars: data?.pillars ?? [],
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
    return data?.pillars?.filter((p) => p.status !== 'done').length || 0;
  }, [data?.pillars]);

  // PLAN 5.2 / D-003: dashboard powinien eksponować max 3 aktywne cele (main/secondary/lab).
  // Jeśli danych jest więcej (np. stary seed / import), pokazujemy pozostałe jako backlog (ukryte domyślnie),
  // ale nie kasujemy danych.
  const goalBuckets = useMemo(() => {
    const all = Array.isArray(data?.pillars) ? data.pillars : [];
    const notDone = all.filter((p: any) => p?.status !== 'done');
    const done = all.filter((p: any) => p?.status === 'done');

    const typeRank = (t: any): number => {
      if (t === 'main') return 0;
      if (t === 'secondary') return 1;
      if (t === 'lab') return 2;
      return 3;
    };

    const sorted = [...notDone].sort((a: any, b: any) => {
      const byType = typeRank(a?.type) - typeRank(b?.type);
      if (byType !== 0) return byType;
      const byCompletion = Number(b?.completion ?? 0) - Number(a?.completion ?? 0);
      if (byCompletion !== 0) return byCompletion;
      const aMs = new Date(a?.last_activity_date ?? 0).getTime();
      const bMs = new Date(b?.last_activity_date ?? 0).getTime();
      return (Number.isFinite(bMs) ? bMs : 0) - (Number.isFinite(aMs) ? aMs : 0);
    });

    const active = sorted.slice(0, 3);
    const backlog = sorted.slice(3);
    return { active, backlog, done };
  }, [data?.pillars]);

  const activePillarsForDisplay = goalBuckets.active;
  const backlogPillarsForDisplay = goalBuckets.backlog;
  const hiddenBacklogCount = backlogPillarsForDisplay.length;

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
          className="text-6xl md:text-7xl font-black uppercase tracking-widest mb-4"
          style={{ color: '#ff00ff', textShadow: '0 0 20px rgba(255, 0, 255, 0.8)' }}
        >
          <span className="animate-pulse">Mission Control</span>
        </h1>
        <p className="text-white text-lg font-semibold tracking-wide">
          Command Center • Operations Dashboard
        </p>
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
            onClick={() => setCurrentView('today')}
            className="btn-premium btn-magenta w-full max-w-lg text-xl md:text-2xl py-10 px-8 hover:scale-105 transition-all duration-300 shadow-2xl shadow-neon-magenta/40 relative overflow-hidden flex items-center justify-center gap-4"
            style={{ borderRadius: '16px', alignItems: 'center' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-neon-magenta/20 via-transparent to-neon-cyan/20 animate-pulse rounded-xl"></div>
            <span className="text-5xl relative z-10">🚀</span>
            <div className="flex flex-col items-start relative z-10">
              <span className="font-black text-2xl">START YOUR MISSION</span>
              <span className="text-base opacity-95 font-semibold">
                {todayTasksCount > 0 ? `${todayTasksCount} tasks waiting` : 'Plan your day'}
              </span>
            </div>
          </button>
        </div>

        {/* AI Assistant entry (PLAN 5.4) */}
        <div className="text-center mb-6">
          <button
            onClick={() => setCurrentView('ai_coach')}
            className="btn-premium w-full max-w-md text-lg py-6 px-6 hover:scale-105 transition-all duration-300 shadow-2xl relative overflow-hidden flex items-center justify-center gap-3"
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              border: '2px solid rgba(245, 158, 11, 0.55)',
              borderRadius: '12px',
              boxShadow:
                '0 8px 32px rgba(245, 158, 11, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-transparent to-neon-cyan/10 animate-pulse rounded-lg"></div>
            <span className="text-3xl relative z-10">🤖</span>
            <div className="flex flex-col items-start relative z-10">
              <span className="font-black text-lg text-white">AI ASSISTANT</span>
              <span className="text-sm opacity-90 text-amber-100">
                Chat + priorytety + anti‑90%
              </span>
            </div>
          </button>
        </div>

        {/* System shortcuts (so nothing is "without a path") */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-center mb-6">
          <button
            onClick={() => setCurrentView('settings')}
            className="btn-premium btn-cyan w-full md:w-auto"
          >
            ⚙ Config (AI / backup)
          </button>
          <button
            onClick={() => setCurrentView('rules')}
            className="btn-premium btn-magenta w-full md:w-auto"
          >
            ⚡ Rules
          </button>
        </div>

        {/* Finish Mode Button - Only show if there are stuck tasks */}
        {insights.stuckTasks.length > 0 && (
          <div className="text-center mb-6">
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setCurrentView('finish')}
              className="btn-premium w-full max-w-md text-lg py-6 px-6 hover:scale-105 transition-all duration-300 shadow-2xl relative overflow-hidden flex items-center justify-center gap-3"
              style={{
                background: 'linear-gradient(135deg, #DC3545 0%, #B91C1C 100%)',
                border: '2px solid rgba(220, 53, 69, 0.8)',
                borderRadius: '12px',
                boxShadow:
                  '0 8px 32px rgba(220, 53, 69, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-900/30 via-transparent to-red-800/20 animate-pulse rounded-lg"></div>
              <span className="text-3xl relative z-10 animate-bounce">🏁</span>
              <div className="flex flex-col items-start relative z-10">
                <span className="font-black text-lg text-white">FINISH MODE</span>
                <span className="text-sm opacity-90 text-red-100">
                  {insights.stuckTasks.length} stuck tasks need completion
                </span>
              </div>
            </motion.button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mt-8">
          <div
            className="glass-card text-center py-6 px-4"
            style={{ border: '2px solid rgba(0, 243, 255, 0.6)', borderRadius: '16px' }}
          >
            <div
              className="text-4xl font-black mb-2 animate-pulse"
              style={{ color: '#00f3ff', textShadow: '0 0 15px rgba(0, 243, 255, 0.8)' }}
            >
              {activeProjects}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Active Missions
            </div>
          </div>
          <div
            className="glass-card text-center py-6 px-4"
            style={{ border: '2px solid rgba(255, 0, 255, 0.6)', borderRadius: '16px' }}
          >
            <div
              className="text-4xl font-black mb-2 animate-bounce"
              style={{ color: '#ff00ff', textShadow: '0 0 15px rgba(255, 0, 255, 0.8)' }}
            >
              {stuckCount}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Critical Alerts
            </div>
          </div>
          <div
            className="glass-card text-center py-6 px-4"
            style={{ border: '2px solid rgba(255, 215, 0, 0.6)', borderRadius: '16px' }}
          >
            <div
              className="text-4xl font-black mb-2"
              style={{ color: '#FFD700', textShadow: '0 0 15px rgba(255, 215, 0, 0.8)' }}
            >
              {data?.user?.streak || 0}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">Day Streak</div>
          </div>
        </div>

        {/* Finish Mode (7d) - MVP stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-8">
          <div
            className="glass-card text-center py-6 px-4"
            style={{ border: '2px solid rgba(250, 204, 21, 0.45)', borderRadius: '16px' }}
          >
            <div
              className="text-4xl font-black mb-2"
              style={{ color: '#FACC15', textShadow: '0 0 15px rgba(250, 204, 21, 0.6)' }}
            >
              {basicStats.mainGoalStreakDays}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              {basicStats.mainGoalStreakDays === 0
                ? 'Start a MAIN goal session today'
                : 'Main Goal Streak (days)'}
            </div>
          </div>
          <div
            className="glass-card text-center py-6 px-4"
            style={{ border: '2px solid rgba(16, 185, 129, 0.5)', borderRadius: '16px' }}
          >
            <div
              className="text-4xl font-black mb-2"
              style={{ color: '#10B981', textShadow: '0 0 15px rgba(16, 185, 129, 0.6)' }}
            >
              {basicStats.finishSessionsLast7DaysCount}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Finish Sessions (7d)
            </div>
          </div>
          <div
            className="glass-card text-center py-6 px-4"
            style={{ border: '2px solid rgba(59, 130, 246, 0.5)', borderRadius: '16px' }}
          >
            <div
              className="text-4xl font-black mb-2"
              style={{ color: '#3B82F6', textShadow: '0 0 15px rgba(59, 130, 246, 0.6)' }}
            >
              {basicStats.finishSessionsLast7DaysTotalMinutes}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Finish Minutes (7d)
            </div>
          </div>
          <div
            className="glass-card text-center py-6 px-4"
            style={{ border: '2px solid rgba(168, 85, 247, 0.5)', borderRadius: '16px' }}
          >
            <div
              className="text-4xl font-black mb-2"
              style={{ color: '#A855F7', textShadow: '0 0 15px rgba(168, 85, 247, 0.6)' }}
            >
              {basicStats.tasksCompletedLast7DaysCount ?? 0}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Tasks Done (7d)
            </div>
          </div>
          <div
            className="glass-card text-center py-6 px-4"
            style={{ border: '2px solid rgba(34, 197, 94, 0.35)', borderRadius: '16px' }}
          >
            <div
              className="text-4xl font-black mb-2"
              style={{ color: '#22C55E', textShadow: '0 0 15px rgba(34, 197, 94, 0.55)' }}
            >
              {basicStats.finishSessionsLast7DaysAvgMinutes.toFixed(1)}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Avg Session (7d)
            </div>
          </div>
          <div
            className="glass-card text-center py-6 px-4"
            style={{ border: '2px solid rgba(14, 165, 233, 0.35)', borderRadius: '16px' }}
          >
            <div
              className="text-4xl font-black mb-2"
              style={{ color: '#0EA5E9', textShadow: '0 0 15px rgba(14, 165, 233, 0.55)' }}
            >
              {basicStats.finishSessionsLast7DaysMedianMinutes.toFixed(1)}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Median Session (7d)
            </div>
          </div>
          <div
            className="glass-card text-center py-6 px-4"
            style={{ border: '2px solid rgba(251, 146, 60, 0.4)', borderRadius: '16px' }}
          >
            <div
              className="text-4xl font-black mb-2"
              style={{ color: '#FB923C', textShadow: '0 0 15px rgba(251, 146, 60, 0.55)' }}
            >
              {basicStats.finishSessionsLast7DaysUniqueTasks}
            </div>
            <div className="text-sm text-white font-bold uppercase tracking-wider">
              Unique Tasks (7d)
            </div>
          </div>

          {/* Stuck → Done rate (7d) */}
          <div
            className="glass-card text-center py-6 px-4"
            style={{ border: '2px solid rgba(239, 68, 68, 0.35)', borderRadius: '16px' }}
          >
            <div
              className="text-4xl font-black mb-2"
              style={{ color: '#EF4444', textShadow: '0 0 15px rgba(239, 68, 68, 0.55)' }}
            >
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

      {/* HIERARCHY LEVEL 2: Today's Focus (PLAN 5.2) */}
      <motion.div
        className="widget-container mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <div className="flex items-center gap-4 mb-6">
          <span className="text-4xl">🎯</span>
          <div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-neon-cyan">
              Dzisiejsze finishe
            </h2>
            <p className="text-sm text-gray-300 mt-1">
              Na czym dziś się skupić, żeby realnie domknąć rzeczy (stuck@90 / main goal / odwlekane)
            </p>
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
                  className="w-full text-left glass-card p-5 hover:scale-[1.01] transition-all duration-200"
                  style={{ borderRadius: '16px', border: '1px solid rgba(255, 215, 0, 0.25)' }}
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
              <h2 className="text-3xl font-black uppercase tracking-widest text-neon-magenta animate-pulse">
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
                  className={`glass-card p-8 cursor-pointer text-left w-full hover:scale-105 transition-all duration-300 focus:outline-none shadow-xl relative overflow-hidden ${
                    isStuck ? 'animate-pulse' : ''
                  }`}
                  style={{
                    border: isStuck
                      ? '2px solid rgba(139, 0, 0, 0.8)' // Dark red border for stuck
                      : '2px solid rgba(255, 0, 255, 0.6)',
                    boxShadow: isStuck
                      ? '0 8px 32px rgba(139, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 20px rgba(139, 0, 0, 0.3)'
                      : '0 8px 32px rgba(255, 0, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    background: isStuck
                      ? 'linear-gradient(135deg, rgba(139, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.8) 100%)'
                      : undefined,
                  }}
                  onClick={() => handlePillarClick(pillar.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={
                    isStuck
                      ? {
                          boxShadow: [
                            '0 8px 32px rgba(139, 0, 0, 0.4), 0 0 20px rgba(139, 0, 0, 0.3)',
                            '0 8px 32px rgba(139, 0, 0, 0.6), 0 0 30px rgba(139, 0, 0, 0.5)',
                            '0 8px 32px rgba(139, 0, 0, 0.4), 0 0 20px rgba(139, 0, 0, 0.3)',
                          ],
                        }
                      : {}
                  }
                  transition={isStuck ? { duration: 2, repeat: Infinity } : {}}
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
                      style={{
                        color: '#ffffff',
                        textShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
                        wordBreak: 'break-word',
                      }}
                    >
                      {task.name}
                    </h3>
                    <span className="text-4xl flex-shrink-0 animate-bounce">
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
                    <span
                      style={{
                        color: isStuck ? '#ff4444' : '#ff00ff',
                        textShadow: `0 0 10px ${isStuck ? 'rgba(255, 68, 68, 0.8)' : 'rgba(255, 0, 255, 0.8)'}`,
                        fontSize: '16px',
                        fontWeight: '900',
                      }}
                    >
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
        className="widget-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <span className="text-4xl animate-pulse">🎯</span>
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
              Active goals: {activePillarsForDisplay.length}/3
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

            {activeGoalsCount >= 3 && (
              <div className="mt-3 text-sm text-red-200">
                Limit 3 aktywnych celów. Zakończ (done) jeden z obecnych, żeby dodać nowy.
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
                  if (activeGoalsCount >= 3) {
                    setCreateError('Nie można dodać 4. aktywnego celu.');
                    return;
                  }
                  createPillar({ name, type: newGoalType });
                  setNewGoalName('');
                  setNewGoalType('secondary');
                  setCreateError('');
                  setIsCreateOpen(false);
                }}
                disabled={!newGoalName.trim() || activeGoalsCount >= 3}
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
              className="glass-card p-12 cursor-pointer text-left w-full hover:scale-105 transition-all duration-300 shadow-xl relative overflow-hidden"
              style={{
                border: '3px solid rgba(0, 243, 255, 0.6)',
                boxShadow:
                  '0 12px 48px rgba(0, 243, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                minHeight: '240px',
                borderRadius: '16px',
              }}
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
                  style={{
                    wordBreak: 'break-word',
                    color: '#ffffff',
                    textShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
                  }}
                >
                  {pillar.name.toUpperCase()}
                </h3>
                <div className="flex items-center gap-2">
                  <span
                    className="text-2xl font-bold"
                    style={{ color: pillar.completion === 100 ? '#00f3ff' : 'transparent' }}
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
                  <span
                    className="text-2xl font-bold"
                    style={{ color: '#00f3ff', textShadow: '0 0 10px rgba(0, 243, 255, 0.8)' }}
                  >
                    {pillar.completion}%
                  </span>
                </div>
                <div
                  className="w-full rounded-full h-6 shadow-inner"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                  }}
                >
                  <div
                    className="h-6 rounded-full transition-all duration-700 shadow-2xl relative overflow-hidden"
                    style={{
                      width: `${Math.max(pillar.completion, 8)}%`,
                      minWidth: pillar.completion === 0 ? '24px' : 'auto',
                      borderRadius: '10px',
                      background:
                        pillar.completion >= 90
                          ? 'linear-gradient(90deg, #ff0080 0%, #ff4080 50%, #00e5ff 100%)'
                          : pillar.completion >= 50
                            ? 'linear-gradient(90deg, #00e5ff 0%, #00b8ff 100%)'
                            : pillar.completion > 0
                              ? 'linear-gradient(90deg, #666 0%, #888 100%)'
                              : 'linear-gradient(90deg, #333 0%, #555 100%)',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
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
                  className="px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300"
                  style={{
                    background: 'rgba(255, 0, 255, 0.1)',
                    border: '1px solid rgba(255, 0, 255, 0.3)',
                    color: '#ff00ff',
                    textShadow: '0 0 8px rgba(255, 0, 255, 0.6)',
                    borderRadius: '12px',
                  }}
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
                  <button
                    key={`backlog_${pillar.id}`}
                    className="glass-card p-5 text-left hover:bg-white/10 transition-all"
                    style={{ borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                    onClick={() => handlePillarClick(pillar.id)}
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
                  </button>
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
