import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppData, Task } from '../types';
import { GlassCard } from './ui/GlassCard';
import { PremiumButton } from './ui/PremiumButton';
import { ANIMATION_VARIANTS } from '../constants/design';

interface TodayProps {
  data: AppData;
  onToggleTask: (pillarId: number, taskName: string) => void;
  onStartTimer: () => void;
  isTimerRunning: boolean;
}

const Today: React.FC<TodayProps> = ({ data, onToggleTask, onStartTimer }) => {
  const stuckProjects = data.pillars.filter(p => p.ninety_percent_alert);
  const activeStuckProject = stuckProjects.length > 0 ? stuckProjects[0] : null;

  // Flatten tasks logic
  const allTasks = data.pillars.flatMap(p => 
    p.tasks.map(t => ({ ...t, pillarId: p.id, pillarName: p.name, isStuck: p.ninety_percent_alert }))
  );

  const mustCloseTasks = allTasks.filter(t => t.isStuck && t.progress < 100 && t.type === 'close');
  const otherTasks = allTasks.filter(t => !t.isStuck && t.progress < 100).slice(0, 3);

  return (
    <motion.div 
      className="pb-24 pt-6 px-6 max-w-2xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Premium Header */}
      <motion.div 
        className="mb-8"
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-widest mb-2">
          <span className="text-gradient-gold">Today</span>
        </h1>
        <p className="text-[var(--color-text-tertiary)] text-sm uppercase tracking-[0.3em] font-medium">
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </motion.div>

      {/* Critical Alert Section */}
      <AnimatePresence>
        {activeStuckProject && (
          <motion.div
            variants={ANIMATION_VARIANTS.fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <GlassCard 
              variant="gradient-border"
              className="p-6 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(0, 0, 0, 0.3) 100%)',
                borderColor: '#ef4444'
              }}
            >
              {/* Animated Warning Icon */}
              <motion.div 
                className="absolute top-4 right-4 text-6xl opacity-20"
                animate={{
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                🔥
              </motion.div>

              {/* Alert Header */}
              <div className="flex items-center gap-3 mb-4">
                <motion.div 
                  className="w-3 h-3 rounded-full bg-red-500"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.5, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <h2 className="text-red-400 font-bold text-sm uppercase tracking-[0.2em]">
                  🔴 Must Close (90% Stuck)
                </h2>
              </div>

              <h3 className="text-white font-bold text-2xl mb-6">{activeStuckProject.name}</h3>
              
              {/* Task List with Stagger */}
              <motion.div 
                className="space-y-3 mb-6"
                variants={ANIMATION_VARIANTS.staggerContainer}
                initial="initial"
                animate="animate"
              >
                {mustCloseTasks.length > 0 ? mustCloseTasks.map((task, idx) => (
                  <motion.div
                    key={`${task.pillarId}-${task.name}`}
                    variants={ANIMATION_VARIANTS.fadeInUp}
                    whileHover={{ x: 4 }}
                    className="glass-card p-4 cursor-pointer hover:bg-[var(--color-glass-medium)] transition-all"
                    onClick={() => onToggleTask(task.pillarId, task.name)}
                  >
                    <div className="flex items-start gap-3">
                      <motion.button 
                        className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          task.progress >= 100 
                            ? 'border-red-500 bg-red-500/20' 
                            : 'border-red-500/50 hover:border-red-500'
                        }`}
                        whileTap={{ scale: 0.9 }}
                      >
                        {task.progress >= 100 && (
                          <motion.div 
                            className="w-3 h-3 bg-red-500 rounded-sm"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500 }}
                          />
                        )}
                      </motion.button>
                      <span className="text-gray-200 text-sm font-medium flex-1">{task.name}</span>
                    </div>
                  </motion.div>
                )) : (
                  <motion.div
                    variants={ANIMATION_VARIANTS.fadeInUp}
                    className="text-center py-6"
                  >
                    <p className="text-green-400 text-lg font-bold mb-2">✅ All Critical Tasks Done!</p>
                    <p className="text-[var(--color-text-tertiary)] text-sm">Ready to close this project</p>
                  </motion.div>
                )}
              </motion.div>

              {/* Timer CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="text-xs text-red-300 mb-3 flex items-center gap-2">
                  <span>⏱️</span>
                  <span>Estimated: 2h final push</span>
                </div>
                <PremiumButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={onStartTimer}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  }}
                >
                  <span className="text-xl">⏱️</span>
                  <span>START 25min FOCUS</span>
                </PremiumButton>
              </motion.div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Build Tasks Section */}
      {!activeStuckProject && (
        <motion.div
          variants={ANIMATION_VARIANTS.fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-gradient-to-b from-[var(--color-accent-gold)] to-transparent rounded-full" />
            <h2 className="text-xl font-bold uppercase tracking-wider text-glow-gold">
              🟡 Build Tasks
            </h2>
          </div>

          <motion.div 
            className="space-y-4"
            variants={ANIMATION_VARIANTS.staggerContainer}
            initial="initial"
            animate="animate"
          >
            {otherTasks.map((task, idx) => (
              <motion.div
                key={`${task.pillarId}-${task.name}`}
                variants={ANIMATION_VARIANTS.fadeInUp}
              >
                <GlassCard
                  variant="hover-glow"
                  glowColor="gold"
                  className="p-5 cursor-pointer"
                  onClick={() => onToggleTask(task.pillarId, task.name)}
                  whileHover={{ x: 4 }}
                >
                  <div className="text-xs text-[var(--color-text-tertiary)] mb-2 uppercase tracking-wider">
                    {task.pillarName}
                  </div>
                  <div className="flex items-start gap-3">
                    <motion.button 
                      className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        task.progress >= 100 
                          ? 'border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/20' 
                          : 'border-[var(--color-accent-gold)]/50 hover:border-[var(--color-accent-gold)]'
                      }`}
                      whileTap={{ scale: 0.9 }}
                    >
                      {task.progress >= 100 && (
                        <motion.div 
                          className="w-3 h-3 bg-[var(--color-accent-gold)] rounded-sm"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 500 }}
                        />
                      )}
                    </motion.button>
                    <span className="text-white text-base font-medium flex-1">{task.name}</span>
                  </div>
                </GlassCard>
              </motion.div>
            ))}

            {otherTasks.length === 0 && (
              <motion.div
                variants={ANIMATION_VARIANTS.fadeInUp}
                className="text-center py-16"
              >
                <GlassCard className="p-8">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-[var(--color-text-secondary)] text-lg font-medium mb-2">
                    No Active Tasks
                  </p>
                  <p className="text-[var(--color-text-tertiary)] text-sm">
                    Add new tasks in your Projects
                  </p>
                </GlassCard>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Lockout Warning */}
      <AnimatePresence>
        {activeStuckProject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <GlassCard className="p-6 text-center border-2 border-dashed border-gray-700">
              <p className="text-[var(--color-text-tertiary)] text-sm mb-2 font-bold uppercase tracking-wider">
                ⚠️ LOCKOUT ACTIVE
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Can't add new tasks until "{activeStuckProject.name}" is BattleDone
              </p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default React.memo(Today);
