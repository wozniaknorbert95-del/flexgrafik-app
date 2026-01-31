/**
 * Toast Service - Global toast notification service
 *
 * Can be used outside React components (in utils, services, etc.)
 * Registers callback from ToastProvider to show toasts.
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastCallback = (message: string, type: ToastType, duration?: number) => void;

let toastCallback: ToastCallback | null = null;

/**
 * Register toast callback from ToastProvider
 * Called once when ToastProvider mounts
 */
export const registerToastCallback = (callback: ToastCallback) => {
  toastCallback = callback;
};

/**
 * Unregister toast callback
 * Called when ToastProvider unmounts
 */
export const unregisterToastCallback = () => {
  toastCallback = null;
};

/**
 * Show toast notification
 *
 * @param message - Toast message
 * @param type - Toast type (default: 'info')
 * @param duration - Auto-dismiss timeout in ms (default: 5000, 0 = no auto-dismiss)
 */
export const showToast = (
  message: string,
  type: ToastType = 'info',
  duration: number = 5000
): void => {
  if (toastCallback) {
    toastCallback(message, type, duration);
  } else {
    // Fallback to console in development (for debugging)
    if (process.env.NODE_ENV === 'development') {
      const emoji = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️',
      }[type];
      console.log(`${emoji} [Toast ${type}]: ${message}`);
    }
  }
};

/**
 * Show success toast
 */
export const showSuccess = (message: string, duration?: number): void => {
  showToast(message, 'success', duration);
};

/**
 * Show error toast
 */
export const showError = (message: string, duration?: number): void => {
  showToast(message, 'error', duration);
};

/**
 * Show info toast
 */
export const showInfo = (message: string, duration?: number): void => {
  showToast(message, 'info', duration);
};

/**
 * Show warning toast
 */
export const showWarning = (message: string, duration?: number): void => {
  showToast(message, 'warning', duration);
};
