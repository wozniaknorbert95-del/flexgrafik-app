import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// ENHANCED DEBOUNCE HOOK - Performance Optimization
// ============================================================================

export interface DebounceOptions {
  leading?: boolean; // Execute immediately on first call
  trailing?: boolean; // Execute after delay on last call
  maxWait?: number; // Maximum time to wait before executing
}

/**
 * Enhanced Debounce Hook with Leading/Trailing Edge Control
 */
export function useDebounce<T>(value: T, delay: number, options: DebounceOptions = {}): T {
  const { leading = false, trailing = true, maxWait } = options;

  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const lastExecuteTimeRef = useRef<number>(0);
  const leadingValueRef = useRef<T | null>(null);

  useEffect(() => {
    const currentTime = Date.now();
    const elapsed = currentTime - lastCallTimeRef.current;

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Leading edge execution
    if (leading && elapsed >= delay && currentTime - lastExecuteTimeRef.current >= delay) {
      setDebouncedValue(value);
      lastExecuteTimeRef.current = currentTime;
      leadingValueRef.current = value;

      // Set max wait timer if specified
      if (maxWait && trailing) {
        maxTimeoutRef.current = setTimeout(() => {
          if (leadingValueRef.current !== null) {
            setDebouncedValue(leadingValueRef.current);
            leadingValueRef.current = null;
          }
        }, maxWait);
      }

      return;
    }

    // Trailing edge execution
    if (trailing) {
      const remaining = delay - elapsed;

      timeoutRef.current = setTimeout(
        () => {
          const executeTime = Date.now();
          const timeSinceLastExecute = executeTime - lastExecuteTimeRef.current;

          // Only execute if delay has passed since last execution
          if (timeSinceLastExecute >= delay) {
            setDebouncedValue(value);
            lastExecuteTimeRef.current = executeTime;
          }
        },
        Math.min(remaining, maxWait || delay)
      );

      // Set max wait timer
      if (maxWait && maxWait > delay) {
        maxTimeoutRef.current = setTimeout(() => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setDebouncedValue(value);
          lastExecuteTimeRef.current = Date.now();
        }, maxWait);
      }
    }

    lastCallTimeRef.current = currentTime;

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, [value, delay, leading, trailing, maxWait]);

  return debouncedValue;
}

/**
 * Debounced Callback Hook
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: DebounceOptions = {}
): T & { cancel: () => void; flush: () => void } {
  const { leading = false, trailing = true, maxWait } = options;

  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgsRef = useRef<any[] | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const lastExecuteTimeRef = useRef<number>(0);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cancel function
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    lastArgsRef.current = null;
  }, []);

  // Flush function - execute immediately
  const flush = useCallback(() => {
    if (lastArgsRef.current) {
      callbackRef.current(...lastArgsRef.current);
      lastExecuteTimeRef.current = Date.now();
      cancel();
    }
  }, [cancel]);

  // Debounced function
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const currentTime = Date.now();
      const elapsed = currentTime - lastCallTimeRef.current;

      lastArgsRef.current = args;

      // Clear existing timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
        maxTimeoutRef.current = null;
      }

      // Leading edge execution
      if (leading && elapsed >= delay && currentTime - lastExecuteTimeRef.current >= delay) {
        callbackRef.current(...args);
        lastExecuteTimeRef.current = currentTime;

        // Set max wait timer if specified
        if (maxWait && trailing) {
          maxTimeoutRef.current = setTimeout(() => {
            if (lastArgsRef.current) {
              callbackRef.current(...lastArgsRef.current);
            }
          }, maxWait);
        }

        return;
      }

      // Trailing edge execution
      if (trailing) {
        const remaining = delay - elapsed;

        timeoutRef.current = setTimeout(
          () => {
            const executeTime = Date.now();
            const timeSinceLastExecute = executeTime - lastExecuteTimeRef.current;

            if (timeSinceLastExecute >= delay && lastArgsRef.current) {
              callbackRef.current(...lastArgsRef.current);
              lastExecuteTimeRef.current = executeTime;
            }
          },
          Math.min(remaining, maxWait || delay)
        );

        // Set max wait timer
        if (maxWait && maxWait > delay) {
          maxTimeoutRef.current = setTimeout(() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            if (lastArgsRef.current) {
              callbackRef.current(...lastArgsRef.current);
              lastExecuteTimeRef.current = Date.now();
            }
          }, maxWait);
        }
      }

      lastCallTimeRef.current = currentTime;
    },
    [delay, leading, trailing, maxWait]
  ) as T & { cancel: () => void; flush: () => void };

  // Add cancel and flush methods
  debouncedCallback.cancel = cancel;
  debouncedCallback.flush = flush;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return debouncedCallback;
}

/**
 * Debounced State Hook - Combines useState with debouncing
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number,
  options: DebounceOptions = {}
): [T, (value: T | ((prev: T) => T)) => void, T] {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);

  const debouncedSetValue = useDebouncedCallback(
    (newValue: T) => setDebouncedValue(newValue),
    delay,
    options
  );

  const setValueAndDebounce = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const resolvedValue =
        typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue;

      setValue(resolvedValue);
      debouncedSetValue(resolvedValue);
    },
    [value, debouncedSetValue]
  );

  return [value, setValueAndDebounce, debouncedValue];
}

/**
 * Debounced Effect Hook
 */
