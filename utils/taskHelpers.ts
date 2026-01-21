import { Task, TaskStatus, TaskPriority } from '../types';

export function calculateTaskStatus(progress: number): TaskStatus {
  if (progress === 0) return 'not-started';
  if (progress < 80) return 'in-progress';
  if (progress < 100) return 'near-completion'; // Trigger alerts here
  return 'done';
}

export function isTaskStuck(task: Task): boolean {
  return task.progress >= 80 && task.progress < 100;
}

export function sortTasksByPriority(tasks: Task[]): Task[] {
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...tasks].sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}

export function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    status: 'not-started',
    createdAt: now
  };
}

export function updateTaskProgress(task: Task, newProgress: number): Task {
  const updatedProgress = Math.max(0, Math.min(100, newProgress));
  const status = calculateTaskStatus(updatedProgress);
  const now = new Date().toISOString();

  return {
    ...task,
    progress: updatedProgress,
    status,
    completedAt: status === 'done' && !task.completedAt ? now : task.completedAt
  };
}

export function updateTaskPriority(task: Task, priority: TaskPriority): Task {
  return {
    ...task,
    priority
  };
}

export function updateTaskDueDate(task: Task, dueDate?: string): Task {
  return {
    ...task,
    dueDate
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
  return tasks.filter(task =>
    task.status === 'near-completion' ||
    (task.priority === 'critical' && task.status !== 'done') ||
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
  const completed = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const stuck = tasks.filter(t => isTaskStuck(t)).length;
  const averageProgress = total > 0
    ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / total)
    : 0;

  return { total, completed, inProgress, stuck, averageProgress };
}