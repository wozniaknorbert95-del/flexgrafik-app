import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../contexts/AppContext';
import { getTodaysFinishRecommendations } from '../utils/recommendations';
import { DeclarationsDisplay } from './DeclarationsDisplay';
import { Moon, Zap } from 'lucide-react';
import { CollapsibleAIAssistant } from './common/CollapsibleAIAssistant';
import { Pillar, Idea } from '../types';
import {
  filterActiveNotDonePillars,
  filterNotDonePillars,
  filterDonePillars,
  filterActivePillars,
  filterInactivePillars,
  sortPillarsByPriority,
  getActiveGoalsCount,
  getInProgressGoalsCount,
} from '../utils/goalHelpers';
import { isPillar } from '../utils/typeGuards';

const pad2 = (n: number) => String(n).padStart(2, '0');

const toIsoDateLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
};

const DashboardPremium: React.FC = () => {
  const {
    data,
    handlePillarClick,
    setCurrentView,
    setActiveProjectId,
    startFinishSession,
    finishSessionsHistory,
    currentFinishSession,
    stuckCount,
    insights,
    basicStats,
    createPillar,
    updatePillar,
    // Ideas Vault accessible via Navigation > More > Ideas
  } = useAppContext();

  const userStats = (data as any)?.userStats;
  const xp = Number(userStats?.xp ?? 0) || 0;
  const level = Math.max(1, Math.floor(Number(userStats?.level ?? 1) || 1));
  const nextLevelXp = Math.max(0, Math.floor(Number(userStats?.nextLevelXp ?? 0) || 0));
  const streakDays = Math.max(0, Math.floor(Number(userStats?.currentStreakDays ?? 0) || 0));

  const levelStartXp = level <= 1 ? 0 : level * level;
  const nextThreshold = (level + 1) * (level + 1);
  const levelSpan = Math.max(1, nextThreshold - levelStartXp);
  const levelProgress = Math.max(0, Math.min(1, (xp - levelStartXp) / levelSpan));
  const levelProgressPct = Math.round(levelProgress * 100);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalType, setNewGoalType] = useState<'main' | 'secondary' | 'lab'>('secondary');
  const [createError, setCreateError] = useState<string>('');
  const [showBacklogGoals, setShowBacklogGoals] = useState(false);

  // Ideas Vault moved to Navigation > More > Ideas - reduces cognitive load

  const todaysFocus = useMemo(() => {
    return getTodaysFinishRecommendations({
      // PLAN 5.2: focus on ACTIVE goals only (backlog is intentionally out of the main loop)
      pillars: filterActiveNotDonePillars(data?.pillars ?? []),
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
    return getInProgressGoalsCount(data?.pillars ?? []);
  }, [data?.pillars]);

  const activeGoalsCount = useMemo(() => {
    return getActiveGoalsCount(data?.pillars ?? []);
  }, [data?.pillars]);

  // PLAN 5.2 / D-003: dashboard powinien eksponować max 3 aktywne cele (main/secondary/lab).
  // Jeśli danych jest więcej (np. stary seed / import), pokazujemy pozostałe jako backlog (ukryte domyślnie),
  // ale nie kasujemy danych.
  const goalBuckets = useMemo(() => {
    const all = (data?.pillars ?? []).filter(isPillar);
    const maxActive = Number(data?.settings?.goals?.maxActive ?? 3) || 3;
    const notDone = filterNotDonePillars(all);
    const done = filterDonePillars(all);

    const active = sortPillarsByPriority(filterActivePillars(notDone)).slice(
      0,
      Math.max(1, Math.min(10, Math.floor(maxActive)))
    );
    const backlog = sortPillarsByPriority(filterInactivePillars(notDone));
    return { active, backlog, done, maxActive };
  }, [data?.pillars, data?.settings?.goals?.maxActive]);

  const activePillarsForDisplay = goalBuckets.active;
  const backlogPillarsForDisplay = goalBuckets.backlog;
  const hiddenBacklogCount = backlogPillarsForDisplay.length;
  const maxActiveGoals = goalBuckets.maxActive;
  const hasBacklogOnly = activePillarsForDisplay.length === 0 && hiddenBacklogCount > 0;
  const totalGoalsCount = (data?.pillars ?? []).filter(isPillar).length;
  const visibleGoalsCount = activePillarsForDisplay.length;
  const activeVisibleGoalsCount = activePillarsForDisplay.filter(
    (p) => (p.status ?? 'in_progress') === 'in_progress'
  ).length;
  const pausedVisibleGoalsCount = Math.max(0, visibleGoalsCount - activeVisibleGoalsCount);

  const nextAction = useMemo(() => {
    const pillars = filterActiveNotDonePillars((data?.pillars ?? []).filter(isPillar));

    // 1) Stuck task with highest progress
    const stuckCandidates: Array<{ pillar: Pillar; task: any }> = [];
    for (const p of pillars) {
      for (const t of p.tasks || []) {
        if (!t) continue;
        const progress = Number(t.progress ?? 0);
        if (progress >= 100 || t.status === 'done' || t.status === 'abandoned') continue;
        const isStuck =
          t.status === 'stuck' || t.stuckAtNinety === true || (progress >= 90 && progress < 100);
        if (!isStuck) continue;
        stuckCandidates.push({ pillar: p, task: t });
      }
    }
    stuckCandidates.sort((a, b) => Number(b.task.progress ?? 0) - Number(a.task.progress ?? 0));
    if (stuckCandidates[0]) {
      return {
        source: 'stuck',
        pillar: stuckCandidates[0].pillar,
        task: stuckCandidates[0].task,
        reason: 'Utknięte (najbliżej finiszu)',
      } as const;
    }

    // 2) Declaration task for today
    const todayIso = toIsoDateLocal(new Date());
    const protocols = Array.isArray((data as any)?.eveningProtocols)
      ? (data as any).eveningProtocols
      : [];
    const todays = protocols
      .filter((p: any) => p && String(p.targetDate || '').slice(0, 10) === todayIso)
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );

    const declarations = Array.isArray(todays[0]?.declarations) ? todays[0].declarations : [];
    const declCandidates = declarations
      .filter((d: any) => d && d.status !== 'cancelled' && d.status !== 'completed')
      .sort((a: any, b: any) =>
        String(a?.timeWindow?.start ?? '').localeCompare(String(b?.timeWindow?.start ?? ''))
      );

    for (const d of declCandidates) {
      const goalId = Number(d.goalId);
      const taskId = Number(d.taskId);
      if (!Number.isFinite(goalId) || !Number.isFinite(taskId)) continue;
      const pillar = pillars.find((p: any) => Number(p.id) === goalId);
      const task = pillar?.tasks?.find((t: any) => Number(t.id) === taskId);
      if (!pillar || !task) continue;
      if (
        Number(task.progress ?? 0) >= 100 ||
        task.status === 'done' ||
        task.status === 'abandoned'
      )
        continue;
      return {
        source: 'declaration',
        pillar,
        task,
        reason: 'Z deklaracji na dziś',
      } as const;
    }

    // 3) Main goal task with highest progress
    const main = pillars.find((p: any) => p.type === 'main') || null;
    if (main) {
      const tasks = (main.tasks || [])
        .filter(
          (t: any) =>
            t && Number(t.progress ?? 0) < 100 && t.status !== 'done' && t.status !== 'abandoned'
        )
        .sort((a: any, b: any) => Number(b.progress ?? 0) - Number(a.progress ?? 0));
      if (tasks[0]) {
        return {
          source: 'main',
          pillar: main,
          task: tasks[0],
          reason: 'Najbliższy finisz w celu głównym',
        } as const;
      }
    }

    return null;
  }, [data?.pillars, (data as any)?.eveningProtocols]);

  // If migration moved goals to backlog, guide the user by default.
  useEffect(() => {
    if (hasBacklogOnly && !showBacklogGoals) {
      setShowBacklogGoals(true);
    }
  }, [hasBacklogOnly, showBacklogGoals]);

  // Ideas Vault logic removed - accessible via Navigation > More > Ideas

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest mb-2 text-neon-magenta">
              Pulpit
            </h1>
            <p className="text-white text-base md:text-lg font-semibold tracking-wide">
              Dziś wygrywa jedna rzecz. Zacznij od priorytetu.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setCurrentView('today')}
              className="btn-premium btn-magenta flex items-center gap-2 px-5 py-3 text-sm whitespace-nowrap"
            >
              <Zap size={18} />
              <span>Zacznij dzień</span>
            </button>
          </div>
        </div>

        {/* HUD: XP / Level / Streak */}
        <div className="glass-card p-5 border border-white/10 rounded-widget">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                Postęp (grywalizacja)
              </div>
              <div className="mt-1 text-white font-black text-2xl">Poziom {level}</div>
              <div className="mt-1 text-xs text-gray-300">
                XP: <span className="font-bold text-white">{Math.floor(xp)}</span>{' '}
                <span className="text-gray-500">•</span> do następnego:{' '}
                <span className="font-bold text-gold">{nextLevelXp}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Seria</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">
                  {streakDays > 0 ? '🔥' : '🕯️'}
                </span>
                <span className="text-white font-black text-xl">{streakDays}d</span>
              </div>
              <div className="text-[11px] text-gray-500 text-right">
                Liczy się 1 ukończona sesja w celu głównym dziennie.
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>XP do kolejnego poziomu</span>
              <span className="font-bold text-gray-200">{levelProgressPct}%</span>
            </div>
            <div className="mt-2 w-full rounded-full h-3 bg-white/10 border border-neon-cyan/25 overflow-hidden">
              <motion.div
                className="h-3 bg-gradient-to-r from-neon-cyan via-blue-500 to-neon-magenta"
                initial={false}
                animate={{ width: `${Math.max(2, levelProgressPct)}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* PLAN_v2 / TASK-501: "CO TERAZ?" – jedna następna akcja */}
      <motion.div
        className="widget-container mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.11 }}
      >
        <div className="glass-card glass-card-gold space-widget-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                🎯 Co teraz?
              </div>
              <div className="text-2xl font-black text-gold mt-1">
                Jedna rzecz, która wygrywa dzień
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Jeśli zrobisz tylko to jedno, dzień jest wygrany.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('finish')}
              className="btn-premium btn-cyan text-sm whitespace-nowrap"
            >
              Otwórz Domykanie
            </button>
          </div>

          {nextAction ? (
            <div className="mt-5 p-4 rounded-lg bg-black/30 border border-gold/25">
              <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                {nextAction.reason}
              </div>
              <div className="mt-2 text-white text-xl font-bold">{nextAction.task.name}</div>
              <div className="mt-1 text-sm text-gray-300">
                Cel: <span className="font-semibold text-white">{nextAction.pillar.name}</span> •
                Postęp:{' '}
                <span className="font-bold text-gold">
                  {Math.round(Number(nextAction.task.progress ?? 0))}%
                </span>
              </div>
              <div className="mt-4 flex flex-col md:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveProjectId(nextAction.pillar.id);
                    setCurrentView('finish');
                  }}
                  className="btn-premium btn-magenta flex-1"
                >
                  Wejdź w Tryb Domykania →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveProjectId(nextAction.pillar.id);
                    handlePillarClick(nextAction.pillar.id);
                  }}
                  className="btn-premium btn-cyan flex-1"
                >
                  Zobacz cel →
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 text-sm text-gray-300">
              Brak „następnej akcji” do wybrania. Dodaj zadania do aktywnych celów albo wejdź w
              Domykanie i wybierz task.
            </div>
          )}
        </div>
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
            <div className="text-white font-black text-xl mb-2">Zacznij tutaj</div>
            <div className="text-sm text-gray-300">
              1) Dodaj pierwszy cel (main/secondary/lab) → 2) Dodaj 1 zadanie z Definicją DONE → 3)
              Wejdź w Tryb Domykania i domknij.
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  setCreateError('');
                  setIsCreateOpen(true);
                  setTimeout(() => {
                    document
                      .getElementById('mission-overview')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 0);
                }}
                className="btn-premium btn-magenta"
              >
                ➕ Dodaj pierwszy cel
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
              Żeby wrócić do działania, aktywuj 1 cel (limit {maxActiveGoals}) i dodaj/wybierz task
              do domknięcia.
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  setShowBacklogGoals(true);
                  setTimeout(() => {
                    document
                      .getElementById('mission-overview')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 0);
                }}
                className="btn-premium btn-magenta"
              >
                ✅ Pokaż backlog i aktywuj cel
              </button>
              <button onClick={() => setCurrentView('finish')} className="btn-premium btn-cyan">
                🏁 Tryb Domykania
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
              {isCreateOpen ? 'Zamknij' : '➕ Nowy cel'}
            </button>
          </div>
        </div>

        {isCreateOpen && (
          <div className="glass-card p-6 mb-6" style={{ borderRadius: '16px' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                  Nazwa celu
                </label>
                <input
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value.slice(0, 120))}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="np. start FlexGrafik OS"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                  Typ
                </label>
                <select
                  value={newGoalType}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'main' || value === 'secondary' || value === 'lab') {
                      setNewGoalType(value);
                    }
                  }}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="main">główny</option>
                  <option value="secondary">poboczny</option>
                  <option value="lab">laboratorium</option>
                </select>
              </div>
            </div>

            {activeGoalsCount >= maxActiveGoals && (
              <div className="mt-3 text-sm text-red-200">
                Limit {maxActiveGoals} aktywnych celów. Zakończ lub przenieś do backlogu jeden z
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
                Anuluj
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
                Utwórz
              </button>
            </div>
          </div>
        )}

        {/* Active goals grid (max 3) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activePillarsForDisplay.map((pillar) => {
            const type =
              pillar.type === 'main' || pillar.type === 'lab' ? pillar.type : 'secondary';
            const accentText =
              type === 'main'
                ? 'text-gold'
                : type === 'lab'
                  ? 'text-neon-magenta'
                  : 'text-neon-cyan';
            const accentBorder =
              type === 'main'
                ? 'border-gold/40'
                : type === 'lab'
                  ? 'border-neon-magenta/25'
                  : 'border-neon-cyan/25';
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
                        style={
                          pillar.type === 'main' ? { boxShadow: 'var(--glow-gold)' } : undefined
                        }
                        aria-label={`Typ celu: ${pillar.type ?? 'secondary'}`}
                        title={`Typ celu: ${pillar.type ?? 'secondary'}`}
                      >
                        {pillar.type === 'main'
                          ? 'GŁÓWNY'
                          : pillar.type === 'lab'
                            ? 'LAB'
                            : 'POBOCZNY'}
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
                    <span
                      className={`text-2xl font-bold ${pillar.completion === 100 ? 'text-neon-cyan' : 'text-transparent'}`}
                    >
                      {pillar.completion === 100 ? '100%' : ''}
                    </span>
                    <span className="text-3xl flex-shrink-0">
                      {pillar.completion === 100 ? '✅' : ''}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/90 font-semibold">Postęp</span>
                    <span className={`text-lg font-black ${accentText}`}>{pillar.completion}%</span>
                  </div>
                  <div
                    className={`w-full rounded-full h-3 bg-white/10 border ${accentBorder} overflow-hidden`}
                  >
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
                  <span className="text-neon-magenta/90 font-black uppercase tracking-wider">
                    Otwórz →
                  </span>
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
                {backlogPillarsForDisplay.map((pillar) => (
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
                        <div className="text-xs text-gray-400 mt-1">status: {pillar.status}</div>
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

      {/* Declarations from Evening Protocol - PRIMARY FOCUS (2x more prominent) */}
      <motion.div
        className="widget-container mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DeclarationsDisplay
          declarations={data.declarations || []}
          protocols={data.eveningProtocols || []}
          goals={data.pillars || []}
          currentFinishSession={currentFinishSession}
          onStartFinishSession={startFinishSession}
          onNavigateToFinish={() => setCurrentView('finish')}
          goalAgents={data.goalAgents || {}}
          onCancelDeclaration={(declarationId: string) => {
            try {
              setData((prev) => ({
                ...prev,
                declarations: (prev.declarations || []).map((d) =>
                  d.id === declarationId ? { ...d, status: 'cancelled' as const } : d
                ),
              }));
              // Toast will be shown by DeclarationsDisplay after confirmation
            } catch (error) {
              const { showError } = require('../utils/toastService');
              showError('Nie udało się anulować deklaracji. Spróbuj ponownie.', 5000);
            }
          }}
        />
      </motion.div>

      {/* Evening Protocol (secondary, "wieczorem") */}
      <motion.div
        className="widget-container mb-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <div className="glass-card space-widget border border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                Wieczorem (plan na jutro)
              </div>
              <div className="text-white font-bold mt-1">Protokół wieczorny</div>
              <div className="text-[11px] text-gray-400 mt-1">
                Wybierz max 3 zadania i przygotuj jutro bez przeciążenia.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('evening_protocol')}
              className="btn-premium btn-cyan text-sm whitespace-nowrap flex items-center gap-2"
            >
              <Moon size={18} />
              <span>Otwórz</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* AI Assistant (collapsible, secondary) */}
      <CollapsibleAIAssistant onOpenAI={() => setCurrentView('ai_coach')} />
    </motion.div>
  );
};

// Memoize to prevent unnecessary re-renders (large component with many calculations)
export default React.memo(DashboardPremium);
