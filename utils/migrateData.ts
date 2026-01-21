import { Task } from '../types';
import { generateTaskId, calculateTaskStatus } from './taskHelpers';

export function migrateOldTasks(oldTasks: any[]): Task[] {
  return oldTasks.map(oldTask => ({
    id: oldTask.id || generateTaskId(),
    name: oldTask.name,
    type: oldTask.type,

    // Convert old boolean to progress
    progress: oldTask.done ? 100 : 0,
    priority: 'medium', // Default priority
    status: oldTask.done ? 'done' : 'not-started',

    dueDate: oldTask.dueDate,
    createdAt: oldTask.createdAt || new Date().toISOString(),
    completedAt: oldTask.done ? new Date().toISOString() : undefined
  }));
}

export function migrateOldPillarTasks(pillar: any): any {
  return {
    ...pillar,
    tasks: migrateOldTasks(pillar.tasks || [])
  };
}

export function migrateOldPhaseTasks(phase: any): any {
  return {
    ...phase,
    tasks: migrateOldTasks(phase.tasks || [])
  };
}

export function needsMigration(data: any): boolean {
  // Check if any task has old format (missing progress field)
  if (data.pillars) {
    return data.pillars.some((pillar: any) =>
      pillar.tasks && pillar.tasks.some((task: any) => !task.hasOwnProperty('progress'))
    );
  }
  return false;
}