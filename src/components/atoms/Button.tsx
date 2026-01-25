import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import {
  ComponentSize,
  ComponentVariant,
  ComponentState,
  FormFieldProps,
} from '../../types/components';

// Button specific props
export interface ButtonProps extends Omit<FormFieldProps, 'children'>, HTMLMotionProps<'button'> {
  variant?: ComponentVariant;
  size?: ComponentSize;
  state?: ComponentState;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

// Size configurations with touch-friendly minimums
const sizeConfig = {
  xs: 'px-3 py-2 text-sm min-h-[44px] min-w-[44px]', // Touch-friendly minimums
  sm: 'px-4 py-3 text-base min-h-[48px] min-w-[48px]', // Preferred touch targets
  md: 'px-6 py-4 text-lg min-h-[48px] min-w-[48px]',
  lg: 'px-8 py-5 text-xl min-h-[56px] min-w-[56px]', // Large touch targets
  xl: 'px-10 py-6 text-2xl min-h-[56px] min-w-[56px]',
};

// Variant configurations with cyberpunk theme
const variantConfig = {
  primary:
    'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40',
  secondary:
    'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg shadow-gray-600/25 hover:shadow-gray-600/40',
  success:
    'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40',
  warning:
    'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40',
  danger:
    'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40',
  info: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40',
};

// State configurations
const stateConfig = {
  idle: '',
  loading: 'cursor-wait opacity-75',
  error: 'cursor-not-allowed opacity-75',
  success: 'cursor-default',
  disabled: 'cursor-not-allowed opacity-50',
};

/**
 * Button Atom Component
 * Cyberpunk-themed button with loading states, accessibility, and motion
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      state = 'idle',
      fullWidth = false,
      icon,
      iconPosition = 'left',
      disabled,
      isLoading,
      loadingText,
      children,
      className = '',
      href,
      target,
      onClick,
      'aria-label': ariaLabel,
      'data-testid': testId,
      ...motionProps
    },
    ref
  ) => {
    // Determine effective state
    const effectiveState: ComponentState = disabled || isLoading ? 'disabled' : state;
    const isDisabled = effectiveState === 'disabled';

    // Button content
    const buttonContent = (
      <>
        {isLoading && loadingText ? (
          <span className="flex items-center gap-2">
            <motion.div
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            {loadingText}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {icon && iconPosition === 'left' && icon}
            {children}
            {icon && iconPosition === 'right' && icon}
          </span>
        )}
      </>
    );

    // Base classes
    const baseClasses = `
    relative inline-flex items-center justify-center
    font-semibold uppercase tracking-wide
    border-none rounded-lg
    transition-all duration-300 ease-out
    focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-transparent
    active:scale-95
    ${sizeConfig[size]}
    ${variantConfig[variant]}
    ${stateConfig[effectiveState]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim();

    // If href is provided, render as link
    if (href) {
      return (
        <motion.a
          ref={ref as any}
          href={href}
          target={target}
          className={baseClasses}
          aria-label={ariaLabel}
          data-testid={testId}
          {...motionProps}
        >
          {buttonContent}
        </motion.a>
      );
    }

    // Render as button
    return (
      <motion.button
        ref={ref}
        className={baseClasses}
        disabled={isDisabled}
        onClick={onClick}
        aria-label={ariaLabel}
        data-testid={testId}
        {...motionProps}
      >
        {buttonContent}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

// Default props
Button.defaultProps = {
  variant: 'primary',
  size: 'md',
  state: 'idle',
  iconPosition: 'left',
  fullWidth: false,
};

export default Button;
