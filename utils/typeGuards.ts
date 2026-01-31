/**
 * Type Guards for Runtime Type Checking
 *
 * Ensures type safety when working with dynamic data from storage or API.
 * Used throughout the application to validate data before use.
 *
 * All guards follow the pattern: `obj is Type`
 * This allows TypeScript to narrow types after guard checks.
 */

import { Pillar, Task, Declaration, EveningProtocol, AppData, FinishSession } from '../types';

/**
 * Type guard for Pillar
 *
 * @param obj - Object to check
 * @returns True if obj is a valid Pillar
 */
export function isPillar(obj: unknown): obj is Pillar {
  if (!obj || typeof obj !== 'object') return false;

  const p = obj as Record<string, unknown>;

  return (
    typeof p.id === 'number' &&
    typeof p.name === 'string' &&
    Array.isArray(p.tasks) &&
    (p.status === 'in_progress' || p.status === 'not_started' || p.status === 'done')
  );
}

/**
 * Type guard for Task
 *
 * @param obj - Object to check
 * @returns True if obj is a valid Task
 */
export function isTask(obj: unknown): obj is Task {
  if (!obj || typeof obj !== 'object') return false;

  const t = obj as Record<string, unknown>;

  return (
    typeof t.id === 'number' &&
    typeof t.name === 'string' &&
    typeof t.progress === 'number' &&
    t.progress >= 0 &&
    t.progress <= 100 &&
    typeof t.status === 'string'
  );
}

/**
 * Type guard for Declaration
 *
 * @param obj - Object to check
 * @returns True if obj is a valid Declaration
 */
export function isDeclaration(obj: unknown): obj is Declaration {
  if (!obj || typeof obj !== 'object') return false;

  const d = obj as Record<string, unknown>;

  return (
    typeof d.id === 'string' &&
    typeof d.taskId === 'number' &&
    typeof d.goalId === 'number' &&
    d.timeWindow &&
    typeof (d.timeWindow as Record<string, unknown>).start === 'string' &&
    typeof (d.timeWindow as Record<string, unknown>).end === 'string'
  );
}

/**
 * Type guard for EveningProtocol
 *
 * @param obj - Object to check
 * @returns True if obj is a valid EveningProtocol
 */
export function isEveningProtocol(obj: unknown): obj is EveningProtocol {
  if (!obj || typeof obj !== 'object') return false;

  const p = obj as Record<string, unknown>;

  return (
    typeof p.id === 'string' &&
    typeof p.targetDate === 'string' &&
    typeof p.createdAt === 'string' &&
    Array.isArray(p.declarations) &&
    Array.isArray(p.implementationIntentions) &&
    Array.isArray(p.rules)
  );
}

/**
 * Type guard for FinishSession
 *
 * @param obj - Object to check
 * @returns True if obj is a valid FinishSession
 */
export function isFinishSession(obj: unknown): obj is FinishSession {
  if (!obj || typeof obj !== 'object') return false;

  const s = obj as Record<string, unknown>;

  return (
    typeof s.id === 'string' &&
    typeof s.taskId === 'number' &&
    typeof s.pillarId === 'number' &&
    typeof s.startTime === 'string' &&
    (s.endTime === null || typeof s.endTime === 'string') &&
    typeof s.status === 'string'
  );
}

/**
 * Type guard for AppData
 *
 * @param obj - Object to check
 * @returns True if obj is a valid AppData
 */
export function isValidAppData(obj: unknown): obj is AppData {
  if (!obj || typeof obj !== 'object') return false;

  const d = obj as Record<string, unknown>;

  return (
    d.user && typeof (d.user as Record<string, unknown>).id === 'string' && Array.isArray(d.pillars)
  );
}

/**
 * Type guard for array of Pillars
 *
 * @param arr - Array to check
 * @returns True if all elements are valid Pillars
 */
export function isPillarArray(arr: unknown): arr is Pillar[] {
  if (!Array.isArray(arr)) return false;
  return arr.every(isPillar);
}

/**
 * Type guard for array of Tasks
 *
 * @param arr - Array to check
 * @returns True if all elements are valid Tasks
 */
export function isTaskArray(arr: unknown): arr is Task[] {
  if (!Array.isArray(arr)) return false;
  return arr.every(isTask);
}

/**
 * Type guard for array of Declarations
 *
 * @param arr - Array to check
 * @returns True if all elements are valid Declarations
 */
export function isDeclarationArray(arr: unknown): arr is Declaration[] {
  if (!Array.isArray(arr)) return false;
  return arr.every(isDeclaration);
}

/**
 * Type guard for array of EveningProtocols
 *
 * @param arr - Array to check
 * @returns True if all elements are valid EveningProtocols
 */
export function isEveningProtocolArray(arr: unknown): arr is EveningProtocol[] {
  if (!Array.isArray(arr)) return false;
  return arr.every(isEveningProtocol);
}
