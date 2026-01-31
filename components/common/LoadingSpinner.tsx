/**
 * Loading Spinner Component
 *
 * Reusable loading indicator with consistent styling across the app.
 * Used in lazy-loaded components, async operations, and data fetching.
 */

import React from 'react';

export interface LoadingSpinnerProps {
  /** Optional message to display below spinner */
  message?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Full screen overlay (centers on viewport) */
  fullScreen?: boolean;
}

/**
 * Loading spinner component with consistent styling
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Ładuję…',
  size = 'md',
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-16 h-16 border-4',
    lg: 'w-24 h-24 border-4',
  };

  const containerClasses = fullScreen
    ? 'min-h-screen flex items-center justify-center bg-obsidian'
    : 'flex items-center justify-center';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div
          className={`inline-block ${sizeClasses[size]} border-neon-cyan border-t-transparent rounded-full animate-spin mb-4`}
          role="status"
          aria-label="Ładuję"
        />
        {message && <p className="text-gray-400 text-sm uppercase tracking-wider">{message}</p>}
      </div>
    </div>
  );
};

/**
 * Component loading fallback for React.lazy
 * Used in RouteManager for lazy-loaded components
 */
export const ComponentLoadingFallback: React.FC = () => (
  <LoadingSpinner message="Ładuję…" size="md" fullScreen />
);
