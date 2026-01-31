import React, { useState, useMemo, Suspense, lazy } from 'react';
import { ViewState, AppData, TimerState, FinishSession } from '../types';
import { NormalizedAppData } from '../types/normalized';
import { BasicStats } from '../utils/stats';

// Critical components loaded immediately (needed for initial render)
import Dashboard from './DashboardPremium';
import Today from './TodayPremium';
import Navigation from './Navigation';

// Lazy loaded components (loaded on demand)
const Timer = lazy(() => import('./TimerPremium'));
const AICoach = lazy(() => import('./screens/AICoachPremium'));
const Settings = lazy(() => import('./SettingsPremium'));
const FinishMode = lazy(() => import('./FinishMode'));
const PillarDetail = lazy(() => import('./PillarDetailPremium'));
const Rules = lazy(() => import('./RulesPremium'));
const IdeasVault = lazy(() => import('./IdeasVaultPremium'));
const EveningProtocolPremium = lazy(() => import('./EveningProtocolPremium'));
const CalendarPremium = lazy(() => import('./CalendarPremium'));
const WeeklyReviewPremium = lazy(() => import('./WeeklyReviewPremium'));

import { ComponentLoadingFallback } from './common/LoadingSpinner';

interface RouteManagerProps {
  currentView: ViewState;
  data: AppData;
  normalizedData: NormalizedAppData | null;
  activeProjectId: number | null;
  setCurrentView: (view: ViewState) => void;
  setActiveProjectId: (id: number | null) => void;
  handlePillarClick: (id: number) => void;
  handleAlertClick: (type: 'stuck' | 'checkin', projectId?: number) => void;
  handleToggleTask: (taskId: number, newProgress?: number) => Promise<void>;
  handleUpdateSettings: (settings: AppData['settings']) => void;
  handleUpdateChatHistory: (history: AppData['aiChatHistory']) => void;
  handleUpdateRules: (rules: AppData['customRules']) => void;
  isTimerRunning: boolean;
  timerState: TimerState | null;
  setIsTimerRunning: (running: boolean) => void;
  setTimerState: (state: TimerState | null) => void;
  onSendAICoachMessage: (message: string) => Promise<void>;
  basicStats: BasicStats;
  finishSessionsHistory: FinishSession[];
}

// Loading fallback component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-obsidian">
    <div className="text-center">
      <div className="inline-block w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-400 text-sm uppercase tracking-wider">Ładuję…</p>
    </div>
  </div>
);

// Temporarily removed SuspenseWrapper

