/**
 * Centralized Error Handler
 *
 * Provides consistent error handling across the application.
 * All errors are logged, formatted, and displayed to users via toast notifications.
 */

/**
 * Error context for additional error information
 */
export interface ErrorContext {
  /** Component name where error occurred */
  component?: string;
  /** Action being performed when error occurred */
  action?: string;
  /** User-friendly error message to display */
  userMessage?: string;
  /** Whether to show error to user (default: true) */
  shouldShowToUser?: boolean;
}

/**
 * Custom application error class
 *
 * Extends standard Error with additional context for better error handling.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public context?: ErrorContext,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Handle application errors consistently
 *
 * - Logs errors in development mode
 * - Shows user-friendly toast notifications
 * - Can be extended to send to error reporting service
 *
 * @param error - Error object or unknown error
 * @param context - Optional error context for better debugging
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   handleError(error, {
 *     component: 'Dashboard',
 *     action: 'loadData',
 *     userMessage: 'Nie udało się załadować danych'
 *   });
 * }
 * ```
 */
export const handleError = (error: unknown, context?: ErrorContext): void => {
  // Create standardized error object
  const appError =
    error instanceof AppError
      ? error
      : new AppError(
          error instanceof Error ? error.message : 'Unknown error occurred',
          context,
          error instanceof Error ? error : undefined
        );

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context?.component || 'Unknown'}] ${context?.action || 'Unknown action'}:`, {
      message: appError.message,
      context: appError.context,
      originalError: appError.originalError,
    });
  }

  // Could send to error reporting service here
  // reportError(appError);

  // Show user-friendly message if needed
  if (appError.context?.shouldShowToUser !== false) {
    const userMessage = appError.context?.userMessage || getUserFriendlyMessage(appError.message);

    // Use toast notification instead of alert
    showToastError(userMessage, 7000); // Show for 7 seconds for errors
  }
};

const getUserFriendlyMessage = (errorMessage: string): string => {
  if (errorMessage.includes('Rate limit exceeded')) {
    return 'Za dużo zapytań. Spróbuj ponownie za minutę.';
  }
  if (errorMessage.includes('API error: 429')) {
    return 'Serwer przeciążony. Spróbuj ponownie za chwilę.';
  }
  if (errorMessage.includes('API error: 401')) {
    return 'Błędny klucz API. Sprawdź ustawienia.';
  }
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Problem z połączeniem. Sprawdź internet.';
  }
  if (errorMessage.includes('API Key')) {
    return 'Dodaj klucz API w ustawieniach.';
  }

  return 'Wystąpił błąd. Spróbuj ponownie.';
};

/**
 * Wrapper for async operations with consistent error handling
 *
 * Automatically catches and handles errors from async operations.
 * Returns null on error, otherwise returns the operation result.
 *
 * @param operation - Async function to execute
 * @param context - Optional error context
 * @returns Operation result or null on error
 *
 * @example
 * ```typescript
 * const data = await withErrorHandling(
 *   () => fetchData(),
 *   { component: 'Dashboard', action: 'fetchData' }
 * );
 * if (data) {
 *   // Use data
 * }
 * ```
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context);
    return null;
  }
};

import { parseRuleCondition } from './ruleConditionParser';
import { Pillar, Sprint, AppData } from '../types';
import { showError as showToastError } from './toastService';

/**
 * @deprecated Use parseRuleCondition from utils/ruleConditionParser.ts instead
 * This function is kept for backward compatibility but now uses safe parser.
 *
 * Safe eval wrapper for rule conditions (with basic sanitization)
 * NOTE: Now uses safe parseRuleCondition instead of unsafe Function()
 */
export const safeEvalCondition = (
  condition: string,
  context: {
    pillars?: Pillar[];
    sprint?: Sprint;
    user?: AppData['user'];
  }
): boolean => {
  try {
    return parseRuleCondition(condition, {
      pillars: context.pillars || [],
      sprint: context.sprint || {
        week: 0,
        year: 0,
        goal: '',
        progress: [],
        done_tasks: [],
        blocked_tasks: [],
      },
      user: context.user || {
        id: '',
        name: '',
        last_checkin: '',
        streak: 0,
      },
    });
  } catch (error) {
    // Fallback: return false if parser fails
    console.warn('Rule condition parsing failed:', error);
    return false;
  }
};