export function useDebouncedEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  delay: number,
  options: DebounceOptions = {}
) {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  const debouncedEffect = useDebouncedCallback(() => effectRef.current(), delay, options);

  useEffect(() => {
    debouncedEffect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Debounced Search Hook - Specialized for search functionality
 */
export function useDebouncedSearch(
  initialQuery = '',
  delay = 300
): {
  query: string;
  debouncedQuery: string;
  setQuery: (query: string) => void;
  isSearching: boolean;
  clearSearch: () => void;
} {
  const [query, setQueryState] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedQuery = useDebounce(query, delay, {
    leading: false,
    trailing: true,
  });

  // Show searching state when query is different from debounced query
  useEffect(() => {
    setIsSearching(query !== debouncedQuery && query.length > 0);
  }, [query, debouncedQuery]);

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
  }, []);

  const clearSearch = useCallback(() => {
    setQueryState('');
  }, []);

  return {
    query,
    debouncedQuery,
    setQuery,
    isSearching,
    clearSearch,
  };
}

/**
 * Debounced Resize Hook - For window resize events
 */
export function useDebouncedResize(
  callback: (size: { width: number; height: number }) => void,
  delay = 150
) {
  const debouncedCallback = useDebouncedCallback(callback, delay);

  useEffect(() => {
    const handleResize = () => {
      debouncedCallback({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    // Initial call
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [debouncedCallback]);
}

/**
 * Debounced Scroll Hook - For scroll events
 */
export function useDebouncedScroll(
  callback: (scroll: { x: number; y: number }) => void,
  element?: HTMLElement | null,
  delay = 100
) {
  const debouncedCallback = useDebouncedCallback(callback, delay);

  useEffect(() => {
    const target = element || window;

    const handleScroll = () => {
      const scrollX = element ? element.scrollLeft : window.pageXOffset;
      const scrollY = element ? element.scrollTop : window.pageYOffset;

      debouncedCallback({ x: scrollX, y: scrollY });
    };

    target.addEventListener('scroll', handleScroll, { passive: true });
    // Initial call
    handleScroll();

    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [debouncedCallback, element]);
}

// Performance monitoring utilities
export const debounceUtils = {
  // Get current debounce statistics (for debugging)
  getStats: () => ({
    activeTimeouts: 0, // Would need to track globally
    averageDelay: 0,
    totalCalls: 0,
  }),

  // Create a debounced function factory
  createDebouncedFunction: <T extends (...args: any[]) => any>(
    fn: T,
    delay: number,
    options: DebounceOptions = {}
  ): T & { cancel: () => void; flush: () => void } => {
    let timeoutId: NodeJS.Timeout | null = null;
    let maxTimeoutId: NodeJS.Timeout | null = null;
    let lastArgs: any[] | null = null;
    let lastCallTime = 0;
    let lastExecuteTime = 0;

    const { leading = false, trailing = true, maxWait } = options;

    const debouncedFn = ((...args: Parameters<T>) => {
      const currentTime = Date.now();
      const elapsed = currentTime - lastCallTime;

      lastArgs = args;

      // Clear existing timers
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
        maxTimeoutId = null;
      }

      // Leading edge
      if (leading && elapsed >= delay && currentTime - lastExecuteTime >= delay) {
        fn(...args);
        lastExecuteTime = currentTime;
        return;
      }

      // Trailing edge
      if (trailing) {
        const remaining = delay - elapsed;

        timeoutId = setTimeout(
          () => {
            const executeTime = Date.now();
            if (executeTime - lastExecuteTime >= delay && lastArgs) {
              fn(...lastArgs);
              lastExecuteTime = executeTime;
            }
          },
          Math.min(remaining, maxWait || delay)
        );
      }

      lastCallTime = currentTime;
    }) as T & { cancel: () => void; flush: () => void };

    debouncedFn.cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
        maxTimeoutId = null;
      }
      lastArgs = null;
    };

    debouncedFn.flush = () => {
      if (lastArgs) {
        fn(...lastArgs);
        lastExecuteTime = Date.now();
        debouncedFn.cancel();
      }
    };

    return debouncedFn;
  },
};

// Example usage:
/*
// Basic debouncing
const debouncedValue = useDebounce(searchQuery, 300);

// Debounced callback
const debouncedSearch = useDebouncedCallback(
  (query) => performSearch(query),
  300,
  { leading: false, trailing: true }
);

// Debounced state
const [value, setValue, debouncedValue] = useDebouncedState('', 500);

// Debounced search hook
const { query, debouncedQuery, setQuery, isSearching } = useDebouncedSearch();

// Debounced resize
useDebouncedResize((size) => {
  console.log('Window resized:', size);
}, 150);
*/
