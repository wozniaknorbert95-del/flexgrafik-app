/**
 * Declaration Done Criteria Editor
 *
 * Component for editing Done Criteria for a specific declaration.
 * Similar to DoneCriteria in FinishMode, but saves to declaration instead of task.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DoneCriterion, Task } from '../types';
import { Plus, X, CheckCircle2, Circle } from 'lucide-react';
import { generateUUID } from '../utils/uuid';

interface DeclarationDoneCriteriaEditorProps {
  task: Task;
  criteria: DoneCriterion[];
  onUpdate: (criteria: DoneCriterion[]) => void;
  readOnly?: boolean;
}

export const DeclarationDoneCriteriaEditor: React.FC<DeclarationDoneCriteriaEditorProps> = ({
  task,
  criteria: initialCriteria,
  onUpdate,
  readOnly = false,
}) => {
  // Load criteria from declaration or use defaults from task
  const [criteria, setCriteria] = useState<DoneCriterion[]>(() => {
    // If declaration has criteria, use those
    if (initialCriteria && initialCriteria.length > 0) {
      return initialCriteria.map((c) => ({
        id: c.id,
        text: c.text,
        completed: c.completed || false,
        completedAt: c.completedAt || null,
      }));
    }

    // If task has doneCriteria, use those
    if ((task as any).doneCriteria && Array.isArray((task as any).doneCriteria)) {
      return (task as any).doneCriteria.map((c: any) => ({
        id: c.id || generateUUID(),
        text: c.text || c.description || '',
        completed: false, // Reset for new declaration
        completedAt: null,
      }));
    }

    // Default criteria based on task type
    const defaultCriteria: DoneCriterion[] = [];
    if (task.type === 'build') {
      defaultCriteria.push(
        {
          id: generateUUID(),
          text: 'Wszystkie funkcje zaimplementowane i przetestowane',
          completed: false,
          completedAt: null,
        },
        {
          id: generateUUID(),
          text: 'Kod zrecenzowany i zatwierdzony',
          completed: false,
          completedAt: null,
        },
        {
          id: generateUUID(),
          text: 'Dokumentacja zaktualizowana',
          completed: false,
          completedAt: null,
        },
        { id: generateUUID(), text: 'Brak krytycznych błędów', completed: false, completedAt: null }
      );
    } else if (task.type === 'close') {
      defaultCriteria.push(
        {
          id: generateUUID(),
          text: 'Wszystkie deliverables dostarczone',
          completed: false,
          completedAt: null,
        },
        {
          id: generateUUID(),
          text: 'Feedback klienta otrzymany',
          completed: false,
          completedAt: null,
        },
        {
          id: generateUUID(),
          text: 'Finalna recenzja ukończona',
          completed: false,
          completedAt: null,
        },
        {
          id: generateUUID(),
          text: 'Cel poprawnie zarchiwizowany',
          completed: false,
          completedAt: null,
        }
      );
    } else {
      defaultCriteria.push(
        {
          id: generateUUID(),
          text: 'Główna funkcjonalność ukończona',
          completed: false,
          completedAt: null,
        },
        {
          id: generateUUID(),
          text: 'Kontrole jakości zaliczone',
          completed: false,
          completedAt: null,
        },
        {
          id: generateUUID(),
          text: 'Gotowe do następnej fazy',
          completed: false,
          completedAt: null,
        },
        {
          id: generateUUID(),
          text: 'Wszystkie zależności rozwiązane',
          completed: false,
          completedAt: null,
        }
      );
    }

    return defaultCriteria;
  });

  // Sync with external changes
  useEffect(() => {
    if (initialCriteria && initialCriteria.length > 0) {
      setCriteria(
        initialCriteria.map((c) => ({
          id: c.id,
          text: c.text,
          completed: c.completed || false,
          completedAt: c.completedAt || null,
        }))
      );
    }
  }, [initialCriteria]);

  const addCriterion = () => {
    const newCriterion: DoneCriterion = {
      id: generateUUID(),
      text: '',
      completed: false,
      completedAt: null,
    };
    const newCriteria = [...criteria, newCriterion];
    setCriteria(newCriteria);
    onUpdate(newCriteria);
  };

  const updateCriterion = (id: string, text: string) => {
    const newCriteria = criteria.map((criterion) =>
      criterion.id === id ? { ...criterion, text } : criterion
    );
    setCriteria(newCriteria);
    onUpdate(newCriteria);
  };

  const removeCriterion = (id: string) => {
    const newCriteria = criteria.filter((criterion) => criterion.id !== id);
    setCriteria(newCriteria);
    onUpdate(newCriteria);
  };

  const toggleCriterion = (id: string) => {
    if (readOnly) return;

    const newCriteria = criteria.map((criterion) =>
      criterion.id === id
        ? {
            ...criterion,
            completed: !criterion.completed,
            completedAt: !criterion.completed ? new Date().toISOString() : null,
          }
        : criterion
    );
    setCriteria(newCriteria);
    onUpdate(newCriteria);
  };

  const completedCount = criteria.filter((c) => c.completed).length;
  const totalCount = criteria.length;
  const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-4 border border-neon-cyan/20 rounded-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <span>✅</span>
          DONE Criteria
        </h4>
        <span className="text-xs text-gray-400">
          {completedCount}/{totalCount} ukończone
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-700 rounded-full h-2">
          <motion.div
            className="bg-neon-cyan h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {criteria.map((criterion) => (
          <motion.div
            key={criterion.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <button
              onClick={() => toggleCriterion(criterion.id)}
              disabled={readOnly}
              className={`w-8 h-8 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                criterion.completed
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-400 hover:border-cyan-400'
              } ${readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              aria-label={criterion.completed ? 'Odhacz kryterium' : 'Zaznacz kryterium'}
            >
              {criterion.completed ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {readOnly ? (
              <span
                className={`flex-1 text-sm ${
                  criterion.completed ? 'line-through text-gray-400' : 'text-white'
                }`}
              >
                {criterion.text || '(puste)'}
              </span>
            ) : (
              <input
                type="text"
                value={criterion.text}
                onChange={(e) => updateCriterion(criterion.id, e.target.value)}
                placeholder="Dodaj kryterium DONE..."
                className={`flex-1 bg-transparent border-none outline-none text-sm ${
                  criterion.completed ? 'line-through text-gray-400' : 'text-white'
                }`}
              />
            )}

            {!readOnly && (
              <button
                onClick={() => removeCriterion(criterion.id)}
                className="w-6 h-6 flex-shrink-0 rounded hover:bg-red-500/20 flex items-center justify-center transition-colors"
                aria-label="Usuń kryterium"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {!readOnly && (
        <button
          onClick={addCriterion}
          className="w-full py-2 px-3 rounded-lg border border-dashed border-gray-600 hover:border-neon-cyan text-gray-400 hover:text-neon-cyan transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Dodaj kryterium
        </button>
      )}
    </motion.div>
  );
};
