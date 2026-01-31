/**
 * Goal/Pillar Helper Functions
 *
 * Centralized functions for filtering and manipulating Pillar/Goal data.
 * Reduces code duplication across components.
 */

import { Pillar } from '../types';
import { isPillar } from './typeGuards';

/**
 * Filter pillars that are not done
 *
 * @param pillars - Array of pillars to filter
 * @returns Array of pillars with status !== 'done'
 */
export function filterNotDonePillars(pillars: unknown[]): Pillar[] {
  return pillars.filter(isPillar).filter((p) => p.status !== 'done');
}

/**
 * Filter pillars that are done
 *
 * @param pillars - Array of pillars to filter
 * @returns Array of pillars with status === 'done'
 */
export function filterDonePillars(pillars: unknown[]): Pillar[] {
  return pillars.filter(isPillar).filter((p) => p.status === 'done');
}

/**
 * Filter active pillars (activation === 'active' or undefined)
 *
 * @param pillars - Array of pillars to filter
 * @returns Array of active pillars
 */
export function filterActivePillars(pillars: unknown[]): Pillar[] {
  return pillars.filter(isPillar).filter((p) => (p.activation ?? 'active') === 'active');
}

/**
 * Filter inactive/backlog pillars (activation !== 'active')
 *
 * @param pillars - Array of pillars to filter
 * @returns Array of inactive pillars
 */
export function filterInactivePillars(pillars: unknown[]): Pillar[] {
  return pillars.filter(isPillar).filter((p) => (p.activation ?? 'active') !== 'active');
}

/**
 * Filter active and not done pillars (most common combination)
 *
 * @param pillars - Array of pillars to filter
 * @returns Array of active, not-done pillars
 */
export function filterActiveNotDonePillars(pillars: unknown[]): Pillar[] {
  return filterNotDonePillars(pillars).filter((p) => (p.activation ?? 'active') === 'active');
}

/**
 * Filter pillars by status
 *
 * @param pillars - Array of pillars to filter
 * @param status - Status to filter by
 * @returns Array of pillars with matching status
 */
export function filterPillarsByStatus(pillars: unknown[], status: Pillar['status']): Pillar[] {
  return pillars.filter(isPillar).filter((p) => p.status === status);
}

/**
 * Get pillar type rank for sorting
 *
 * @param type - Pillar type
 * @returns Numeric rank (0 = main, 1 = secondary, 2 = lab, 3 = other)
 */
export function getPillarTypeRank(type: Pillar['type'] | undefined): number {
  if (type === 'main') return 0;
  if (type === 'secondary') return 1;
  if (type === 'lab') return 2;
  return 3;
}

/**
 * Sort pillars by type, completion, and last activity
 *
 * @param pillars - Array of pillars to sort
 * @returns Sorted array of pillars
 */
export function sortPillarsByPriority(pillars: Pillar[]): Pillar[] {
  return [...pillars].sort((a, b) => {
    // First by type
    const byType = getPillarTypeRank(a.type) - getPillarTypeRank(b.type);
    if (byType !== 0) return byType;

    // Then by completion (descending)
    const byCompletion = Number(b.completion ?? 0) - Number(a.completion ?? 0);
    if (byCompletion !== 0) return byCompletion;

    // Finally by last activity (descending)
    const aMs = new Date(a.last_activity_date ?? 0).getTime();
    const bMs = new Date(b.last_activity_date ?? 0).getTime();
    return (Number.isFinite(bMs) ? bMs : 0) - (Number.isFinite(aMs) ? aMs : 0);
  });
}

/**
 * Get count of active goals
 *
 * @param pillars - Array of pillars
 * @returns Number of active, not-done pillars
 */
export function getActiveGoalsCount(pillars: unknown[]): number {
  return filterActiveNotDonePillars(pillars).length;
}

/**
 * Get count of in-progress goals
 *
 * @param pillars - Array of pillars
 * @returns Number of pillars with status === 'in_progress'
 */
export function getInProgressGoalsCount(pillars: unknown[]): number {
  return filterPillarsByStatus(pillars, 'in_progress').length;
}
