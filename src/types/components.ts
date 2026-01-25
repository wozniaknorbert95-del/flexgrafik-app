// Shared component types for Atomic Design system

export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ComponentVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type ComponentState = 'idle' | 'loading' | 'error' | 'success' | 'disabled';

// Base component props interface
export interface BaseComponentProps {
  className?: string;
  'data-testid'?: string;
  children?: React.ReactNode;
}

// Loading state interface
export interface LoadingProps {
  isLoading?: boolean;
  loadingText?: string;
}

// Error state interface
export interface ErrorProps {
  error?: string | Error | null;
  onRetry?: () => void;
}

// Accessibility base interface
export interface AccessibilityProps {
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  role?: string;
}

// Focus management interface
export interface FocusProps {
  autoFocus?: boolean;
  tabIndex?: number;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void;
}

// Form field base interface
export interface FormFieldProps
  extends BaseComponentProps, LoadingProps, ErrorProps, AccessibilityProps, FocusProps {
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

// Compound component context type
export interface CompoundComponentContext<T = any> {
  register: (id: string, component: T) => void;
  unregister: (id: string) => void;
  getComponent: (id: string) => T | undefined;
  components: Record<string, T>;
}
