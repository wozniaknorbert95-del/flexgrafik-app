import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ViewState } from '../../../types';
import { Header } from '../organisms';
import { ErrorBoundary } from '../atoms';
import { useNavigation } from '../../../hooks';
import { BaseComponentProps, LoadingProps } from '../../../types/components';

// Page layout specific props
export interface PageLayoutProps extends BaseComponentProps, LoadingProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  showHeader?: boolean;
  showNavigation?: boolean;
  fullWidth?: boolean;
  centered?: boolean;
  backgroundPattern?: 'default' | 'grid' | 'dots' | 'none';
  stuckCount?: number;
}

/**
 * PageLayout Template Component
 * Provides consistent page structure with header, navigation, and content areas
 */
export const PageLayout: React.FC<PageLayoutProps> = ({
  currentView,
  onNavigate,
  title,
  subtitle,
  headerActions,
  children,
  showHeader = true,
  showNavigation = true,
  fullWidth = false,
  centered = false,
  backgroundPattern = 'default',
  stuckCount = 0,
  isLoading = false,
  className = '',
  'data-testid': testId,
}) => {
  const [isPageLoading, setIsPageLoading] = useState(true);
  const { getNavigationInfo } = useNavigation(currentView, onNavigate);

  // Simulate page loading (remove in real implementation)
  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 300);
    return () => clearTimeout(timer);
  }, [currentView]);

  // Get page info for dynamic content
  const pageInfo = getNavigationInfo(currentView);

  // Background pattern classes
  const backgroundClasses = {
    default: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900',
    grid: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden',
    dots: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden',
    none: 'bg-gray-900',
  };

  // Grid pattern overlay
  const GridPattern = () => (
    <div className="absolute inset-0 opacity-10">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
          linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );

  // Dots pattern overlay
  const DotsPattern = () => (
    <div className="absolute inset-0 opacity-10">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />
    </div>
  );

  return (
    <ErrorBoundary level="template">
      <div
        className={`min-h-screen ${backgroundClasses[backgroundPattern]} ${className}`}
        data-testid={testId}
      >
        {/* Background patterns */}
        {backgroundPattern === 'grid' && <GridPattern />}
        {backgroundPattern === 'dots' && <DotsPattern />}

        {/* Header */}
        {showHeader && (
          <Header
            currentView={currentView}
            onNavigate={onNavigate}
            title={title}
            subtitle={subtitle}
            actions={headerActions}
            stuckCount={stuckCount}
            isLoading={isLoading}
          />
        )}

        {/* Main Content */}
        <main className={`relative z-10 ${showHeader ? 'pt-0' : 'pt-8'}`}>
          <AnimatePresence mode="wait">
            {isPageLoading ? (
              <motion.div
                key="loading"
                className="flex items-center justify-center min-h-[60vh]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-center">
                  <motion.div
                    className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full mx-auto mb-4"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <p className="text-gray-400">Loading {pageInfo.label}...</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                className={`
                  ${fullWidth ? 'w-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}
                  ${centered ? 'flex items-center justify-center min-h-[calc(100vh-200px)]' : 'py-8'}
                `}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ErrorBoundary level="organism">{children}</ErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Cyberpunk accent lines */}
        <div className="fixed top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />
        <div className="fixed bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />
      </div>
    </ErrorBoundary>
  );
};

// Specialized page layouts for different use cases

/**
 * Dashboard Page Layout
 * Optimized for dashboard-style pages with stats and widgets
 */
export const DashboardPageLayout: React.FC<
  Omit<PageLayoutProps, 'centered' | 'backgroundPattern'>
> = (props) => <PageLayout {...props} centered={false} backgroundPattern="grid" fullWidth={true} />;

/**
 * Form Page Layout
 * Centered layout optimized for forms and data entry
 */
export const FormPageLayout: React.FC<
  Omit<PageLayoutProps, 'centered' | 'backgroundPattern' | 'fullWidth'>
> = (props) => (
  <PageLayout {...props} centered={false} backgroundPattern="default" fullWidth={false} />
);

/**
 * Modal Page Layout
 * Full-screen layout for modal-like experiences
 */
export const ModalPageLayout: React.FC<
  Omit<PageLayoutProps, 'centered' | 'showHeader' | 'backgroundPattern'>
> = (props) => (
  <PageLayout
    {...props}
    centered={true}
    showHeader={false}
    backgroundPattern="none"
    className="bg-black/50 backdrop-blur-sm"
  />
);

/**
 * Clean Page Layout
 * Minimal layout for focused content
 */
export const CleanPageLayout: React.FC<
  Omit<PageLayoutProps, 'backgroundPattern' | 'showNavigation'>
> = (props) => <PageLayout {...props} backgroundPattern="none" showNavigation={false} />;

export default PageLayout;