export const RouteManager: React.FC<RouteManagerProps> = ({
  currentView,
  data,
  normalizedData,
  activeProjectId,
  setCurrentView,
  setActiveProjectId,
  handlePillarClick,
  handleAlertClick,
  handleToggleTask,
  handleUpdateSettings,
  handleUpdateChatHistory,
  handleUpdateRules,
  isTimerRunning,
  timerState,
  setIsTimerRunning,
  setTimerState,
  onSendAICoachMessage,
  basicStats,
  finishSessionsHistory,
}) => {
  const renderView = () => {
    // Safety check
    if (!data) return null;

    switch (currentView) {
      case 'home':
        return <Dashboard key="home" />;

      case 'today':
        return <Today key="today" />;

      case 'finish':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <FinishMode key="finish" />
          </Suspense>
        );

      case 'calendar':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <CalendarPremium key="calendar" />
          </Suspense>
        );

      case 'sprint':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            {/* FAZA 3: Sprint scalamy z tygodniem (kalendarz Pn–Nd). */}
            <CalendarPremium key="week" />
          </Suspense>
        );

      case 'pillar_detail':
        const pillar = data.pillars.find((p) => p.id === activeProjectId);
        if (!pillar) return <Dashboard key="home-fallback" />;
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <PillarDetail
              key={`pillar-${activeProjectId}`}
              pillar={pillar}
              normalizedData={normalizedData}
              optimisticState={undefined}
              onBack={() => setCurrentView('home')}
              onToggleTask={handleToggleTask}
              onEnterFinishMode={() => setCurrentView('finish')}
            />
          </Suspense>
        );

      case 'accountability':
        return (
          <div key="accountability" className="min-h-screen pb-32 pt-8 px-6">
            {/* Header */}
            <div className="widget-container mb-12">
              <button onClick={() => setCurrentView('home')} className="btn-premium btn-cyan mb-8">
                ← Wróć
              </button>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-6xl">📊</span>
                <h1 className="text-6xl font-extrabold text-gradient-gold tracking-wider uppercase">
                  Rozliczalność
                </h1>
              </div>
              <p className="text-sm text-gray-400 uppercase tracking-wider">
                /// Historia powiadomień i statystyki
              </p>
            </div>

            {/* Quick Stats */}
            <div className="widget-container mb-12">
              <div className="grid grid-cols-2 gap-6">
                <div className="glass-card glass-card-magenta space-widget text-center">
                  <div className="text-5xl font-bold text-glow-magenta mb-2">
                    {data.user.streak}
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Dni serii
                  </div>
                </div>
                <div className="glass-card glass-card-cyan space-widget text-center">
                  <div className="text-5xl font-bold text-glow-cyan mb-2">
                    {data.notificationHistory.length}
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Powiadomienia
                  </div>
                </div>
              </div>
            </div>

            {/* Finish Mode Statistics (7D) */}
            <div className="widget-container mb-12">
              <h2 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-3 mb-6">
                <span className="text-3xl">📊</span>
                <span>Statystyki Trybu Domykania (7 dni)</span>
              </h2>

              {(() => {
                const hasAnyStats =
                  Number(basicStats?.finishSessionsLast7DaysCount ?? 0) > 0 ||
                  Number(basicStats?.finishSessionsLast7DaysTotalMinutes ?? 0) > 0 ||
                  Number(basicStats?.tasksCompletedLast7DaysCount ?? 0) > 0 ||
                  Number(basicStats?.stuckTasksClassifiedLast7DaysCount ?? 0) > 0;

                if (!hasAnyStats) {
                  return (
                    <div className="glass-card space-widget-lg text-center">
                      <span className="text-6xl mb-4 block">📭</span>
                      <p className="text-white text-xl mb-2">Brak statystyk</p>
                      <p className="text-sm text-gray-400">
                        Zacznij sesję Trybu Domykania, żeby zobaczyć statystyki z ostatnich 7 dni.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Primary metric */}
                    <div className="glass-card p-6 border border-gold/40">
                      <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                        Utknęło→DONE (7 dni)
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
                            {basicStats.stuckTasksClassifiedLast7DaysCount ?? 0} zadań
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">Brak danych</div>
                        )}
                      </div>
                    </div>

                    {/* Secondary metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="glass-card p-4 border border-white/10">
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Sesje</div>
                        <div className="text-2xl font-black text-white">
                          {basicStats.finishSessionsLast7DaysCount ?? 0}
                        </div>
                      </div>
                      <div className="glass-card p-4 border border-white/10">
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Minuty</div>
                        <div className="text-2xl font-black text-white">
                          {Math.round(Number(basicStats.finishSessionsLast7DaysTotalMinutes ?? 0))}
                        </div>
                      </div>
                      <div className="glass-card p-4 border border-white/10">
                        <div className="text-xs text-gray-400 uppercase tracking-wider">
                          Zrobione zadania
                        </div>
                        <div className="text-2xl font-black text-white">
                          {basicStats.tasksCompletedLast7DaysCount ?? 0}
                        </div>
                      </div>
                      <div className="glass-card p-4 border border-white/10">
                        <div className="text-xs text-gray-400 uppercase tracking-wider">
                          Średnio (min)
                        </div>
                        <div className="text-2xl font-black text-white">
                          {Number(basicStats.finishSessionsLast7DaysAvgMinutes ?? 0).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Historia powiadomień */}
            <div className="widget-container">
              <h2 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-3 mb-8">
                <span className="text-3xl">🔔</span>
                <span>Historia powiadomień</span>
              </h2>

              {data.notificationHistory.length === 0 ? (
                <div className="glass-card space-widget-lg text-center">
                  <span className="text-6xl mb-4 block">📭</span>
                  <p className="text-white text-xl mb-2">Brak powiadomień</p>
                  <p className="text-sm text-gray-400">Twoje powiadomienia będą się tu pojawiać</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.notificationHistory.slice(0, 20).map((notification) => (
                    <div
                      key={notification.id}
                      className="glass-card space-widget hover:border-neon-cyan/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {notification.type === 'checkin' && '📝'}
                            {notification.type === 'stuck' && '🚨'}
                            {notification.type === 'deadline' && '⏰'}
                            {notification.type === 'custom' && '📋'}
                            {notification.type === 'ai' && '🤖'}
                          </span>
                          <span className="text-xs text-gray-500 uppercase tracking-wider">
                            {new Date(notification.timestamp).toLocaleString('pl-PL', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {notification.response && (
                          <span
                            className={`text-xs px-3 py-1 rounded-widget-sm font-bold uppercase tracking-wider ${
                              notification.response === 'checked_in'
                                ? 'bg-[color:color-mix(in_srgb,var(--accent-success)_18%,transparent)] border border-[color:color-mix(in_srgb,var(--accent-success)_50%,transparent)] text-[var(--accent-success)]'
                                : notification.response === 'acknowledged'
                                  ? 'bg-[color:color-mix(in_srgb,var(--accent-cyan)_18%,transparent)] border border-[color:color-mix(in_srgb,var(--accent-cyan)_50%,transparent)] text-[var(--accent-cyan)]'
                                  : 'bg-[color:color-mix(in_srgb,var(--accent-warning)_18%,transparent)] border border-[color:color-mix(in_srgb,var(--accent-warning)_50%,transparent)] text-[var(--accent-warning)]'
                            }`}
                          >
                            {notification.response === 'checked_in'
                              ? '✓ Done'
                              : notification.response === 'acknowledged'
                                ? '👁️ Seen'
                                : 'Pending'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white mb-2">{notification.message}</p>
                      {notification.ruleId && (
                        <p className="text-xs text-gray-500 pt-2 border-t border-white/10">
                          Rule:{' '}
                          {data.customRules.find((r) => r.id === notification.ruleId)?.name ||
                            notification.ruleId}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {data.notificationHistory.length > 20 && (
                <p className="text-xs text-center text-gray-500 mt-4">
                  Showing last 20 of {data.notificationHistory.length} notifications
                </p>
              )}
            </div>
          </div>
        );

      case 'settings':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <Settings
              key="settings"
              data={data}
              normalizedData={normalizedData}
              onUpdateSettings={handleUpdateSettings}
              onBack={() => setCurrentView('home')}
            />
          </Suspense>
        );

      case 'rules':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <Rules
              key="rules"
              data={data}
              normalizedData={normalizedData}
              onUpdateRules={handleUpdateRules}
              onBack={() => setCurrentView('home')}
            />
          </Suspense>
        );

      case 'ai_coach':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <AICoach
              key="ai_coach"
              data={data}
              normalizedData={normalizedData}
              onSendMessage={onSendAICoachMessage}
              onBack={() => setCurrentView('home')}
            />
          </Suspense>
        );

      case 'ideas':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <IdeasVault key="ideas" onBack={() => setCurrentView('home')} />
          </Suspense>
        );

      case 'evening_protocol':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <EveningProtocolPremium key="evening_protocol" />
          </Suspense>
        );

      case 'weekly_review':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <WeeklyReviewPremium key="weekly_review" />
          </Suspense>
        );

      case 'timer':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <div key="timer" className="min-h-screen pb-32 pt-8 px-6">
              <div className="widget-container-narrow mb-12">
                <button
                  onClick={() => setCurrentView('home')}
                  className="btn-premium btn-cyan mb-8"
                >
                  ← Wróć
                </button>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-6xl">⏰</span>
                  <h1 className="text-6xl font-extrabold uppercase tracking-wider text-gradient-gold">
                    Timer
                  </h1>
                </div>
                <p className="text-sm text-gray-400 uppercase tracking-wider">
                  /// System Pomodoro — fokus
                </p>
              </div>

              <div className="widget-container-narrow">
                <Timer
                  normalizedData={normalizedData}
                  onTimerStart={(state) => setIsTimerRunning(true)}
                  onTimerPause={(state) => setIsTimerRunning(false)}
                  onTimerComplete={(state) => {
                    setIsTimerRunning(false);
                  }}
                  onTimerReset={() => setIsTimerRunning(false)}
                />
              </div>
            </div>
          </Suspense>
        );

      default:
        return <Dashboard key="home-default" />;
    }
  };

  return (
    <main id="main-content" role="main" tabIndex={-1}>
      {renderView()}
    </main>
  );
};
