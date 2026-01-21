import { Task, Pillar, AppData } from '../../types';
import { isTaskStuck, sortTasksByPriority } from '../../utils/taskHelpers';

interface DailyPriorityResult {
  task: Task;
  reason: string;
  pillar: Pillar;
  urgencyScore: number;
}

/**
 * AI-powered daily priority selection
 * Algorithm: Prioritize stuck tasks (80-99%) > high priority > overdue > oldest
 */
export function generateDailyPriority(appData: AppData): DailyPriorityResult | null {
  const allTasks: Array<{ task: Task; pillar: Pillar }> = [];

  // Collect all incomplete tasks
  appData.pillars.forEach(pillar => {
    pillar.phases.forEach(phase => {
      phase.tasks
        .filter(task => task.progress < 100)
        .forEach(task => allTasks.push({ task, pillar }));
    });
  });

  if (allTasks.length === 0) return null;

  // Score each task (higher = more urgent)
  const scored = allTasks.map(({ task, pillar }) => {
    let score = 0;
    let reason = '';

    // CRITICAL: Stuck at 80-99% (finish what you started!)
    if (isTaskStuck(task)) {
      score += 100;
      reason = `🎯 Stuck at ${task.progress}% - finish what you started!`;
    }

    // HIGH PRIORITY: Critical/High tasks
    if (task.priority === 'critical') {
      score += 50;
      reason = reason || '🔥 Critical priority task';
    } else if (task.priority === 'high') {
      score += 30;
      reason = reason || '⚡ High priority task';
    }

    // OVERDUE: Past due date
    if (task.dueDate && new Date(task.dueDate) < new Date()) {
      const daysOverdue = Math.floor(
        (Date.now() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      score += 40 + daysOverdue * 5;
      reason = reason || `⏰ ${daysOverdue} days overdue`;
    }

    // AGING: Older tasks get slight boost
    const ageInDays = Math.floor(
      (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    score += Math.min(ageInDays, 20); // Cap at 20 points

    // IN-PROGRESS: Slight boost for started tasks
    if (task.progress > 0 && task.progress < 80) {
      score += 10;
      reason = reason || `📈 In progress (${task.progress}%)`;
    }

    return {
      task,
      pillar,
      urgencyScore: score,
      reason: reason || '📝 Ready to start'
    };
  });

  // Return highest scoring task
  scored.sort((a, b) => b.urgencyScore - a.urgencyScore);
  return scored[0];
}

/**
 * Get top 3 priorities for "Today" view
 */
export function getTopPriorities(appData: AppData, count: number = 3): DailyPriorityResult[] {
  const allTasks: Array<{ task: Task; pillar: Pillar }> = [];

  appData.pillars.forEach(pillar => {
    pillar.phases.forEach(phase => {
      phase.tasks
        .filter(task => task.progress < 100)
        .forEach(task => allTasks.push({ task, pillar }));
    });
  });

  const scored = allTasks.map(({ task, pillar }) => {
    let score = 0;
    let reason = '';

    if (isTaskStuck(task)) {
      score += 100;
      reason = `Stuck at ${task.progress}%`;
    }

    if (task.priority === 'critical') score += 50;
    else if (task.priority === 'high') score += 30;

    if (task.dueDate && new Date(task.dueDate) < new Date()) {
      score += 40;
      reason = reason || 'Overdue';
    }

    return { task, pillar, urgencyScore: score, reason: reason || 'Ready to start' };
  });

  scored.sort((a, b) => b.urgencyScore - a.urgencyScore);
  return scored.slice(0, count);
}