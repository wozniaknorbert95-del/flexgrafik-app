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
 * Centralized notification and rule evaluation system
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

    const completedDays = data.sprint.progress.filter((d) => d.checked).length;
    const totalDays = data.sprint.progress.length;
    const completionPercent = (completedDays / totalDays) * 100;

    // If sprint is more than 5 days in and completion < 70%, warn
    if (completedDays >= 5 && completionPercent < 70) {
      notificationCenter.send(
        'deadline',
        `Warning: Sprint ends in ${totalDays - completedDays} days, only ${Math.round(100 - completionPercent)}% tasks remaining.`,
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

    data.customRules.forEach((rule) => {
      if (!rule.active) return;

      // Anti-spam: Check cooldown (60 seconds)
      const lastExec = lastRuleExecution.current[rule.id] || 0;
      if (now - lastExec < 60000) {
        console.log(
          `⏸️ Rule "${rule.name}" on cooldown (${Math.round((60000 - (now - lastExec)) / 1000)}s left)`
        );
        return;
      }

      // Only evaluate if rule should trigger (basic check for performance)
      let shouldTrigger = false;

      try {
        switch (rule.trigger) {
          case 'time':
            const currentTime = `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`;
            shouldTrigger = rule.condition === currentTime;
            break;

          case 'data':
            // Skip complex evaluation for now - will be handled by notificationCenter
            shouldTrigger = false; // Let notificationCenter handle data-based rules
            break;

          case 'manual':
            // Manual rules are triggered by user actions
            shouldTrigger = false;
            break;
        }

        if (shouldTrigger) {
          console.log(`🎯 Rule triggered: ${rule.name}`);

          // Update cooldown timestamp BEFORE executing action
          lastRuleExecution.current[rule.id] = now;

          // Use notificationCenter for consistent execution
          notificationCenter.executeRuleAction?.(rule);
        }
      } catch (error) {
        console.error(`❌ Rule "${rule.name}" failed:`, error);
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
