/**
 * Komponent deklaracji.
 *
 * Pokazuje deklaracje z Protokołu Wieczornego na pulpicie.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Declaration, Pillar, Task, GoalAgent, EveningProtocol, FinishSession } from '../types';
import { DeclarationStatusCalculator } from '../utils/declarationStatusCalculator';
import { PenaltyCalculator } from '../utils/penaltyCalculator';
import { getTodayDate, getTomorrowDate, formatDateHuman } from '../utils/dateHelpers';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PlayCircle,
  Flag,
  X,
  Moon,
  ArrowRight,
} from 'lucide-react';
import { EmptyState } from './common/EmptyState';
import { ConfirmDialog } from './common/ConfirmDialog';

interface DeclarationsDisplayProps {
  declarations: Declaration[];
  protocols: EveningProtocol[];
  goals: Pillar[];
  currentFinishSession: FinishSession | null;
  onStartFinishSession: (taskId: number, goalId: number) => void;
  onNavigateToFinish: () => void;
  goalAgents?: Record<number, GoalAgent>;
  onCancelDeclaration?: (declarationId: string) => void;
}

const DeclarationsDisplayComponent: React.FC<DeclarationsDisplayProps> = ({
  declarations,
  protocols,
  goals,
  currentFinishSession,
  onStartFinishSession,
  onNavigateToFinish,
  goalAgents = {},
  onCancelDeclaration,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [pendingCancelDeclarationId, setPendingCancelDeclarationId] = useState<string | null>(null);

  // Update time every minute for real-time status
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Get today's declarations
  const todaysDeclarations = useMemo(() => {
    const today = getTodayDate();

    // Find protocol for today OR tomorrow (if user planned ahead)
    // Priority: today first, then tomorrow
    const todayProtocol = protocols.find((p) => p.targetDate === today && p.status === 'completed');
    const tomorrowProtocol = protocols.find((p) => {
      const tomorrow = getTomorrowDate();
      return p.targetDate === tomorrow && p.status === 'completed';
    });

    // Use today's protocol if exists, otherwise use tomorrow's
    const activeProtocol = todayProtocol || tomorrowProtocol;
    if (!activeProtocol) {
      return [];
    }

    // Get declarations from protocol
    const protocolDeclarations = declarations.filter((d) => d.protocolId === activeProtocol.id);

    // Calculate current status for each declaration
    return protocolDeclarations
      .map((declaration) => {
        const isFinishSessionActive =
          currentFinishSession?.taskId === declaration.taskId &&
          currentFinishSession?.status === 'in_progress';

        const currentStatus = DeclarationStatusCalculator.calculate(
          declaration,
          currentTime,
          isFinishSessionActive
        );

        // Get goal and task info
        const goal = goals.find((g) => g.id === declaration.goalId);
        const task = goal?.tasks?.find((t) => t.id === declaration.taskId);

        // Get agent info
        const agent = goalAgents[declaration.goalId];
        const penalty =
          agent && declaration.status === 'failed'
            ? PenaltyCalculator.calculate(
                declaration,
                agent.config,
                agent.state.consecutiveFailures
              )
            : null;

        return {
          declaration,
          currentStatus,
          goal,
          task,
          agent,
          penalty,
          isFinishSessionActive,
        };
      })
      .filter((item) => item.goal && item.task); // Only show if goal and task exist
  }, [declarations, protocols, goals, currentTime, currentFinishSession, goalAgents]);

  // Get active protocol for display
  const activeProtocol = useMemo(() => {
    const today = getTodayDate();
    const tomorrow = getTomorrowDate();
    const todayProtocol = protocols.find((p) => p.targetDate === today && p.status === 'completed');
    const tomorrowProtocol = protocols.find(
      (p) => p.targetDate === tomorrow && p.status === 'completed'
    );
    return todayProtocol || tomorrowProtocol || null;
  }, [protocols]);

  // Group by status
  const groupedDeclarations = useMemo(() => {
    const groups: Record<string, typeof todaysDeclarations> = {
      pending: [],
      active: [],
      in_progress: [],
      completed: [],
      failed: [],
      cancelled: [],
    };

    todaysDeclarations.forEach((item) => {
      const status = item.currentStatus;
      if (groups[status]) {
        groups[status].push(item);
      }
    });

    return groups;
  }, [todaysDeclarations]);

  // Cancel declaration handler
  const handleCancelDeclaration = (declarationId: string) => {
    if (onCancelDeclaration) {
      onCancelDeclaration(declarationId);
    }
  };

  // Get status icon and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'Oczekuje' };
      case 'active':
        return { icon: PlayCircle, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Aktywna' };
      case 'in_progress':
        return { icon: Flag, color: 'text-neon-cyan', bg: 'bg-neon-cyan/20', label: 'W trakcie' };
      case 'completed':
        return {
          icon: CheckCircle2,
          color: 'text-green-400',
          bg: 'bg-green-500/20',
          label: 'Ukończona',
        };
      case 'failed':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Nieudana' };
      case 'cancelled':
        return { icon: X, color: 'text-gray-500', bg: 'bg-gray-600/20', label: 'Anulowana' };
      default:
        return { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-500/20', label: status };
    }
  };

  // Get minutes until active
  const getTimeUntilActive = (declaration: Declaration) => {
    const minutes = DeclarationStatusCalculator.getMinutesUntilActive(declaration, currentTime);
    if (minutes === null) return null;

    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  if (todaysDeclarations.length === 0) {
    return (
      <motion.div
        className="widget-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ConfirmDialog
          isOpen={isCancelConfirmOpen}
          title="Anulować deklarację?"
          description="Anulowane deklaracje nie będą karane przez agenta. Tej operacji nie da się cofnąć."
          confirmLabel="Anuluj deklarację"
          cancelLabel="Wróć"
          tone="danger"
          onCancel={() => {
            setIsCancelConfirmOpen(false);
            setPendingCancelDeclarationId(null);
          }}
          onConfirm={async () => {
            if (!pendingCancelDeclarationId) {
              setIsCancelConfirmOpen(false);
              return;
            }
            handleCancelDeclaration(pendingCancelDeclarationId);
            const { showSuccess } = await import('../utils/toastService');
            showSuccess('Deklaracja anulowana', 3000);
            setIsCancelConfirmOpen(false);
            setPendingCancelDeclarationId(null);
          }}
        />

        <div className="flex items-center gap-4 mb-6">
          <span className="text-4xl">📋</span>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-neon-cyan">
              Dzisiejsze deklaracje
            </h2>
          </div>
        </div>

        <div className="glass-card p-8" style={{ borderRadius: '16px' }}>
          <EmptyState
            icon={Moon}
            title="Zaplanuj jutro wieczorem"
            description="Protokół wieczorny pomaga zaplanować zadania na jutro. Wieczorem wybierasz zadania, ustawiasz okna czasowe i definiujesz kryteria ukończenia. Rano widzisz jasny plan działania."
            illustration="🌙"
            primaryAction={{
              label: 'Zaplanuj jutro →',
              onClick: onNavigateToFinish,
              icon: ArrowRight,
            }}
            secondaryAction={
              process.env.NODE_ENV === 'development' && protocols.length > 0
                ? {
                    label: `Debug: ${protocols.length} protokołów`,
                    onClick: () => {
                      // eslint-disable-next-line no-console
                      console.log(
                        '🔍 Available protocols:',
                        protocols.map((p) => ({
                          targetDate: p.targetDate,
                          status: p.status,
                          declarationsCount: p.declarations?.length || 0,
                        }))
                      );
                    },
                  }
                : undefined
            }
          />
        </div>

        <div className="glass-card p-6 text-center text-gray-400">
          <p>Nie masz jeszcze deklaracji na dzisiaj.</p>
          <p className="text-sm mt-2">
            Utwórz protokół wieczorny, aby zaplanować zadania na jutro.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="widget-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        title="Anulować deklarację?"
        description="Anulowane deklaracje nie będą karane przez agenta. Tej operacji nie da się cofnąć."
        confirmLabel="Anuluj deklarację"
        cancelLabel="Wróć"
        tone="danger"
        onCancel={() => {
          setIsCancelConfirmOpen(false);
          setPendingCancelDeclarationId(null);
        }}
        onConfirm={async () => {
          if (!pendingCancelDeclarationId) {
            setIsCancelConfirmOpen(false);
            return;
          }
          handleCancelDeclaration(pendingCancelDeclarationId);
          const { showSuccess } = await import('../utils/toastService');
          showSuccess('Deklaracja anulowana', 3000);
          setIsCancelConfirmOpen(false);
          setPendingCancelDeclarationId(null);
        }}
      />

      <div className="flex items-center gap-4 mb-6">
        <span className="text-4xl">📋</span>
        <div className="flex-1">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-neon-cyan">
            Dzisiejsze deklaracje
            {activeProtocol && activeProtocol.targetDate !== getTodayDate() && (
              <span className="ml-2 text-sm text-gray-400 font-normal normal-case">
                (z protokołu na {formatDateHuman(activeProtocol.targetDate)})
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-300 mt-1">
            Zadania zadeklarowane w wieczornym protokole • {todaysDeclarations.length}{' '}
            {todaysDeclarations.length === 1 ? 'deklaracja' : 'deklaracji'}
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          <button onClick={onNavigateToFinish} className="btn-premium btn-magenta">
            🏁 Tryb Domykania
          </button>
          <button onClick={onNavigateToFinish} className="btn-premium btn-cyan">
            🌙 Protokół wieczorny
          </button>
        </div>
      </div>

      <div className="glass-card p-6" style={{ borderRadius: '16px' }}>
        <div className="space-y-4">
          {/* Active/In Progress (priority) */}
          {[...groupedDeclarations.active, ...groupedDeclarations.in_progress].map((item) => {
            const statusInfo = getStatusInfo(item.currentStatus);
            const StatusIcon = statusInfo.icon;

            return (
              <motion.div
                key={item.declaration.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="border-2 border-neon-cyan/30 rounded-lg p-4 bg-neon-cyan/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color} font-semibold`}
                      >
                        {statusInfo.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.declaration.timeWindow.start} - {item.declaration.timeWindow.end}
                      </span>
                    </div>

                    <div className="text-white font-bold text-lg mb-1">{item.task?.name}</div>

                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <span>📍 {item.goal?.name}</span>
                      {item.declaration.doneCriteria.length > 0 && (
                        <span>
                          • {item.declaration.doneCriteria.filter((c) => c.completed).length}/
                          {item.declaration.doneCriteria.length} DONE
                        </span>
                      )}
                    </div>

                    {item.penalty && item.penalty.points > 0 && (
                      <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded mt-2">
                        {PenaltyCalculator.getPenaltyMessage(item.penalty, item.goal?.name || '')}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {onCancelDeclaration &&
                      (item.currentStatus === 'pending' || item.currentStatus === 'active') && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setPendingCancelDeclarationId(item.declaration.id);
                            setIsCancelConfirmOpen(true);
                          }}
                          className="btn-premium btn-gray flex-shrink-0 text-xs"
                          title="Anuluj deklarację"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    <button
                      onClick={() => {
                        if (item.task && item.goal) {
                          onStartFinishSession(item.task.id, item.goal.id);
                          onNavigateToFinish();
                        }
                      }}
                      className="btn-premium btn-magenta flex-shrink-0"
                      disabled={
                        item.currentStatus === 'completed' ||
                        item.currentStatus === 'failed' ||
                        item.currentStatus === 'cancelled' ||
                        !item.task ||
                        !item.goal
                      }
                    >
                      {item.isFinishSessionActive ? '▶ Kontynuuj' : '🏁 Start'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Pending */}
          {groupedDeclarations.pending.map((item) => {
            const statusInfo = getStatusInfo(item.currentStatus);
            const StatusIcon = statusInfo.icon;
            const timeUntil = getTimeUntilActive(item.declaration);

            return (
              <motion.div
                key={item.declaration.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="border border-gray-700 rounded-lg p-4 bg-gray-800/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color} font-semibold`}
                      >
                        {statusInfo.label}
                      </span>
                      {timeUntil && <span className="text-xs text-gray-400">Za {timeUntil}</span>}
                    </div>

                    <div className="text-white font-semibold mb-1">{item.task?.name}</div>

                    <div className="text-sm text-gray-400">
                      📍 {item.goal?.name} • {item.declaration.timeWindow.start} -{' '}
                      {item.declaration.timeWindow.end}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Completed */}
          {groupedDeclarations.completed.map((item) => {
            const statusInfo = getStatusInfo(item.currentStatus);
            const StatusIcon = statusInfo.icon;

            return (
              <motion.div
                key={item.declaration.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="border border-green-700/30 rounded-lg p-4 bg-green-500/5 opacity-75"
              >
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                  <div className="flex-1">
                    <div className="text-white font-semibold line-through">{item.task?.name}</div>
                    <div className="text-xs text-gray-400">📍 {item.goal?.name} • Ukończone</div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Failed */}
          {groupedDeclarations.failed.map((item) => {
            const statusInfo = getStatusInfo(item.currentStatus);
            const StatusIcon = statusInfo.icon;

            return (
              <motion.div
                key={item.declaration.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="border border-red-700/30 rounded-lg p-4 bg-red-500/10"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color} font-semibold`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="text-white font-semibold mb-1">{item.task?.name}</div>

                    <div className="text-sm text-gray-400 mb-2">
                      📍 {item.goal?.name} • {item.declaration.timeWindow.start} -{' '}
                      {item.declaration.timeWindow.end}
                    </div>

                    {item.penalty && item.penalty.points > 0 && (
                      <div className="text-xs text-red-400 bg-red-500/20 p-2 rounded">
                        {PenaltyCalculator.getPenaltyMessage(item.penalty, item.goal?.name || '')}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Cancelled */}
          {groupedDeclarations.cancelled.map((item) => {
            const statusInfo = getStatusInfo(item.currentStatus);
            const StatusIcon = statusInfo.icon;

            return (
              <motion.div
                key={item.declaration.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="border border-gray-700/30 rounded-lg p-4 bg-gray-800/20 opacity-60"
              >
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                  <div className="flex-1">
                    <div className="text-white font-semibold line-through text-gray-500">
                      {item.task?.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      📍 {item.goal?.name} • Anulowana przez użytkownika
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

// Memoize to prevent unnecessary re-renders
export const DeclarationsDisplay = React.memo(
  DeclarationsDisplayComponent,
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.declarations === nextProps.declarations &&
      prevProps.protocols === nextProps.protocols &&
      prevProps.goals === nextProps.goals &&
      prevProps.currentFinishSession?.id === nextProps.currentFinishSession?.id &&
      prevProps.currentFinishSession?.status === nextProps.currentFinishSession?.status &&
      JSON.stringify(prevProps.goalAgents) === JSON.stringify(nextProps.goalAgents)
    );
  }
);
