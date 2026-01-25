import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { ComponentSize, ComponentVariant, BaseComponentProps } from '../../types/components';

// Badge specific props
export interface BadgeProps extends BaseComponentProps, Omit<HTMLMotionProps<'span'>, 'size'> {
  variant?: ComponentVariant;
  size?: ComponentSize;
  pill?: boolean;
  animated?: boolean;
  glow?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

// Size configurations
const sizeConfig = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-1 text-sm',
  md: 'px-2.5 py-1.5 text-sm',
  lg: 'px-3 py-2 text-base',
  xl: 'px-4 py-3 text-lg',
};

// Variant configurations
const variantConfig = {
  primary: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  secondary: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  success: 'bg-green-500/20 text-green-300 border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  danger: 'bg-red-500/20 text-red-300 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

// Glow effects for variants
const glowEffects = {
  primary: 'shadow-cyan-500/50',
  secondary: 'shadow-gray-500/50',
  success: 'shadow-green-500/50',
  warning: 'shadow-yellow-500/50',
  danger: 'shadow-red-500/50',
  info: 'shadow-blue-500/50',
};

/**
 * Badge Atom Component
 * Cyberpunk-themed badges with variants, animations, and removal capability
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      pill = false,
      animated = false,
      glow = false,
      removable = false,
      onRemove,
      className = '',
      children,
      'data-testid': testId,
      ...motionProps
    },
    ref
  ) => {
    const handleRemove = (event: React.MouseEvent) => {
      event.stopPropagation();
      onRemove?.();
    };

    // Base classes
    const baseClasses = `
    inline-flex items-center gap-1
    font-semibold uppercase tracking-wide
    border backdrop-blur-sm
    transition-all duration-300
    ${sizeConfig[size]}
    ${variantConfig[variant]}
    ${pill ? 'rounded-full' : 'rounded-lg'}
    ${glow ? `shadow-lg ${glowEffects[variant]}` : ''}
    ${animated ? 'hover:scale-105' : ''}
    ${removable ? 'pr-1' : ''}
    ${className}
  `.trim();

    return (
      <motion.span
        ref={ref}
        className={baseClasses}
        data-testid={testId}
        role="status"
        aria-label={typeof children === 'string' ? children : undefined}
        {...motionProps}
      >
        {/* Badge content */}
        <span className="relative z-10">{children}</span>

        {/* Remove button */}
        {removable && (
          <motion.button
            onClick={handleRemove}
            className="
            flex items-center justify-center
            w-4 h-4 rounded-full
            bg-white/20 hover:bg-white/30
            text-white text-xs
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-white/50
          "
            aria-label="Remove badge"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            ×
          </motion.button>
        )}

        {/* Animated border glow */}
        {animated && (
          <motion.div
            className="absolute inset-0 rounded-lg opacity-0"
            style={{
              background: `linear-gradient(45deg,
              transparent 0%,
              rgba(255,255,255,0.1) 50%,
              transparent 100%
            )`,
            }}
            animate={{
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.span>
    );
  }
);

Badge.displayName = 'Badge';

// Default props
Badge.defaultProps = {
  variant: 'secondary',
  size: 'md',
  pill: false,
  animated: false,
  glow: false,
  removable: false,
};

export default Badge;
