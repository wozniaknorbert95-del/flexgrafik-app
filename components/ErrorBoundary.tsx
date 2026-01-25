import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in child component tree
 * Prevents entire app from crashing
 * Displays fallback UI when error occurs
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so next render shows fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console (in production, send to error tracking service)
    console.error('🔥 Error Boundary caught error:', error);
    console.error('📍 Component stack:', errorInfo.componentStack);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // trackError(error, errorInfo);
  }

  handleReset = () => {
    // Reset error state and try rendering again
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback or default error screen
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error screen
      return (
        <div className="min-h-screen flex items-center justify-center bg-obsidian px-6">
          <motion.div
            className="max-w-2xl w-full glass-card space-widget text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Icon */}
            <motion.div
              className="text-7xl mb-6"
              animate={{
                rotate: [0, -10, 10, -10, 0],
              }}
              transition={{
                duration: 0.5,
                repeat: 0,
              }}
            >
              ⚠️
            </motion.div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-wider mb-4 text-gradient-gold">
              System Error
            </h1>

            {/* Description */}
            <p className="text-gray-300 text-base mb-8">
              Something went wrong. The application encountered an unexpected error.
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-8 text-left bg-glass-heavy rounded-widget p-4 border border-red-500/30">
                <div className="text-xs uppercase tracking-wider text-red-400 font-bold mb-2">
                  Error Details (Development Only):
                </div>
                <pre className="text-xs text-gray-400 overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button onClick={this.handleReset} className="btn-premium btn-magenta px-8 py-4">
                🔄 Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="btn-premium btn-cyan px-8 py-4"
              >
                🏠 Return Home
              </button>
            </div>

            {/* Support Info */}
            <div className="mt-8 pt-6 border-t border-gray-800">
              <p className="text-xs text-gray-500 leading-relaxed">
                If the problem persists, try clearing your browser cache (
                <kbd className="px-2 py-1 bg-glass-light rounded text-neon-cyan">Ctrl+Shift+R</kbd>)
                or contact support.
              </p>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
