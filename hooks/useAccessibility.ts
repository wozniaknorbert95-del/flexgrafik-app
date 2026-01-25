import { useEffect, useRef, useState } from 'react';

/**
 * Accessibility utilities and hooks for WCAG compliance
 */

export interface FocusTrapOptions {
  active: boolean;
  onEscape?: () => void;
  onEnter?: () => void;
  restoreFocus?: boolean;
}

export const useFocusTrap = ({
  active,
  onEscape,
  onEnter,
  restoreFocus = true,
}: FocusTrapOptions) => {
  const containerRef = useRef<HTMLElement>(null);
  const previouslyFocusedElementRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    // Store the previously focused element
    if (restoreFocus) {
      previouslyFocusedElementRef.current = document.activeElement;
    }

    // Find all focusable elements within the container
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key === 'Enter' && onEnter) {
        event.preventDefault();
        onEnter();
        return;
      }

      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus the first element when trap becomes active
    if (firstElement) {
      firstElement.focus();
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus when trap becomes inactive
      if (restoreFocus && previouslyFocusedElementRef.current instanceof HTMLElement) {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [active, onEscape, onEnter, restoreFocus]);

  return containerRef;
};

/**
 * Hook for managing ARIA live regions for dynamic content
 */
export const useLiveRegion = (priority: 'polite' | 'assertive' = 'polite') => {
  const [message, setMessage] = useState('');

  const announce = (text: string) => {
    setMessage(text);
    // Clear the message after it's been announced
    setTimeout(() => setMessage(''), 1000);
  };

  return {
    message,
    announce,
    liveRegionProps: {
      'aria-live': priority,
      'aria-atomic': true,
      className: 'sr-only',
    },
  };
};

/**
 * Hook for managing skip links
 */
export const useSkipLinks = () => {
  useEffect(() => {
    const handleSkipLink = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Home to focus main content
      if ((event.ctrlKey || event.metaKey) && event.key === 'Home') {
        event.preventDefault();
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus();
          mainContent.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    document.addEventListener('keydown', handleSkipLink);
    return () => document.removeEventListener('keydown', handleSkipLink);
  }, []);
};

/**
 * Hook for detecting reduced motion preference
 */
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

/**
 * Hook for managing high contrast mode detection
 */
export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    // Check for high contrast mode (limited browser support)
    const checkHighContrast = () => {
      // This is a simplified check - real implementation would be more complex
      const testElement = document.createElement('div');
      testElement.style.color = 'rgb(31, 41, 55)'; // Tailwind gray-800
      testElement.style.backgroundColor = 'rgb(255, 255, 255)';
      document.body.appendChild(testElement);

      const computedColor = window.getComputedStyle(testElement).color;
      const computedBg = window.getComputedStyle(testElement).backgroundColor;

      // If colors are overridden (high contrast mode), they might be different
      const isHighContrast =
        computedColor !== 'rgb(31, 41, 55)' || computedBg !== 'rgb(255, 255, 255)';

      document.body.removeChild(testElement);
      setIsHighContrast(isHighContrast);
    };

    checkHighContrast();

    // Listen for changes (though this is not widely supported)
    const handleContrastChange = () => checkHighContrast();
    window.addEventListener('contrastchange', handleContrastChange);

    return () => window.removeEventListener('contrastchange', handleContrastChange);
  }, []);

  return isHighContrast;
};

/**
 * Utility for generating accessible button props
 */
export const getAccessibleButtonProps = (
  label: string,
  description?: string,
  disabled?: boolean
) => ({
  'aria-label': label,
  'aria-describedby': description ? `${label}-description` : undefined,
  'aria-disabled': disabled,
  disabled,
  tabIndex: disabled ? -1 : 0,
});

/**
 * Utility for generating accessible modal props
 */
export const getAccessibleModalProps = (title: string, describedBy?: string) => ({
  role: 'dialog',
  'aria-modal': true,
  'aria-labelledby': title,
  'aria-describedby': describedBy,
});

/**
 * Utility for generating accessible form field props
 */
export const getAccessibleFieldProps = (
  label: string,
  error?: string,
  required?: boolean,
  describedBy?: string
) => ({
  'aria-label': label,
  'aria-required': required,
  'aria-invalid': !!error,
  'aria-describedby':
    [error ? `${label}-error` : undefined, describedBy].filter(Boolean).join(' ') || undefined,
});

/**
 * Screen reader utilities
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    if (announcement.parentNode) {
      announcement.parentNode.removeChild(announcement);
    }
  }, 1000);
};

/**
 * Focus management utilities
 */
export const focusFirstFocusableElement = (container: HTMLElement) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  if (firstElement) {
    firstElement.focus();
  }
};

export const focusLastFocusableElement = (container: HTMLElement) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  if (lastElement) {
    lastElement.focus();
  }
};
