import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ViewState } from '../../../types';
import { useUI } from '../../../contexts';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

export interface MobileNavigationProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  items: NavigationItem[];
  className?: string;
}

export interface NavigationItem {
  id: ViewState;
  icon: string;
  label: string;
  description: string;
  shortcut?: string;
  badge?: number | string;
}

/**
 * Mobile Navigation Component
 * Touch-optimized bottom navigation with swipe gestures
 */
export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentView,
  onNavigate,
  items,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { setActiveProject } = useUI();

  // Auto-hide navigation on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide navigation
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show navigation
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Handle swipe gestures for navigation
  const handleSwipe = (direction: 'left' | 'right') => {
    const currentIndex = items.findIndex((item) => item.id === currentView);
    let nextIndex;

    if (direction === 'left' && currentIndex < items.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (direction === 'right' && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    } else {
      return; // No valid navigation
    }

    const nextItem = items[nextIndex];
    if (nextItem) {
      onNavigate(nextItem.id);
      if (nextItem.id !== 'today') {
        setActiveProject?.(null);
      }
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const currentIndex = items.findIndex((item) => item.id === currentView);
      let nextIndex = currentIndex;

      switch (event.key) {
        case 'ArrowLeft':
          if (currentIndex > 0) nextIndex = currentIndex - 1;
          break;
        case 'ArrowRight':
          if (currentIndex < items.length - 1) nextIndex = currentIndex + 1;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = items.length - 1;
          break;
        default:
          // Check for shortcut keys
          const shortcutItem = items.find(
            (item) => item.shortcut && event.key.toLowerCase() === item.shortcut.toLowerCase()
          );
          if (shortcutItem) {
            onNavigate(shortcutItem.id);
            if (shortcutItem.id !== 'today') {
              setActiveProject?.(null);
            }
            return;
          }
          return;
      }

      if (nextIndex !== currentIndex) {
        event.preventDefault();
        const nextItem = items[nextIndex];
        onNavigate(nextItem.id);
        if (nextItem.id !== 'today') {
          setActiveProject?.(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentView, onNavigate, items, setActiveProject]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          className={`fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 ${className}`}
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
            {items.map((item, index) => {
              const isActive = item.id === currentView;
              const hasBadge = item.badge !== undefined && item.badge !== 0;

              return (
                <motion.button
                  key={item.id}
                  className="relative flex flex-col items-center justify-center p-3 rounded-lg touch-target-preferred touch-feedback min-w-0 flex-1"
                  onClick={() => {
                    onNavigate(item.id);
                    if (item.id !== 'today') {
                      setActiveProject?.(null);
                    }
                  }}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                  aria-label={`${item.label}: ${item.description}`}
                  aria-current={isActive ? 'page' : undefined}
                  data-testid={`nav-${item.id}`}
                >
                  {/* Icon */}
                  <div className="relative">
                    <Icon
                      name={item.icon}
                      size="lg"
                      variant={isActive ? 'primary' : 'secondary'}
                      glow={isActive}
                      className="mb-1"
                    />

                    {/* Badge */}
                    {hasBadge && (
                      <motion.div
                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                      </motion.div>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-xs font-medium ${
                      isActive ? 'text-cyan-400' : 'text-gray-400'
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-cyan-400 rounded-full"
                      layoutId="activeTab"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Swipe hint for first-time users */}
          <SwipeHint />
        </motion.nav>
      )}
    </AnimatePresence>
  );
};

/**
 * Swipe Hint Component
 * Shows swipe gesture hint for mobile users
 */
const SwipeHint: React.FC = () => {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // Show hint for first-time users on mobile
    const hasSeenHint = localStorage.getItem('mobile-nav-hint-seen');
    const isMobile = window.innerWidth < 768;

    if (!hasSeenHint && isMobile) {
      setTimeout(() => setShowHint(true), 2000);
      setTimeout(() => setShowHint(false), 6000);

      localStorage.setItem('mobile-nav-hint-seen', 'true');
    }
  }, []);

  if (!showHint) return null;

  return (
    <motion.div
      className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg pointer-events-none"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      <div className="flex items-center gap-2 text-sm">
        <span>👆</span>
        <span>Swipe left/right to navigate</span>
      </div>
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
    </motion.div>
  );
};

export default MobileNavigation;
