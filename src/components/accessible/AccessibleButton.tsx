import React, { forwardRef, useRef, useEffect } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Button, ButtonProps } from '../atoms/Button';
import { useAnnouncer, useA11yPreferences } from '../../hooks/useAccessibility';

export interface AccessibleButtonProps extends ButtonProps {
  announceOnClick?: string;
  loadingAnnouncement?: string;
  successAnnouncement?: string;
  errorAnnouncement?: string;
}

/**
 * Accessible Button Component
 * Enhanced button with comprehensive accessibility features
 */
export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      children,
      announceOnClick,
      loadingAnnouncement = 'Loading...',
      successAnnouncement,
      errorAnnouncement,
      onClick,
      isLoading,
      state,
      className = '',
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      ...buttonProps
    },
    ref
  ) => {
    const { announce } = useAnnouncer();
    const { reducedMotion, highContrast } = useA11yPreferences();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const internalRef = ref || buttonRef;

    // Generate accessible label if not provided
    const accessibleLabel =
      ariaLabel ||
      (typeof children === 'string'
        ? children
        : React.isValidElement(children)
          ? children.props['aria-label'] || children.props.alt
          : undefined);

    // Handle click with announcements
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      // Call original onClick
      onClick?.(event);

      // Announce action if specified
      if (announceOnClick) {
        announce(announceOnClick, 'polite');
      }

      // Announce state changes
      if (state === 'success' && successAnnouncement) {
        announce(successAnnouncement, 'polite');
      } else if (state === 'error' && errorAnnouncement) {
        announce(errorAnnouncement, 'assertive');
      }
    };

    // Announce loading state changes
    useEffect(() => {
      if (isLoading) {
        announce(loadingAnnouncement, 'polite');
      }
    }, [isLoading, loadingAnnouncement, announce]);

    // Enhanced focus styles for high contrast
    const focusClassName = highContrast
      ? 'focus:outline-2 focus:outline-solid focus:outline-blue-600 focus:outline-offset-2'
      : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent';

    // Reduced motion for animations
    const motionProps: Partial<HTMLMotionProps<'button'>> = reducedMotion
      ? {}
      : {
          whileTap: { scale: 0.98 },
          transition: { type: 'spring', stiffness: 300, damping: 30 },
        };

    return (
      <Button
        ref={internalRef}
        className={`${focusClassName} ${className}`}
        onClick={handleClick}
        isLoading={isLoading}
        state={state}
        aria-label={accessibleLabel}
        aria-describedby={ariaDescribedBy}
        {...motionProps}
        {...buttonProps}
      >
        {children}

        {/* Screen reader status announcements */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isLoading && loadingAnnouncement}
          {state === 'success' && successAnnouncement}
          {state === 'error' && errorAnnouncement}
        </div>
      </Button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

// Specialized accessible button variants
export const AccessiblePrimaryButton: React.FC<Omit<AccessibleButtonProps, 'variant'>> = (
  props
) => <AccessibleButton variant="primary" {...props} />;

export const AccessibleSecondaryButton: React.FC<Omit<AccessibleButtonProps, 'variant'>> = (
  props
) => <AccessibleButton variant="secondary" {...props} />;

export const AccessibleIconButton: React.FC<
  Omit<AccessibleButtonProps, 'children'> & {
    icon: React.ReactNode;
    iconLabel: string;
  }
> = ({ icon, iconLabel, className = '', ...props }) => (
  <AccessibleButton className={`p-2 ${className}`} aria-label={iconLabel} {...props}>
    {icon}
  </AccessibleButton>
);

export default AccessibleButton;
