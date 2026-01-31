/**
 * Implementation Intentions Form
 *
 * Component for adding and managing Implementation Intentions in Evening Protocol.
 * Implementation Intentions are "if-then" plans that help users follow through on commitments.
 *
 * Format: "Gdy [trigger], to [action]"
 * Example: "Gdy poczuję, że to prawie gotowe, to sprawdzę listę kryteriów DONE"
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProtocolImplementationIntention, Pillar, Task } from '../types';
import { generateUUID } from '../utils/uuid';
import { showWarning } from '../utils/toastService';
import { Plus, X, Edit2, Trash2, CheckCircle2 } from 'lucide-react';

interface ImplementationIntentionsFormProps {
  intentions: ProtocolImplementationIntention[];
  protocolId: string;
  goals: Pillar[];
  declarations: Array<{ taskId: number; goalId: number }>;
  onUpdate: (intentions: ProtocolImplementationIntention[]) => void;
  minRequired?: number;
}

export const ImplementationIntentionsForm: React.FC<ImplementationIntentionsFormProps> = ({
  intentions: initialIntentions,
  protocolId,
  goals,
  declarations,
  onUpdate,
  minRequired = 3,
}) => {
  const [intentions, setIntentions] =
    useState<ProtocolImplementationIntention[]>(initialIntentions);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [trigger, setTrigger] = useState('');
  const [action, setAction] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<number | 'all'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Get tasks for selected goal
  const availableTasks = React.useMemo(() => {
    if (selectedGoalId === 'all') {
      // All tasks from declarations
      return declarations
        .map((d) => {
          const goal = goals.find((g) => g.id === d.goalId);
          const task = goal?.tasks?.find((t) => t.id === d.taskId);
          return task ? { task, goal } : null;
        })
        .filter(Boolean) as Array<{ task: Task; goal: Pillar }>;
    }

    const goal = goals.find((g) => g.id === selectedGoalId);
    if (!goal) return [];

    return (goal.tasks || [])
      .filter((t) => declarations.some((d) => d.taskId === t.id))
      .map((task) => ({ task, goal }));
  }, [selectedGoalId, goals, declarations]);

  const resetForm = () => {
    setTrigger('');
    setAction('');
    setSelectedGoalId('all');
    setSelectedTaskId(null);
    setIsAdding(false);
    setEditingId(null);
  };

  const saveIntention = () => {
    if (!trigger.trim() || !action.trim()) {
      showWarning('Wypełnij wszystkie pola.', 5000);
      return;
    }

    const goalId =
      selectedGoalId === 'all' ? declarations[0]?.goalId || goals[0]?.id || 0 : selectedGoalId;

    const newIntention: ProtocolImplementationIntention = {
      id: editingId ? intentions.find((i) => i.id === editingId)!.id : generateUUID(),
      trigger: trigger.trim(),
      action: action.trim(),
      active: true,
      protocolId,
      goalId,
      taskId: selectedTaskId,
      createdAt: editingId
        ? intentions.find((i) => i.id === editingId)!.createdAt
        : new Date().toISOString(),
      lastTriggered: null,
    };

    if (editingId) {
      const updated = intentions.map((i) => (i.id === editingId ? newIntention : i));
      setIntentions(updated);
      onUpdate(updated);
    } else {
      const updated = [...intentions, newIntention];
      setIntentions(updated);
      onUpdate(updated);
    }

    resetForm();
  };

  const deleteIntention = (id: string) => {
    if (intentions.length <= minRequired) {
      showWarning(`Musisz mieć minimum ${minRequired} intencji.`, 5000);
      return;
    }

    const updated = intentions.filter((i) => i.id !== id);
    setIntentions(updated);
    onUpdate(updated);
  };

  const startEdit = (intention: ProtocolImplementationIntention) => {
    setTrigger(intention.trigger);
    setAction(intention.action);
    setSelectedGoalId(intention.goalId);
    setSelectedTaskId(intention.taskId);
    setEditingId(intention.id);
    setIsAdding(true);
  };

  const cancelEdit = () => {
    resetForm();
  };

  const isValid = trigger.trim().length > 0 && action.trim().length > 0;
  const meetsMinimum = intentions.length >= minRequired;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>🎯</span>
            Intencje wdrożeniowe (Gdy–To)
          </h4>
          <p className="text-xs text-gray-400 mt-1">
            Format: „Gdy [sytuacja], to [akcja]” • Wymagane: minimum {minRequired}
          </p>
        </div>
        <div className="text-xs text-gray-400">
          {intentions.length}/{minRequired} {meetsMinimum ? '✅' : '⚠️'}
        </div>
      </div>

      {/* Intentions List */}
      <div className="space-y-2 mb-4">
        <AnimatePresence>
          {intentions.map((intention) => {
            const goal = goals.find((g) => g.id === intention.goalId);
            const task = goal?.tasks?.find((t) => t.id === intention.taskId);
            const isEditing = editingId === intention.id;

            if (isEditing) return null; // Show form instead

            return (
              <motion.div
                key={intention.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-gray-800/50 rounded-lg border border-gray-700 p-3"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-neon-cyan flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm text-white mb-1">
                      <span className="font-semibold">Gdy:</span> {intention.trigger}
                    </div>
                    <div className="text-sm text-gray-300 mb-2">
                      <span className="font-semibold">To:</span> {intention.action}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {goal && <span>Cel: {goal.name}</span>}
                      {task && <span>• Zadanie: {task.name}</span>}
                      {!task && <span>• Poziom celu</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(intention)}
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-neon-cyan transition-colors"
                      aria-label="Edytuj intencję"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteIntention(intention.id)}
                      disabled={intentions.length <= minRequired}
                      className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Usuń intencję"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-800/50 rounded-lg border border-neon-cyan/30 p-4 space-y-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-semibold text-white">
                {editingId ? 'Edytuj intencję' : 'Dodaj nową intencję'}
              </h5>
              <button onClick={cancelEdit} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Trigger */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Gdy (sytuacja/wyzwalacz):</label>
              <input
                type="text"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="np. poczuję, że to prawie gotowe..."
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
              />
            </div>

            {/* Action */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">To (akcja):</label>
              <input
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="np. sprawdzę listę kryteriów DONE"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
              />
            </div>

            {/* Goal Selection */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Powiązane z celem (opcjonalnie):
              </label>
              <select
                value={selectedGoalId}
                onChange={(e) => {
                  setSelectedGoalId(e.target.value === 'all' ? 'all' : Number(e.target.value));
                  setSelectedTaskId(null);
                }}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
              >
                <option value="all">Wszystkie cele</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Task Selection (if goal selected) */}
            {selectedGoalId !== 'all' && availableTasks.length > 0 && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Powiązane z zadaniem (opcjonalnie):
                </label>
                <select
                  value={selectedTaskId || ''}
                  onChange={(e) =>
                    setSelectedTaskId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
                >
                  <option value="">Poziom celu</option>
                  {availableTasks.map(({ task }) => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={cancelEdit}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors text-sm"
              >
                Anuluj
              </button>
              <button
                onClick={saveIntention}
                disabled={!isValid}
                className="flex-1 px-4 py-2 rounded-lg bg-neon-cyan text-obsidian font-semibold hover:bg-neon-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {editingId ? 'Zapisz' : 'Dodaj'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Button */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-2 px-3 rounded-lg border border-dashed border-gray-600 hover:border-neon-cyan text-gray-400 hover:text-neon-cyan transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Dodaj intencję
        </button>
      )}

      {/* Validation Message */}
      {!meetsMinimum && (
        <div className="text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded">
          ⚠️ Dodaj jeszcze {minRequired - intentions.length}{' '}
          {minRequired - intentions.length === 1 ? 'intencję' : 'intencje'} aby ukończyć protokół
        </div>
      )}
    </motion.div>
  );
};
