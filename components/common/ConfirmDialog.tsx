import React, { useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFocusTrap } from '../../hooks/useAccessibility';

export type ConfirmTone = 'default' | 'danger';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Potwierdź',
  cancelLabel = 'Anuluj',
  tone = 'default',
  confirmDisabled = false,
  onConfirm,
  onCancel,
}) => {
  const titleId = useId();
  const descId = useId();

  const modalRef = useFocusTrap({
    active: isOpen,
    onEscape: onCancel,
    onEnter: () => {
      if (!confirmDisabled) onConfirm();
    },
    restoreFocus: true,
  });

  const confirmClass = tone === 'danger' ? 'btn-premium btn-magenta' : 'btn-premium btn-magenta';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-10 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            ref={modalRef as any}
            className="w-full max-w-lg"
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
          >
            <div className="glass-card glass-card-gold p-6 border border-white/10">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 id={titleId} className="text-xl font-black text-white mb-2">
                    {title}
                  </h3>
                  {description && (
                    <p id={descId} className="text-sm text-gray-300 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-11 h-11 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0"
                  aria-label="Zamknij okno"
                  title="Zamknij"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 justify-end">
                <button type="button" onClick={onCancel} className="btn-premium btn-cyan">
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={confirmDisabled}
                  className={`${confirmClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
