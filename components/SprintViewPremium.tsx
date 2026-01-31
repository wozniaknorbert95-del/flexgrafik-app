import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AppData } from '../types';
import { ConfirmDialog } from './common/ConfirmDialog';

interface SprintViewProps {
  data: AppData;
  onToggleDay: (dayIndex: number) => void;
  onBack: () => void;
  onResetSprint?: () => void;
}

const WEEKDAY_SHORT_PL = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

const pad2 = (n: number) => String(n).padStart(2, '0');

const toIsoDateLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
};

const formatSprintDate = (raw: unknown): { label: string; isToday: boolean } => {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return { label: '—', isToday: false };

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return { label: '—', isToday: false };

  const weekday = WEEKDAY_SHORT_PL[(d.getDay() + 6) % 7] || '';
  const label = `${weekday} ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;

  const todayIso = toIsoDateLocal(new Date());
  const isToday = toIsoDateLocal(d) === todayIso;
  return { label, isToday };
};

const SprintViewPremium: React.FC<SprintViewProps> = ({
  data,
  onToggleDay,
  onBack,
  onResetSprint,
}) => {
  const progress = Array.isArray((data as any)?.sprint?.progress)
    ? (data as any).sprint.progress
    : [];
  const completedDays = progress.filter((d: any) => d && d.checked).length;
  const totalDays = progress.length > 0 ? progress.length : 7;
  const progressPercent = (completedDays / totalDays) * 100;
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  return (
    <div className="min-h-screen pb-32 pt-8 px-6">
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="Zresetować sprint?"
        description="Wszystkie dni zostaną odznaczone, a listy zadań wyczyszczone. Tej operacji nie da się cofnąć."
        confirmLabel="Resetuj sprint"
        cancelLabel="Anuluj"
        tone="danger"
        onCancel={() => setIsResetConfirmOpen(false)}
        onConfirm={() => {
          setIsResetConfirmOpen(false);
          onResetSprint?.();
        }}
      />

      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={onBack} className="btn-premium btn-cyan mb-8">
          ← Wróć
        </button>

        <div className="flex items-center gap-4 mb-4">
          <span className="text-6xl">🏃</span>
          <h1 className="text-6xl font-extrabold uppercase tracking-wider text-gradient-neon">
            Sprint
          </h1>
        </div>
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          /// 7-dniowy sprint odpowiedzialności
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
            <h2 className="text-2xl font-bold text-white">Postęp sprintu</h2>
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

          <div className="text-center text-sm text-gray-400 mb-4">
            Ukończone dni: {completedDays} z 7
          </div>

          {onResetSprint && (
            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  setIsResetConfirmOpen(true);
                }}
                className="btn-premium btn-cyan text-sm"
              >
                🔄 Resetuj sprint
              </button>
            </div>
          )}
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
          {progress.map((day: any, index: number) => {
            const { label, isToday } = formatSprintDate(day?.date);
            return (
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
                          : 'border-[var(--border-subtle)]'
                      }`}
                    >
                      {day.checked ? (
                        <span className="text-black font-bold text-xl">✓</span>
                      ) : (
                        <span className="text-[var(--text-muted)] font-bold">{index + 1}</span>
                      )}
                    </div>

                    <div>
                      <h3
                        className={`text-lg font-bold ${
                          day.checked ? 'text-glow-cyan' : 'text-white'
                        }`}
                      >
                        Dzień {index + 1}
                      </h3>
                      <p className="text-sm text-gray-400">{label}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isToday && (
                      <span className="text-xs px-3 py-1 rounded-widget-sm bg-gold/10 border border-gold/40 text-gold uppercase tracking-wider font-bold">
                        Dziś
                      </span>
                    )}
                    {day.checked && (
                      <span className="text-xs px-3 py-1 rounded-widget-sm bg-neon-cyan/20 border border-neon-cyan/50 text-glow-cyan uppercase tracking-wider font-bold">
                        Ukończone
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default SprintViewPremium;
