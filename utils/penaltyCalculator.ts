/**
 * Penalty Calculator
 *
 * Domain logic for calculating penalties based on declaration failures.
 * Pure functions, no side effects.
 */

import { Declaration, GoalAgent } from '../types';

export interface PenaltyCalculation {
  points: number;
  severity: 'none' | 'minor' | 'major' | 'critical';
  reason: string;
}

export class PenaltyCalculator {
  /**
   * Calculate penalty for a failed declaration
   *
   * @param declaration - Declaration that failed
   * @param agentConfig - Agent configuration
   * @param consecutiveFailures - Number of consecutive failures for this goal
   * @returns Penalty calculation result
   */
  static calculate(
    declaration: Declaration,
    agentConfig: GoalAgent['config'],
    consecutiveFailures: number
  ): PenaltyCalculation {
    // No penalty if declaration is not failed
    if (declaration.status !== 'failed') {
      return {
        points: 0,
        severity: 'none',
        reason: 'Declaration not failed',
      };
    }

    // Determine severity based on consecutive failures
    const severity = this.determineSeverity(consecutiveFailures, agentConfig);
    const basePoints = agentConfig.penaltyPointsPerFailure;

    let points = 0;
    let reason = '';

    switch (severity) {
      case 'minor':
        points = basePoints;
        reason = `Minor failure: ${consecutiveFailures} consecutive failure${consecutiveFailures > 1 ? 's' : ''}`;
        break;
      case 'major':
        points = basePoints * 2;
        reason = `Major failure: ${consecutiveFailures} consecutive failures - pattern detected`;
        break;
      case 'critical':
        points = basePoints * 3;
        reason = `Critical: ${consecutiveFailures} consecutive failures - significant accountability issue`;
        break;
      default:
        points = 0;
        reason = 'No penalty';
    }

    return { points, severity, reason };
  }

  /**
   * Determine severity level based on consecutive failures
   *
   * @param failures - Number of consecutive failures
   * @param config - Agent configuration with thresholds
   * @returns Severity level
   */
  private static determineSeverity(
    failures: number,
    config: GoalAgent['config']
  ): 'minor' | 'major' | 'critical' {
    if (failures >= config.severityThresholds.critical) {
      return 'critical';
    }
    if (failures >= config.severityThresholds.major) {
      return 'major';
    }
    if (failures >= config.severityThresholds.minor) {
      return 'minor';
    }
    return 'minor'; // Default to minor for any failure
  }

  /**
   * Calculate total penalty points for multiple failed declarations
   *
   * @param declarations - Array of failed declarations
   * @param agentConfig - Agent configuration
   * @param consecutiveFailures - Consecutive failures count
   * @returns Total penalty points
   */
  static calculateTotal(
    declarations: Declaration[],
    agentConfig: GoalAgent['config'],
    consecutiveFailures: number
  ): number {
    return declarations.reduce((total, declaration) => {
      const penalty = this.calculate(declaration, agentConfig, consecutiveFailures);
      return total + penalty.points;
    }, 0);
  }

  /**
   * Get penalty message for user
   *
   * @param penalty - Penalty calculation result
   * @param goalName - Name of the goal
   * @returns User-friendly message
   */
  static getPenaltyMessage(penalty: PenaltyCalculation, goalName: string): string {
    if (penalty.points === 0) {
      return '';
    }

    const severityEmoji = {
      minor: '⚠️',
      major: '🔴',
      critical: '🚨',
      none: '',
    };

    return `${severityEmoji[penalty.severity]} ${penalty.reason}. -${penalty.points} points from "${goalName}" reward.`;
  }
}
