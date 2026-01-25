import React from 'react';
import { motion } from 'framer-motion';
import { AppData } from '../types';

interface SprintViewProps {
  data: AppData;
  onToggleDay: (dayIndex: number) => void;
  onBack: () => void;
}

const SprintViewPremium: React.FC<SprintViewProps> = ({ data, onToggleDay, onBack }) => {
  const completedDays = data.sprint.progress.filter((d) => d.checked).length;
  const progressPercent = (completedDays / 7) * 100;

  return (
    <div className="min-h-screen pb-32 pt-8 px-6">
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={onBack} className="btn-premium btn-cyan mb-8">
          ← Back
        </button>

        <div className="flex items-center gap-4 mb-4">
          <span className="text-6xl">🏃</span>
          <h1 className="text-6xl font-extrabold uppercase tracking-wider text-gradient-neon">
            Sprint
          </h1>
        </div>
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          /// 7-Day Accountability Sprint
        </p>
      </motion.div>

      {/* Progress Overview */}
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="glass-card glass-card-gold space-widget-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Sprint Progress</h2>
            <span className="text-4xl font-bold text-glow-gold">
              {Math.round(progressPercent)}%
            </span>
          </div>

          <div className="w-full h-4 bg-glass-heavy rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-neon-cyan via-neon-magenta to-gold"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>

          <div className="text-center text-sm text-gray-400">
            {completedDays} of 7 days completed
          </div>
        </div>
      </motion.div>

      {/* Days Grid */}
      <motion.div
        className="widget-container-narrow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="grid grid-cols-1 gap-4">
          {data.sprint.progress.map((day, index) => (
            <motion.div
              key={index}
              className={`glass-card space-widget cursor-pointer ${
                day.checked ? 'glass-card-cyan' : ''
              }`}
              onClick={() => onToggleDay(index)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-widget-sm border-2 flex items-center justify-center transition-all ${
                      day.checked
                        ? 'bg-neon-cyan border-neon-cyan shadow-glow-cyan'
                        : 'border-gray-600'
                    }`}
                  >
                    {day.checked ? (
                      <span className="text-black font-bold text-xl">✓</span>
                    ) : (
                      <span className="text-gray-500 font-bold">{index + 1}</span>
                    )}
                  </div>

                  <div>
                    <h3
                      className={`text-lg font-bold ${
                        day.checked ? 'text-glow-cyan' : 'text-white'
                      }`}
                    >
                      Day {index + 1}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {day.checked && (
                  <span className="text-xs px-3 py-1 rounded-widget-sm bg-neon-cyan/20 border border-neon-cyan/50 text-glow-cyan uppercase tracking-wider font-bold">
                    Complete
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default SprintViewPremium;
