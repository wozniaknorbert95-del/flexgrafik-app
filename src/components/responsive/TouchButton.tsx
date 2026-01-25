import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Button, ButtonProps } from '../atoms/Button';

export interface TouchButtonProps extends ButtonProps {
  touchSize?: 'min' | 'preferred' | 'large';
  hapticFeedback?: boolean;
  preventDoubleTap?: boolean;
  touchRipple?: boolean;
}

/**
 * Touch-Friendly Button Component
 * Enhanced button with mobile-first touch optimizations and accessibility
 */
export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  (
    {
      touchSize = 'preferred',
      hapticFeedback = true,
      preventDoubleTap = true,
      touchRipple = true,
      className = '',
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const [lastTap, setLastTap] = React.useState(0);
    const [ripplePosition, setRipplePosition] = React.useState<{ x: number; y: number } | null>(
      null
    );

    // Touch size classes
    const touchSizeClasses = {
      min: 'touch-target-min',
      preferred: 'touch-target-preferred',
      large: 'touch-target-large',
    };

    // Haptic feedback simulation (visual feedback on devices without haptics)
    const triggerHapticFeedback = React.useCallback(() => {
      if (hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, [hapticFeedback]);

    // Prevent double-tap zoom on iOS
    const handleTouchStart = React.useCallback((event: React.TouchEvent) => {
      event.preventDefault();
    }, []);

    // Handle touch/click with double-tap prevention
    const handleInteraction = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
        if (preventDoubleTap) {
          const currentTime = Date.now();
          const timeDiff = currentTime - lastTap;

          if (timeDiff < 300) {
            // Double tap detected, prevent default
            event.preventDefault();
            return;
          }

          setLastTap(currentTime);
        }

        // Trigger haptic feedback
        triggerHapticFeedback();

        // Create ripple effect
        if (touchRipple) {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ('touches' in event ? event.touches[0].clientX : event.clientX) - rect.left;
          const y = ('touches' in event ? event.touches[0].clientY : event.clientY) - rect.top;
          setRipplePosition({ x, y });

          // Clear ripple after animation
          setTimeout(() => setRipplePosition(null), 600);
        }

        // Call original onClick
        onClick?.(event as any);
      },
      [preventDoubleTap, lastTap, triggerHapticFeedback, touchRipple, onClick]
    );

    // Enhanced button classes
    const enhancedClassName = `
    touch-feedback
    ${touchSizeClasses[touchSize]}
    ${touchRipple ? 'relative overflow-hidden' : ''}
    ${className}
  `.trim();

    return (
      <>
        <Button
          ref={ref}
          className={enhancedClassName}
          onClick={handleInteraction}
          onTouchStart={handleTouchStart}
          {...buttonProps}
        >
          {children}

          {/* Touch ripple effect */}
          {touchRipple && ripplePosition && (
            <motion.div
              className="absolute bg-white/30 rounded-full pointer-events-none"
              style={{
                left: ripplePosition.x - 20,
                top: ripplePosition.y - 20,
                width: 40,
                height: 40,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          )}
        </Button>

        {/* Screen reader announcement for haptic feedback */}
        {hapticFeedback && (
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            Button activated
          </div>
        )}
      </>
    );
  }
);

TouchButton.displayName = 'TouchButton';

// Touch-optimized button variants
export const TouchPrimaryButton: React.FC<Omit<TouchButtonProps, 'variant'>> = (props) => (
  <TouchButton variant="primary" {...props} />
);

export const TouchSecondaryButton: React.FC<Omit<TouchButtonProps, 'variant'>> = (props) => (
  <TouchButton variant="secondary" {...props} />
);

export const TouchIconButton: React.FC<
  Omit<TouchButtonProps, 'children' | 'variant'> & { icon: React.ReactNode }
> = ({ icon, ...props }) => (
  <TouchButton variant="secondary" size="sm" {...props}>
    {icon}
  </TouchButton>
);

export default TouchButton;
