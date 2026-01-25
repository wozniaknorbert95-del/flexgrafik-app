import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AppData, ViewState } from './types';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { scheduleStuckTasksAudit } from './utils/scheduler';
import { RouteManager } from './components/RouteManager';
import { NotificationManager } from './components/NotificationManager';
import { SprintManager } from './components/SprintManager';
import { AIChatManager } from './components/AIChatManager';
import { InstallPrompt } from './components/InstallPrompt';
import { useSkipLinks } from './hooks/useAccessibility';

// Critical components loaded immediately
import Navigation from './components/Navigation';
import ErrorBoundary from './components/ErrorBoundary';

// Remove all console.log statements from production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

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
  } = useAppContext();

  // Computed values (now from context)
  // isLoaded and stuckCount come from useAppContext above

  // UI state for timer is now in context

  // Accessibility hooks
  useSkipLinks();

  // Initialize stuck tasks scheduler and service worker communication
  useEffect(() => {
    scheduleStuckTasksAudit();

    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      switch (type) {
        case 'sync-success':
          console.log('✅ Data synced successfully:', data);
          // Could show a toast notification here
          break;

        case 'sync-failed':
          console.warn('⚠️ Some data failed to sync:', data);
          // Could show retry options here
          break;

        default:
          console.log('Unknown service worker message:', type, data);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  // Handlers are now available from context

  // AI Chat is handled in AppContext (local-first + Ollama fallback)

  // Loading Screen
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center text-cyber-cyan font-mono animate-pulse">
        Initializing FlexGrafik OS...
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('🔥 Application Error:', error);
        console.error('📍 Error Info:', errorInfo);
      }}
    >
      {/* Skip links for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#navigation" className="skip-link" style={{ top: '-80px', left: '6px' }}>
        Skip to navigation
      </a>

      <div className="min-h-screen bg-dark-bg text-white font-sans selection:bg-neon-magenta selection:text-white pb-16 pb-safe">
        {/* Header with navigation role */}
        <header role="banner" className="sr-only">
          Mission Control - Operations Dashboard
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
          handleSprintDayToggle={(idx) => console.log('Sprint day toggle:', idx)}
          handleUpdateRules={(rules) => console.log('Update rules:', rules)}
          resetSprint={() => console.log('Reset sprint')}
          isTimerRunning={isTimerRunning}
          timerState={timerState}
          setIsTimerRunning={setIsTimerRunning}
          setTimerState={setTimerState}
          onSendAICoachMessage={sendAICoachMessage}
        />

        {/* Bottom navigation */}
        {currentView !== 'finish' && (
          <Navigation currentView={currentView} setView={setCurrentView} stuckCount={stuckCount} />
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
            console.log('🎉 App installed successfully!');
            // Could trigger celebration animation or confetti here
          }}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;
