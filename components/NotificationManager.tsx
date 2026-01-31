import React, { useEffect, useCallback, useRef } from 'react';
import { AppData, NotificationCenter } from '../types';
import { NotificationManager as InAppNotificationManager } from './InAppNotification';

interface NotificationManagerProps {
  data: AppData;
  notificationCenter: NotificationCenter | null;
  currentView: string;
  setCurrentView: (view: string) => void;
  isLoaded: boolean;
}

/**
 * Centralny system powiadomień i ewaluacji reguł.
 */
export const NotificationManager: React.FC<NotificationManagerProps> = ({
  data,
  notificationCenter,
  currentView,
  setCurrentView,
  isLoaded,
}) => {
  const lastRuleExecution = useRef<Record<string, number>>({});

  // Sprint deadline warning effect
  useEffect(() => {
    if (!isLoaded || !notificationCenter) return;

    const progress = data?.sprint?.progress ?? [];
    if (!Array.isArray(progress) || progress.length === 0) return;

    const completedDays = progress.filter((d) => d.checked).length;
    const totalDays = progress.length;
    if (totalDays <= 0) return;

    const completionPercent = (completedDays / totalDays) * 100;

    // If sprint is more than 5 days in and completion < 70%, warn
    if (completedDays >= 5 && completionPercent < 70) {
      notificationCenter.send(
        'deadline',
        `Uwaga: sprint kończy się za ${Math.max(0, totalDays - completedDays)} dni. Masz odhaczone tylko ${Math.round(
          completionPercent
        )}%.`,
        'sprint_deadline_warning'
      );
    }
  }, [data.sprint.progress, isLoaded, notificationCenter]);

  // Finish Mode notification effect
  useEffect(() => {
    if (currentView === 'finish' && notificationCenter) {
      // Could add specific finish mode notifications here
    }
  }, [currentView, notificationCenter]);

  // Rule evaluation system - check every minute for time-based rules
  const evaluateRulesWithCooldown = useCallback(() => {
    if (!notificationCenter) return;

    const now = Date.now();

    const rules = Array.isArray(data?.customRules) ? data.customRules : [];

    rules.forEach((rule) => {
      if (!rule.active) return;

      // Anti-spam: Check cooldown (60 seconds)
      const lastExec = lastRuleExecution.current[rule.id] || 0;
      if (now - lastExec < 60000) return;

      // Only evaluate if rule should trigger (basic check for performance)
      let shouldTrigger = false;

      try {
        switch (rule.trigger) {
          case 'time':
            const d = new Date();
            const currentTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            shouldTrigger = rule.condition === currentTime;
            break;

          case 'data':
            // Pomijamy złożoną ewaluację danych — obsłuży to docelowo warstwa reguł.
            shouldTrigger = false; // Let notificationCenter handle data-based rules
            break;

          case 'manual':
            // Reguły manualne są uruchamiane przez akcje użytkownika.
            shouldTrigger = false;
            break;
        }

        if (shouldTrigger) {
          // Update cooldown timestamp BEFORE executing action
          lastRuleExecution.current[rule.id] = now;

          // Use notificationCenter for consistent execution
          notificationCenter.executeRuleAction(rule);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error(`Reguła "${rule.name}" nie zadziałała:`, error);
        }
        // Disable broken rules automatically to prevent spam
        // This would need to be handled by parent component
      }
    });
  }, [data.customRules, notificationCenter]);

  // Rule evaluation interval
  useEffect(() => {
    if (!isLoaded) return;

    const ruleInterval = setInterval(() => {
      evaluateRulesWithCooldown();
    }, 60000); // Check every minute

    // Initial evaluation
    evaluateRulesWithCooldown();

    return () => clearInterval(ruleInterval);
  }, [isLoaded, evaluateRulesWithCooldown]);

  return <InAppNotificationManager onNavigateToFinish={() => setCurrentView('finish')} />;
};
