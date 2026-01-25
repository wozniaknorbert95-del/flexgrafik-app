import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TaskInsight } from '../../../types';
import { useData, useUI } from '../../../contexts';
import { sanitizeInput } from '../../../utils/inputValidation';
import { Button, ProgressBar, Badge, Icon, Input } from '../atoms';
import { FormField } from './FormField';
import { BaseComponentProps } from '../../types/components';

// TaskCard specific props
export interface TaskCardProps extends BaseComponentProps {
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
  const { updateTask } = useData();
  const { addNotification } = useUI();
  const [trigger, setTrigger] = useState('');
  const [action, setAction] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triggerError, setTriggerError] = useState('');
  const [actionError, setActionError] = useState('');

  // Focus trap for accessibility
  const modalRef = React.useRef<HTMLDivElement>(null);

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
      await updateTask(task.id.toString(), {
        implementationIntention: {
          trigger: trigger.trim(),
          action: action.trim(),
          active: true,
        },
      });
      addNotification({
        type: 'success',
        message: 'Implementation intention saved!',
        duration: 3000,
      });
      onComplete();
    } catch (error) {
      console.error('Failed to save implementation intention:', error);
      addNotification({
        type: 'error',
        message: 'Failed to save implementation intention',
        duration: 5000,
      });
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="implementation-intention-title"
    >
      <motion.div
        ref={modalRef}
        className="w-full max-w-md mx-4 mb-6 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <Icon name="brain" size="xl" className="mb-2" />
            <h3 id="implementation-intention-title" className="text-2xl font-bold text-white mb-2">
              Create Finish Plan
            </h3>
            <p className="text-gray-300 text-sm">
              Set up an automatic trigger to help you break through the final 10%.
            </p>
          </div>

          {/* Current Task Info */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="text-sm text-gray-400 mb-1">Task to complete:</div>
            <div className="text-white font-medium">{task.name}</div>
            <div className="text-sm text-gray-400 mt-1">Current progress: {task.progress}%</div>
          </div>

          {/* Quick Templates */}
          <div>
            <h4 className="text-lg font-bold text-white mb-3">Quick Templates:</h4>
            <div className="grid grid-cols-1 gap-2">
              {templates.map((template, index) => (
                <Button
                  key={index}
                  variant="secondary"
                  size="sm"
                  className="text-left p-3 h-auto whitespace-normal"
                  onClick={() => applyTemplate(template)}
                >
                  <div className="text-sm text-gray-300">
                    <strong>If:</strong> {template.trigger}
                    <br />
                    <strong>Then:</strong> {template.action}
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Form */}
          <div className="space-y-4">
            <FormField label="If (trigger situation):" error={triggerError} required>
              <Input
                value={trigger}
                onValueChange={(value) => {
                  setTrigger(value);
                  if (triggerError) setTriggerError('');
                }}
                placeholder="e.g., I think 'this is almost done'..."
                rows={2}
                as="textarea"
              />
            </FormField>

            <FormField label="Then (automatic action):" error={actionError} required>
              <Input
                value={action}
                onValueChange={(value) => {
                  setAction(value);
                  if (actionError) setActionError('');
                }}
                placeholder="e.g., check my DONE criteria list..."
                rows={2}
                as="textarea"
              />
            </FormField>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleSubmit}
              disabled={!trigger.trim() || !action.trim() || isSubmitting}
              isLoading={isSubmitting}
              loadingText="Saving..."
              className="flex-1"
            >
              🚀 Activate Plan
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/**
 * TaskCard Molecule Component
 * Combines multiple atoms to create a comprehensive task display
 */
export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  insight,
  onClick,
  showImplementationIntention = true,
  className = '',
  'data-testid': testId,
}) => {
  const { updateTask } = useData();
  const { addNotification } = useUI();
  const { progress, name, implementationIntention } = task;
  const { isStuck, daysInCurrentState } = insight;

  const [showSetup, setShowSetup] = useState(false);

  const getProgressVariant = () => {
    if (progress >= 95) return 'success';
    if (progress >= 90) return 'warning';
    if (progress >= 75) return 'info';
    return 'primary';
  };

  return (
    <>
      <motion.div
        className={`
          glass-card p-6 cursor-pointer transition-all duration-300
          ${isStuck ? 'ring-2 ring-red-500/50 shadow-red-500/25' : 'hover:scale-105'}
          ${className}
        `}
        onClick={onClick}
        whileHover={{ scale: isStuck ? 1 : 1.02 }}
        whileTap={{ scale: 0.98 }}
        data-testid={testId}
        role="button"
        tabIndex={0}
        aria-label={`Task: ${name}, Progress: ${progress}%`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex-1 pr-2">{name}</h3>
          {isStuck && (
            <Badge variant="danger" animated glow>
              🚨 STUCK
            </Badge>
          )}
        </div>

        {/* Progress Section */}
        <div className="mb-4">
          <ProgressBar
            value={progress}
            variant={getProgressVariant()}
            label="Progress"
            showValue
            animated
            size="md"
          />
        </div>

        {/* Stuck Task Finish Booster */}
        <AnimatePresence>
          {isStuck && showImplementationIntention && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 rounded-lg border-2 bg-red-500/10 border-red-500/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon name="target" size="lg" />
                <span className="text-lg font-bold text-white">Stuck at the Finish Line!</span>
              </div>

              <p className="text-sm text-gray-300 mb-3">
                This task has been at {progress}% for {daysInCurrentState} days. You're so close -
                let's get it done!
              </p>

              {!implementationIntention?.active ? (
                <Button
                  variant="warning"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSetup(true);
                  }}
                >
                  <Icon name="rocket" size="sm" />
                  Create Finish Plan
                </Button>
              ) : (
                <div className="p-3 rounded-lg bg-white/10 border border-white/20">
                  <div className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    <Icon name="check" size="sm" />
                    Your Finish Plan:
                  </div>
                  <div className="text-sm text-gray-300">
                    <strong>If:</strong> {implementationIntention.trigger}
                    <br />
                    <strong>Then:</strong> {implementationIntention.action}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Implementation Intention Bottom Sheet */}
      <AnimatePresence>
        {showSetup && (
          <ImplementationIntentionBottomSheet
            task={task}
            onComplete={() => setShowSetup(false)}
            onCancel={() => setShowSetup(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default TaskCard;
