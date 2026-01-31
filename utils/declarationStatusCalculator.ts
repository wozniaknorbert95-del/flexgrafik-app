/**
 * Declaration Status Calculator
 *
 * Pure function to calculate declaration status based on current time and session state.
 * No side effects, fully testable.
 *
 * State Machine:
 * - pending -> active -> in_progress -> completed
 * - pending -> active -> failed
 * - Any state -> cancelled (explicit user action)
 */

import { Declaration, DeclarationStatus } from '../types';

export class DeclarationStatusCalculator {
  /**
   * Calculate current status of a declaration
   *
   * @param declaration - Declaration to evaluate
   * @param currentTime - Current time (defaults to now)
   * @param finishSessionActive - Whether Finish Mode session is active for this declaration
   * @returns Current declaration status
   */
  static calculate(
    declaration: Declaration,
    currentTime: Date = new Date(),
    finishSessionActive: boolean = false
  ): DeclarationStatus {
    // Handle terminal states (immutable once set)
    if (declaration.status === 'cancelled') return 'cancelled';
    if (declaration.completedAt) return 'completed';
    if (declaration.failedAt) return 'failed';

    // Parse time window
    const startMinutes = this.parseTime(declaration.timeWindow.start);
    const endMinutes = this.parseTime(declaration.timeWindow.end);
    const nowMinutes = this.getTimeOfDay(currentTime);

    // Handle midnight crossover (e.g., 23:00 - 01:00)
    const isOvernight = endMinutes < startMinutes;
    let isWithinWindow: boolean;

    if (isOvernight) {
      // Overnight window: either before midnight (now >= start) or after midnight (now <= end)
      isWithinWindow = nowMinutes >= startMinutes || nowMinutes <= endMinutes;
    } else {
      // Normal window: between start and end
      isWithinWindow = nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    }

    // State machine logic
    if (nowMinutes < startMinutes && !isOvernight) {
      return 'pending';
    }

    if (isWithinWindow) {
      return finishSessionActive ? 'in_progress' : 'active';
    }

    // Past end time
    if (nowMinutes > endMinutes && !isOvernight) {
      return 'failed';
    }

    // Overnight case: if we're past end and it's the next day
    if (isOvernight && nowMinutes > endMinutes) {
      // Check if we're still on the same day (rough check)
      // For precise handling, would need full date comparison
      return 'failed';
    }

    // Fallback to current status
    return declaration.status;
  }

  /**
   * Parse time string (HH:mm) to minutes since midnight
   *
   * @param timeStr - Time in "HH:mm" format
   * @returns Minutes since midnight (0-1439)
   */
  private static parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error(`Invalid time format: ${timeStr}. Expected HH:mm`);
    }
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error(`Invalid time values: ${timeStr}`);
    }
    return hours * 60 + minutes;
  }

  /**
   * Get time of day in minutes since midnight
   *
   * @param date - Date object
   * @returns Minutes since midnight (0-1439)
   */
  private static getTimeOfDay(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
  }

  /**
   * Check if declaration should be checked by agent
   *
   * @param declaration - Declaration to check
   * @param currentTime - Current time
   * @returns True if agent should evaluate this declaration
   */
  static shouldBeCheckedByAgent(declaration: Declaration, currentTime: Date = new Date()): boolean {
    const status = this.calculate(declaration, currentTime, false);
    // Check declarations that are active, in_progress, or recently failed
    return ['active', 'in_progress', 'failed'].includes(status);
  }

  /**
   * Get time until declaration becomes active
   *
   * @param declaration - Declaration to check
   * @param currentTime - Current time
   * @returns Minutes until active, or null if already active/past
   */
  static getMinutesUntilActive(
    declaration: Declaration,
    currentTime: Date = new Date()
  ): number | null {
    if (declaration.status === 'cancelled' || declaration.completedAt || declaration.failedAt) {
      return null;
    }

    const startMinutes = this.parseTime(declaration.timeWindow.start);
    const nowMinutes = this.getTimeOfDay(currentTime);

    if (nowMinutes >= startMinutes) {
      return null; // Already active or past
    }

    return startMinutes - nowMinutes;
  }
}
