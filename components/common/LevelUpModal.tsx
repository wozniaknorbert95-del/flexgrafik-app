import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export const LevelUpModal: React.FC<{
  isOpen: boolean;
  levelFrom: number;
  levelTo: number;
  xp: number;
  onClose: () => void;
}> = ({ isOpen, levelFrom, levelTo, xp, onClose }) => {
  const from = Math.max(1, Math.floor(Number(levelFrom) || 1));
  const to = Math.max(1, Math.floor(Number(levelTo) || from));
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
          aria-label="Awans poziomu"
        >
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
            aria-label="Zamknij"
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md rounded-2xl border border-gold/30 bg-black/70 backdrop-blur p-6 shadow-2xl"
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="text-xs text-gray-300 uppercase tracking-wider font-bold">
              🎉 Level up
            </div>
            <div className="mt-2 text-3xl font-black text-gold">Poziom {to}</div>
            <div className="mt-2 text-sm text-gray-200">
              Awans:{' '}
              <span className="font-bold text-white">
                {from} → {to}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-400">
              XP łącznie: <span className="font-semibold text-gray-200">{safeXp}</span>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-gray-200 text-xs font-bold uppercase tracking-wider hover:bg-white/10"
              >
                OK
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
