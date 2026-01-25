import React, { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button';
import { BaseComponentProps } from '../../types/components';

// Error boundary specific props
export interface ErrorBoundaryProps extends BaseComponentProps {
  fallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'atom' | 'molecule' | 'organism' | 'template';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary Atom Component
 * Comprehensive error boundary with cyberpunk theming and recovery options
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error } = this.state;
    const {
      children,
      fallback,
      showDetails = false,
      level = 'atom',
      className = '',
      'data-testid': testId,
    } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.handleRetry);
        }
        return fallback;
      }

      // Default error UI with cyberpunk theme
      return (
        <motion.div
          className={`flex flex-col items-center justify-center p-6 rounded-lg bg-red-500/10 border border-red-500/20 backdrop-blur-sm ${className}`}
          data-testid={testId}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Error icon with animation */}
          <motion.div
            className="mb-4"
            animate={{
              rotate: [0, -10, 10, -10, 0],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          >
            <span className="text-4xl">⚠️</span>
          </motion.div>

          {/* Error title */}
          <h3 className="text-xl font-bold text-red-400 mb-2 text-center">System Error Detected</h3>

          {/* Error level indicator */}
          <div className="text-sm text-gray-400 mb-4 px-3 py-1 rounded-full bg-gray-800/50 border border-gray-600/30">
            Level: {level.toUpperCase()}
          </div>

          {/* Error message */}
          <p className="text-gray-300 text-center mb-6 max-w-md">
            Something went wrong in the {level} component. The system has detected an anomaly and
            isolated the affected area.
          </p>

          {/* Error details (development/debugging) */}
          {showDetails && (
            <details className="mb-6 w-full max-w-md">
              <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300 mb-2">
                Technical Details
              </summary>
              <div className="text-xs text-red-300 bg-black/50 p-3 rounded border border-red-500/20 font-mono overflow-auto max-h-32">
                <div className="mb-2">
                  <strong>Error:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={this.handleRetry}
              className="min-w-[100px]"
            >
              🔄 Retry
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => window.location.reload()}
              className="min-w-[100px]"
            >
              🔌 Restart
            </Button>
          </div>

          {/* Cyberpunk decoration */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            <div className="absolute bottom-2 left-2 w-1 h-1 bg-red-400 rounded-full animate-ping" />
          </div>
        </motion.div>
      );
    }

    return children;
  }
}

// Functional wrapper for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default ErrorBoundary;
