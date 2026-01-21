import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppData, SprintDay } from '../types';
import { generateSprintRetrospective } from '../services/aiService';
import { generateTrophyPDF } from '../utils/trophyGenerator';
import { useVoiceNotify } from '../utils/voiceUtils';
import { withErrorHandling, handleError } from '../utils/errorHandler';
import { GlassCard } from './ui/GlassCard';
import { PremiumButton } from './ui/PremiumButton';
import { ANIMATION_VARIANTS } from '../constants/design';

interface SprintViewProps {
  data: AppData;
  onToggleDay: (idx: number) => void;
  onResetSprint: () => void;
}

const SprintView: React.FC<SprintViewProps> = ({ data, onToggleDay, onResetSprint }) => {
  const { sprint } = data;
  const daysLeft = sprint.progress.filter(d => !d.checked).length;
  const daysCompleted = sprint.progress.filter(d => d.checked).length;
  const [aiLoading, setAiLoading] = useState(false);
  const [trophyLoading, setTrophyLoading] = useState(false);
  const voiceNotify = useVoiceNotify(data.settings.voice);

  const score = Math.round((daysCompleted / 7) * 100);

  return (
    <motion.div 
      className="pb-24 pt-6 px-6 max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Premium Header */}
      <motion.div 
        className="flex justify-between items-end mb-8"
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-widest mb-2">
            <span className="text-gradient-gold">Sprint</span>
          </h1>
          <p className="text-[var(--color-text-tertiary)] text-sm uppercase tracking-[0.2em] font-medium">
            Week {sprint.week} / {sprint.year}
          </p>
        </div>
        
        {/* Animated Score */}
        <div className="text-right">
          <motion.div
            className="text-5xl font-black text-glow-magenta"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
          >
            {score}%
          </motion.div>
          <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest font-bold">
            Velocity
          </p>
        </div>
      </motion.div>

      {/* Goal Card */}
      <motion.div
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <GlassCard 
          variant="gradient-border"
          glowColor="magenta"
          className="p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--color-accent-magenta)] to-[var(--color-accent-cyan)]" />
          <div className="ml-4">
            <h2 className="text-xs text-glow-magenta font-bold uppercase tracking-[0.3em] mb-2">
              Weekly Goal
            </h2>
            <p className="text-xl md:text-2xl text-white font-bold">"{sprint.goal}"</p>
          </div>
        </GlassCard>
      </motion.div>

      {/* Week Grid */}
      <motion.div 
        className="mb-8"
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-[var(--color-accent-cyan)] to-transparent rounded-full" />
          <h3 className="text-sm text-[var(--color-text-tertiary)] font-bold uppercase tracking-[0.2em]">
            Progress ({daysCompleted}/{7} days completed)
          </h3>
        </div>
        
        <motion.div 
          className="grid grid-cols-7 gap-3"
          variants={ANIMATION_VARIANTS.staggerContainer}
          initial="initial"
          animate="animate"
        >
          {sprint.progress.map((day, idx) => (
            <motion.button
              key={idx}
              variants={ANIMATION_VARIANTS.fadeInUp}
              onClick={() => onToggleDay(idx)}
              className={`aspect-[3/4] rounded-xl flex flex-col items-center justify-center border-2 transition-all ${
                day.checked 
                  ? 'bg-gradient-to-br from-[var(--color-accent-magenta)] to-[var(--color-accent-cyan)] border-[var(--color-accent-magenta)] text-black shadow-[0_0_20px_rgba(255,0,255,0.5)]' 
                  : 'glass-card border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)] hover:border-[var(--color-accent-cyan)]'
              }`}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-xs font-bold mb-1 uppercase tracking-wider">{day.day}</span>
              <motion.span 
                className="text-2xl"
                animate={day.checked ? {
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, 0]
                } : {}}
                transition={{ duration: 0.3 }}
              >
                {day.checked ? '✓' : '·'}
              </motion.span>
            </motion.button>
          ))}
        </motion.div>

        {/* Animated Progress Bar */}
        <motion.div 
          className="mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="h-2 bg-black/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[var(--color-accent-magenta)] to-[var(--color-accent-cyan)]"
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1.5, delay: 0.6, ease: "easeOut" }}
              style={{
                boxShadow: '0 0 15px var(--color-accent-magenta)'
              }}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Task Lists Grid */}
      <motion.div 
        className="grid md:grid-cols-2 gap-6 mb-8"
        variants={ANIMATION_VARIANTS.staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Done Tasks */}
        <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
          <GlassCard 
            variant="hover-glow"
            className="p-6 h-full"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(0, 0, 0, 0.3) 100%)',
              borderColor: 'rgba(34, 197, 94, 0.3)'
            }}
          >
            <h3 className="text-green-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <span>✅</span>
              <span>Done This Week</span>
            </h3>
            
            <motion.ul 
              className="space-y-2"
              variants={ANIMATION_VARIANTS.staggerContainer}
              initial="initial"
              animate="animate"
            >
              {sprint.done_tasks.length > 0 ? sprint.done_tasks.map((t, i) => (
                <motion.li 
                  key={i}
                  variants={ANIMATION_VARIANTS.fadeInUp}
                  className="text-sm text-[var(--color-text-secondary)] flex items-start gap-2 p-2 rounded hover:bg-green-500/10 transition-colors"
                >
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{t}</span>
                </motion.li>
              )) : (
                <motion.li 
                  variants={ANIMATION_VARIANTS.fadeInUp}
                  className="text-[var(--color-text-muted)] italic text-sm text-center py-4"
                >
                  Nothing yet...
                </motion.li>
              )}
            </motion.ul>
          </GlassCard>
        </motion.div>

        {/* Blocked Tasks */}
        <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
          <GlassCard 
            variant="hover-glow"
            className="p-6 h-full"
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(0, 0, 0, 0.3) 100%)',
              borderColor: 'rgba(239, 68, 68, 0.3)'
            }}
          >
            <h3 className="text-red-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <span>🔴</span>
              <span>Stuck / Blocked</span>
            </h3>
            
            <motion.ul 
              className="space-y-2 mb-4"
              variants={ANIMATION_VARIANTS.staggerContainer}
              initial="initial"
              animate="animate"
            >
              {sprint.blocked_tasks.length > 0 ? sprint.blocked_tasks.map((t, i) => (
                <motion.li 
                  key={i}
                  variants={ANIMATION_VARIANTS.fadeInUp}
                  className="text-sm text-[var(--color-text-secondary)] flex items-start gap-2 p-2 rounded hover:bg-red-500/10 transition-colors"
                >
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{t}</span>
                </motion.li>
              )) : (
                <motion.li 
                  variants={ANIMATION_VARIANTS.fadeInUp}
                  className="text-green-400 font-medium text-sm text-center py-4"
                >
                  All clear! 🎉
                </motion.li>
              )}
            </motion.ul>

            <div className="flex gap-2">
              <PremiumButton variant="tertiary" size="sm" fullWidth>
                Log Issue
              </PremiumButton>
              <PremiumButton variant="tertiary" size="sm" fullWidth>
                Ask Help
              </PremiumButton>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Active Rules */}
      <motion.div
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <GlassCard className="p-6">
          <h3 className="text-xs text-[var(--color-text-tertiary)] font-bold uppercase tracking-[0.2em] mb-3">
            📈 IF-THEN ACTIVE
          </h3>
          <div className="text-sm text-[var(--color-text-secondary)] font-mono">
            <span className="text-[var(--color-text-muted)]">IF</span> brak check-in do 12:00<br/>
            <span className="text-[var(--color-text-muted)]">→</span> <span className="text-glow-gold">alert "Sprint risk!"</span>
          </div>
        </GlassCard>
      </motion.div>

      {/* Action Buttons */}
      <motion.div 
        className="space-y-4"
        variants={ANIMATION_VARIANTS.staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
          <PremiumButton
            variant="primary"
            size="lg"
            fullWidth
            glowColor="magenta"
            loading={aiLoading}
            onClick={async () => {
              if (!data.settings.ai?.enabled || !data.settings.ai.apiKey) {
                alert('Włącz AI Coach w Settings');
                return;
              }
              setAiLoading(true);
              const retro = await withErrorHandling(
                () => generateSprintRetrospective(data),
                {
                  component: 'SprintView',
                  action: 'generateSprintRetrospective',
                  userMessage: 'Nie udało się wygenerować retrospektywy AI.'
                }
              );

              if (retro) {
                alert(`📊 AI Retrospektywa:\n\n${retro}`);
                if (data.settings.voice.enabled) {
                  voiceNotify(retro, 'normal');
                }
              }
              setAiLoading(false);
            }}
            disabled={!sprint}
          >
            <span className="text-xl">📊</span>
            <span>{aiLoading ? 'AI myśli...' : 'AI Retrospektywa'}</span>
          </PremiumButton>
        </motion.div>

        <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
          <PremiumButton
            variant="primary"
            size="lg"
            fullWidth
            glowColor="gold"
            loading={trophyLoading}
            onClick={async () => {
              setTrophyLoading(true);
              try {
                const filename = generateTrophyPDF(sprint, data.pillars);
                alert(`🏆 Trophy PDF generated!\n\nFile: ${filename}\n\nCheck your downloads folder!`);
                if (data.settings.voice.enabled) {
                  voiceNotify('Trophy generated! Check your downloads.', 'normal');
                }
              } catch (error) {
                handleError(error, {
                  component: 'SprintView',
                  action: 'generateTrophy',
                  userMessage: 'Failed to generate trophy PDF'
                });
                alert('❌ Error generating trophy PDF. Check console for details.');
              }
              setTrophyLoading(false);
            }}
          >
            <span className="text-xl">🏆</span>
            <span>Generate Trophy PDF</span>
          </PremiumButton>
        </motion.div>

        <motion.div 
          className="grid grid-cols-2 gap-4"
          variants={ANIMATION_VARIANTS.fadeInUp}
        >
          <PremiumButton
            variant="secondary"
            size="lg"
            onClick={onResetSprint}
          >
            Retrospect
          </PremiumButton>
          <PremiumButton
            variant="tertiary"
            size="lg"
          >
            Plan Next
          </PremiumButton>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default React.memo(SprintView);
