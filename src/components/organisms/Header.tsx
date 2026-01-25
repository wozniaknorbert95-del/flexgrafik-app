import React from 'react';
import { motion } from 'framer-motion';
import { ViewState } from '../../../types';
import { useUI, useData } from '../../../contexts';
import { NavigationItem, NavigationGroup } from '../molecules';
import { Badge, Button, Icon } from '../atoms';
import { ErrorBoundary } from '../atoms/ErrorBoundary';
import { BaseComponentProps, LoadingProps } from '../../../types/components';

// Header specific props
export interface HeaderProps extends BaseComponentProps, LoadingProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  stuckCount?: number;
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/**
 * Header Organism Component
 * Complex header with navigation, breadcrumbs, and actions
 */
export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  stuckCount = 0,
  showBackButton = false,
  onBack,
  title,
  subtitle,
  actions,
  isLoading = false,
  className = '',
  'data-testid': testId,
}) => {
  const { getAllTasks } = useData();
  const tasks = getAllTasks();
  const user = { name: 'User' }; // Placeholder - would come from AuthContext

  // Navigation items configuration
  const navItems = [
    {
      id: 'home' as ViewState,
      icon: 'home',
      label: 'Mission',
      description: 'Operations Dashboard',
      shortcut: '1',
    },
    {
      id: 'today' as ViewState,
      icon: 'lightning',
      label: 'Today',
      description: 'Daily Task Execution',
      shortcut: '2',
    },
    {
      id: 'finish' as ViewState,
      icon: 'flag',
      label: 'Finish',
      description: 'Complete Stuck Tasks',
      shortcut: '3',
    },
    {
      id: 'ai_coach' as ViewState,
      icon: 'brain',
      label: 'AI',
      description: 'Strategic Intelligence',
      shortcut: '4',
    },
    {
      id: 'settings' as ViewState,
      icon: 'settings',
      label: 'Config',
      description: 'System Settings',
      shortcut: '5',
    },
  ];

  // Get current view info
  const currentViewInfo = navItems.find((item) => item.id === currentView);

  return (
    <ErrorBoundary level="organism">
      <header className={`relative z-40 ${className}`} data-testid={testId} role="banner">
        {/* Main header bar */}
        <motion.div
          className="bg-gray-900/95 backdrop-blur-xl border-b border-white/10"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left section - Back button and title */}
              <div className="flex items-center gap-4">
                {showBackButton && (
                  <Button variant="secondary" size="sm" onClick={onBack} aria-label="Go back">
                    <Icon name="back" size="sm" />
                  </Button>
                )}

                <div className="flex items-center gap-3">
                  {currentViewInfo && (
                    <Icon name={currentViewInfo.icon} size="lg" variant="primary" glow />
                  )}

                  <div>
                    {title ? (
                      <h1 className="text-xl font-bold text-white">{title}</h1>
                    ) : currentViewInfo ? (
                      <h1 className="text-xl font-bold text-white">{currentViewInfo.label}</h1>
                    ) : null}

                    {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
                  </div>
                </div>
              </div>

              {/* Center section - Navigation (Desktop only) */}
              <nav
                className="hidden lg:flex items-center gap-2"
                role="navigation"
                aria-label="Main navigation"
              >
                {navItems.map((item) => (
                  <NavigationItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    description={item.description}
                    shortcut={item.shortcut}
                    isActive={currentView === item.id}
                    badge={item.id === 'home' && stuckCount > 0 ? stuckCount : undefined}
                    badgeVariant="danger"
                    layout="horizontal"
                    showLabel={false}
                    onClick={() => onNavigate(item.id)}
                  />
                ))}
              </nav>

              {/* Right section - Actions and user info */}
              <div className="flex items-center gap-3">
                {actions}

                {/* User indicator */}
                {user?.name && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                    <Icon name="user" size="sm" />
                    <span className="text-sm text-gray-300">{user.name}</span>
                  </div>
                )}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <motion.div
                      className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <span className="text-sm">Loading...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Mobile navigation drawer */}
        <div className="md:hidden">
          <motion.nav
            className="px-4 py-3 bg-gray-900/90 backdrop-blur-xl border-b border-white/5"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            transition={{ duration: 0.3 }}
            role="navigation"
            aria-label="Mobile navigation"
          >
            <NavigationGroup>
              {navItems.map((item) => (
                <NavigationItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  description={item.description}
                  shortcut={item.shortcut}
                  isActive={currentView === item.id}
                  badge={item.id === 'home' && stuckCount > 0 ? stuckCount : undefined}
                  badgeVariant="danger"
                  layout="horizontal"
                  onClick={() => onNavigate(item.id)}
                />
              ))}
            </NavigationGroup>
          </motion.nav>
        </div>
      </header>
    </ErrorBoundary>
  );
};

// Header variants for different contexts
export const HeaderVariants = {
  // Dashboard header with stats
  Dashboard: (
    props: Omit<HeaderProps, 'title'> & {
      stats?: Array<{ label: string; value: string | number; icon: string }>;
    }
  ) => (
    <Header
      {...props}
      title="Mission Control"
      subtitle="Operations Dashboard"
      actions={
        props.stats && (
          <div className="hidden lg:flex items-center gap-4">
            {props.stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Icon name={stat.icon} size="sm" variant="primary" />
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-gray-400">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )
      }
    />
  ),

  // Task-focused header
  TaskView: (
    props: Omit<HeaderProps, 'title'> & {
      taskCount?: number;
      completionRate?: number;
    }
  ) => (
    <Header
      {...props}
      title="Task Execution"
      subtitle={`${props.taskCount || 0} tasks • ${props.completionRate || 0}% completion rate`}
    />
  ),

  // AI Coach header
  AICoach: (props: Omit<HeaderProps, 'title'>) => (
    <Header
      {...props}
      title="AI Strategic Intelligence"
      subtitle="Powered by advanced reasoning algorithms"
      actions={
        <Badge variant="info" animated>
          <Icon name="brain" size="xs" />
          Online
        </Badge>
      }
    />
  ),
};

export default Header;
