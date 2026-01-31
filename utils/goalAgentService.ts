/**
 * Goal Agent Service
 *
 * Service for monitoring declarations and applying penalties.
 * Runs periodic checks on declarations to detect failures and apply penalties.
 *
 * Architecture:
 * - Pure functions for agent logic
 * - Side effects isolated to update functions
 * - Testable and predictable
 */

import { Declaration, GoalAgent, AppData, AgentCheckRecord, AgentAction } from '../types';
import { DeclarationStatusCalculator } from './declarationStatusCalculator';
import { PenaltyCalculator } from './penaltyCalculator';
import { getTodayDate } from './dateHelpers';

/**
 * Check declarations for a specific goal
 *
 * @param declarations - All declarations to check
 * @param goalId - Goal ID to filter declarations
 * @param agent - Goal Agent configuration and state
 * @param currentTime - Current time for status calculation
 * @returns Agent check record with actions
 */
export function checkGoalDeclarations(
  declarations: Declaration[],
  goalId: number,
  agent: GoalAgent,
  currentTime: Date = new Date(),
  finishSessionActive: Map<number, boolean> = new Map()
): AgentCheckRecord {
  // Filter declarations for this goal
  const goalDeclarations = declarations.filter((d) => d.goalId === goalId);

  // Filter declarations that should be checked
  const declarationsToCheck = goalDeclarations.filter((d) =>
    DeclarationStatusCalculator.shouldBeCheckedByAgent(d, currentTime)
  );

  const actions: AgentAction[] = [];
  let failuresDetected = 0;
  let penaltiesApplied = 0;

  // Check each declaration
  for (const declaration of declarationsToCheck) {
    // Check if Finish Mode is active for this declaration's task
    const isSessionActive = finishSessionActive.get(declaration.taskId) || false;
    const currentStatus = DeclarationStatusCalculator.calculate(
      declaration,
      currentTime,
      isSessionActive
    );

    // Don't penalize if Finish Mode is active (user is working on it)
    if (isSessionActive) {
      continue;
    }

    // Detect failures
    if (currentStatus === 'failed' && declaration.status !== 'failed') {
      failuresDetected++;

      // Calculate penalty
      const penalty = PenaltyCalculator.calculate(
        { ...declaration, status: 'failed' },
        agent.config,
        agent.state.consecutiveFailures
      );

      if (penalty.points > 0) {
        penaltiesApplied++;

        actions.push({
          type: 'penalty',
          declarationId: declaration.id,
          points: penalty.points,
          reason: penalty.reason,
          timestamp: currentTime.toISOString(),
        });
      }
    }
  }

  return {
    timestamp: currentTime.toISOString(),
    declarationsChecked: declarationsToCheck.length,
    failuresDetected,
    penaltiesApplied,
    actions,
  };
}

/**
 * Update goal agent state after check
 *
 * @param agent - Current agent state
 * @param checkRecord - Result of agent check
 * @returns Updated agent state
 */
export function updateAgentState(agent: GoalAgent, checkRecord: AgentCheckRecord): GoalAgent {
  const totalPenalties = checkRecord.actions
    .filter((a) => a.type === 'penalty')
    .reduce((sum, a) => sum + a.points, 0);

  const newConsecutiveFailures =
    checkRecord.failuresDetected > 0
      ? agent.state.consecutiveFailures + checkRecord.failuresDetected
      : 0; // Reset if no failures

  return {
    ...agent,
    state: {
      ...agent.state,
      lastCheckAt: checkRecord.timestamp,
      totalPenaltiesApplied: agent.state.totalPenaltiesApplied + totalPenalties,
      consecutiveFailures: newConsecutiveFailures,
      status: agent.config.enabled ? 'active' : 'disabled',
    },
    history: [
      ...agent.state.history.slice(-29), // Keep last 30 days
      checkRecord,
    ],
  };
}

/**
 * Update declaration statuses based on current time
 *
 * @param declarations - Declarations to update
 * @param currentTime - Current time
 * @param finishSessionActive - Map of taskId -> isFinishSessionActive
 * @returns Updated declarations
 */
