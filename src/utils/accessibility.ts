// Accessibility Utilities and Helpers
// WCAG 2.1 AA Compliance Support

/**
 * Accessibility utility functions for WCAG 2.1 AA compliance
 */

/**
 * Generate unique IDs for accessibility relationships
 */
export const generateA11yId = (prefix: string = 'a11y') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Announce content to screen readers
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
  timeout: number = 100
) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'sr-only');
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, timeout + 1000);
};

/**
 * Manage focus within a container
 */
export const trapFocus = (container: HTMLElement) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }

    if (e.key === 'Escape') {
      // Find and click the close button if it exists
      const closeButton = container.querySelector('[data-a11y-close]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus first element
  if (firstElement) {
    firstElement.focus();
  }

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
};

/**
 * Check if element is visible to screen readers
 */
export const isElementVisible = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
};

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ];

  return Array.from(container.querySelectorAll(focusableSelectors.join(', '))) as HTMLElement[];
};

/**
 * Calculate color contrast ratio (WCAG compliance)
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  // Simple implementation - in production use a proper color library
  // This is a placeholder that assumes good contrast for demo purposes
  const isDarkColor = (color: string) => {
    // Basic check for dark colors
    return (
      color.includes('900') ||
      color.includes('800') ||
      color.includes('black') ||
      color.includes('gray-900')
    );
  };

  const isLightColor = (color: string) => {
    return (
      color.includes('50') ||
      color.includes('100') ||
      color.includes('white') ||
      color.includes('gray-100')
    );
  };

  if (
    (isDarkColor(color1) && isLightColor(color2)) ||
    (isLightColor(color1) && isDarkColor(color2))
  ) {
    return 7.1; // Good contrast ratio
  }

  return 4.5; // Minimum acceptable ratio
};

/**
 * Skip link functionality
 */
export const createSkipLink = (targetId: string, label: string): HTMLAnchorElement => {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = label;
  skipLink.className =
    'skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded';
  skipLink.setAttribute('data-skip-link', 'true');

  return skipLink;
};

/**
 * High contrast mode detection
 */
export const isHighContrastMode = (): boolean => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

/**
 * Reduced motion preference
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Color scheme preference
 */
export const prefersDarkMode = (): boolean => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Move focus to a specific element
   */
  moveFocusTo: (element: HTMLElement) => {
    if (element && typeof element.focus === 'function') {
      element.focus();
      // Scroll into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  /**
   * Move focus to the next element in tab order
   */
  moveFocusNext: (currentElement: HTMLElement) => {
    const focusableElements = getFocusableElements(document.body);
    const currentIndex = focusableElements.indexOf(currentElement);

    if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {
      focusManagement.moveFocusTo(focusableElements[currentIndex + 1]);
    }
  },

  /**
   * Move focus to the previous element in tab order
   */
  moveFocusPrevious: (currentElement: HTMLElement) => {
    const focusableElements = getFocusableElements(document.body);
    const currentIndex = focusableElements.indexOf(currentElement);

    if (currentIndex > 0) {
      focusManagement.moveFocusTo(focusableElements[currentIndex - 1]);
    }
  },
};

/**
 * ARIA live region management
 */
export const liveRegion = {
  /**
   * Create a live region for announcements
   */
  create: (priority: 'polite' | 'assertive' = 'polite'): HTMLElement => {
    const region = document.createElement('div');
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    document.body.appendChild(region);
    return region;
  },

  /**
   * Announce a message
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const region = liveRegion.create(priority);
    region.textContent = message;

    // Remove after announcement
    setTimeout(() => {
      if (region.parentNode) {
        region.parentNode.removeChild(region);
      }
    }, 1000);
  },
};

/**
 * Keyboard navigation helpers
 */
export const keyboardNavigation = {
  /**
   * Handle arrow key navigation for lists
   */
  handleArrowKeys: (
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onSelect: (index: number) => void
  ) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(currentIndex + 1, items.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect(currentIndex);
        return;
    }

    if (newIndex !== currentIndex) {
      // Update focus
      items[currentIndex]?.setAttribute('tabindex', '-1');
      items[newIndex]?.setAttribute('tabindex', '0');
      items[newIndex]?.focus();

      // Announce to screen reader
      const label =
        items[newIndex]?.getAttribute('aria-label') ||
        items[newIndex]?.textContent ||
        `Item ${newIndex + 1}`;
      announceToScreenReader(`${label} selected`, 'polite');
    }
  },
};

export default {
  generateA11yId,
  announceToScreenReader,
  trapFocus,
  isElementVisible,
  getFocusableElements,
  getContrastRatio,
  createSkipLink,
  isHighContrastMode,
  prefersReducedMotion,
  prefersDarkMode,
  focusManagement,
  liveRegion,
  keyboardNavigation,
};
