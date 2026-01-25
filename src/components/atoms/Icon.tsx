import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { ComponentSize, ComponentVariant, BaseComponentProps } from '../../types/components';

// Icon specific props
export interface IconProps extends BaseComponentProps, Omit<HTMLMotionProps<'span'>, 'size'> {
  name: string;
  size?: ComponentSize;
  variant?: ComponentVariant;
  animated?: boolean;
  glow?: boolean;
  pulse?: boolean;
}

// Size configurations
const sizeConfig = {
  xs: 'w-3 h-3 text-xs',
  sm: 'w-4 h-4 text-sm',
  md: 'w-5 h-5 text-base',
  lg: 'w-6 h-6 text-lg',
  xl: 'w-8 h-8 text-xl',
};

// Icon mapping for common icons
const iconMap: Record<string, string> = {
  // Navigation
  home: '🏠',
  back: '←',
  forward: '→',
  menu: '☰',
  close: '✕',
  search: '🔍',
  settings: '⚙️',
  user: '👤',
  logout: '🚪',

  // Actions
  add: '+',
  edit: '✏️',
  delete: '🗑️',
  save: '💾',
  cancel: '❌',
  check: '✓',
  play: '▶️',
  pause: '⏸️',
  stop: '⏹️',

  // Status
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  loading: '⏳',

  // Task related
  task: '📋',
  timer: '⏰',
  calendar: '📅',
  star: '⭐',
  flag: '🚩',
  target: '🎯',
  rocket: '🚀',

  // Emotions/AI
  brain: '🧠',
  lightbulb: '💡',
  fire: '🔥',
  thunder: '⚡',
  heart: '❤️',

  // UI elements
  eye: '👁️',
  eyeSlash: '🙈',
  lock: '🔒',
  unlock: '🔓',
  chevronUp: '↑',
  chevronDown: '↓',
  chevronLeft: '←',
  chevronRight: '→',
};

// Variant color mapping
const variantColors = {
  primary: 'text-cyan-400',
  secondary: 'text-gray-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
  info: 'text-blue-400',
};

/**
 * Icon Atom Component
 * Cyberpunk-themed icons with animations and glow effects
 */
export const Icon = forwardRef<HTMLSpanElement, IconProps>(
  (
    {
      name,
      size = 'md',
      variant = 'secondary',
      animated = false,
      glow = false,
      pulse = false,
      className = '',
      children,
      'data-testid': testId,
      ...motionProps
    },
    ref
  ) => {
    const icon = iconMap[name] || name; // Fallback to name if not in map

    // Base classes
    const baseClasses = `
    inline-flex items-center justify-center
    select-none
    ${sizeConfig[size]}
    ${variantColors[variant]}
    ${glow ? 'drop-shadow-lg' : ''}
    ${className}
  `.trim();

    // Animation variants
    const animationVariants = {
      idle: {},
      pulse: {
        scale: [1, 1.1, 1],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
      glow: {
        textShadow: [
          '0 0 5px currentColor',
          '0 0 20px currentColor, 0 0 30px currentColor',
          '0 0 5px currentColor',
        ],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    };

    const currentAnimation = pulse ? 'pulse' : glow ? 'glow' : 'idle';

    return (
      <motion.span
        ref={ref}
        className={baseClasses}
        variants={animationVariants}
        animate={animated ? currentAnimation : 'idle'}
        data-testid={testId}
        role="img"
        aria-label={`${name} icon`}
        {...motionProps}
      >
        {icon}
      </motion.span>
    );
  }
);

Icon.displayName = 'Icon';

// Default props
Icon.defaultProps = {
  size: 'md',
  variant: 'secondary',
  animated: false,
  glow: false,
  pulse: false,
};

export default Icon;
