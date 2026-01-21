import React, { useState } from 'react';
import { AppData } from '../types';
import { generateDailyPriorities, chatWithAI } from '../services/aiService';
import { getSystemPrompt } from '../prompts/systemPrompt';
import { useVoiceNotify } from '../utils/voiceUtils';
import { withErrorHandling } from '../utils/errorHandler';

// Strategy validation and management utilities
const validateStrategy = (json: any): boolean => {
  try {
    // Check required fields exist
    if (!json.pillars || !Array.isArray(json.pillars)) return false;
    if (!json.phases || !Array.isArray(json.phases)) return false;
    if (!json.sprint || typeof json.sprint !== 'object') return false;

    // Check pillars structure
    if (json.pillars.length === 0) return false;
    const pillarsValid = json.pillars.every((p: any) =>
      p.id && p.name && typeof p.completion === 'number' &&
      p.done_definition && Array.isArray(p.tasks)
    );
    if (!pillarsValid) return false;

    // Check phases structure
    const phasesValid = json.phases.every((phase: any) =>
      phase.phase && phase.name && typeof phase.completion === 'number' &&
      Array.isArray(phase.checklist)
    );
    if (!phasesValid) return false;

    return true;
  } catch (error) {
    console.error('Strategy validation error:', error);
    return false;
  }
};

const migrateStrategy = (json: any): Partial<AppData> => {
  // Add missing fields with defaults
  const migrated: Partial<AppData> = { ...json };

  // Add customRules if missing
  if (!migrated.customRules) {
    migrated.customRules = [];
  }

  // Add notificationHistory if missing
  if (!migrated.notificationHistory) {
    migrated.notificationHistory = [];
  }

  // Add aiChatHistory if missing
  if (!migrated.aiChatHistory) {
    migrated.aiChatHistory = [];
  }

  // Ensure settings structure is complete
  if (!migrated.settings) {
    migrated.settings = {
      voice: { enabled: true, volume: 80, speed: 1.0 },
      ai: { apiKey: '', enabled: false }
    };
  }

  return migrated;
};

