import { useState, useCallback, useMemo } from 'react';

/**
 * Validation rule types
 */
export type ValidationRule<T = any> = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | null;
  message?: string;
};

export type ValidationRules<T = any> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

export type ValidationErrors<T = any> = {
  [K in keyof T]?: string;
};

export type ValidationResult<T = any> = {
  isValid: boolean;
  errors: ValidationErrors<T>;
  firstError?: string;
};

/**
 * Custom hook for form validation
 * Provides comprehensive validation functionality with TypeScript support
 */
export const useFormValidation = <T extends Record<string, any>>(rules: ValidationRules<T>) => {
  const [errors, setErrors] = useState<ValidationErrors<T>>({});
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    (field: keyof T, value: any): string | null => {
      const fieldRules = rules[field];
      if (!fieldRules) return null;

      // Required validation
      if (fieldRules.required && (value === undefined || value === null || value === '')) {
        return fieldRules.message || `${String(field)} is required`;
      }

      // Skip other validations if value is empty and not required
      if (value === undefined || value === null || value === '') {
        return null;
      }

      const stringValue = String(value);

      // Length validations
      if (fieldRules.minLength && stringValue.length < fieldRules.minLength) {
        return (
          fieldRules.message ||
          `${String(field)} must be at least ${fieldRules.minLength} characters`
        );
      }

      if (fieldRules.maxLength && stringValue.length > fieldRules.maxLength) {
        return (
          fieldRules.message ||
          `${String(field)} must be no more than ${fieldRules.maxLength} characters`
        );
      }

      // Pattern validation
      if (fieldRules.pattern && !fieldRules.pattern.test(stringValue)) {
        return fieldRules.message || `${String(field)} format is invalid`;
      }

      // Custom validation
      if (fieldRules.custom) {
        return fieldRules.custom(value);
      }

      return null;
    },
    [rules]
  );

  /**
   * Validate all fields
   */
  const validateAll = useCallback(
    (values: T): ValidationResult<T> => {
      const newErrors: ValidationErrors<T> = {};
      let firstError: string | undefined;

      for (const field in rules) {
        const error = validateField(field, values[field]);
        if (error) {
          newErrors[field] = error;
          if (!firstError) firstError = error;
        }
      }

      const result: ValidationResult<T> = {
        isValid: Object.keys(newErrors).length === 0,
        errors: newErrors,
        firstError,
      };

      setErrors(newErrors);
      return result;
    },
    [rules, validateField]
  );

  /**
   * Validate a single field and update errors
   */
  const validateSingle = useCallback(
    (field: keyof T, value: any): string | null => {
      const error = validateField(field, value);

      setErrors((prev) => ({
        ...prev,
        [field]: error || undefined,
      }));

      return error;
    },
    [validateField]
  );

  /**
   * Mark field as touched
   */
  const touchField = useCallback((field: keyof T) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Clear error for specific field
   */
  const clearFieldError = useCallback((field: keyof T) => {
    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  }, []);

  /**
   * Get field error (only if touched)
   */
  const getFieldError = useCallback(
    (field: keyof T): string | undefined => {
      return touched[field] ? errors[field] : undefined;
    },
    [errors, touched]
  );

  /**
   * Check if form is valid
   */
  const isValid = useMemo(() => {
    return Object.values(errors).every((error) => !error);
  }, [errors]);

  /**
   * Get all current errors
   */
  const getAllErrors = useCallback(() => errors, [errors]);

  /**
   * Validate form on submit
   */
  const validateOnSubmit = useCallback(
    (values: T): boolean => {
      const result = validateAll(values);
      // Mark all fields as touched
      const allTouched = Object.keys(rules).reduce(
        (acc, field) => {
          acc[field as keyof T] = true;
          return acc;
        },
        {} as Record<keyof T, boolean>
      );
      setTouched(allTouched);

      return result.isValid;
    },
    [validateAll, rules]
  );

  /**
   * Reset validation state
   */
  const reset = useCallback(() => {
    setErrors({});
    setTouched({} as Record<keyof T, boolean>);
  }, []);

  return {
    errors,
    touched,
    isValid,
    validateField,
    validateAll,
    validateSingle,
    validateOnSubmit,
    touchField,
    clearErrors,
    clearFieldError,
    getFieldError,
    getAllErrors,
    reset,
  };
};

/**
 * Common validation rules
 */
export const commonValidationRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },

  password: {
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  },

  phone: {
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    message: 'Please enter a valid phone number',
  },

  url: {
    pattern:
      /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    message: 'Please enter a valid URL',
  },
};

/**
 * Create validation rules helper
 */
export const createValidationRules = <T extends Record<string, any>>(config: {
  [K in keyof T]?: ValidationRule<T[K]> | boolean; // boolean for required only
}): ValidationRules<T> => {
  const rules: ValidationRules<T> = {};

  for (const [field, ruleConfig] of Object.entries(config)) {
    if (typeof ruleConfig === 'boolean') {
      rules[field as keyof T] = { required: ruleConfig };
    } else {
      rules[field as keyof T] = ruleConfig;
    }
  }

  return rules;
};

export default useFormValidation;
