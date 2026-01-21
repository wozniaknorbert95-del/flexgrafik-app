import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AppData, Pillar } from '../types';
import { generateDailyPriorities } from '../services/aiService';
import { useVoiceNotify } from '../utils/voiceUtils';
import { handleError, withErrorHandling } from '../utils/errorHandler';
import { generateDailyPriority } from '../utils/dailyPriority';
import { PremiumButton } from './ui/PremiumButton';
import { GlassCard } from './ui/GlassCard';
import { Skeleton } from './ui/Skeleton';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { ANIMATION_VARIANTS } from '../constants/design';

interface DashboardProps {
  data: AppData;
  onPillarClick: (id: number) => void;
  onAlertClick: (type: 'stuck' | 'checkin', projectId?: number) => void;
  setView?: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onPillarClick, onAlertClick, setView }) => {
  const stuckProjects = data.pillars.filter(p => p.ninety_percent_alert);
  const checkinNeeded = !data.user.last_checkin || new Date(data.user.last_checkin).getDate() !== new Date().getDate();
  const [aiLoading, setAiLoading] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const voiceNotify = useVoiceNotify(data.settings.voice);

  // AI-powered daily priority
  const dailyPriority = generateDailyPriority(data);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 't', action: () => setView?.('today'), description: 'Go to Today view' },
    { key: 's', action: () => setView?.('sprint'), description: 'Go to Sprint view' },
    { key: 'a', action: () => setView?.('ai_coach'), description: 'Open AI Coach' },
    { key: '?', shiftKey: true, action: () => setShowKeyboardHelp(true), description: 'Show shortcuts' }
  ]);

  const getStatusColor = (p: Pillar) => {
    if (p.ninety_percent_alert) return { border: 'border-red-500', text: 'text-red-400', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' };
    if (p.completion === 100) return { border: 'border-green-500', text: 'text-green-400', glow: '' };
    if (p.status === 'in_progress') return { border: 'border-[var(--color-accent-gold)]', text: 'text-[var(--color-accent-gold)]', glow: '' };
    return { border: 'border-gray-700', text: 'text-gray-500', glow: '' };
  };

  return (
    <motion.div 
      className="pb-24 pt-6 px-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Premium Header with Gold Gradient */}
      <motion.div 
        className="mb-8"
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
      >
        <h1 className="text-5xl md:text-6xl font-extrabold uppercase tracking-widest mb-3">
          <span className="text-gradient-gold">FlexGrafik</span>
        </h1>
        <p className="text-[var(--color-text-tertiary)] text-sm uppercase tracking-[0.3em] font-medium">
          Accountability OS • Premium Edition
        </p>
      </motion.div>

      {/* Primary CTA */}
      <motion.div 
        className="mb-8"
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
      >
        <PremiumButton
          variant="primary"
          size="lg"
          fullWidth
          glowColor="magenta"
          onClick={() => onPillarClick(stuckProjects.length > 0 ? stuckProjects[0].id : data.pillars[0]?.id)}
        >
          {dailyPriority ? (
            <>
              <span className="text-2xl">🎯</span>
              <span>Today's Priority: {dailyPriority.task.name}</span>
            </>
          ) : (
            <>
              <span className="text-2xl">⚡</span>
              <span>Start Your Day</span>
            </>
          )}
        </PremiumButton>
      </motion.div>

      {/* Alerts Section */}
      {(stuckProjects.length > 0 || checkinNeeded) && (
        <motion.div
          variants={ANIMATION_VARIANTS.fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <GlassCard variant="gradient-border" glowColor="magenta" className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <motion.div 
                className="w-3 h-3 rounded-full bg-[var(--color-accent-magenta)]"
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
              <h2 className="text-lg font-bold uppercase tracking-wider text-glow-magenta">
                Active Alerts
              </h2>
            </div>
            
            <motion.div 
              className="space-y-3"
              variants={ANIMATION_VARIANTS.staggerContainer}
              initial="initial"
              animate="animate"
            >
              {stuckProjects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  variants={ANIMATION_VARIANTS.fadeInUp}
                  className="glass-card p-4 cursor-pointer hover:bg-[var(--color-glass-medium)] transition-all"
                  onClick={() => onPillarClick(project.id)}
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <h3 className="font-semibold text-white">{project.name}</h3>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          Stuck at {project.completion}% • {project.days_stuck || 0} days
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-400">{project.completion}%</div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {checkinNeeded && (
                <motion.div
                  variants={ANIMATION_VARIANTS.fadeInUp}
                  className="glass-card p-4 cursor-pointer hover:bg-[var(--color-glass-medium)] transition-all"
                  onClick={() => onAlertClick('checkin')}
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📋</span>
                    <div>
                      <h3 className="font-semibold text-white">Daily Check-in Required</h3>
                      <p className="text-xs text-[var(--color-text-tertiary)]">
                        Keep your streak alive
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </GlassCard>
        </motion.div>
      )}

      {/* Projects Grid */}
      <motion.div
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-bold uppercase tracking-wider mb-6 text-glow-cyan">
          Projects
        </h2>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={ANIMATION_VARIANTS.staggerContainer}
          initial="initial"
          animate="animate"
        >
          {data.pillars.map((pillar) => {
            const status = getStatusColor(pillar);
            return (
              <motion.div
                key={pillar.id}
                variants={ANIMATION_VARIANTS.fadeInUp}
              >
                <GlassCard
                  variant="hover-glow"
                  glowColor="cyan"
                  className={`p-6 cursor-pointer ${status.glow}`}
                  onClick={() => onPillarClick(pillar.id)}
                  whileHover={{ y: -4 }}
                >
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold text-white uppercase tracking-wide">
                      {pillar.name}
                    </h3>
                    {pillar.ninety_percent_alert && (
                      <span className="px-2 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-bold uppercase">
                        Stuck
                      </span>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider">
                        Progress
                      </span>
                      <span className={`text-3xl font-bold ${status.text}`}>
                        {pillar.completion}%
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[var(--color-accent-cyan)] to-[var(--color-accent-magenta)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${pillar.completion}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                        style={{ 
                          boxShadow: '0 0 10px var(--color-accent-cyan)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Tasks Count */}
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
                    <span>{pillar.tasks.length} tasks</span>
                    <span className="uppercase tracking-wider">{pillar.status}</span>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowKeyboardHelp(false)}
        >
          <motion.div
            className="glass-card p-8 max-w-md w-full"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-6 text-gradient-gold">Keyboard Shortcuts</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-secondary)]">Today View</span>
                <kbd className="px-3 py-1 bg-black/50 rounded border border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)] font-mono">T</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-secondary)]">Sprint View</span>
                <kbd className="px-3 py-1 bg-black/50 rounded border border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)] font-mono">S</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-secondary)]">AI Coach</span>
                <kbd className="px-3 py-1 bg-black/50 rounded border border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)] font-mono">A</kbd>
              </div>
            </div>
            <PremiumButton
              variant="secondary"
              size="sm"
              fullWidth
              className="mt-6"
              onClick={() => setShowKeyboardHelp(false)}
            >
              Close
            </PremiumButton>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Dashboard;
