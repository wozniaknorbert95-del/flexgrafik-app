import React, { forwardRef, useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { ComponentSize, FormFieldProps } from '../../types/components';

// Input specific props
export interface InputProps extends FormFieldProps, Omit<HTMLMotionProps<'input'>, 'size'> {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  size?: ComponentSize;
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: string) => void;
  validator?: (value: string) => string | null;
}

// Size configurations
const sizeConfig = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-6 py-4 text-lg',
  xl: 'px-8 py-5 text-xl',
};

/**
 * Input Atom Component
 * Cyberpunk-themed input with validation, icons, and accessibility
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      size = 'md',
      placeholder,
      value,
      defaultValue,
      maxLength,
      minLength,
      pattern,
      autoComplete,
      inputMode,
      leftIcon,
      rightIcon,
      disabled,
      required,
      readOnly,
      isLoading,
      error,
      validator,
      className = '',
      onChange,
      onValueChange,
      onFocus,
      onBlur,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'data-testid': testId,
      id,
      name,
      ...motionProps
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(defaultValue || '');
    const [internalError, setInternalError] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Use controlled or uncontrolled value
    const currentValue = value !== undefined ? value : internalValue;
    const currentError = error || internalError;

    // Generate unique IDs for accessibility
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = `${inputId}-error`;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;

      // Update internal state if uncontrolled
      if (value === undefined) {
        setInternalValue(newValue);
      }

      // Validate if validator provided
      if (validator) {
        const validationError = validator(newValue);
        setInternalError(validationError);
      }

      // Call external handlers
      onChange?.(event);
      onValueChange?.(newValue);
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(event);
    };

    // Base classes
    const baseClasses = `
    relative w-full
    bg-white/10 backdrop-blur-sm
    border rounded-lg
    text-white placeholder-gray-400
    transition-all duration-300
    focus:outline-none
    ${sizeConfig[size]}
    ${
      isFocused
        ? 'border-cyan-400 shadow-lg shadow-cyan-500/25'
        : 'border-white/20 hover:border-white/40'
    }
    ${currentError ? 'border-red-400 focus:border-red-400 shadow-red-500/25' : ''}
    ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.trim();

    return (
      <div className="relative">
        {/* Input wrapper with icons */}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
              {leftIcon}
            </div>
          )}

          <motion.input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            value={currentValue}
            placeholder={placeholder}
            maxLength={maxLength}
            minLength={minLength}
            pattern={pattern}
            autoComplete={autoComplete}
            inputMode={inputMode}
            disabled={disabled || isLoading}
            required={required}
            readOnly={readOnly}
            className={`
            ${baseClasses}
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
          `}
            aria-label={ariaLabel}
            aria-describedby={currentError ? errorId : ariaDescribedBy}
            aria-invalid={!!currentError}
            data-testid={testId}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...motionProps}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
              {rightIcon}
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <motion.div
                className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          )}
        </div>

        {/* Error message */}
        {currentError && (
          <motion.div
            id={errorId}
            className="mt-1 text-sm text-red-400 flex items-center gap-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span>⚠️</span>
            {currentError}
          </motion.div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Default props
Input.defaultProps = {
  type: 'text',
  size: 'md',
};

export default Input;
