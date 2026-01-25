// Custom hooks barrel export
export { useTaskActions } from './useTaskActions';
export { useNavigation } from './useNavigation';
export {
  useFormValidation,
  commonValidationRules,
  createValidationRules,
  type ValidationRule,
  type ValidationRules,
  type ValidationErrors,
  type ValidationResult,
} from './useFormValidation';

// New state management hooks
export {
  useAPIQuery,
  useAPIMutation,
  apiUtils,
  type APIState,
  type APIOptions,
  type APIMutationOptions,
} from './useAPI';

export { useForm, formValidators, type FormOptions } from './useForm';

export {
  useLocalStorage,
  useLocalStorageSchema,
  useLocalStorageWithTTL,
  useLocalStorageStore,
  localStorageUtils,
  type LocalStorageOptions,
} from './useLocalStorage';

export {
  useDebounce,
  useDebouncedCallback,
  useDebouncedState,
  useDebouncedEffect,
  useDebouncedSearch,
  useDebouncedResize,
  useDebouncedScroll,
  debounceUtils,
  type DebounceOptions,
} from './useDebounce';
