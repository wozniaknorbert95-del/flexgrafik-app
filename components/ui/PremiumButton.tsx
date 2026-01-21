import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface PremiumButtonProps extends Omit<HTMLMotionProps<"button">, 'children'> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  glowColor?: 'magenta' | 'cyan' | 'gold';
}

/**
 * Premium Button Component - Cyberpunk 2025
 * Micro-interactions, haptic feedback, luxurious feel
 */
export const PremiumButton = React.memo<PremiumButtonProps>(({ 
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  glowColor = 'magenta',
  disabled,
  className = '',
  ...props 
}) => {
  // Base styles
  const baseStyles = `
    relative inline-flex items-center justify-center gap-2
    font-semibold uppercase tracking-wider
    transition-all duration-200
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  // Size variants
  const sizeStyles = {
    sm: 'px-4 py-2 text-xs rounded-lg',
    md: 'px-6 py-3 text-sm rounded-xl',
    lg: 'px-8 py-4 text-base rounded-2xl',
  }[size];

  // Variant styles
  const variantStyles = {
    primary: `
      bg-transparent border-2 border-[var(--color-accent-${glowColor})]
      text-[var(--color-accent-${glowColor})]
      hover:bg-[var(--color-accent-${glowColor})]/10
      hover:shadow-[0_0_20px_var(--shadow-glow-${glowColor}-md)]
      focus-visible:ring-[var(--color-accent-${glowColor})]
    `,
    secondary: `
      bg-[var(--color-glass-light)] backdrop-blur-xl
      border border-[var(--color-border-subtle)]
      text-[var(--color-text-primary)]
      hover:bg-[var(--color-glass-medium)]
      hover:shadow-[var(--shadow-elevation-low)]
    `,
    tertiary: `
      bg-transparent
      text-[var(--color-text-secondary)]
      hover:text-[var(--color-text-primary)]
      hover:bg-[var(--color-glass-light)]
    `,
    ghost: `
      bg-transparent
      text-[var(--color-accent-${glowColor})]
      hover:bg-[var(--color-glass-light)]
    `,
  }[variant];

  return (
    <motion.button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <motion.div
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <span className="ml-2">Processing...</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </motion.button>
  );
});

PremiumButton.displayName = 'PremiumButton';

export default PremiumButton;
