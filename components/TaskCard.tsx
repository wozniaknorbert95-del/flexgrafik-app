import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TaskInsight } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { sanitizeInput } from '../utils/inputValidation';
import {
  useFocusTrap,
  getAccessibleModalProps,
  getAccessibleButtonProps,
} from '../hooks/useAccessibility';

interface TaskCardProps {
  task: Task;
  insight: TaskInsight;
  onClick?: () => void;
  showImplementationIntention?: boolean;
}

// Implementation Intention Bottom Sheet Component
interface ImplementationIntentionBottomSheetProps {
  task: Task;
  onComplete: () => void;
  onCancel: () => void;
}

export const ImplementationIntentionBottomSheet: React.FC<
  ImplementationIntentionBottomSheetProps
> = ({ task, onComplete, onCancel }) => {
  const { activateImplementationIntention } = useAppContext();
  const [trigger, setTrigger] = useState('');
  const [action, setAction] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triggerError, setTriggerError] = useState('');
  const [actionError, setActionError] = useState('');

  // Focus trap for accessibility
  const modalRef = useFocusTrap({
    active: true,
    onEscape: onCancel,
    onEnter: handleSubmit,
    restoreFocus: true,
  });

  const templates = [
    {
      trigger: 'pomyślę, że to już prawie gotowe',
      action: 'sprawdzę listę kryteriów DONE i uzupełnię brakujące',
    },
    {
      trigger: 'zechcę odłożyć zadanie na później',
      action: 'zrobię jeden mały krok (5 minut) natychmiast',
    },
    {
      trigger: 'usłyszę dzwonek telefonu',
      action: 'przypomnę sobie o wykonaniu jednego mikro-kroku',
    },
    {
      trigger: 'otworzę przeglądarkę',
      action: 'sprawdzę postęp w aplikacji i wykonam jeden krok',
    },
  ];

  const handleSubmit = async () => {
    // Validate inputs
    let hasErrors = false;

    if (!trigger.trim()) {
      setTriggerError('Trigger situation is required');
      hasErrors = true;
    }

    if (!action.trim()) {
      setActionError('Action is required');
      hasErrors = true;
    }

    if (trigger.trim().length > 200) {
      setTriggerError('Trigger too long (max 200 characters)');
      hasErrors = true;
    }

    if (action.trim().length > 200) {
      setActionError('Action too long (max 200 characters)');
      hasErrors = true;
    }

    if (hasErrors) return;

    setIsSubmitting(true);
    try {
      // Update task with implementation intention
      await activateImplementationIntention(task.id, {
        trigger: trigger.trim(),
        action: action.trim(),
        active: true,
      });
      onComplete();
    } catch (error) {
      console.error('Failed to save implementation intention:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyTemplate = (template: (typeof templates)[0]) => {
    setTrigger(template.trigger);
    setAction(template.action);
  };

  return (
    <motion.div
      className="bottom-sheet-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      {...getAccessibleModalProps(
        'Create Implementation Intention',
        'implementation-intention-description'
      )}
    >
      <motion.div
        ref={modalRef}
        className="bottom-sheet-content"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Handle bar */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
        </div>

        <div className="p-6">
          <h3
            id="implementation-intention-title"
            className="text-2xl font-bold text-white mb-2 flex items-center gap-2"
          >
            <span>🧠</span>
            Create Finish Plan
          </h3>

          <p id="implementation-intention-description" className="text-gray-300 mb-6 text-sm">
            Set up an automatic trigger to help you break through the final 10%. This "if-then" plan
            will activate when you face completion barriers.
          </p>

          {/* Current Task Info */}
          <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="text-sm text-gray-400 mb-1">Task to complete:</div>
            <div className="text-white font-medium">{task.name}</div>
            <div className="text-sm text-gray-400 mt-1">Current progress: {task.progress}%</div>
          </div>

          {/* Quick Templates */}
          <div className="mb-6">
            <h4 className="text-lg font-bold text-white mb-3">Quick Templates:</h4>
            <div className="grid grid-cols-1 gap-2">
              {templates.map((template, index) => (
                <button
                  key={index}
                  className="text-left p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
                  onClick={() => applyTemplate(template)}
                >
                  <div className="text-sm text-gray-300">
                    <strong>If:</strong> {template.trigger}
                    <br />
                    <strong>Then:</strong> {template.action}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Form */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                If (trigger situation):
              </label>
              <textarea
                value={trigger}
                onChange={(e) => {
                  const sanitized = sanitizeInput(e.target.value, { maxLength: 200 });
                  setTrigger(sanitized);
                  if (triggerError) setTriggerError('');
                }}
                className={`w-full p-3 rounded-lg bg-white/10 border text-white placeholder-gray-400 focus:outline-none ${
                  triggerError
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-white/20 focus:border-cyan-400'
                }`}
                placeholder="e.g., I think 'this is almost done'..."
                rows={2}
              />
              {triggerError && <p className="text-red-400 text-xs mt-1">{triggerError}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Then (automatic action):
              </label>
              <textarea
                value={action}
                onChange={(e) => {
                  const sanitized = sanitizeInput(e.target.value, { maxLength: 200 });
                  setAction(sanitized);
                  if (actionError) setActionError('');
                }}
                className={`w-full p-3 rounded-lg bg-white/10 border text-white placeholder-gray-400 focus:outline-none ${
                  actionError
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-white/20 focus:border-cyan-400'
                }`}
                placeholder="e.g., check my DONE criteria list..."
                rows={2}
              />
              {actionError && <p className="text-red-400 text-xs mt-1">{actionError}</p>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!trigger.trim() || !action.trim() || isSubmitting}
              className="flex-1 py-3 px-4 rounded-lg font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isSubmitting
                  ? 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)'
                  : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
              }}
            >
              {isSubmitting ? 'Saving...' : 'Activate Plan'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  insight,
  onClick,
  showImplementationIntention = true,
}) => {
  const { activateImplementationIntention } = useAppContext();
  const { progress, name, implementationIntention } = task;
  const { isStuck, daysInCurrentState } = insight;

  const [showSetup, setShowSetup] = useState(false);

  const getProgressVariant = () => {
    if (progress >= 95) return 'finish-line';
    if (progress >= 90) return 'gradient-finish';
    if (progress >= 75) return 'near-completion';
    return 'standard';
  };

  const getProgressColor = () => {
    if (progress >= 95) return '#FFD700'; // Gold
    if (progress >= 90) return '#FF6B6B'; // Coral
    if (progress >= 75) return '#4ECDC4'; // Teal
    if (progress >= 50) return '#45B7D1'; // Blue
    return '#96CEB4'; // Green
  };

  return (
    <motion.div
      className={`glass-card p-6 cursor-pointer transition-all duration-300 ${
        isStuck ? 'stuck-alert' : 'hover:scale-105'
      }`}
      onClick={onClick}
      whileHover={{ scale: isStuck ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3
          className="text-xl font-bold text-white flex-1 pr-2"
          style={{ textShadow: '0 0 8px rgba(255, 255, 255, 0.5)' }}
        >
          {name}
        </h3>
        {isStuck && <span className="text-2xl animate-pulse">🚨</span>}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-300">Progress</span>
          <span className="text-lg font-bold" style={{ color: getProgressColor() }}>
            {progress}%
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
          <motion.div
            className={`progress-fill h-full rounded-full ${getProgressVariant()}`}
            style={{
              width: `${Math.max(progress, 5)}%`, // Minimum 5% visible
              background: getProgressVariant() === 'standard' ? getProgressColor() : undefined,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(progress, 5)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stuck Task Finish Booster */}
      {isStuck && showImplementationIntention && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 p-4 rounded-lg border-2"
          style={{
            background: 'rgba(255, 107, 107, 0.1)',
            borderColor: 'rgba(255, 107, 107, 0.5)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🎯</span>
            <span className="text-lg font-bold text-white">Stuck at the Finish Line!</span>
          </div>

          <p className="text-sm text-gray-300 mb-3">
            This task has been at {progress}% for {daysInCurrentState} days. You're so close - let's
            get it done!
          </p>

          {!implementationIntention?.active ? (
            <motion.button
              className="w-full py-3 px-4 rounded-lg font-bold text-white transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #FF6B6B 0%, #DC3545 100%)',
                boxShadow: '0 4px 16px rgba(255, 107, 107, 0.3)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setShowSetup(true);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              🚀 Create Finish Plan
            </motion.button>
          ) : (
            <div className="p-3 rounded-lg bg-white/10 border border-white/20">
              <div className="text-sm font-bold text-white mb-1">Your Finish Plan:</div>
              <div className="text-sm text-gray-300">
                <strong>If:</strong> {implementationIntention.trigger}
                <br />
                <strong>Then:</strong> {implementationIntention.action}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Implementation Intention Bottom Sheet */}
      {showSetup && (
        <ImplementationIntentionBottomSheet
          task={task}
          onComplete={() => setShowSetup(false)}
          onCancel={() => setShowSetup(false)}
        />
      )}
    </motion.div>
  );
};

export default TaskCard;
