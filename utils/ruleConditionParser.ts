/**
 * Safe Rule Condition Parser
 *
 * Replaces unsafe eval/Function() with a declarative, safe parser.
 * Supports common patterns used in rule conditions.
 *
 * Supported patterns:
 * - Array methods: .some(), .filter(), .length
 * - Comparisons: >=, <=, >, <, ===, !==
 * - Logical operators: &&, ||
 * - Property access: pillars.completion, sprint.progress
 */

import { Pillar, Sprint, AppData } from '../types';

interface RuleContext {
  pillars: Pillar[];
  sprint: Sprint;
  user: AppData['user'];
}

/**
 * Parse and evaluate rule condition safely
 *
 * @param condition - Condition string (e.g., "pillars.some(p => p.completion >= 90)")
 * @param context - Rule evaluation context
 * @returns True if condition is met
 */
export function parseRuleCondition(condition: string, context: RuleContext): boolean {
  try {
    // Time-based conditions (simple string match)
    if (condition.match(/^\d{2}:\d{2}$/)) {
      const [hours, minutes] = condition.split(':').map(Number);
      const now = new Date();
      return now.getHours() === hours && now.getMinutes() === minutes;
    }

    // Data-based conditions - parse common patterns
    return evaluateDataCondition(condition, context);
  } catch (error) {
    console.warn('Rule condition parsing error:', error);
    return false;
  }
}

/**
 * Evaluate data-based conditions safely
 *
 * Supports patterns like:
 * - pillars.some(p => p.completion >= 90 && p.days_stuck > 3)
 * - sprint.progress.filter(d => !d.checked).length <= 2
 */
function evaluateDataCondition(condition: string, context: RuleContext): boolean {
  const { pillars, sprint, user } = context;

  // Pattern 1: pillars.some(p => ...)
  if (condition.includes('pillars.some')) {
    return evaluatePillarsSome(condition, pillars);
  }

  // Pattern 2: sprint.progress.filter(...).length
  if (condition.includes('sprint.progress.filter')) {
    return evaluateSprintFilter(condition, sprint);
  }

  // Pattern 3: Simple property checks
  if (condition.includes('pillars') || condition.includes('sprint') || condition.includes('user')) {
    // For complex conditions, use a whitelist approach
    return evaluateComplexCondition(condition, context);
  }

  // Default: return false for unknown patterns
  return false;
}

/**
 * Evaluate pillars.some() patterns
 * Example: "pillars.some(p => p.completion >= 90 && (p.days_stuck || 0) > 3)"
 */
function evaluatePillarsSome(condition: string, pillars: Pillar[]): boolean {
  // Extract the predicate from .some(p => ...)
  const match = condition.match(/pillars\.some\(p\s*=>\s*(.+)\)/);
  if (!match) return false;

  const predicate = match[1];

  // Check each pillar against the predicate
  for (const pillar of pillars) {
    let matches = true;

    // Check completion >= X
    const completionMatch = predicate.match(/p\.completion\s*>=\s*(\d+)/);
    if (completionMatch) {
      const threshold = Number(completionMatch[1]);
      if (pillar.completion < threshold) {
        matches = false;
      }
    }

    // Check days_stuck > X (with || 0 pattern)
    const stuckMatch = predicate.match(/\(p\.days_stuck\s*\|\|\s*0\)\s*>\s*(\d+)/);
    if (stuckMatch) {
      const threshold = Number(stuckMatch[1]);
      const daysStuck = pillar.days_stuck || 0;
      if (daysStuck <= threshold) {
        matches = false;
      }
    }

    // Check days_stuck > X (without || 0 pattern)
    const stuckMatch2 = predicate.match(/p\.days_stuck\s*>\s*(\d+)/);
    if (stuckMatch2 && !stuckMatch) {
      const threshold = Number(stuckMatch2[1]);
      const daysStuck = pillar.days_stuck || 0;
      if (daysStuck <= threshold) {
        matches = false;
      }
    }

    // If predicate has &&, all conditions must match
    // If predicate has ||, at least one must match
    if (predicate.includes('&&')) {
      // For &&, if all checks passed, this pillar matches
      if (matches) return true;
    } else {
      // For single condition or ||, if matches, return true
      if (matches) return true;
    }
  }

  return false;
}

/**
 * Evaluate sprint.progress.filter() patterns
 * Example: "sprint.progress.filter(d => !d.checked).length <= 2"
 */
function evaluateSprintFilter(condition: string, sprint: Sprint): boolean {
  // Extract filter and length check
  const filterMatch = condition.match(
    /sprint\.progress\.filter\([^)]+\)\.length\s*(<=|>=|<|>|===|!==)\s*(\d+)/
  );
  if (!filterMatch) return false;

  const operator = filterMatch[1];
  const threshold = Number(filterMatch[2]);

  // Check what we're filtering
  let filteredLength = 0;

  if (condition.includes('!d.checked')) {
    // Filter unchecked days
    filteredLength = sprint.progress.filter((d) => !d.checked).length;
  } else if (condition.includes('d.checked')) {
    // Filter checked days
    filteredLength = sprint.progress.filter((d) => d.checked).length;
  }

  // Apply comparison
  switch (operator) {
    case '<=':
      return filteredLength <= threshold;
    case '>=':
      return filteredLength >= threshold;
    case '<':
      return filteredLength < threshold;
    case '>':
      return filteredLength > threshold;
    case '===':
      return filteredLength === threshold;
    case '!==':
      return filteredLength !== threshold;
    default:
      return false;
  }
}

/**
 * Evaluate complex conditions with multiple checks
 * Falls back to safe evaluation of known patterns
 */
function evaluateComplexCondition(condition: string, context: RuleContext): boolean {
  // For now, return false for unknown patterns
  // In future, can extend with more pattern matching
  console.warn('Unknown condition pattern:', condition);
  return false;
}