interface SettingsProps {
  data: AppData;
  onUpdateSettings: (settings: AppData['settings']) => void;
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ data, onUpdateSettings, onBack }) => {
  const { voice, ai } = data.settings;
  const [loading, setLoading] = useState(false);
  const voiceNotify = useVoiceNotify(voice);

  const handleVoiceToggle = () => {
    onUpdateSettings({
      ...data.settings,
      voice: { ...voice, enabled: !voice.enabled }
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseInt(e.target.value);
    onUpdateSettings({
      ...data.settings,
      voice: { ...voice, volume }
    });
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const speed = parseFloat(e.target.value);
    onUpdateSettings({
      ...data.settings,
      voice: { ...voice, speed }
    });
  };

  const handleTestVoice = () => {
    // Test voice notification
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesis.cancel();

      const testMessage = "Test powiadomienia głosowego. Dzień dobry, to jest test ustawień głosowych.";
      const utterance = new SpeechSynthesisUtterance(testMessage);

      const voices = speechSynthesis.getVoices();
      const polishVoice = voices.find(voice => voice.lang.startsWith('pl'));
      const englishVoice = voices.find(voice => voice.lang.startsWith('en'));

      utterance.voice = polishVoice || englishVoice || voices[0];
      utterance.lang = polishVoice ? 'pl-PL' : 'en-US';
      utterance.volume = voice.volume / 100;
      utterance.rate = voice.speed;

      speechSynthesis.speak(utterance);
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
        <h1 className="text-xl font-bold text-cyber-cyan tracking-widest uppercase mb-1">Ustawienia</h1>
        <p className="text-xs text-gray-400 font-mono">Konfiguracja aplikacji</p>
      </div>

      {/* Voice Settings Section */}
      <div className="space-y-6">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4">🔊 Powiadomienia Głosowe</h2>

        {/* Enable/Disable Toggle */}
        <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Włącz powiadomienia głosowe</h3>
              <p className="text-xs text-gray-400">Otrzymuj głosowe alerty i powiadomienia</p>
            </div>
            <button
              onClick={handleVoiceToggle}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                voice.enabled ? 'bg-cyber-magenta' : 'bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                voice.enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        {/* Volume Slider */}
        <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4">
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-white">Głośność</h3>
              <span className="text-xs text-cyber-cyan font-mono">{voice.volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={voice.volume}
              onChange={handleVolumeChange}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>

        {/* Speed Slider */}
        <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4">
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-white">Szybkość mówienia</h3>
              <span className="text-xs text-cyber-cyan font-mono">{voice.speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.1"
              value={voice.speed}
              onChange={handleSpeedChange}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>

        {/* Test Button */}
        <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4">
          <button
            onClick={handleTestVoice}
            className="w-full bg-cyber-magenta hover:bg-opacity-80 text-black font-bold py-3 px-4 rounded-lg transition-colors"
          >
            🎵 Test powiadomienia głosowego
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Sprawdź jak będą brzmieć powiadomienia
          </p>
        </div>
      </div>

      {/* AI Coach Settings Section */}
      <div className="space-y-6">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4">🤖 AI Coach</h2>

        {/* Enable/Disable AI Toggle */}
        <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Włącz AI Coach</h3>
              <p className="text-xs text-gray-400">Otrzymuj AI-powered wskazówki i priorytety</p>
            </div>
            <button
              onClick={() => onUpdateSettings({
                ...data.settings,
                ai: { ...ai, enabled: !ai.enabled }
              })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                ai.enabled ? 'bg-cyber-magenta' : 'bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                ai.enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        {/* API Key Input */}
        <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-white mb-2">Groq API Key</h3>
            <input
              type="password"
              value={ai.apiKey}
              onChange={(e) => onUpdateSettings({
                ...data.settings,
                ai: { ...ai, apiKey: e.target.value }
              })}
              placeholder="Wprowadź swój API key..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-magenta"
            />
            <p className="text-xs text-gray-400 mt-2">
              API key z <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-cyber-cyan hover:text-cyber-magenta">Groq Console</a> (darmowe 30 req/min)
            </p>
          </div>
        </div>

        {/* AI Test Button */}
        <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4">
          <button
            onClick={async () => {
              if (!ai.apiKey) {
                alert('Dodaj API Key najpierw');
                return;
              }
              setLoading(true);
              const response = await withErrorHandling(
                () => generateDailyPriorities(data),
                {
                  component: 'Settings',
                  action: 'testAI',
                  userMessage: 'Nie udało się przetestować AI.'
                }
              );

              if (response) {
                alert(`AI: ${response}`);
                if (voice.enabled) {
                  voiceNotify(response, 'normal');
                }
              }
              setLoading(false);
            }}
            disabled={loading || !ai.enabled}
            className="w-full bg-cyber-magenta hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? '⏳ AI myśli...' : '🧪 Test AI (Priorytety)'}
          </button>
        </div>
      </div>

      {/* AI Coach Personality Section */}
      <div className="space-y-6">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4">🎭 AI Coach Personality</h2>

        {/* System Prompt Editor */}
        <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white mb-2">System Prompt</h3>
            <p className="text-xs text-gray-400 mb-3">
              Dostosuj osobowość AI Coach. Określa jak AI myśli i odpowiada.
            </p>
            <textarea
              value={ai.customSystemPrompt || getSystemPrompt(data)}
              onChange={(e) => onUpdateSettings({
                ...data.settings,
                ai: { ...ai, customSystemPrompt: e.target.value }
              })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-magenta resize-none font-mono"
              rows={8}
              placeholder="Wprowadź system prompt..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onUpdateSettings({
                ...data.settings,
                ai: { ...ai, customSystemPrompt: undefined }
              })}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded text-sm transition-colors"
            >
              🔄 Reset do Default
            </button>
            <button
              onClick={async () => {
                if (!ai.apiKey) {
                  alert('Dodaj API Key najpierw');
                  return;
                }

                const testPrompt = ai.customSystemPrompt || getSystemPrompt(data);
                const testMessages = [{ role: 'user' as const, content: 'Cześć! Kim jesteś i jak możesz mi pomóc?' }];

                setLoading(true);
                const response = await withErrorHandling(
                  () => chatWithAI(testMessages, testPrompt, ai.apiKey),
                  {
                    component: 'Settings',
                    action: 'testPrompt',
                    userMessage: 'Nie udało się przetestować prompt.'
                  }
                );

                if (response) {
                  alert(`🤖 Test odpowiedzi:\n\n${response}`);
                  if (voice.enabled) {
                    voiceNotify(response, 'normal');
                  }
                }
                setLoading(false);
              }}
              disabled={loading || !ai.enabled}
              className="flex-1 bg-cyber-cyan hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-2 px-4 rounded text-sm transition-colors"
            >
              {loading ? '⏳ Test...' : '🧪 Test Prompt'}
            </button>
          </div>
        </div>
      </div>

      {/* Strategy Management Section */}
      <div className="space-y-6">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4">📋 Strategy Management</h2>

        {/* Export Strategy */}
        <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-bold text-white mb-3">💾 Export Current Strategy</h3>
          <p className="text-xs text-gray-400 mb-4">
            Pobierz aktualny plan strategiczny jako plik JSON do backupu lub edycji.
          </p>
          <button
            onClick={() => {
              const strategyData = {
                pillars: data.pillars,
                phases: data.phases,
                sprint: data.sprint,
                customRules: data.customRules,
                exportedAt: new Date().toISOString(),
                version: '1.0'
              };

              const blob = new Blob([JSON.stringify(strategyData, null, 2)], {
                type: 'application/json'
              });

              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `flexgrafik-strategy-${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);

              alert('Strategia została pobrana!');
            }}
            className="w-full bg-cyber-green hover:bg-opacity-80 text-black font-bold py-3 px-4 rounded-lg transition-colors"
          >
            💾 Export Strategy (JSON)
          </button>
        </div>

        {/* Import Strategy */}
        <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-bold text-white mb-3">📥 Import New Strategy</h3>
          <p className="text-xs text-gray-400 mb-4">
            Wklej JSON strategii i zastąp aktualny plan. <strong>To nieodwracalna operacja!</strong>
          </p>

          <textarea
            placeholder={`Wklej tutaj JSON strategii...\n\nPrzykład struktury:\n{\n  "pillars": [...],\n  "phases": [...],\n  "sprint": {...},\n  "customRules": [...]\n}`}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-magenta resize-none font-mono mb-4"
            rows={6}
            style={{ tabSize: 2 }}
          />

          <button
            onClick={async () => {
              const textarea = document.querySelector('textarea[placeholder*="Wklej tutaj JSON"]') as HTMLTextAreaElement;
              const jsonText = textarea?.value?.trim();

              if (!jsonText) {
                alert('Wklej JSON strategii najpierw.');
                return;
              }

              try {
                const importedData = JSON.parse(jsonText);

                // Validate structure
                if (!validateStrategy(importedData)) {
                  alert('❌ Nieprawidłowa struktura JSON. Sprawdź czy wszystkie wymagane pola są obecne.');
                  return;
                }

                // Confirm replacement
                const confirmMessage = `⚠️ To zastąpi aktualny plan strategiczny!\n\nZaimportowane dane zawierają:\n• ${importedData.pillars?.length || 0} filarów\n• ${importedData.phases?.length || 0} faz\n• ${importedData.customRules?.length || 0} reguł\n\nKontynuować?`;

                if (!confirm(confirmMessage)) {
                  return;
                }

                // Migrate and apply
                const migratedData = migrateStrategy(importedData);
                const newAppData = { ...data, ...migratedData };

                // Update all settings at once
                onUpdateSettings(newAppData.settings);

                // Trigger full app reload to apply changes
                alert('✅ Strategia została zaimportowana! Odświeżam aplikację...');
                window.location.reload();

              } catch (error) {
                alert('❌ Błąd parsowania JSON. Sprawdź składnię.');
                console.error('Import error:', error);
              }
            }}
            className="w-full bg-cyber-gold hover:bg-opacity-80 text-black font-bold py-3 px-4 rounded-lg transition-colors"
          >
            📥 Import & Replace Strategy
          </button>
        </div>

        {/* Strategy Editor Preview */}
        <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-bold text-white mb-3">🎯 Quick Stats</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-900/50 rounded p-3">
              <div className="text-xl font-bold text-cyber-magenta">{data.pillars.length}</div>
              <div className="text-xs text-gray-400">Filarów</div>
            </div>
            <div className="bg-gray-900/50 rounded p-3">
              <div className="text-xl font-bold text-cyber-cyan">{data.phases.length}</div>
              <div className="text-xs text-gray-400">Faz</div>
            </div>
            <div className="bg-gray-900/50 rounded p-3">
              <div className="text-xl font-bold text-cyber-gold">{data.customRules.length}</div>
              <div className="text-xs text-gray-400">Reguł</div>
            </div>
            <div className="bg-gray-900/50 rounded p-3">
              <div className="text-xl font-bold text-cyber-green">{data.aiChatHistory.length}</div>
              <div className="text-xs text-gray-400">Wiadomości AI</div>
            </div>
          </div>
        </div>

        {/* Voice Info */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">ℹ️ Informacje</h3>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Priorytety: Normalne, Pilne (powtórzone), Krytyczne (powtórzone)</li>
            <li>• Język: Polski (z fallbackiem na angielski)</li>
            <li>• Web Speech API wymagane dla działania</li>
            <li>• Strategie są w pełni kompatybilne wstecz</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Settings;