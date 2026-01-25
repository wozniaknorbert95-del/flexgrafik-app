import { Task, TaskStatus, TaskPriority } from '../types';
import { analyzeTaskProgression } from './progressionInsights';
import { STUCK_THRESHOLD_DAYS, STUCK_PROGRESS_MIN, STUCK_PROGRESS_MAX } from './config';

export function calculateTaskStatus(progress: number): TaskStatus {
  return progress >= 100 ? 'done' : 'active';
}

export function isTaskStuck(task: Task): boolean {
  return task.status === 'stuck' || task.stuckAtNinety || (task.progress >= 90 && task.progress < 100);
}

/**
 * ADVANCED STUCK DETECTION - Core 90% Barrier Detection
 */
export function detectStuckAt90(task: Task): boolean {
  if (!task.lastProgressUpdate) return false;

  const daysSinceUpdate = daysBetween(task.lastProgressUpdate, new Date());
  return (
    task.progress >= STUCK_PROGRESS_MIN &&
    task.progress <= STUCK_PROGRESS_MAX &&
    daysSinceUpdate > STUCK_THRESHOLD_DAYS
  );
}

/**
 * Utility function for calculating days between dates
 */
export function daysBetween(dateString1: string, date2: Date): number {
  const date1 = new Date(dateString1);
  const diffTime = date2.getTime() - date1.getTime();
  return Math.floor(diffTime / (1000 * 3600 * 24));
}

/**
 * Get all stuck tasks from pillars
 */
export function getStuckTasks(pillars: any[]): any[] {
  const allTasks = pillars.flatMap((pillar) => pillar.tasks);
  return allTasks.filter((task) => {
    const insight = analyzeTaskProgression(task);
    return insight.isStuck;
  });
}

/**
 * Enhanced task update with progress history
 */
export function updateTaskProgressWithHistory(task: Task, newProgress: number): Task {
  const updatedProgress = Math.max(0, Math.min(100, newProgress));
  const now = new Date().toISOString();

  const nextStuckAtNinety =
    updatedProgress === 100
      ? false // Immediately clear stuck flag when task is completed
      : updatedProgress >= 90 && updatedProgress < 100
        ? detectStuckAt90({ ...task, progress: updatedProgress, lastProgressUpdate: now })
        : false; // Reset if moved out of stuck range

  const nextStatus: TaskStatus =
    updatedProgress === 100
      ? 'done'
      : task.status === 'abandoned'
        ? 'abandoned'
        : nextStuckAtNinety
          ? 'stuck'
          : 'active';

  return {
    ...task,
    progress: updatedProgress,
    lastProgressUpdate: now,
    stuckAtNinety: nextStuckAtNinety,
    status: nextStatus,
    completedAt: updatedProgress === 100 && !task.completedAt ? now : task.completedAt,
  };
}

export function sortTasksByPriority(tasks: Task[]): Task[] {
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export function generateTaskId(): number {
  return Date.now() + Math.floor(Math.random() * 1000000);
}

export function createNewTask(
  name: string,
  type: Task['type'],
  priority: TaskPriority = 'medium'
): Task {
  const now = new Date().toISOString();
  return {
    id: generateTaskId(),
    name,
    type,
    progress: 0,
    priority,
    status: 'active',
    createdAt: now,
    lastProgressUpdate: now,
    stuckAtNinety: false,
  };
}

export function updateTaskProgress(task: Task, newProgress: number): Task {
  const updatedProgress = Math.max(0, Math.min(100, newProgress));
  const now = new Date().toISOString();
  const nextStatus: TaskStatus =
    updatedProgress >= 100 ? 'done' : task.status === 'abandoned' ? 'abandoned' : 'active';

  return {
    ...task,
    progress: updatedProgress,
    status: nextStatus,
    completedAt: updatedProgress >= 100 && !task.completedAt ? now : task.completedAt,
  };
}

export function updateTaskPriority(task: Task, priority: TaskPriority): Task {
  return {
    ...task,
    priority,
  };
}

export function updateTaskDueDate(task: Task, dueDate?: string): Task {
  return {
    ...task,
    dueDate,
  };
}

export function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  return new Date(task.dueDate) < new Date() && task.status !== 'done';
}

export function getTaskAgeInDays(task: Task): number {
  const created = new Date(task.createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export function getTasksNeedingAttention(tasks: Task[]): Task[] {
  return tasks.filter(
    (task) =>
      task.status === 'stuck' ||
      task.stuckAtNinety ||
      (task.progress >= 80 && task.progress < 100) ||
      (task.priority === 'critical' && task.status !== 'done' && task.status !== 'abandoned') ||
      isTaskOverdue(task)
  );
}

export function getCompletionStats(tasks: Task[]): {
  total: number;
  completed: number;
  inProgress: number;
  stuck: number;
  averageProgress: number;
} {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'done').length;
  const stuck = tasks.filter((t) => t.status === 'stuck' || t.stuckAtNinety).length;
  const inProgress = tasks.filter((t) => t.status === 'active').length;
  const averageProgress =
    total > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / total) : 0;

  return { total, completed, inProgress, stuck, averageProgress };
}
