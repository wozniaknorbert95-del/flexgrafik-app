import { AppData, NotificationHistory, CustomRule } from '../types';
// AI motivation temporarily disabled
// import { generateMotivation } from './aiMotivation';
// Voice notifications temporarily disabled
// import { createVoiceNotify } from './voiceUtils';
import { handleError, safeEvalCondition } from './errorHandler';

// Anti-spam tracking for notifications
const recentNotifications = new Map<string, number>();

// Notification center class
class NotificationCenter {
  private appData: AppData;
  private updateData: (updater: (prev: AppData) => AppData) => void;
  private voiceNotify: (text: string, priority?: 'normal' | 'urgent' | 'critical') => void;

  constructor(appData: AppData, updateData: (updater: (prev: AppData) => AppData) => void) {
    this.appData = appData;
    this.updateData = updateData;
    this.voiceNotify = () => {}; // Voice notifications disabled
  }

  // Send notification through unified system
  async send(type: NotificationHistory['type'], message: string, ruleId?: string) {
    // ANTI-SPAM: Check if identical notification was sent recently (5 seconds)
    const key = `${type}:${message}`;
    const lastSent = recentNotifications.get(key) || 0;
    const now = Date.now();

    if (now - lastSent < 30000) {
      console.log('🚫 Spam detected, skipping notification:', message);
      return;
    }

    recentNotifications.set(key, now);

    console.log(`📢 Notification: ${type} - ${message}`);

    // Add to history
    const notification: NotificationHistory = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      ruleId,
    };

    this.updateData((prev) => ({
      ...prev,
      notificationHistory: [notification, ...prev.notificationHistory.slice(0, 49)], // Keep last 50
    }));

    // Handle voice notifications
    if (this.appData.settings.voice.enabled) {
      const priority = type === 'stuck' || type === 'deadline' ? 'urgent' : 'normal';
      this.voiceNotify(message, priority);
    }

    // Handle AI responses for certain types (simplified)
    if (type === 'stuck') {
      setTimeout(() => {
        const motivationMessages = [
          'Wierz w siebie! Masz umiejętności, żeby to dokończyć.',
          'Jesteś tak blisko! Zrób jeszcze jeden krok.',
          'Pomyśl o satysfakcji z ukończenia tego zadania.',
          'Zasługujesz na sukces - do dzieła!',
        ];
        const randomMessage =
          motivationMessages[Math.floor(Math.random() * motivationMessages.length)];
        this.send('ai', `🤖 AI Coach: ${randomMessage}`, ruleId);
      }, 1000); // Small delay for better UX
    }

    // Show visual alert for critical notifications
    if (type === 'stuck' || type === 'deadline') {
      // This will be handled by the UI components that show alerts
    }
  }

  // Evaluate custom rules (simplified - main logic moved to App.tsx with cooldown)
  async evaluateRules() {
    // This method is now handled by App.tsx with proper cooldown protection
    // to prevent infinite loops. Individual rule execution still happens here.
    console.log('📋 Rule evaluation requested (handled by App.tsx)');
  }

  // Execute rule action
  private async executeRuleAction(rule: CustomRule) {
    let message = rule.message;

    // Handle AI-generated messages
    if (
      rule.action === 'ai_voice' &&
      this.appData.settings.ai.enabled &&
      this.appData.settings.ai.apiKey
    ) {
      const aiPrompt = rule.message.startsWith('AI: ') ? rule.message.substring(4) : rule.message;

      message = await generateMotivation(
        aiPrompt.includes('stuck project')
          ? this.appData.pillars.find((p) => p.ninety_percent_alert)?.name || ''
          : 'general',
        aiPrompt.includes('stuck project')
          ? this.appData.pillars.find((p) => p.ninety_percent_alert)?.days_stuck || 0
          : 0,
        this.appData
      ).catch((error) => {
        handleError(error, {
          component: 'NotificationCenter',
          action: 'executeRuleAction',
          userMessage: 'Przepraszam, AI jest niedostępne. Spróbuj ponownie później.',
          shouldShowToUser: false,
        });
        return 'Przepraszam, AI jest niedostępne. Spróbuj ponownie później.';
      });
    }

    // Execute the action
    switch (rule.action) {
      case 'voice':
        this.voiceNotify(message, 'normal');
        break;

      case 'ai_voice':
        this.voiceNotify(message, 'normal');
        break;

      case 'notification':
        // For now, just log - UI components handle visual notifications
        console.log(`🔔 Notification: ${message}`);
        break;

      case 'block_action':
        // This would need to be handled by the UI components
        console.log(`🚫 Block action: ${message}`);
        break;
    }

    // Send through notification center for history
    this.send('custom', message, rule.id);
  }
}

// Export singleton factory
let notificationCenterInstance: NotificationCenter | null = null;

export const getNotificationCenter = (
  appData: AppData,
  updateData: (updater: (prev: AppData) => AppData) => void
) => {
  if (!notificationCenterInstance) {
    notificationCenterInstance = new NotificationCenter(appData, updateData);
  }
  return notificationCenterInstance;
};
