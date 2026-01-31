import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CustomRule, SprintDay } from './types';
import { useAppContext } from './contexts/AppContext';
import { scheduleStuckTasksAudit, scheduleGoalAgentChecks } from './utils/scheduler';
import { RouteManager } from './components/RouteManager';
import { NotificationManager } from './components/NotificationManager';
import { AIChatManager } from './components/AIChatManager';
import { InstallPrompt } from './components/InstallPrompt';
import { useSkipLinks } from './hooks/useAccessibility';
import { ToastProvider } from './components/ToastProvider';
import { showSuccess as showToastSuccess, showError as showToastError } from './utils/toastService';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { LevelUpModal } from './components/common/LevelUpModal';

// Critical components loaded immediately
import Navigation from './components/Navigation';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  // Use existing AppContext temporarily
  const {
    data,
    normalizedData,
    currentView,
    activeProjectId,
    isLoaded,
    notificationCenter,
    isTimerRunning,
    timerState,
    setCurrentView,
    setActiveProjectId,
    setIsTimerRunning,
    setTimerState,
    handlePillarClick,
    handleAlertClick,
    handleToggleTask,
    handleUpdateSettings,
    handleUpdateChatHistory,
    sendAICoachMessage,
    stuckCount,
    setData,
    basicStats,
    finishSessionsHistory,
  } = useAppContext();

  const [isLevelUpOpen, setIsLevelUpOpen] = useState(false);
  const lastShownLevelUpAtRef = useRef<string | null>(null);

  useEffect(() => {
    const at = (data as any)?.userStats?.lastLevelUpAt as string | null | undefined;
    const from = (data as any)?.userStats?.lastLevelUpFrom as number | undefined;
    const to = (data as any)?.userStats?.lastLevelUpTo as number | undefined;
    if (!at || !from || !to) return;
    if (lastShownLevelUpAtRef.current === at) return;

    // Avoid re-showing on refresh if user already saw this level-up
    try {
      const seenAt = localStorage.getItem('fg_last_levelup_seen_at');
      if (seenAt === at) {
        lastShownLevelUpAtRef.current = at;
        return;
      }
    } catch {
      // ignore
    }

    setIsLevelUpOpen(true);
    lastShownLevelUpAtRef.current = at;
  }, [(data as any)?.userStats?.lastLevelUpAt]);

  // Onboarding state (minimal - only for first-time users)
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user has seen onboarding
  useEffect(() => {
    if (!isLoaded) return;
    const hasSeenOnboarding = localStorage.getItem('flexgrafik_onboarding_completed');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [isLoaded]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('flexgrafik_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('flexgrafik_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  // Computed values (now from context)
  // isLoaded and stuckCount come from useAppContext above

  // UI state for timer is now in context

  // Accessibility hooks
  useSkipLinks();

  const hasInitializedSchedulers = useRef(false);

  // Initialize stuck tasks scheduler and service worker communication
  useEffect(() => {
    if (!isLoaded) return; // Wait for data to load
    if (hasInitializedSchedulers.current) return;
    hasInitializedSchedulers.current = true;

    scheduleStuckTasksAudit();

    // Initialize Goal Agent scheduler
    try {
      scheduleGoalAgentChecks(setData);
    } catch (error) {
      showToastError(
        'Nie udało się uruchomić harmonogramu Goal Agenta. Spróbuj odświeżyć aplikację.',
        7000
      );
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to initialize Goal Agent scheduler:', error);
      }
    }

    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      switch (type) {
        case 'sync-success':
          showToastSuccess('✅ Dane zsynchronizowane pomyślnie', 3000);
          break;

        case 'sync-failed':
          showToastError('⚠️ Niektóre dane nie zostały zsynchronizowane', 5000);
          break;

        default:
          // Unknown message types - only log in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Unknown service worker message:', type, data);
          }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [isLoaded, setData]);

  // Handlers are now available from context

  // Sprint and Rules handlers
  const handleUpdateRules = useCallback(
    (rules: CustomRule[]) => {
      setData((prev) => ({
        ...prev,
        customRules: rules,
      }));
    },
    [setData]
  );

  // AI Chat is handled in AppContext (local-first + Ollama fallback)

  // Loading Screen
  if (!isLoaded) {
    return <LoadingSpinner message="Uruchamianie FlexGrafik OS…" size="lg" fullScreen />;
  }

  // Show onboarding for first-time users
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />;
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        showToastError('Wystąpił błąd aplikacji. Sprawdź konsolę dla szczegółów.', 8000);
        if (process.env.NODE_ENV === 'development') {
          console.error('🔥 Application Error:', error);
          console.error('📍 Error Info:', errorInfo);
        }
      }}
    >
      {/* Skip links for keyboard users */}
      <a href="#main-content" className="skip-link">
        Przejdź do treści głównej
      </a>
      <a href="#navigation" className="skip-link" style={{ top: '-80px', left: '6px' }}>
        Przejdź do nawigacji
      </a>

      <ToastProvider>
        <div className="min-h-screen bg-dark-bg text-white font-sans selection:bg-neon-magenta selection:text-white pb-16 pb-safe">
          <LevelUpModal
            isOpen={isLevelUpOpen}
            levelFrom={Number((data as any)?.userStats?.lastLevelUpFrom ?? 1)}
            levelTo={Number((data as any)?.userStats?.lastLevelUpTo ?? 1)}
            xp={Number((data as any)?.userStats?.xp ?? 0)}
            onClose={() => {
              setIsLevelUpOpen(false);
              try {
                const at = String((data as any)?.userStats?.lastLevelUpAt ?? '');
                if (at) localStorage.setItem('fg_last_levelup_seen_at', at);
              } catch {
                // ignore
              }
            }}
          />
          {/* Header with navigation role */}
          <header role="banner" className="sr-only">
            Centrum dowodzenia — pulpit operacyjny
          </header>

          {/* Route Manager - handles all view rendering */}
          <RouteManager
            currentView={currentView}
            data={data}
            normalizedData={normalizedData}
            activeProjectId={activeProjectId}
            setCurrentView={setCurrentView}
            setActiveProjectId={setActiveProjectId}
            handlePillarClick={handlePillarClick}
            handleAlertClick={handleAlertClick}
            handleToggleTask={handleToggleTask}
            handleUpdateSettings={handleUpdateSettings}
            handleUpdateChatHistory={handleUpdateChatHistory}
            handleUpdateRules={handleUpdateRules}
            isTimerRunning={isTimerRunning}
            timerState={timerState}
            setIsTimerRunning={setIsTimerRunning}
            setTimerState={setTimerState}
            onSendAICoachMessage={sendAICoachMessage}
            basicStats={basicStats}
            finishSessionsHistory={finishSessionsHistory}
          />

          {/* Bottom navigation */}
          {currentView !== 'finish' && (
            <Navigation
              currentView={currentView}
              setView={setCurrentView}
              stuckCount={stuckCount}
            />
          )}

          {/* Notification Manager - handles all notification logic */}
          <NotificationManager
            data={data}
            notificationCenter={notificationCenter}
            currentView={currentView}
            setCurrentView={setCurrentView}
            isLoaded={isLoaded}
          />

          {/* Sprint Manager - temporarily disabled during refactor */}
          {/* <SprintManager
          data={data}
          setData={setData}
        /> */}

          {/* AI Chat Manager - handles AI validation */}
          <AIChatManager data={data} onSendMessage={sendAICoachMessage} />

          {/* Install Prompt - PWA installation */}
          <InstallPrompt
            onInstall={() => {
              showToastSuccess('🎉 Aplikacja zainstalowana pomyślnie!', 4000);
            }}
          />
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
