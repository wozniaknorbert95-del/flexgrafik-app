/**
 * Evening Protocol Premium Component
 *
 * Main component for the Evening Protocol flow.
 * Allows users to plan their next day by:
 * 1. Selecting tasks from active goals
 * 2. Defining Done Criteria for each task
 * 3. Setting Implementation Intentions (min 3)
 * 4. Creating/updating Rules (min 1)
 *
 * Phase 2: Basic structure and task selection
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../contexts/AppContext';
import {
  Pillar,
  Task,
  EveningProtocol,
  Declaration,
  ProtocolImplementationIntention,
  CustomRule,
} from '../types';
import {
  getTomorrowDate,
  getYesterdayDate,
  getDateFromToday,
  formatDateHuman,
  isValidFutureProtocolDate,
  getAvailableProtocolDates,
} from '../utils/dateHelpers';
import { generateUUID } from '../utils/uuid';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import { DeclarationDoneCriteriaEditor } from './DeclarationDoneCriteriaEditor';
import { TimeWindowSelector } from './TimeWindowSelector';
import { ImplementationIntentionsForm } from './ImplementationIntentionsForm';
import { ProtocolRulesSelector } from './ProtocolRulesSelector';
import { useToast } from './ToastProvider';
import {
  showSuccess as showToastSuccess,
  showError as showToastError,
  showInfo as showToastInfo,
} from '../utils/toastService';

const EveningProtocolPremium: React.FC = () => {
  const { data, setData, setCurrentView } = useAppContext();
  const PROTOCOL_TARGET_DATE_STORAGE_KEY = 'fg_protocol_target_date';

  // Date selection state (defaults to tomorrow, but can select future dates)
  const [selectedTargetDate, setSelectedTargetDate] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(PROTOCOL_TARGET_DATE_STORAGE_KEY);
      if (raw && isValidFutureProtocolDate(raw)) return raw;
    } catch {
      // ignore
    }
    return getTomorrowDate();
  });
  const selectedDateFormatted = formatDateHuman(selectedTargetDate);

  // Loading state for async operations
  const [isSaving, setIsSaving] = useState(false);

  // Available dates for selection (today + next 7 days)
  const availableDates = useMemo(() => getAvailableProtocolDates(), []);

  // Check if protocol already exists for selected date
  const existingProtocol = useMemo(() => {
    if (!data.eveningProtocols || data.eveningProtocols.length === 0) return null;
    return data.eveningProtocols.find((p) => p.targetDate === selectedTargetDate);
  }, [data.eveningProtocols, selectedTargetDate]);

  // Find yesterday's protocol for "Quick Repeat" feature
  const yesterdayProtocol = useMemo(() => {
    if (!data.eveningProtocols || data.eveningProtocols.length === 0) return null;
    const yesterdayDate = getYesterdayDate();
    return data.eveningProtocols.find(
      (p) => p.targetDate === yesterdayDate && p.status === 'completed'
    );
  }, [data.eveningProtocols]);

  // Validate selected date
  const isDateValid = useMemo(() => {
    return isValidFutureProtocolDate(selectedTargetDate);
  }, [selectedTargetDate]);

  // Persist last selected date for week view deep-linking.
  useEffect(() => {
    try {
      if (isValidFutureProtocolDate(selectedTargetDate)) {
        localStorage.setItem(PROTOCOL_TARGET_DATE_STORAGE_KEY, selectedTargetDate);
      }
    } catch {
      // ignore
    }
  }, [selectedTargetDate]);

  // Initialize or load protocol
  const [protocol, setProtocol] = useState<EveningProtocol>(() => {
    if (existingProtocol) {
      return existingProtocol;
    }

    // Create new draft protocol
    return {
      id: generateUUID(),
      targetDate: selectedTargetDate,
      createdAt: new Date().toISOString(),
      completedAt: null,
      status: 'draft',
      declarations: [],
      implementationIntentions: [],
      rules: [],
      metadata: {
        version: 1,
        goalIds: [],
        totalDeclarations: 0,
      },
    };
  });

  // Update protocol target date when selection changes
  useEffect(() => {
    const newProtocol = existingProtocol || {
      id: generateUUID(),
      targetDate: selectedTargetDate,
      createdAt: new Date().toISOString(),
      completedAt: null,
      status: 'draft' as const,
      declarations: [],
      implementationIntentions: [],
      rules: [],
      metadata: {
        version: 1,
        goalIds: [],
        totalDeclarations: 0,
      },
    };

    setProtocol(newProtocol);

    // Show feedback when switching dates
    if (existingProtocol) {
      showToastInfo(`Załadowano protokół dla ${formatDateHuman(selectedTargetDate)}`, 3000);
    }
  }, [selectedTargetDate, existingProtocol]);

  // Get active goals (for task selection)
  const activeGoals = useMemo(() => {
    return (data?.pillars || []).filter(
      (p: Pillar) => p.status !== 'done' && (p.activation ?? 'active') === 'active'
    );
  }, [data?.pillars]);

  // Get selectable tasks (from active goals, not completed)
  const selectableTasks = useMemo(() => {
    const tasks: Array<{ task: Task; goal: Pillar }> = [];
    for (const goal of activeGoals) {
      for (const task of goal.tasks || []) {
        if (task.progress < 100 && task.status !== 'done' && task.status !== 'abandoned') {
          tasks.push({ task, goal });
        }
      }
    }
    return tasks;
  }, [activeGoals]);

  // Selected tasks (for declarations)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(() => {
    const ids = new Set<number>();
    protocol.declarations.forEach((d) => ids.add(d.taskId));
    return ids;
  });

  // Expanded declarations (for editing)
  const [expandedDeclarations, setExpandedDeclarations] = useState<Set<string>>(new Set());

  // Validation and feedback state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Toggle task selection
  const toggleTaskSelection = (taskId: number) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
        // Remove declaration if exists
        setProtocol((prev) => ({
          ...prev,
          declarations: prev.declarations.filter((d) => d.taskId !== taskId),
        }));
        // Remove from expanded
        const declaration = protocol.declarations.find((d) => d.taskId === taskId);
        if (declaration) {
          setExpandedDeclarations((prev) => {
            const next = new Set(prev);
            next.delete(declaration.id);
            return next;
          });
        }
      } else {
        next.add(taskId);
        // Create new declaration draft
        const taskData = selectableTasks.find((t) => t.task.id === taskId);
        if (taskData) {
          const newDeclaration: Declaration = {
            id: generateUUID(),
            protocolId: protocol.id,
            taskId: taskData.task.id,
            goalId: taskData.goal.id,
            doneCriteria: [],
            timeWindow: {
              start: '09:00',
              end: '12:00',
            },
            status: 'pending',
            createdAt: new Date().toISOString(),
            startedAt: null,
            completedAt: null,
            failedAt: null,
            agentEvaluation: {
              checkedAt: null,
              penaltyPoints: 0,
              reason: null,
              severity: 'none',
            },
          };
          setProtocol((prev) => ({
            ...prev,
            declarations: [...prev.declarations, newDeclaration],
            metadata: {
              ...prev.metadata,
              goalIds: Array.from(new Set([...prev.metadata.goalIds, taskData.goal.id])),
              totalDeclarations: prev.declarations.length + 1,
            },
          }));
          // Auto-expand new declaration
          setExpandedDeclarations((prev) => new Set([...prev, newDeclaration.id]));
        }
      }
      return next;
    });
  };

  // Toggle declaration expansion
  const toggleDeclarationExpansion = (declarationId: string) => {
    setExpandedDeclarations((prev) => {
      const next = new Set(prev);
      if (next.has(declarationId)) {
        next.delete(declarationId);
      } else {
        next.add(declarationId);
      }
      return next;
    });
  };

  // Update declaration done criteria
  const updateDeclarationCriteria = (declarationId: string, criteria: any[]) => {
    setProtocol((prev) => ({
      ...prev,
      declarations: prev.declarations.map((d) =>
        d.id === declarationId ? { ...d, doneCriteria: criteria } : d
      ),
    }));
  };

  // Update declaration time window
  const updateDeclarationTimeWindow = (declarationId: string, start: string, end: string) => {
    setProtocol((prev) => ({
      ...prev,
      declarations: prev.declarations.map((d) =>
        d.id === declarationId ? { ...d, timeWindow: { ...d.timeWindow, start, end } } : d
      ),
    }));
  };

  // Update implementation intentions
  const updateImplementationIntentions = (intentions: ProtocolImplementationIntention[]) => {
    setProtocol((prev) => ({
      ...prev,
      implementationIntentions: intentions,
    }));
  };

  // Update rules
  const updateProtocolRules = (rules: CustomRule[]) => {
    setProtocol((prev) => ({
      ...prev,
      rules: rules,
    }));
  };

  // Create new rule (adds to AppData.customRules)
  const createNewRule = (rule: CustomRule) => {
    setData((prev) => ({
      ...prev,
      customRules: [...(prev.customRules || []), rule],
    }));
  };

  // Repeat yesterday's protocol
  const repeatYesterdayProtocol = () => {
    if (!yesterdayProtocol) {
      showToastError('Nie znaleziono wczorajszego protokołu', 4000);
      return;
    }

    try {
      // Copy declarations with new IDs
      const copiedDeclarations: Declaration[] = yesterdayProtocol.declarations.map((d) => ({
        ...d,
        id: generateUUID(),
        protocolId: protocol.id,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        failedAt: null,
        agentEvaluation: {
          checkedAt: null,
          penaltyPoints: 0,
          reason: null,
          severity: 'none' as const,
        },
      }));

      // Copy implementation intentions with new IDs
      const copiedIntentions: ProtocolImplementationIntention[] =
        yesterdayProtocol.implementationIntentions.map((ii) => ({
          ...ii,
          id: generateUUID(),
        }));

      // Copy rules (reference existing rules, don't duplicate)
      const copiedRules: CustomRule[] = yesterdayProtocol.rules.map((rule) => rule);

      // Update protocol
      setProtocol((prev) => ({
        ...prev,
        declarations: copiedDeclarations,
        implementationIntentions: copiedIntentions,
        rules: copiedRules,
        metadata: {
          ...prev.metadata,
          goalIds: Array.from(new Set(copiedDeclarations.map((d) => d.goalId))),
          totalDeclarations: copiedDeclarations.length,
        },
      }));

      // Update selected task IDs
      setSelectedTaskIds(new Set(copiedDeclarations.map((d) => d.taskId)));

      showToastSuccess(
        `✅ Skopiowano protokół z ${formatDateHuman(yesterdayProtocol.targetDate)}: ${copiedDeclarations.length} deklaracji, ${copiedIntentions.length} intentions`,
        5000
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Błąd podczas kopiowania protokołu';
      showToastError(`❌ ${errorMessage}`, 5000);
    }
  };

  // Save protocol (draft)
  const saveProtocol = () => {
    setData((prev) => {
      const protocols = prev.eveningProtocols || [];
      const existingIndex = protocols.findIndex((p) => p.id === protocol.id);

      if (existingIndex >= 0) {
        // Update existing
        const updated = [...protocols];
        updated[existingIndex] = protocol;
        return {
          ...prev,
          eveningProtocols: updated,
        };
      } else {
        // Add new
        return {
          ...prev,
          eveningProtocols: [...protocols, protocol],
        };
      }
    });
  };

  // Validation helper
  const validateProtocol = (): string[] => {
    const errors: string[] = [];

    if (selectedTaskIds.size === 0) {
      errors.push('Musisz wybrać przynajmniej jedno zadanie');
      return errors; // Early return - no point checking further
    }

    // Check if all selected tasks have declarations
    const tasksWithoutDeclarations = Array.from(selectedTaskIds).filter(
      (taskId) => !protocol.declarations.some((d) => d.taskId === taskId)
    );
    if (tasksWithoutDeclarations.length > 0) {
      errors.push(
        `Niektóre wybrane zadania nie mają deklaracji (${tasksWithoutDeclarations.length} brakuje)`
      );
    }

    if (protocol.declarations.length === 0) {
      errors.push('Musisz zdefiniować deklaracje dla wybranych zadań');
    }

    // Check if all declarations have done criteria
    const declarationsWithoutCriteria = protocol.declarations.filter(
      (d) => !d.doneCriteria || d.doneCriteria.length === 0
    );
    if (declarationsWithoutCriteria.length > 0) {
      const taskNames = declarationsWithoutCriteria
        .map((d) => {
          const task = selectableTasks.find((t) => t.task.id === d.taskId);
          return task ? task.task.name : `Zadanie #${d.taskId}`;
        })
        .join(', ');
      errors.push(`Deklaracje muszą mieć zdefiniowane Done Criteria: ${taskNames}`);
    }

    // Check if all declarations have time windows
    const declarationsWithoutTimeWindow = protocol.declarations.filter(
      (d) => !d.timeWindow || !d.timeWindow.start || !d.timeWindow.end
    );
    if (declarationsWithoutTimeWindow.length > 0) {
      const taskNames = declarationsWithoutTimeWindow
        .map((d) => {
          const task = selectableTasks.find((t) => t.task.id === d.taskId);
          return task ? task.task.name : `Zadanie #${d.taskId}`;
        })
        .join(', ');
      errors.push(`Deklaracje muszą mieć zdefiniowane okno czasowe: ${taskNames}`);
    }

    // Validate time windows (start < end)
    const invalidTimeWindows = protocol.declarations.filter((d) => {
      if (!d.timeWindow || !d.timeWindow.start || !d.timeWindow.end) return false;
      const [startH, startM] = d.timeWindow.start.split(':').map(Number);
      const [endH, endM] = d.timeWindow.end.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      return startMinutes >= endMinutes;
    });
    if (invalidTimeWindows.length > 0) {
      errors.push(
        `${invalidTimeWindows.length} deklaracji ma nieprawidłowe okno czasowe (start >= end)`
      );
    }

    if (protocol.implementationIntentions.length < 3) {
      errors.push(
        `Musisz dodać minimum 3 Implementation Intentions (obecnie: ${protocol.implementationIntentions.length})`
      );
    }

    if (protocol.rules.length < 1) {
      errors.push('Musisz dodać minimum 1 Rule');
    }

    return errors;
  };

  // Complete protocol (validate and save)
  const completeProtocol = async () => {
    // Clear previous errors and success
    setValidationErrors([]);
    setShowSuccess(false);

    // Validate
    const errors = validateProtocol();
    if (errors.length > 0) {
      setValidationErrors(errors);
      showToastError('Proszę poprawić błędy walidacji przed zapisaniem', 5000);
      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);

    try {
      const completed: EveningProtocol = {
        ...protocol,
        status: 'completed',
        completedAt: new Date().toISOString(),
      };

      setData((prev) => {
        const protocols = prev.eveningProtocols || [];
        const existingIndex = protocols.findIndex((p) => p.id === protocol.id);

        // Update or add protocol
        let updatedProtocols: EveningProtocol[];
        if (existingIndex >= 0) {
          updatedProtocols = [...protocols];
          updatedProtocols[existingIndex] = completed;
        } else {
          updatedProtocols = [...protocols, completed];
        }

        // Get existing declarations for this protocol to avoid duplicates
        const existingDeclarations = (prev.declarations || []).filter(
          (d) => d.protocolId === protocol.id
        );
        const existingDeclarationIds = new Set(existingDeclarations.map((d) => d.id));

        // Create new declarations from protocol (only if they don't exist)
        const newDeclarations: Declaration[] = completed.declarations
          .filter((d) => !existingDeclarationIds.has(d.id))
          .map((d) => ({
            ...d,
            status: 'pending' as const,
            createdAt: d.createdAt || new Date().toISOString(),
          }));

        // Update existing declarations with latest data from protocol
        const updatedDeclarations = existingDeclarations.map((existing) => {
          const protocolDeclaration = completed.declarations.find((d) => d.id === existing.id);
          if (protocolDeclaration) {
            return {
              ...existing,
              doneCriteria: protocolDeclaration.doneCriteria,
              timeWindow: protocolDeclaration.timeWindow,
              // Don't overwrite status if declaration is already in progress/completed
              status: existing.status === 'pending' ? 'pending' : existing.status,
            };
          }
          return existing;
        });

        // Combine: keep other declarations, update existing, add new
        const allOtherDeclarations = (prev.declarations || []).filter(
          (d) => d.protocolId !== protocol.id
        );

        return {
          ...prev,
          eveningProtocols: updatedProtocols,
          declarations: [...allOtherDeclarations, ...updatedDeclarations, ...newDeclarations],
        };
      });

      setIsSaving(false);

      // Show success feedback
      setShowSuccess(true);
      showToastSuccess(
        `✅ Protokół ukończony! ${completed.declarations.length} deklaracji zapisanych`,
        4000
      );

      // Navigate back to dashboard after 2 seconds
      setTimeout(() => {
        setCurrentView('home');
      }, 2000);
    } catch (error) {
      setIsSaving(false);
      const errorMessage =
        error instanceof Error ? error.message : 'Wystąpił błąd podczas zapisywania protokołu';
      showToastError(`❌ Błąd: ${errorMessage}. Spróbuj ponownie.`, 7000);
      setValidationErrors([errorMessage]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Auto-save on changes
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (protocol.status === 'draft') {
        // Use current protocol state
        setData((prev) => {
          const protocols = prev.eveningProtocols || [];
          const existingIndex = protocols.findIndex((p) => p.id === protocol.id);

          if (existingIndex >= 0) {
            const updated = [...protocols];
            updated[existingIndex] = protocol;
            return {
              ...prev,
              eveningProtocols: updated,
            };
          } else {
            return {
              ...prev,
              eveningProtocols: [...protocols, protocol],
            };
          }
        });
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [protocol, setData]);

  return (
    <div className="min-h-screen bg-obsidian text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-obsidian/95 backdrop-blur-sm border-b border-neon-cyan/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>← Wróć</span>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-neon-cyan">Protokół wieczorny</h1>
            <p className="text-xs text-gray-400 mt-1">Planowanie na: {selectedDateFormatted}</p>
          </div>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </div>

      {/* Date Selection */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="glass-card p-4 border border-neon-cyan/20 rounded-lg">
          <label className="block text-sm text-gray-400 mb-2">Wybierz datę dla protokołu:</label>
          <select
            value={selectedTargetDate}
            onChange={(e) => {
              const newDate = e.target.value;
              if (isValidFutureProtocolDate(newDate)) {
                setSelectedTargetDate(newDate);
              }
            }}
            className="w-full bg-gray-900 border border-neon-cyan/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-cyan"
          >
            {availableDates.map((date) => {
              const isToday = date === getDateFromToday(0);
              const isTomorrow = date === getDateFromToday(1);
              const label = isToday
                ? `Dziś (${formatDateHuman(date)})`
                : isTomorrow
                  ? `Jutro (${formatDateHuman(date)})`
                  : formatDateHuman(date);

              return (
                <option key={date} value={date}>
                  {label}
                </option>
              );
            })}
          </select>
          {!isDateValid && (
            <p className="text-xs text-red-400 mt-2">
              Data musi być między dziś a 7 dni w przyszłość
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Message */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-500/20 border border-green-500 rounded-lg p-4 flex items-center gap-3"
          >
            <CheckCircle className="text-green-500 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-semibold text-green-500">Protokół ukończony!</h3>
              <p className="text-sm text-gray-300">
                Deklaracje zostały zapisane. Przekierowywanie do Pulpitu…
              </p>
            </div>
          </motion.div>
        )}

        {/* Quick Repeat Yesterday Button */}
        {yesterdayProtocol && protocol.declarations.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <button
              onClick={repeatYesterdayProtocol}
              className="w-full glass-card p-4 border border-neon-cyan/30 hover:border-neon-cyan/50 rounded-lg flex items-center justify-between gap-4 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neon-cyan/20 rounded-lg group-hover:bg-neon-cyan/30 transition-colors">
                  <RotateCcw className="w-5 h-5 text-neon-cyan" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-white">Powtórz wczorajszy protokół</h3>
                  <p className="text-sm text-gray-400">
                    Skopiuj zadania, okna czasowe i intentions z wczoraj (
                    {formatDateHuman(yesterdayProtocol.targetDate)})
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-neon-cyan transition-colors" />
            </button>
          </motion.div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-500/20 border border-red-500 rounded-lg p-4"
          >
            <div className="flex items-start gap-3 mb-2">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <h3 className="font-semibold text-red-500">Błędy walidacji</h3>
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 ml-7">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Progress Indicator */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Postęp protokołu</span>
            <span className="text-sm text-gray-400">
              {
                [
                  selectedTaskIds.size > 0,
                  protocol.declarations.length > 0 &&
                    protocol.declarations.every((d) => d.doneCriteria && d.doneCriteria.length > 0),
                  protocol.implementationIntentions.length >= 3,
                  protocol.rules.length >= 1,
                ].filter(Boolean).length
              }{' '}
              / 4 kroków
            </span>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'Zadania', done: selectedTaskIds.size > 0 },
              {
                label: 'Done Criteria',
                done:
                  protocol.declarations.length > 0 &&
                  protocol.declarations.every((d) => d.doneCriteria && d.doneCriteria.length > 0),
              },
              { label: 'Intentions', done: protocol.implementationIntentions.length >= 3 },
              { label: 'Rules', done: protocol.rules.length >= 1 },
            ].map((step, idx) => (
              <div
                key={idx}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  step.done ? 'bg-neon-cyan' : 'bg-gray-700'
                }`}
                title={step.label}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Task Selection */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan font-bold">
              1
            </span>
            Wybierz zadania
          </h3>

          {selectableTasks.length === 0 ? (
            <div className="bg-gray-800/50 rounded-lg p-6 text-center text-gray-400">
              <p>Brak dostępnych zadań w aktywnych celach.</p>
              <p className="text-sm mt-2">Dodaj zadania do celów, aby móc je wybrać.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectableTasks.map(({ task, goal }) => {
                const isSelected = selectedTaskIds.has(task.id);
                return (
                  <motion.button
                    key={task.id}
                    onClick={() => toggleTaskSelection(task.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-neon-cyan bg-neon-cyan/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-neon-cyan" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{task.name}</span>
                          <span className="text-xs text-gray-400">({goal.name})</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>Progress: {task.progress}%</span>
                          <span>Type: {task.type}</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {selectedTaskIds.size > 0 && (
            <div className="mt-4 text-sm text-gray-400">
              Wybrano: {selectedTaskIds.size} {selectedTaskIds.size === 1 ? 'zadanie' : 'zadań'}
            </div>
          )}
        </motion.div>

        {/* Step 2: Done Criteria & Time Windows */}
        {selectedTaskIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan font-bold">
                2
              </span>
              Definicje DONE i okna czasowe
            </h3>

            <div className="space-y-4">
              {protocol.declarations.map((declaration) => {
                const taskData = selectableTasks.find((t) => t.task.id === declaration.taskId);
                if (!taskData) return null;

                const isExpanded = expandedDeclarations.has(declaration.id);
                const task = taskData.task;
                const goal = taskData.goal;

                return (
                  <motion.div
                    key={declaration.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden"
                  >
                    {/* Declaration header */}
                    <button
                      onClick={() => toggleDeclarationExpansion(declaration.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <div className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-neon-cyan" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-white">{task.name}</div>
                          <div className="text-xs text-gray-400">
                            {goal.name} • {declaration.timeWindow.start} -{' '}
                            {declaration.timeWindow.end}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {declaration.doneCriteria.length} kryteriów
                        </div>
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="p-4 space-y-4 border-t border-gray-700"
                      >
                        {/* Time Window Selector */}
                        <TimeWindowSelector
                          start={declaration.timeWindow.start}
                          end={declaration.timeWindow.end}
                          onChange={(start, end) =>
                            updateDeclarationTimeWindow(declaration.id, start, end)
                          }
                        />

                        {/* Done Criteria Editor */}
                        <DeclarationDoneCriteriaEditor
                          task={task}
                          criteria={declaration.doneCriteria}
                          onUpdate={(criteria) =>
                            updateDeclarationCriteria(declaration.id, criteria)
                          }
                        />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Step 3: Implementation Intentions */}
        {selectedTaskIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan font-bold">
                3
              </span>
              Implementation Intentions (min 3)
            </h3>

            <ImplementationIntentionsForm
              intentions={protocol.implementationIntentions}
              protocolId={protocol.id}
              goals={activeGoals}
              declarations={protocol.declarations.map((d) => ({
                taskId: d.taskId,
                goalId: d.goalId,
              }))}
              onUpdate={updateImplementationIntentions}
              minRequired={3}
            />
          </motion.div>
        )}

        {/* Step 4: Rules */}
        {selectedTaskIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan font-bold">
                4
              </span>
              Rules (min 1)
            </h3>

            <ProtocolRulesSelector
              rules={protocol.rules}
              allRules={data.customRules || []}
              protocolId={protocol.id}
              onUpdate={updateProtocolRules}
              onCreateNew={createNewRule}
              minRequired={1}
            />
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => setCurrentView('home')}
            className="px-6 py-3 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Anuluj
          </button>

          <button
            onClick={completeProtocol}
            disabled={showSuccess || isSaving}
            className="px-6 py-3 rounded-lg bg-neon-cyan text-obsidian font-semibold hover:bg-neon-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              'Zapisywanie...'
            ) : showSuccess ? (
              <>
                <CheckCircle size={20} />
                Zakończono
              </>
            ) : (
              'Zakończ protokół'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export default React.memo(EveningProtocolPremium);
