import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../contexts/AppContext';
import { generateDailyPriority } from '../utils/dailyPriority';

const TodayPremium: React.FC = () => {
  console.log('🎯 TodayPremium: Component loaded');
  const { data, normalizedData, handleToggleTask, setCurrentView } = useAppContext();
  console.log('📊 Today data check:', {
    dataExists: !!data,
    pillarsExist: !!data?.pillars,
    pillarsLength: data?.pillars?.length || 0,
  });

  // Phase 2: Use normalized data if available, fallback to legacy
  const useNormalized = normalizedData !== null;

  console.log('📋 Today using data format:', useNormalized ? 'NORMALIZED' : 'LEGACY');

  // TEMPORARILY DISABLED: Phase 3 optimistic UI - causing runtime errors
  // TODO: Re-enable after fixing NormalizedSelectors import issues
  const isTaskPending = useCallback((taskId: string) => {
    return false; // Always return false until optimistic UI is fixed
  }, []);

  // Memoize expensive daily priority computation
  const dailyPriority = useMemo(() => generateDailyPriority(data), [data.pillars, data.sprint]);

  // TEMPORARILY DISABLED: Phase 2C normalized data - causing runtime errors
  // TODO: Fix NormalizedSelectors import issues in production build
  const todayTasks = useMemo(() => {
    return data.pillars
      .flatMap((pillar) =>
        pillar.tasks.filter((task) => task.progress < 100).map((task) => ({ ...task, pillar }))
      )
      .slice(0, 5);
  }, [data.pillars]);

  // Phase 3: Async toggle handler with optimistic UI
  const handleToggle = useCallback(
    async (taskId: number) => {
      console.log('🎯 TodayPremium: handleToggle called with taskId:', taskId);
      try {
        console.log('🔄 Calling handleToggleTask with:', taskId);
        await handleToggleTask(taskId);
        console.log('✅ handleToggleTask completed successfully');
      } catch (error) {
        console.error('❌ Failed to toggle task:', error);
        // Error already handled in context
      }
    },
    [handleToggleTask]
  );

  return (
    <div data-component="Today" className="min-h-screen pb-32 pt-8 px-6">
      {/* Header */}
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={() => setCurrentView('home')} className="btn-premium btn-cyan mb-8">
          ← Back
        </button>

        <div className="flex items-center gap-4 mb-4">
          <span className="text-6xl">📋</span>
          <h1 className="text-6xl font-extrabold uppercase tracking-wider text-gradient-gold">
            Today
          </h1>
        </div>
        <p className="text-sm text-gray-400 uppercase tracking-wider">/// Daily Task Focus</p>
      </motion.div>

      {/* Daily Priority */}
      {dailyPriority && (
        <motion.div
          className="widget-container-narrow mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="glass-card glass-card-magenta space-widget-lg">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-5xl neon-breath">🎯</span>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-glow-magenta mb-2">Priority Task</h2>
                <p className="text-sm text-gray-400">{dailyPriority.pillar.name}</p>
              </div>
            </div>

            <div className="bg-obsidian-light rounded-widget-sm p-6 mb-4">
              <h3 className="text-xl font-bold text-white mb-3">{dailyPriority.task.name}</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggle(dailyPriority.task.id)}
                  className={`w-8 h-8 rounded-widget-sm border-2 flex items-center justify-center transition-all ${
                    dailyPriority.task.progress >= 100
                      ? 'bg-neon-magenta border-neon-magenta shadow-glow-magenta'
                      : 'border-gray-600 hover:border-neon-magenta'
                  }`}
                >
                  {dailyPriority.task.progress >= 100 && (
                    <span className="text-black font-bold">✓</span>
                  )}
                </button>
                <span className="text-sm text-gray-400">Mark as complete</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 uppercase tracking-wider">
                Reason: {dailyPriority.reason}
              </span>
              <span className="text-glow-magenta font-bold">
                {dailyPriority.pillar.completion}%
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Today's Tasks */}
      <motion.div
        className="widget-container-narrow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-4 mb-8">
          <span className="text-3xl">✅</span>
          <h2 className="text-3xl font-bold uppercase tracking-wider text-gradient-neon">
            Open Tasks
          </h2>
          <span className="text-gray-500">({todayTasks.length})</span>
        </div>

        {todayTasks.length === 0 ? (
          <div className="glass-card space-widget-lg text-center">
            <span className="text-6xl mb-4 block">🎉</span>
            <h3 className="text-2xl font-bold text-white mb-3">All Clear!</h3>
            <p className="text-gray-400">No open tasks for today. Great work!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayTasks.map((task, index) => (
              <motion.div
                key={`${task.pillar.id}-${task.name}`}
                className="glass-card glass-card-cyan space-widget"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                whileHover={{ scale: 1.02, x: 4 }}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleToggle(task.id)}
                    disabled={false}
                    className={`w-10 h-10 rounded-lg border-3 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      task.progress >= 100
                        ? 'bg-gradient-to-br from-neon-cyan to-cyan-400 border-neon-cyan shadow-lg shadow-cyan-500/50'
                        : 'border-gray-300 hover:border-neon-cyan hover:shadow-lg hover:shadow-cyan-500/30 bg-white/5'
                    }`}
                  >
                    {task.progress >= 100 && (
                      <span className="text-black font-bold text-lg animate-pulse">✓</span>
                    )}
                    {task.progress < 100 && (
                      <span className="text-gray-400 text-xs opacity-60">○</span>
                    )}
                  </button>

                  <div className="flex-1">
                    <h3
                      className={`text-base font-medium mb-2 ${
                        task.progress >= 100 ? 'text-gray-500 line-through' : 'text-white'
                      }`}
                    >
                      {task.name}
                    </h3>

                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">{task.pillar.name}</span>
                      <span
                        className={`px-2 py-1 rounded-widget-sm text-xs font-bold uppercase ${
                          task.type === 'close'
                            ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                            : 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                        }`}
                      >
                        {task.type}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Progress Summary */}
      <motion.div
        className="widget-container-narrow mt-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="glass-card space-widget">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-glow-cyan mb-2">
                {todayTasks.filter((t) => t.progress >= 100).length}
              </div>
              <div className="text-xs uppercase tracking-wider text-gray-500">Completed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-glow-magenta mb-2">
                {todayTasks.filter((t) => t.progress < 100).length}
              </div>
              <div className="text-xs uppercase tracking-wider text-gray-500">Remaining</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gradient-gold mb-2">
                {todayTasks.length > 0
                  ? Math.round(
                      (todayTasks.filter((t) => t.progress >= 100).length / todayTasks.length) * 100
                    )
                  : 100}
                %
              </div>
              <div className="text-xs uppercase tracking-wider text-gray-500">Progress</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(TodayPremium);
