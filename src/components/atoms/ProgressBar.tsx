import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { ComponentSize, ComponentVariant, BaseComponentProps } from '../../types/components';

// ProgressBar specific props
export interface ProgressBarProps extends BaseComponentProps, Omit<HTMLMotionProps<'div'>, 'size'> {
  value: number; // 0-100
  max?: number;
  size?: ComponentSize;
  variant?: ComponentVariant;
  showValue?: boolean;
  animated?: boolean;
  striped?: boolean;
  label?: string;
  showPercentage?: boolean;
}

// Size configurations
const sizeConfig = {
  xs: 'h-1',
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
  xl: 'h-6',
};

// Variant color mapping
const variantColors = {
  primary: 'from-cyan-500 to-blue-500',
  secondary: 'from-gray-500 to-gray-600',
  success: 'from-green-500 to-emerald-500',
  warning: 'from-yellow-500 to-orange-500',
  danger: 'from-red-500 to-pink-500',
  info: 'from-blue-500 to-indigo-500',
};

// Variant glow effects
const variantGlows = {
  primary: 'shadow-cyan-500/50',
  secondary: 'shadow-gray-500/50',
  success: 'shadow-green-500/50',
  warning: 'shadow-yellow-500/50',
  danger: 'shadow-red-500/50',
  info: 'shadow-blue-500/50',
};

/**
 * ProgressBar Atom Component
 * Cyberpunk-themed progress bar with animations and variants
 */
export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      max = 100,
      size = 'md',
      variant = 'primary',
      showValue = false,
      animated = true,
      striped = false,
      label,
      showPercentage = true,
      className = '',
      'data-testid': testId,
      children,
      ...motionProps
    },
    ref
  ) => {
    // Clamp value between 0 and max
    const clampedValue = Math.max(0, Math.min(value, max));
    const percentage = (clampedValue / max) * 100;

    // Ensure minimum visible progress for UX
    const displayPercentage = Math.max(percentage, percentage > 0 ? 2 : 0);

    return (
      <div
        ref={ref}
        className={`w-full ${className}`}
        data-testid={testId}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        {/* Label */}
        {label && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300 font-medium">{label}</span>
            {showPercentage && (
              <span className="text-sm text-gray-400 font-mono">{Math.round(percentage)}%</span>
            )}
          </div>
        )}

        {/* Progress container */}
        <div
          className={`
          relative w-full bg-gray-800/50 rounded-full overflow-hidden
          border border-white/10 backdrop-blur-sm
          ${sizeConfig[size]}
        `}
        >
          {/* Background pattern for cyberpunk effect */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `linear-gradient(90deg,
              transparent 0%,
              rgba(255,255,255,0.1) 50%,
              transparent 100%
            )`,
              backgroundSize: '20px 100%',
            }}
          />

          {/* Progress fill */}
          <motion.div
            className={`
            relative h-full rounded-full
            bg-gradient-to-r ${variantColors[variant]}
            shadow-lg ${variantGlows[variant]}
            ${striped ? 'progress-striped' : ''}
          `}
            style={{
              width: `${displayPercentage}%`,
              backgroundSize: striped ? '20px 20px' : undefined,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${displayPercentage}%` }}
            transition={{
              duration: animated ? 0.8 : 0,
              ease: 'easeOut',
            }}
            {...motionProps}
          />

          {/* Animated shine effect */}
          {animated && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
                ease: 'easeInOut',
              }}
            />
          )}

          {/* Value indicator */}
          {showValue && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ width: `${displayPercentage}%` }}
            >
              <motion.span
                className="text-xs font-bold text-white drop-shadow-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {Math.round(percentage)}%
              </motion.span>
            </div>
          )}
        </div>

        {/* Percentage display below bar */}
        {!label && showPercentage && (
          <div className="flex justify-end mt-1">
            <span className="text-xs text-gray-400 font-mono">{Math.round(percentage)}%</span>
          </div>
        )}
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

// Default props
ProgressBar.defaultProps = {
  max: 100,
  size: 'md',
  variant: 'primary',
  showValue: false,
  animated: true,
  striped: false,
  showPercentage: true,
};

export default ProgressBar;
