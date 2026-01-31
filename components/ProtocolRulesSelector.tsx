/**
 * Protocol Rules Selector
 *
 * Component for selecting and linking Rules in Evening Protocol.
 * Allows users to:
 * - Link existing rules
 * - Create new rules (simplified wizard)
 * - Validate minimum 1 rule required
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomRule } from '../types';
import { generateUUID } from '../utils/uuid';
import { showWarning } from '../utils/toastService';
import { Plus, X, Link, Shield, CheckCircle2, Trash2 } from 'lucide-react';

interface ProtocolRulesSelectorProps {
  rules: CustomRule[];
  allRules: CustomRule[]; // All available rules from AppData
  protocolId: string;
  onUpdate: (rules: CustomRule[]) => void;
  onCreateNew: (rule: CustomRule) => void; // Callback to create new rule in AppData
  minRequired?: number;
}

export const ProtocolRulesSelector: React.FC<ProtocolRulesSelectorProps> = ({
  rules: selectedRules,
  allRules,
  protocolId,
  onUpdate,
  onCreateNew,
  minRequired = 1,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showLinkExisting, setShowLinkExisting] = useState(false);

  // New rule form state
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTrigger, setNewRuleTrigger] = useState<'time' | 'data' | 'manual'>('time');
  const [newRuleCondition, setNewRuleCondition] = useState('09:00'); // Default time
  const [newRuleAction, setNewRuleAction] = useState<
    'voice' | 'ai_voice' | 'notification' | 'block_action'
  >('notification');
  const [newRuleMessage, setNewRuleMessage] = useState('');

  // Available rules (not already selected)
  const availableRules = useMemo(() => {
    const selectedIds = new Set(selectedRules.map((r) => r.id));
    return allRules.filter((r) => !selectedIds.has(r.id));
  }, [allRules, selectedRules]);

  const linkExistingRule = (rule: CustomRule) => {
    if (selectedRules.some((r) => r.id === rule.id)) {
      return; // Already selected
    }
    const updated = [...selectedRules, rule];
    onUpdate(updated);
    setShowLinkExisting(false);
  };

  const unlinkRule = (ruleId: string) => {
    if (selectedRules.length <= minRequired) {
      showWarning(`Musisz mieć minimum ${minRequired} regułę.`, 5000);
      return;
    }
    const updated = selectedRules.filter((r) => r.id !== ruleId);
    onUpdate(updated);
  };

  const createNewRule = () => {
    if (!newRuleName.trim() || !newRuleMessage.trim()) {
      showWarning('Wypełnij wszystkie wymagane pola.', 5000);
      return;
    }

    // Simple condition validation for time trigger
    if (newRuleTrigger === 'time') {
      // Input type="time" returns format HH:mm, validate it
      if (!newRuleCondition || !newRuleCondition.match(/^\d{2}:\d{2}$/)) {
        showWarning('Dla wyzwalacza „Czas” wybierz godzinę (format HH:mm).', 6000);
        return;
      }
    }

    if (newRuleTrigger === 'data' && !newRuleCondition.trim()) {
      showWarning('Dla wyzwalacza „Warunek danych” podaj warunek.', 6000);
      return;
    }

    const newRule: CustomRule = {
      id: generateUUID(),
      name: newRuleName.trim(),
      trigger: newRuleTrigger,
      condition: newRuleCondition.trim() || (newRuleTrigger === 'time' ? '09:00' : 'true'),
      action: newRuleAction,
      message: newRuleMessage.trim(),
      active: true,
    };

    // Create in AppData first
    onCreateNew(newRule);

    // Then add to protocol
    const updated = [...selectedRules, newRule];
    onUpdate(updated);

    // Reset form
    setNewRuleName('');
    setNewRuleTrigger('time');
    setNewRuleCondition('09:00'); // Reset to default
    setNewRuleAction('notification');
    setNewRuleMessage('');
    setIsAdding(false);
  };

  const cancelAdd = () => {
    setNewRuleName('');
    setNewRuleTrigger('time');
    setNewRuleCondition('09:00'); // Reset to default
    setNewRuleAction('notification');
    setNewRuleMessage('');
    setIsAdding(false);
    setShowLinkExisting(false);
  };

  const meetsMinimum = selectedRules.length >= minRequired;

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
            <Shield className="w-4 h-4 text-neon-cyan" />
            Reguły
          </h4>
          <p className="text-xs text-gray-400 mt-1">
            Automatyzacje i powiadomienia • Wymagane: minimum {minRequired}
          </p>
        </div>
        <div className="text-xs text-gray-400">
          {selectedRules.length}/{minRequired} {meetsMinimum ? '✅' : '⚠️'}
        </div>
      </div>

      {/* Selected Rules List */}
      <div className="space-y-2 mb-4">
        <AnimatePresence>
          {selectedRules.map((rule) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-gray-800/50 rounded-lg border border-gray-700 p-3"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-neon-cyan flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white mb-1">{rule.name}</div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>
                      <span className="text-gray-500">Wyzwalacz:</span>{' '}
                      {rule.trigger === 'time'
                        ? 'Czas'
                        : rule.trigger === 'data'
                          ? 'Warunek danych'
                          : 'Ręczne'}
                      {rule.trigger === 'time' && <span className="ml-2">({rule.condition})</span>}
                    </div>
                    <div>
                      <span className="text-gray-500">Akcja:</span>{' '}
                      {rule.action === 'notification'
                        ? 'Powiadomienie'
                        : rule.action === 'ai_voice'
                          ? 'Głos AI'
                          : rule.action === 'voice'
                            ? 'Głos'
                            : 'Blokada akcji'}
                    </div>
                    <div className="text-gray-300 mt-1">{rule.message}</div>
                  </div>
                </div>
                <button
                  onClick={() => unlinkRule(rule.id)}
                  disabled={selectedRules.length <= minRequired}
                  className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Usuń regułę"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add/Link Form */}
      <AnimatePresence>
        {(isAdding || showLinkExisting) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-800/50 rounded-lg border border-neon-cyan/30 p-4 space-y-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-semibold text-white">
                {showLinkExisting ? 'Linkuj istniejącą regułę' : 'Utwórz nową regułę'}
              </h5>
              <button onClick={cancelAdd} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {showLinkExisting ? (
              /* Link Existing Rules */
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableRules.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-4">
                    Brak dostępnych reguł do linkowania
                  </div>
                ) : (
                  availableRules.map((rule) => (
                    <button
                      key={rule.id}
                      onClick={() => linkExistingRule(rule)}
                      className="w-full text-left p-3 rounded-lg border border-gray-700 hover:border-neon-cyan bg-gray-900/50 hover:bg-gray-800 transition-colors"
                    >
                      <div className="font-semibold text-white text-sm mb-1">{rule.name}</div>
                      <div className="text-xs text-gray-400">
                        {rule.trigger} {'→'} {rule.action}
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              /* Create New Rule */
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nazwa reguły *</label>
                  <input
                    type="text"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    placeholder="np. Przypomnienie o porannej sesji"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Trigger *</label>
                  <select
                    value={newRuleTrigger}
                    onChange={(e) => {
                      const trigger = e.target.value as 'time' | 'data' | 'manual';
                      setNewRuleTrigger(trigger);
                      if (trigger === 'time') {
                        // Set default time if empty
                        setNewRuleCondition(newRuleCondition || '09:00');
                      } else {
                        setNewRuleCondition('');
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
                  >
                    <option value="time">Czas (o określonej godzinie)</option>
                    <option value="data">Warunek danych</option>
                    <option value="manual">Ręczne wywołanie</option>
                  </select>
                </div>

                {newRuleTrigger === 'time' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Godzina (HH:mm) *</label>
                    <input
                      type="time"
                      value={newRuleCondition}
                      onChange={(e) => setNewRuleCondition(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
                    />
                  </div>
                )}

                {newRuleTrigger === 'data' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Warunek (np. stuckCount {'>'} 0) *
                    </label>
                    <input
                      type="text"
                      value={newRuleCondition}
                      onChange={(e) => setNewRuleCondition(e.target.value)}
                      placeholder="np. stuckCount > 0"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Akcja *</label>
                  <select
                    value={newRuleAction}
                    onChange={(e) => setNewRuleAction(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
                  >
                    <option value="notification">Powiadomienie</option>
                    <option value="voice">Głos</option>
                    <option value="ai_voice">Głos AI</option>
                    <option value="block_action">Blokada akcji</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Wiadomość *</label>
                  <textarea
                    value={newRuleMessage}
                    onChange={(e) => setNewRuleMessage(e.target.value)}
                    placeholder="Treść powiadomienia lub wiadomości"
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={cancelAdd}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors text-sm"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={createNewRule}
                    disabled={!newRuleName.trim() || !newRuleMessage.trim()}
                    className="flex-1 px-4 py-2 rounded-lg bg-neon-cyan text-obsidian font-semibold hover:bg-neon-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Utwórz
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      {!isAdding && !showLinkExisting && (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsAdding(true);
              setShowLinkExisting(false);
            }}
            className="flex-1 py-2 px-3 rounded-lg border border-dashed border-gray-600 hover:border-neon-cyan text-gray-400 hover:text-neon-cyan transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Utwórz nową
          </button>
          {availableRules.length > 0 && (
            <button
              onClick={() => {
                setShowLinkExisting(true);
                setIsAdding(false);
              }}
              className="flex-1 py-2 px-3 rounded-lg border border-gray-700 hover:border-neon-cyan text-gray-300 hover:text-neon-cyan transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Link className="w-4 h-4" />
              Linkuj istniejącą
            </button>
          )}
        </div>
      )}

      {/* Validation Message */}
      {!meetsMinimum && (
        <div className="text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded">
          ⚠️ Dodaj jeszcze {minRequired - selectedRules.length}{' '}
          {minRequired - selectedRules.length === 1 ? 'regułę' : 'reguły'} aby ukończyć protokół
        </div>
      )}
    </motion.div>
  );
};
