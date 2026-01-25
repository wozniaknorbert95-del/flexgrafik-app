import React, { forwardRef, useId } from 'react';
import { Input } from '../atoms/Input';
import { useFieldA11y, useAnnouncer } from '../../hooks/useAccessibility';
import { ComponentSize } from '../../types/components';

export interface AccessibleFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  description?: string;
  help?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  size?: ComponentSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: string) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  validator?: (value: string) => string | null;
  'data-testid'?: string;
}

/**
 * Accessible Form Field Component
 * Fully accessible form input with proper labeling, validation, and error handling
 */
export const AccessibleField = forwardRef<HTMLInputElement, AccessibleFieldProps>(
  (
    {
      label,
      name,
      type = 'text',
      value,
      defaultValue,
      placeholder,
      description,
      help,
      error,
      required = false,
      disabled = false,
      readOnly = false,
      size = 'md',
      leftIcon,
      rightIcon,
      className = '',
      onChange,
      onValueChange,
      onFocus,
      onBlur,
      validator,
      'data-testid': testId,
    },
    ref
  ) => {
    const fieldId = useId();
    const { announce } = useAnnouncer();

    // Get accessibility props
    const { fieldProps, labelProps, descriptionProps, errorProps, helpProps } = useFieldA11y({
      label,
      description,
      error,
      help,
      required,
      disabled,
    });

    // Handle validation with announcements
    const handleValidation = (inputValue: string) => {
      if (validator) {
        const validationError = validator(inputValue);
        if (validationError) {
          announce(`Validation error: ${validationError}`, 'assertive');
        }
        return validationError;
      }
      return null;
    };

    // Enhanced change handler with accessibility announcements
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;

      // Call original handler
      onChange?.(event);
      onValueChange?.(newValue);

      // Announce character count for long inputs
      if (newValue.length > 50) {
        const remaining = 200 - newValue.length;
        if (remaining > 0) {
          announce(`${remaining} characters remaining`, 'polite');
        } else {
          announce('Character limit exceeded', 'assertive');
        }
      }
    };

    // Enhanced focus handler
    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      // Announce field context
      const contextMessage = [
        required && 'Required field',
        description && description,
        help && help,
      ]
        .filter(Boolean)
        .join('. ');

      if (contextMessage) {
        announce(`${label}. ${contextMessage}`, 'polite');
      }

      onFocus?.(event);
    };

    // Enhanced blur handler for validation
    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      const value = event.target.value;

      // Validate on blur
      if (value && validator) {
        const validationError = validator(value);
        if (validationError) {
          announce(`Error: ${validationError}`, 'assertive');
        }
      }

      onBlur?.(event);
    };

    return (
      <div className={`field ${className}`} role="group" aria-labelledby={labelProps.id}>
        {/* Label */}
        <label {...labelProps} htmlFor={fieldId} className="label">
          {label}
          {required && (
            <span className="required-indicator" aria-label="required">
              *
            </span>
          )}
        </label>

        {/* Input */}
        <Input
          ref={ref}
          id={fieldId}
          name={name}
          type={type}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          size={size}
          leftIcon={leftIcon}
          rightIcon={rightIcon}
          error={error}
          validator={handleValidation}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-labelledby={fieldProps['aria-labelledby']}
          aria-describedby={fieldProps['aria-describedby']}
          aria-required={fieldProps['aria-required']}
          aria-invalid={fieldProps['aria-invalid']}
          data-testid={testId}
        />

        {/* Description */}
        {description && (
          <div {...descriptionProps} className="field-description">
            {description}
          </div>
        )}

        {/* Help Text */}
        {help && !error && (
          <div {...helpProps} className="field-help">
            {help}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div {...errorProps} className="field-error">
            <span aria-hidden="true">⚠️</span>
            {error}
          </div>
        )}
      </div>
    );
  }
);

AccessibleField.displayName = 'AccessibleField';

export default AccessibleField;
