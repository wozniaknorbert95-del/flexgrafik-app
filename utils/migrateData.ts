import { Task, TaskStatus } from '../types';
import { generateTaskId, calculateTaskStatus, detectStuckAt90 } from './taskHelpers';

export function migrateOldTasks(oldTasks: any[]): Task[] {
  return oldTasks.map((oldTask) => {
    const now = new Date().toISOString();
    const progress =
      typeof oldTask.progress === 'number' ? oldTask.progress : oldTask.done ? 100 : 0;

    const rawStatus = typeof oldTask.status === 'string' ? oldTask.status : '';
    const rawFinishStatus = typeof oldTask.finishStatus === 'string' ? oldTask.finishStatus : '';

    const isNewStatus = (s: string): s is TaskStatus =>
      s === 'active' || s === 'stuck' || s === 'done' || s === 'abandoned';

    let status: TaskStatus;
    if (isNewStatus(rawStatus)) {
      status = rawStatus;
    } else if (rawFinishStatus === 'done') {
      status = 'done';
    } else if (rawFinishStatus === 'stuck') {
      status = 'stuck';
    } else if (progress >= 100 || oldTask.done === true || rawStatus === 'done') {
      status = 'done';
    } else {
      status = calculateTaskStatus(progress); // active vs done fallback
    }

    const lastProgressUpdate = oldTask.lastProgressUpdate || oldTask.createdAt || now;
    const stuckAtNinety =
      progress >= 100
        ? false
        : typeof oldTask.stuckAtNinety === 'boolean'
          ? oldTask.stuckAtNinety
          : detectStuckAt90({
              id: oldTask.id || generateTaskId(),
              name: String(oldTask.name || ''),
              type: oldTask.type as any,
              progress,
              priority: oldTask.priority || 'medium',
              status: 'active',
              definitionOfDone:
                typeof oldTask.definitionOfDone === 'string' ? oldTask.definitionOfDone : '',
              stuckAtNinety: false,
              lastProgressUpdate,
              dueDate: oldTask.dueDate,
              createdAt: oldTask.createdAt || now,
              completedAt: oldTask.completedAt,
            } as Task);

    if (status !== 'done' && status !== 'abandoned' && stuckAtNinety) {
      status = 'stuck';
    }

    return {
      id: oldTask.id || generateTaskId(),
      name: oldTask.name,
      type: oldTask.type,

      // Task-level Definition of DONE (new field; safe default)
      definitionOfDone:
        typeof oldTask.definitionOfDone === 'string' ? oldTask.definitionOfDone : '',

      // Convert old boolean to progress
      progress,
      priority: oldTask.priority || 'medium', // Default priority
      status,

      // Core anti-90% tracking (safe defaults for older data)
      stuckAtNinety,
      lastProgressUpdate,

      dueDate: oldTask.dueDate,
      createdAt: oldTask.createdAt || now,
      completedAt: oldTask.completedAt || (progress === 100 ? now : undefined),
    };
  });
}

export function migrateOldPillarTasks(pillar: any): any {
  return {
    ...pillar,
    tasks: migrateOldTasks(pillar.tasks || []),
  };
}

export function migrateOldPhaseTasks(phase: any): any {
  return {
    ...phase,
    tasks: migrateOldTasks(phase.tasks || []),
  };
}

export function needsMigration(data: any): boolean {
  // Check if any task has old format (missing progress field)
  if (data.pillars) {
    return data.pillars.some(
      (pillar: any) =>
        pillar.tasks && pillar.tasks.some((task: any) => !task.hasOwnProperty('progress'))
    );
  }
  return false;
}
