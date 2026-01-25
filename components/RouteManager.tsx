import React from 'react';
import { ViewState, AppData } from '../types';
import { NormalizedAppData } from '../types/normalized';

// TEMPORARY: Synchronous imports to test app startup
import Dashboard from './DashboardPremium';
import Today from './TodayPremium';
import Timer from './TimerPremium';
import SprintView from './SprintViewPremium';
import AICoach from './screens/AICoachPremium';
import Settings from './SettingsPremium';
import FinishMode from './FinishMode';
import PillarDetail from './PillarDetailPremium';
import Rules from './RulesPremium';

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
  handleSprintDayToggle: (idx: number) => void;
  handleUpdateRules: (rules: AppData['customRules']) => void;
  resetSprint: () => void;
  isTimerRunning: boolean;
  timerState: any;
  setIsTimerRunning: (running: boolean) => void;
  setTimerState: (state: any) => void;
  onSendAICoachMessage: (message: string) => Promise<void>;
}

// Loading fallback component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-obsidian">
    <div className="text-center">
      <div className="inline-block w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-400 text-sm uppercase tracking-wider">Loading...</p>
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
  handleSprintDayToggle,
  handleUpdateRules,
  resetSprint,
  isTimerRunning,
  timerState,
  setIsTimerRunning,
  setTimerState,
  onSendAICoachMessage,
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
        return <FinishMode key="finish" />;

      case 'sprint':
        return (
          <SprintView
            key="sprint"
            data={data}
            normalizedData={normalizedData}
            onToggleDay={handleSprintDayToggle}
            onBack={() => setCurrentView('home')}
          />
        );

      case 'pillar_detail':
        const pillar = data.pillars.find((p) => p.id === activeProjectId);
        if (!pillar) return <Dashboard key="home-fallback" />;
        return (
          <PillarDetail
            key={`pillar-${activeProjectId}`}
            pillar={pillar}
            normalizedData={normalizedData}
            optimisticState={undefined}
            onBack={() => setCurrentView('home')}
            onToggleTask={handleToggleTask}
            onEnterFinishMode={() => setCurrentView('finish')}
          />
        );

      case 'accountability':
        return (
          <div key="accountability" className="min-h-screen pb-32 pt-8 px-6">
            {/* Header */}
            <div className="widget-container mb-12">
              <button onClick={() => setCurrentView('home')} className="btn-premium btn-cyan mb-8">
                ← Back
              </button>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-6xl">📊</span>
                <h1 className="text-6xl font-extrabold text-gradient-gold tracking-wider uppercase">
                  Accountability
                </h1>
              </div>
              <p className="text-sm text-gray-400 uppercase tracking-wider">
                /// Notification History & Stats
              </p>
            </div>

            {/* Stats */}
            <div className="widget-container mb-12">
              <div className="grid grid-cols-2 gap-6">
                <div className="glass-card glass-card-magenta space-widget text-center">
                  <div className="text-5xl font-bold text-glow-magenta mb-2">
                    {data.user.streak}
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Streak Days
                  </div>
                </div>
                <div className="glass-card glass-card-cyan space-widget text-center">
                  <div className="text-5xl font-bold text-glow-cyan mb-2">
                    {data.notificationHistory.length}
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Notifications
                  </div>
                </div>
              </div>
            </div>

            {/* Notification History */}
            <div className="widget-container">
              <h2 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-3 mb-8">
                <span className="text-3xl">🔔</span>
                <span>Notification History</span>
              </h2>

              {data.notificationHistory.length === 0 ? (
                <div className="glass-card space-widget-lg text-center">
                  <span className="text-6xl mb-4 block">📭</span>
                  <p className="text-white text-xl mb-2">No notifications yet</p>
                  <p className="text-sm text-gray-400">Your notifications will appear here</p>
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
                            {new Date(notification.timestamp).toLocaleString('en-US', {
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
                                ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                                : notification.response === 'acknowledged'
                                  ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                                  : 'bg-gray-500/20 border border-gray-500/50 text-gray-400'
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
          <Settings
            key="settings"
            data={data}
            normalizedData={normalizedData}
            onUpdateSettings={handleUpdateSettings}
            onBack={() => setCurrentView('home')}
          />
        );

      case 'rules':
        return (
          <Rules
            key="rules"
            data={data}
            normalizedData={normalizedData}
            onUpdateRules={handleUpdateRules}
            onBack={() => setCurrentView('home')}
          />
        );

      case 'ai_coach':
        return (
          <AICoach
            key="ai_coach"
            data={data}
            normalizedData={normalizedData}
            onSendMessage={onSendAICoachMessage}
            onBack={() => setCurrentView('home')}
          />
        );

      case 'timer':
        return (
          <div key="timer" className="min-h-screen pb-32 pt-8 px-6">
            <div className="widget-container-narrow mb-12">
              <button onClick={() => setCurrentView('home')} className="btn-premium btn-cyan mb-8">
                ← Back
              </button>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-6xl">⏰</span>
                <h1 className="text-6xl font-extrabold uppercase tracking-wider text-gradient-gold">
                  Timer
                </h1>
              </div>
              <p className="text-sm text-gray-400 uppercase tracking-wider">
                /// Pomodoro Focus System
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
