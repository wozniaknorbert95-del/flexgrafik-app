import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Input, Icon } from '../atoms';
import { InputProps } from '../atoms/Input';
import { BaseComponentProps, LoadingProps, ErrorProps } from '../../types/components';

// FormField specific props
export interface FormFieldProps extends Omit<InputProps, 'error'> {
  label?: string;
  helpText?: string;
  required?: boolean;
  layout?: 'vertical' | 'horizontal';
  labelWidth?: string;
}

/**
 * FormField Molecule Component
 * Combines Input with label, help text, and validation display
 */
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      label,
      helpText,
      required = false,
      error,
      layout = 'vertical',
      labelWidth = 'w-32',
      className = '',
      'data-testid': testId,
      children,
      ...inputProps
    },
    ref
  ) => {
    const fieldId = inputProps.id || `field-${Math.random().toString(36).substr(2, 9)}`;
    const helpId = helpText ? `${fieldId}-help` : undefined;
    const errorId = error ? `${fieldId}-error` : undefined;

    // Combine aria-describedby for screen readers
    const ariaDescribedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

    const containerClasses = `
    ${layout === 'horizontal' ? 'flex items-start gap-4' : 'space-y-2'}
    ${className}
  `.trim();

    return (
      <motion.div
        ref={ref}
        className={containerClasses}
        data-testid={testId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Label */}
        {label && (
          <label
            htmlFor={fieldId}
            className={`
            flex items-center gap-1 text-sm font-semibold text-white
            ${layout === 'horizontal' ? labelWidth : ''}
          `}
          >
            <span>{label}</span>
            {required && (
              <span className="text-red-400" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {/* Input container */}
        <div className="flex-1">
          {/* Custom input or default Input component */}
          {children ? (
            React.cloneElement(children as React.ReactElement, {
              id: fieldId,
              'aria-describedby': ariaDescribedBy,
              required,
              ...inputProps,
            })
          ) : (
            <Input
              {...inputProps}
              id={fieldId}
              aria-describedby={ariaDescribedBy}
              required={required}
              error={error}
            />
          )}

          {/* Help text */}
          {helpText && (
            <motion.div
              id={helpId}
              className="mt-2 flex items-start gap-2 text-sm text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Icon name="info" size="xs" className="mt-0.5 flex-shrink-0" />
              <span>{helpText}</span>
            </motion.div>
          )}

          {/* Error message */}
          {error && (
            <motion.div
              id={errorId}
              className="mt-2 flex items-start gap-2 text-sm text-red-400"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              role="alert"
              aria-live="polite"
            >
              <Icon name="error" size="xs" className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }
);

FormField.displayName = 'FormField';

// Compound component pattern for complex forms
export const FormFieldGroup = forwardRef<
  HTMLDivElement,
  BaseComponentProps & {
    title?: string;
    description?: string;
    children: React.ReactNode;
  }
>(({ title, description, children, className = '', 'data-testid': testId }, ref) => {
  return (
    <motion.div
      ref={ref}
      className={`space-y-4 p-4 rounded-lg bg-white/5 border border-white/10 ${className}`}
      data-testid={testId}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Group header */}
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-bold text-white mb-1">{title}</h3>}
          {description && <p className="text-sm text-gray-400">{description}</p>}
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
});

FormFieldGroup.displayName = 'FormFieldGroup';

export default FormField;
