import { useCallback, useEffect } from 'react';
import { ViewState } from '../types';
import { useUI } from '../contexts';

/**
 * Custom hook for navigation management
 * Handles keyboard shortcuts and navigation utilities
 */
export const useNavigation = () => {
  const { currentView, navigate, goBack, goForward, canGoBack, canGoForward, navigationHistory } =
    useUI();

  // Navigation map for keyboard shortcuts
  const navigationMap: Record<string, ViewState> = {
    '1': 'home',
    '2': 'today',
    '3': 'finish',
    '4': 'ai_coach',
    '5': 'settings',
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyboardNavigation = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Handle number keys for navigation
      if (event.key >= '1' && event.key <= '5') {
        event.preventDefault();
        const view = navigationMap[event.key];
        if (view) {
          navigate(view);
        }
        return;
      }

      // Handle back/forward with alt + arrow keys
      if (event.altKey) {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            goBack();
            break;
          case 'ArrowRight':
            event.preventDefault();
            goForward();
            break;
        }
      }

      // Handle escape to go home
      if (event.key === 'Escape') {
        navigate('home');
      }
    },
    [navigate, goBack, goForward]
  );

  /**
   * Set up keyboard event listeners
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardNavigation);
    return () => window.removeEventListener('keydown', handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  /**
   * Get navigation info for a view
   */
  const getNavigationInfo = useCallback((view: ViewState) => {
    const viewInfo = {
      home: { label: 'Mission Control', icon: '🏠', description: 'Operations Dashboard' },
      today: { label: 'Today', icon: '⚡', description: 'Daily Task Execution' },
      finish: { label: 'Finish Mode', icon: '🏁', description: 'Complete Stuck Tasks' },
      ai_coach: { label: 'AI Coach', icon: '🧠', description: 'Strategic Intelligence' },
      settings: { label: 'Settings', icon: '⚙', description: 'System Configuration' },
      timer: { label: 'Timer', icon: '⏰', description: 'Focus Timer' },
      sprint: { label: 'Sprint', icon: '🏃', description: 'Sprint Planning' },
      pillar_detail: { label: 'Pillar Details', icon: '🎯', description: 'Detailed View' },
      rules: { label: 'Rules', icon: '📋', description: 'Automation Rules' },
      accountability: {
        label: 'Accountability',
        icon: '👥',
        description: 'Accountability Partners',
      },
    };

    return viewInfo[view] || { label: 'Unknown', icon: '❓', description: 'Unknown View' };
  }, []);

  /**
   * Get available navigation shortcuts
   */
  const getNavigationShortcuts = useCallback(() => {
    return Object.entries(navigationMap).map(([key, view]) => ({
      key,
      view,
      info: getNavigationInfo(view),
    }));
  }, [getNavigationInfo]);

  /**
   * Check if a view is accessible from current navigation
   */
  const isViewAccessible = useCallback((view: ViewState) => {
    // All main views are always accessible
    const mainViews: ViewState[] = ['home', 'today', 'finish', 'ai_coach', 'settings'];
    return mainViews.includes(view);
  }, []);

  return {
    currentView,
    navigate,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    navigationHistory,
    getNavigationInfo,
    getNavigationShortcuts,
    isViewAccessible,
    handleKeyboardNavigation,
  };
};

export default useNavigation;
