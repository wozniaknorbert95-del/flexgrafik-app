import { useState, useCallback, useEffect } from 'react';
import { AppData, CustomRule } from '../types';
import { handleError } from '../utils/errorHandler';

interface NotificationCenter {
  send: (type: string, message: string, id: string) => void;
}

const RULE_COOLDOWN_MS = 60000; // 1 minute between rule triggers

/**
 * Custom hook for evaluating custom rules with anti-spam cooldown
 * Prevents rules from triggering too frequently
 */
export function useRuleEvaluation(data: AppData, notificationCenter: NotificationCenter | null) {
  const [lastRuleExecution, setLastRuleExecution] = useState<Record<string, number>>({});

  const evaluateRulesWithCooldown = useCallback(() => {
    if (!notificationCenter) return;

    const now = Date.now();

    data.customRules.forEach((rule) => {
      if (!rule.active) return;

      const lastExecution = lastRuleExecution[rule.id] || 0;
      const timeSinceLastExecution = now - lastExecution;

      // Anti-spam: Skip if executed recently
      if (timeSinceLastExecution < RULE_COOLDOWN_MS) {
        return;
      }

      // Evaluate condition
      try {
        let shouldTrigger = false;

        if (rule.trigger === 'time') {
          // Simple time-based conditions
          const hour = new Date().getHours();
          if (rule.condition.includes('morning') && hour >= 6 && hour < 12) {
            shouldTrigger = true;
          } else if (rule.condition.includes('evening') && hour >= 18 && hour < 22) {
            shouldTrigger = true;
          }
        } else if (rule.trigger === 'data') {
          // Data-based conditions (e.g., stuck projects)
          const stuckProjects = data.pillars.filter(
            (p) => p.completion >= 80 && p.completion < 100 && p.days_stuck && p.days_stuck > 3
          );

          if (rule.condition.includes('stuck') && stuckProjects.length > 0) {
            shouldTrigger = true;
          }
        }

        // Trigger action if condition met
        if (shouldTrigger) {
          if (rule.action === 'voice' || rule.action === 'ai_voice') {
            notificationCenter.send('custom', rule.message, rule.id);
          }

          // Update last execution time
          setLastRuleExecution((prev) => ({
            ...prev,
            [rule.id]: now,
          }));
        }
      } catch (error) {
        handleError(error, {
          component: 'useRuleEvaluation',
          action: 'evaluateRule',
          userMessage: `Rule evaluation failed for: ${rule.name}`,
        });
      }
    });
  }, [data, notificationCenter, lastRuleExecution]);

  // Auto-evaluate rules every minute
  useEffect(() => {
    const interval = setInterval(evaluateRulesWithCooldown, 60000);
    return () => clearInterval(interval);
  }, [evaluateRulesWithCooldown]);

  return {
    evaluateRules: evaluateRulesWithCooldown,
    lastRuleExecution,
  };
}
