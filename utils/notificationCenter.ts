import type { AppData, CustomRule, NotificationHistory } from '../types';
import {
  showError as showToastError,
  showInfo as showToastInfo,
  showSuccess as showToastSuccess,
  showWarning as showToastWarning,
} from './toastService';

// Anti-spam tracking for notifications
const recentNotifications = new Map<string, number>();

const NOTIFICATION_COOLDOWN_MS = 30_000; // 30s anti-spam window per identical message
const MAX_HISTORY = 50;

type NotificationType = NotificationHistory['type'];

const normalizeNotificationType = (type: unknown): NotificationType => {
  const t = String(type ?? '').trim();
  if (t === 'checkin') return 'checkin';
  if (t === 'stuck') return 'stuck';
  if (t === 'deadline') return 'deadline';
  if (t === 'ai') return 'ai';
  return 'custom';
};

// Notification center implementation (local-first, toast + history)
class NotificationCenterImpl {
  private updateData: (updater: (prev: AppData) => AppData) => void;
  private active: Map<string, NotificationHistory> = new Map();

  constructor(updateData: (updater: (prev: AppData) => AppData) => void) {
    this.updateData = updateData;
  }

  // Send notification through unified system (toast + persisted history)
  send(type: string, message: string, sourceId: string): void {
    const safeMessage = String(message ?? '').trim();
    const safeSourceId = String(sourceId ?? '').trim();
    if (!safeMessage || !safeSourceId) return;

    const normalizedType = normalizeNotificationType(type);

    // ANTI-SPAM: skip identical notification within cooldown window
    const key = `${normalizedType}:${safeMessage}`;
    const lastSent = recentNotifications.get(key) || 0;
    const now = Date.now();

    if (now - lastSent < NOTIFICATION_COOLDOWN_MS) return;

    recentNotifications.set(key, now);

    // Toast mapping (komunikaty po polsku przygotowuje caller; to jest tylko transport)
    if (normalizedType === 'deadline') showToastWarning(safeMessage, 6000);
    else if (normalizedType === 'stuck') showToastWarning(safeMessage, 7000);
    else if (normalizedType === 'checkin') showToastSuccess(safeMessage, 4000);
    else if (normalizedType === 'ai') showToastInfo(safeMessage, 6000);
    else showToastInfo(safeMessage, 5000);

    // Persist to history
    const notification: NotificationHistory = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: normalizedType,
      message: safeMessage,
      ruleId: safeSourceId,
    };

    this.updateData((prev) => ({
      ...prev,
      notificationHistory: [
        notification,
        ...(prev.notificationHistory ?? []).slice(0, MAX_HISTORY - 1),
      ],
    }));

    // Keep minimal \"active\" cache for future UI (currently unused)
    this.active.set(notification.id, notification);
  }

  dismiss(id: string): void {
    this.active.delete(id);
  }

  getActive(): NotificationHistory[] {
    return Array.from(this.active.values());
  }

  executeRuleAction(rule: CustomRule): void {
    try {
      const msg = String(rule?.message ?? '').trim();
      if (!rule || !rule.active || !msg) return;

      // Minimal, predictable behavior:
      // - voice / ai_voice currently have no voice output (by design), but still create a notification.
      // - notification: shows standard info toast
      // - block_action: treated as warning (\"deadline\" channel) to make it more visible
      const type: NotificationType =
        rule.action === 'block_action' ? 'deadline' : rule.action === 'ai_voice' ? 'ai' : 'custom';

      this.send(type, msg, rule.id);
    } catch (e) {
      // Never crash the app due to a notification action.
      showToastError('Nie udało się wykonać reguły powiadomienia.', 6000);
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('NotificationCenter.executeRuleAction failed:', e);
      }
    }
  }
}

// Export singleton factory
let notificationCenterInstance: NotificationCenterImpl | null = null;

export const getNotificationCenter = (
  _appData: AppData,
  updateData: (updater: (prev: AppData) => AppData) => void
) => {
  if (!notificationCenterInstance) {
    notificationCenterInstance = new NotificationCenterImpl(updateData);
  }
  return notificationCenterInstance;
};