export function updateDeclarationStatuses(
  declarations: Declaration[],
  currentTime: Date = new Date(),
  finishSessionActive: Map<number, boolean> = new Map()
): Declaration[] {
  return declarations.map((declaration) => {
    // Skip terminal states
    if (declaration.status === 'cancelled' || declaration.completedAt || declaration.failedAt) {
      return declaration;
    }

    const isSessionActive = finishSessionActive.get(declaration.taskId) || false;
    const newStatus = DeclarationStatusCalculator.calculate(
      declaration,
      currentTime,
      isSessionActive
    );

    // Only update if status changed
    if (newStatus === declaration.status) {
      return declaration;
    }

    const updated: Declaration = {
      ...declaration,
      status: newStatus,
    };

    // Set timestamps for state transitions
    if (newStatus === 'in_progress' && !declaration.startedAt) {
      updated.startedAt = currentTime.toISOString();
    }

    if (newStatus === 'failed' && !declaration.failedAt) {
      updated.failedAt = currentTime.toISOString();
    }

    if (newStatus === 'completed' && !declaration.completedAt) {
      updated.completedAt = currentTime.toISOString();
    }

    return updated;
  });
}

/**
 * Apply agent penalties to declarations
 *
 * @param declarations - Declarations to update
 * @param actions - Agent actions (penalties)
 * @returns Updated declarations with penalty evaluations
 */
export function applyAgentPenalties(
  declarations: Declaration[],
  actions: AgentAction[]
): Declaration[] {
  const penaltyMap = new Map<string, AgentAction>();
  actions.filter((a) => a.type === 'penalty').forEach((a) => penaltyMap.set(a.declarationId, a));

  return declarations.map((declaration) => {
    const penalty = penaltyMap.get(declaration.id);
    if (!penalty) {
      return declaration;
    }

    // Update agent evaluation
    return {
      ...declaration,
      agentEvaluation: {
        checkedAt: penalty.timestamp,
        penaltyPoints: declaration.agentEvaluation.penaltyPoints + penalty.points,
        reason: penalty.reason,
        severity: penalty.points >= 15 ? 'critical' : penalty.points >= 10 ? 'major' : 'minor',
      },
    };
  });
}

/**
 * Run agent check for all active goals
 *
 * @param appData - Current app data
 * @param currentTime - Current time
 * @param finishSessionActive - Map of taskId -> isFinishSessionActive
 * @returns Updated app data with agent checks applied and list of penalty actions
 */
export function runAgentChecks(
  appData: AppData,
  currentTime: Date = new Date(),
  finishSessionActive: Map<number, boolean> = new Map()
): { updatedData: AppData; penaltyActions: AgentAction[] } {
  const goalAgents = appData.goalAgents || {};
  const declarations = appData.declarations || [];
  const today = getTodayDate();

  // Get today's declarations only
  const todayProtocols = (appData.eveningProtocols || []).filter(
    (p) => p.targetDate === today && p.status === 'completed'
  );
  const todayProtocolIds = new Set(todayProtocols.map((p) => p.id));
  const todayDeclarations = declarations.filter((d) => todayProtocolIds.has(d.protocolId));

  // Update declaration statuses first
  const updatedDeclarations = updateDeclarationStatuses(
    todayDeclarations,
    currentTime,
    finishSessionActive
  );

  // Check each goal agent
  const updatedAgents: Record<number, GoalAgent> = { ...goalAgents };
  const allActions: AgentAction[] = [];

  for (const [goalIdStr, agent] of Object.entries(goalAgents)) {
    const goalId = Number(goalIdStr);
    if (!agent.config.enabled || agent.state.status !== 'active') {
      continue;
    }

    // Run check
    const checkRecord = checkGoalDeclarations(
      updatedDeclarations,
      goalId,
      agent,
      currentTime,
      finishSessionActive
    );

    // Update agent state
    updatedAgents[goalId] = updateAgentState(agent, checkRecord);

    // Collect actions
    allActions.push(...checkRecord.actions);
  }

  // Apply penalties to declarations
  const finalDeclarations = applyAgentPenalties(updatedDeclarations, allActions);

  // Update AppData
  const updatedData: AppData = {
    ...appData,
    declarations: [
      ...declarations.filter((d) => !todayProtocolIds.has(d.protocolId)), // Keep other declarations
      ...finalDeclarations, // Updated today's declarations
    ],
    goalAgents: updatedAgents,
  };

  return {
    updatedData,
    penaltyActions: allActions.filter((a) => a.type === 'penalty'),
  };
}

/**
 * Check if agent should run check now
 *
 * @param agent - Goal Agent
 * @param currentTime - Current time
 * @returns True if check should run
 */
export function shouldRunAgentCheck(agent: GoalAgent, currentTime: Date = new Date()): boolean {
  if (!agent.config.enabled || agent.state.status !== 'active') {
    return false;
  }

  const lastCheck = agent.state.lastCheckAt ? new Date(agent.state.lastCheckAt).getTime() : 0;

  const now = currentTime.getTime();
  const intervalMs = agent.config.checkIntervalMinutes * 60 * 1000;

  return now - lastCheck >= intervalMs;
}
