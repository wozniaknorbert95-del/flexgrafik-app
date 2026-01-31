import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AppData, CustomRule } from '../types';
import { validateRuleCondition, sanitizeInput } from '../utils/inputValidation';

interface RulesProps {
  data: AppData;
  onUpdateRules: (rules: CustomRule[]) => void;
  onBack: () => void;
}

const RulesPremium: React.FC<RulesProps> = ({ data, onUpdateRules, onBack }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState<Partial<CustomRule>>({
    name: '',
    trigger: 'time',
    condition: '',
    action: 'voice',
    message: '',
    active: true,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const formatTriggerLabel = (t: CustomRule['trigger']): string => {
    if (t === 'time') return '🕐 czas';
    if (t === 'data') return '📊 dane';
    if (t === 'manual') return '👆 ręcznie';
    return String(t);
  };

  const formatActionLabel = (a: CustomRule['action']): string => {
    if (a === 'voice') return '🔊 głos';
    if (a === 'ai_voice') return '🤖 AI + głos';
    if (a === 'notification') return '🔔 powiadomienie';
    if (a === 'block_action') return '🚫 blokada';
    return String(a);
  };

  const handleToggleRule = (ruleId: string) => {
    const updatedRules = data.customRules.map((rule) =>
      rule.id === ruleId ? { ...rule, active: !rule.active } : rule
    );
    onUpdateRules(updatedRules);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = data.customRules.filter((rule) => rule.id !== ruleId);
    onUpdateRules(updatedRules);
  };

  const handleAddRule = () => {
    // Clear previous errors
    setValidationErrors({});

    // Validate all fields
    const errors: Record<string, string> = {};

    if (!newRule.name?.trim()) {
      errors.name = 'Wpisz nazwę reguły.';
    } else if (newRule.name.length > 100) {
      errors.name = 'Nazwa jest za długa (max 100 znaków).';
    }

    if (!newRule.condition?.trim()) {
      errors.condition = 'Wpisz warunek.';
    } else {
      const conditionValidation = validateRuleCondition(newRule.condition);
      if (!conditionValidation.isValid) {
        errors.condition = conditionValidation.error || 'Nieprawidłowy warunek.';
      }
    }

    if (!newRule.message?.trim()) {
      errors.message = 'Wpisz wiadomość.';
    } else if (newRule.message.length > 200) {
      errors.message = 'Wiadomość jest za długa (max 200 znaków).';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const rule: CustomRule = {
      id: `rule_${Date.now()}`,
      name: sanitizeInput(newRule.name!, { maxLength: 100 }),
      trigger: newRule.trigger as CustomRule['trigger'],
      condition: newRule.condition!,
      action: newRule.action as CustomRule['action'],
      message: sanitizeInput(newRule.message!, { maxLength: 200 }),
      active: newRule.active!,
    };

    onUpdateRules([...data.customRules, rule]);
    setNewRule({
      name: '',
      trigger: 'time',
      condition: '',
      action: 'voice',
      message: '',
      active: true,
    });
    setValidationErrors({});
    setShowAddForm(false);
  };

  return (
    <div className="min-h-screen pb-32 pt-8 px-6">
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={onBack} className="btn-premium btn-cyan mb-8">
          ← Wróć
        </button>

        <div className="flex items-center gap-4 mb-4">
          <span className="text-6xl">⚡</span>
          <h1 className="text-6xl font-extrabold uppercase tracking-wider text-gradient-gold">
            Reguły
          </h1>
        </div>
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          /// Automatyczny system powiadomień
        </p>
      </motion.div>

      {/* Rules List */}
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gradient-neon uppercase tracking-wider">
            Aktywne reguły ({data.customRules.filter((r) => r.active).length}/
            {data.customRules.length})
          </h2>
        </div>

        {data.customRules.length === 0 ? (
          <div className="glass-card space-widget-lg text-center">
            <span className="text-6xl mb-4 block">📋</span>
            <h3 className="text-2xl font-bold text-white mb-3">Brak reguł</h3>
            <p className="text-gray-400 mb-6">
              Ustaw automatyczne powiadomienia, żeby trzymać się ustaleń
            </p>
            <button onClick={() => setShowAddForm(true)} className="btn-premium btn-magenta">
              Utwórz pierwszą regułę
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {data.customRules.map((rule, index) => (
              <motion.div
                key={rule.id}
                className={`glass-card space-widget ${rule.active ? 'glass-card-cyan' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{rule.name}</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 rounded-widget-sm text-xs font-bold uppercase bg-neon-cyan/20 border border-neon-cyan/50 text-glow-cyan">
                        {formatTriggerLabel(rule.trigger)}
                      </span>
                      <span className="text-gray-500">→</span>
                      <span className="px-3 py-1 rounded-widget-sm text-xs font-bold uppercase bg-neon-magenta/20 border border-neon-magenta/50 text-glow-magenta">
                        {formatActionLabel(rule.action)}
                      </span>
                    </div>
                    <div className="bg-obsidian-light rounded-widget-sm p-3 mb-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        Warunek:
                      </p>
                      <p className="text-sm font-mono text-white">{rule.condition}</p>
                    </div>
                    <p className="text-sm text-gray-400">{rule.message}</p>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <button
                      type="button"
                      className={`toggle-premium ${rule.active ? 'active' : ''}`}
                      onClick={() => handleToggleRule(rule.id)}
                      aria-pressed={rule.active}
                      aria-label={rule.active ? 'Wyłącz regułę' : 'Włącz regułę'}
                      title={rule.active ? 'Wyłącz regułę' : 'Włącz regułę'}
                    >
                      <div className="toggle-thumb" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-[var(--accent-danger)] hover:opacity-90 text-xl"
                      aria-label="Usuń regułę"
                      title="Usuń regułę"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {rule.lastTriggered && (
                  <div className="text-xs text-gray-500 pt-3 border-t border-white/10">
                    Ostatnio uruchomione: {new Date(rule.lastTriggered).toLocaleString('pl-PL')}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Add Rule Button */}
      {!showAddForm && data.customRules.length > 0 && (
        <div className="widget-container-narrow mb-12">
          <button onClick={() => setShowAddForm(true)} className="btn-premium btn-magenta w-full">
            ➕ Dodaj nową regułę
          </button>
        </div>
      )}

      {/* Add Rule Form */}
      {showAddForm && (
        <motion.div
          className="widget-container-narrow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="glass-card glass-card-gold space-widget-lg">
            <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">
              Nowa reguła
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">
                  Nazwa
                </label>
                <input
                  type="text"
                  value={newRule.name || ''}
                  onChange={(e) => {
                    setNewRule({ ...newRule, name: e.target.value });
                    if (validationErrors.name) {
                      setValidationErrors({ ...validationErrors, name: '' });
                    }
                  }}
                  placeholder="np. Poranna motywacja"
                  className={`input-premium ${validationErrors.name ? 'border-[var(--accent-danger)]' : ''}`}
                />
                {validationErrors.name && (
                  <p className="text-[var(--accent-danger)] text-xs mt-1">
                    {validationErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">
                  Wyzwalacz
                </label>
                <select
                  value={newRule.trigger || 'time'}
                  onChange={(e) =>
                    setNewRule({ ...newRule, trigger: e.target.value as CustomRule['trigger'] })
                  }
                  className="input-premium"
                >
                  <option value="time">🕐 Czas — codziennie o konkretnej godzinie</option>
                  <option value="data">📊 Dane — gdy warunek jest spełniony</option>
                  <option value="manual">👆 Ręcznie — uruchamiane ręcznie</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">
                  Warunek
                </label>
                <input
                  type="text"
                  value={newRule.condition || ''}
                  onChange={(e) => {
                    setNewRule({ ...newRule, condition: e.target.value });
                    if (validationErrors.condition) {
                      setValidationErrors({ ...validationErrors, condition: '' });
                    }
                  }}
                  placeholder="np. 07:00 lub pillars[0].completion >= 90"
                  className={`input-premium font-mono ${validationErrors.condition ? 'border-[var(--accent-danger)]' : ''}`}
                />
                {validationErrors.condition && (
                  <p className="text-[var(--accent-danger)] text-xs mt-1">
                    {validationErrors.condition}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">
                  Akcja
                </label>
                <select
                  value={newRule.action || 'voice'}
                  onChange={(e) =>
                    setNewRule({ ...newRule, action: e.target.value as CustomRule['action'] })
                  }
                  className="input-premium"
                >
                  <option value="voice">🔊 Głos — odczytaj wiadomość</option>
                  <option value="ai_voice">🤖 AI + głos — zapytaj AI i odczytaj</option>
                  <option value="notification">🔔 Powiadomienie — pokaż toast</option>
                  <option value="block_action">🚫 Blokada — zablokuj akcję użytkownika</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">
                  Wiadomość
                </label>
                <textarea
                  value={newRule.message || ''}
                  onChange={(e) => {
                    setNewRule({ ...newRule, message: e.target.value });
                    if (validationErrors.message) {
                      setValidationErrors({ ...validationErrors, message: '' });
                    }
                  }}
                  placeholder="Treść wiadomości lub „AI: [prompt]” dla AI"
                  className={`input-premium min-h-[100px] ${validationErrors.message ? 'border-[var(--accent-danger)]' : ''}`}
                />
                {validationErrors.message && (
                  <p className="text-[var(--accent-danger)] text-xs mt-1">
                    {validationErrors.message}
                  </p>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={handleAddRule} className="btn-premium btn-magenta flex-1">
                  💾 Zapisz regułę
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewRule({
                      name: '',
                      trigger: 'time',
                      condition: '',
                      action: 'voice',
                      message: '',
                      active: true,
                    });
                  }}
                  className="btn-premium btn-cyan flex-1"
                >
                  ❌ Anuluj
                </button>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="glass-card space-widget mt-6">
            <h4 className="text-sm font-bold text-glow-cyan mb-4 uppercase tracking-wider">
              ℹ️ Przykłady warunków
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="bg-obsidian-light px-3 py-2 rounded-widget-sm">
                <span className="text-neon-cyan">Czas:</span> "07:00", "20:30"
              </div>
              <div className="bg-obsidian-light px-3 py-2 rounded-widget-sm">
                <span className="text-neon-cyan">Dane:</span> "pillars[0].completion &gt;= 90"
              </div>
              <div className="bg-obsidian-light px-3 py-2 rounded-widget-sm">
                <span className="text-neon-cyan">Dane:</span> "pillars.some(p =&gt; p.days_stuck
                &gt; 5)"
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default RulesPremium;
