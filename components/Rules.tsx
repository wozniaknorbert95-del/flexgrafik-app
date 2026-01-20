import React, { useState } from 'react';
import { AppData, CustomRule } from '../types';

interface RulesProps {
  data: AppData;
  onUpdateRules: (rules: CustomRule[]) => void;
  onBack: () => void;
}

const Rules: React.FC<RulesProps> = ({ data, onUpdateRules, onBack }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null);
  const [newRule, setNewRule] = useState<Partial<CustomRule>>({
    name: '',
    trigger: 'time',
    condition: '',
    action: 'voice',
    message: '',
    active: true
  });

  const handleToggleRule = (ruleId: string) => {
    const updatedRules = data.customRules.map(rule =>
      rule.id === ruleId ? { ...rule, active: !rule.active } : rule
    );
    onUpdateRules(updatedRules);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = data.customRules.filter(rule => rule.id !== ruleId);
    onUpdateRules(updatedRules);
  };

  const handleAddRule = () => {
    if (!newRule.name || !newRule.condition || !newRule.message) {
      alert('Wypełnij wszystkie pola');
      return;
    }

    const rule: CustomRule = {
      id: `rule_${Date.now()}`,
      name: newRule.name!,
      trigger: newRule.trigger as CustomRule['trigger'],
      condition: newRule.condition!,
      action: newRule.action as CustomRule['action'],
      message: newRule.message!,
      active: newRule.active!
    };

    const updatedRules = [...data.customRules, rule];
    onUpdateRules(updatedRules);

    setNewRule({
      name: '',
      trigger: 'time',
      condition: '',
      action: 'voice',
      message: '',
      active: true
    });
    setShowAddForm(false);
  };

  const getTriggerDisplay = (trigger: CustomRule['trigger']) => {
    switch (trigger) {
      case 'time': return '🕐 Czas';
      case 'data': return '📊 Dane';
      case 'manual': return '👆 Manualny';
      default: return trigger;
    }
  };

  const getActionDisplay = (action: CustomRule['action']) => {
    switch (action) {
      case 'voice': return '🔊 Głos';
      case 'ai_voice': return '🤖 AI + Głos';
      case 'notification': return '🔔 Powiadomienie';
      case 'block_action': return '🚫 Blokada';
      default: return action;
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6 border-b border-gray-800 pb-4">
        <button
          onClick={onBack}
          className="text-cyber-cyan hover:text-cyber-magenta transition-colors mb-2"
        >
          ← Powrót
        </button>
        <h1 className="text-xl font-bold text-cyber-cyan tracking-widest uppercase mb-1">Reguły Powiadomień</h1>
        <p className="text-xs text-gray-400 font-mono">Konfiguracja automatycznych alertów</p>
      </div>

      {/* Rules List */}
      <div className="space-y-4 mb-6">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">📋 Aktywne Reguły ({data.customRules.filter(r => r.active).length}/{data.customRules.length})</h2>

        {data.customRules.map(rule => (
          <div key={rule.id} className="bg-cyber-panel border border-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white mb-1">{rule.name}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <span>{getTriggerDisplay(rule.trigger)}</span>
                  <span>→</span>
                  <span>{getActionDisplay(rule.action)}</span>
                </div>
                <p className="text-xs text-gray-500 font-mono mb-1">
                  IF: {rule.condition}
                </p>
                <p className="text-xs text-gray-300">
                  {rule.message.length > 50 ? rule.message.substring(0, 50) + '...' : rule.message}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    rule.active ? 'bg-cyber-magenta' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform absolute top-1 ${
                    rule.active ? 'translate-x-4' : 'translate-x-1'
                  }`} />
                </button>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
            {rule.lastTriggered && (
              <p className="text-xs text-gray-500">
                Ostatnio uruchomiona: {new Date(rule.lastTriggered).toLocaleString('pl-PL')}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Add Rule Button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full bg-cyber-magenta hover:bg-opacity-80 text-black font-bold py-3 px-4 rounded-lg transition-colors mb-4"
        >
          ➕ Dodaj Nową Regułę
        </button>
      )}

      {/* Add Rule Form */}
      {showAddForm && (
        <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-bold text-white mb-4">Nowa Reguła</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nazwa reguły</label>
              <input
                type="text"
                value={newRule.name || ''}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-magenta"
                placeholder="np. Poranna motywacja"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Trigger</label>
              <select
                value={newRule.trigger || 'time'}
                onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value as CustomRule['trigger'] })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-magenta"
              >
                <option value="time">🕐 Czas - codziennie o danej godzinie</option>
                <option value="data">📊 Dane - gdy warunki są spełnione</option>
                <option value="manual">👆 Manualny - uruchamiany ręcznie</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Warunek</label>
              <input
                type="text"
                value={newRule.condition || ''}
                onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-magenta"
                placeholder="np. 07:00 lub pillars[0].completion >= 90"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Akcja</label>
              <select
                value={newRule.action || 'voice'}
                onChange={(e) => setNewRule({ ...newRule, action: e.target.value as CustomRule['action'] })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-magenta"
              >
                <option value="voice">🔊 Głos - przeczytaj wiadomość</option>
                <option value="ai_voice">🤖 AI + Głos - zapytaj AI i przeczytaj odpowiedź</option>
                <option value="notification">🔔 Powiadomienie - pokaż alert</option>
                <option value="block_action">🚫 Blokada - zablokuj akcję użytkownika</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Wiadomość</label>
              <textarea
                value={newRule.message || ''}
                onChange={(e) => setNewRule({ ...newRule, message: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-magenta h-20 resize-none"
                placeholder="Treść wiadomości lub 'AI: [prompt]' dla AI"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddRule}
                className="flex-1 bg-cyber-magenta hover:bg-opacity-80 text-black font-bold py-2 px-4 rounded text-sm transition-colors"
              >
                💾 Zapisz Regułę
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
                    active: true
                  });
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded text-sm transition-colors"
              >
                ❌ Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">ℹ️ Przykłady Warunków</h3>
        <div className="text-xs text-gray-500 space-y-1">
          <div><strong>Time:</strong> "07:00", "20:30"</div>
          <div><strong>Data:</strong> "pillars[0].completion &gt;= 90"</div>
          <div><strong>Data:</strong> "pillars.some(p =&gt; p.days_stuck &gt; 5)"</div>
          <div><strong>Data:</strong> "sprint.progress.filter(d =&gt; !d.checked).length &lt;= 2"</div>
        </div>
      </div>
    </div>
  );
};

export default Rules;