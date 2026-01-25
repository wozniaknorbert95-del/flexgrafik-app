import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ViewState } from '../../../types';
import { useUI } from '../../../contexts';
import { NavigationItem, NavigationGroup } from '../molecules';
import { Badge, Button, Icon } from '../atoms';
import {
  useKeyboardNavigation,
  useAnnouncer,
  useA11yPreferences,
} from '../../../hooks/useAccessibility';

export interface NavigationItemData {
  id: ViewState;
  icon: string;
  label: string;
  description: string;
  shortcut?: string;
  badge?: number | string;
}

export interface AccessibleNavigationProps {
  items: NavigationItemData[];
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'primary' | 'secondary';
  collapsible?: boolean;
  className?: string;
  'data-testid'?: string;
}

/**
 * Accessible Navigation Component
 * Fully accessible navigation with proper ARIA landmarks, keyboard support, and screen reader announcements
 */
export const AccessibleNavigation: React.FC<AccessibleNavigationProps> = ({
  items,
  currentView,
  onNavigate,
  orientation = 'horizontal',
  variant = 'primary',
  collapsible = false,
  className = '',
  'data-testid': testId,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsible);
  const { announce } = useAnnouncer();
  const { reducedMotion } = useA11yPreferences();

  // Keyboard navigation hook
  const { containerRef, focusedIndex, moveFocusToIndex } = useKeyboardNavigation(
    items,
    (item, index) => {
      handleNavigation(item.id, index);
    },
    (item) => item.label
  );

  // Navigation handler with announcements
  const handleNavigation = (viewId: ViewState, index: number) => {
    onNavigate(viewId);

    // Announce navigation
    const item = items.find((item) => item.id === viewId);
    if (item) {
      announce(`Navigated to ${item.label}: ${item.description}`, 'polite');
    }

    // Update focused index
    moveFocusToIndex(index);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if no input/textarea is focused
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.hasAttribute('contenteditable')
      ) {
        return;
      }

      // Check for shortcuts
      const shortcutItem = items.find(
        (item) => item.shortcut && event.key.toLowerCase() === item.shortcut.toLowerCase()
      );

      if (shortcutItem) {
        event.preventDefault();
        handleNavigation(shortcutItem.id, items.indexOf(shortcutItem));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items]);

  // Orientation classes
  const orientationClasses =
    orientation === 'horizontal' ? 'flex flex-row gap-2' : 'flex flex-col gap-1';

  // Variant classes
  const variantClasses =
    variant === 'primary'
      ? 'bg-gray-900/95 backdrop-blur-xl border border-white/10'
      : 'bg-transparent';

  // Animation variants
  const containerVariants = {
    collapsed: {
      width: orientation === 'vertical' ? 64 : 'auto',
      transition: {
        duration: reducedMotion ? 0 : 0.3,
        ease: 'easeInOut',
      },
    },
    expanded: {
      width: 'auto',
      transition: {
        duration: reducedMotion ? 0 : 0.3,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <nav
      ref={containerRef}
      className={`relative ${variantClasses} ${className}`}
      role="navigation"
      aria-label="Main navigation"
      data-testid={testId}
    >
      <motion.div
        className={`p-2 ${orientationClasses}`}
        variants={containerVariants}
        animate={isCollapsed ? 'collapsed' : 'expanded'}
      >
        {items.map((item, index) => {
          const isActive = item.id === currentView;
          const hasBadge = item.badge !== undefined && item.badge !== 0;

          return (
            <motion.div
              key={item.id}
              className="relative"
              whileHover={!reducedMotion ? { scale: 1.05 } : {}}
              whileTap={!reducedMotion ? { scale: 0.95 } : {}}
            >
              <button
                className={`
                  relative flex items-center gap-3 p-3 rounded-lg
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900
                  ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }
                  ${orientation === 'vertical' && isCollapsed ? 'justify-center px-2' : ''}
                  ${hasBadge ? 'pr-8' : ''}
                `}
                onClick={() => handleNavigation(item.id, index)}
                aria-label={`${item.label}: ${item.description}${item.shortcut ? ` (${item.shortcut})` : ''}`}
                aria-current={isActive ? 'page' : undefined}
                role="menuitem"
                tabIndex={focusedIndex === index ? 0 : -1}
                data-testid={`nav-${item.id}`}
              >
                {/* Icon */}
                <Icon
                  name={item.icon}
                  size="lg"
                  variant={isActive ? 'primary' : 'secondary'}
                  glow={isActive}
                />

                {/* Label (hidden when collapsed) */}
                {(!isCollapsed || orientation === 'horizontal') && (
                  <motion.span
                    className="font-medium"
                    initial={false}
                    animate={{ opacity: isCollapsed && orientation === 'vertical' ? 0 : 1 }}
                    transition={{ duration: reducedMotion ? 0 : 0.2 }}
                  >
                    {item.label}
                  </motion.span>
                )}

                {/* Badge */}
                {hasBadge && (
                  <Badge variant="danger" size="sm" className="absolute -top-1 -right-1">
                    {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}

                {/* Shortcut hint */}
                {item.shortcut && !isCollapsed && orientation === 'horizontal' && (
                  <span className="ml-auto text-xs text-gray-500 font-mono">
                    {item.shortcut.toUpperCase()}
                  </span>
                )}
              </button>

              {/* Tooltip for collapsed state */}
              {isCollapsed && orientation === 'vertical' && (
                <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <div className="bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-sm text-gray-300">{item.description}</div>
                    {item.shortcut && (
                      <div className="text-xs text-gray-400 mt-1">
                        Press {item.shortcut.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Collapse toggle (if collapsible) */}
      {collapsible && orientation === 'vertical' && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 p-0 rounded-full shadow-lg"
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            announce(isCollapsed ? 'Navigation expanded' : 'Navigation collapsed', 'polite');
          }}
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? '→' : '←'}
        </Button>
      )}

      {/* Screen reader instructions */}
      <div className="sr-only">
        Use arrow keys to navigate, Enter to select, or press the shortcut keys shown.
      </div>
    </nav>
  );
};

export default AccessibleNavigation;
