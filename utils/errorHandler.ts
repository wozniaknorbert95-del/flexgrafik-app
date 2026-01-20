// Centralized error handler for consistent error handling across the app

export interface ErrorContext {
  component?: string;
  action?: string;
  userMessage?: string;
  shouldShowToUser?: boolean;
}

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

export const handleError = (error: unknown, context?: ErrorContext): void => {
  // Create standardized error object
  const appError = error instanceof AppError ? error : new AppError(
    error instanceof Error ? error.message : 'Unknown error occurred',
    context,
    error instanceof Error ? error : undefined
  );

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context?.component || 'Unknown'}] ${context?.action || 'Unknown action'}:`, {
      message: appError.message,
      context: appError.context,
      originalError: appError.originalError
    });
  }

  // Could send to error reporting service here
  // reportError(appError);

  // Show user-friendly message if needed
  if (appError.context?.shouldShowToUser !== false) {
    const userMessage = appError.context?.userMessage ||
      getUserFriendlyMessage(appError.message);

    // Use a toast notification instead of alert in the future
    alert(userMessage);
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

// Wrapper for async operations with consistent error handling
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

// Safe eval wrapper for rule conditions (with basic sanitization)
export const safeEvalCondition = (condition: string, context: any): boolean => {
  try {
    // Basic sanitization - prevent dangerous operations
    if (condition.includes('eval(') ||
        condition.includes('Function(') ||
        condition.includes('require(') ||
        condition.includes('import(')) {
      throw new Error('Unsafe condition: contains dangerous operations');
    }

    // Create safe evaluation function
    const safeEval = new Function(
      'pillars', 'sprint', 'user',
      `
      try {
        // Basic validation
        if (typeof ${condition} !== 'boolean') {
          return false;
        }
        return ${condition};
      } catch (e) {
        console.warn('Rule condition evaluation error:', e);
        return false;
      }
      `
    );

    return safeEval(context.pillars, context.sprint, context.user);
  } catch (error) {
    console.warn('Safe eval failed for condition:', condition, error);
    return false;
  }
};