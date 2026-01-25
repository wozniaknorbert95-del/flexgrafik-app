import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppData } from '../types';
import { exportDataToFile, importDataFromFile, getStorageInfo } from '../utils/storageManager';
import {
  runStuckTasksAuditNow,
  getSchedulerStatus,
  requestNotificationPermission,
} from '../utils/scheduler';
import { validateApiKey, sanitizeInput } from '../utils/inputValidation';

// Using any to avoid runtime type references

interface SettingsProps {
  data: AppData;
  normalizedData?: any; // Phase 2: optional for gradual migration
  onUpdateSettings: (settings: AppData['settings']) => void;
  onBack: () => void;
}

const SettingsPremium: React.FC<SettingsProps> = ({
  data,
  normalizedData,
  onUpdateSettings,
  onBack,
}) => {
  const { voice, ai } = data.settings;
  const [apiKey, setApiKey] = useState(ai?.apiKey || '');
  const [apiKeyError, setApiKeyError] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState(ai?.customSystemPrompt || '');
  const [storageType, setStorageType] = useState<string>('loading...');
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>('unknown');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Phase 2: Use normalized data if available, fallback to legacy
  const useNormalized = normalizedData !== null;

  console.log('⚙️ Settings using data format:', useNormalized ? 'NORMALIZED' : 'LEGACY');

  // Get storage info on mount
  React.useEffect(() => {
    getStorageInfo().then((info) => {
      const type = info.type === 'indexeddb' ? '🚀 IndexedDB' : '💾 localStorage';
      setStorageType(`${type} (${info.size} bytes)`);
    });

    // Check scheduler status
    const status = getSchedulerStatus();
    setSchedulerStatus(status);

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      if (type === 'sync-success') {
        setSchedulerStatus((prev) => ({
          ...prev,
          lastSync: {
            timestamp: new Date().toISOString(),
            result: 'success',
            itemsSynced: data.syncedCount,
          },
        }));
      } else if (type === 'sync-failed') {
        setSchedulerStatus((prev) => ({
          ...prev,
          lastSync: {
            timestamp: new Date().toISOString(),
            result: 'failed',
            itemsFailed: data.failedCount,
          },
        }));
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  // Export handler
  const handleExport = () => {
    try {
      exportDataToFile(data);
      console.log('✅ Data exported');
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert('Failed to export data');
    }
  };

  // Import handler
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleRunAudit = async () => {
    try {
      const stuckTasks = runStuckTasksAuditNow();
      alert(`Audit completed! Found ${stuckTasks.length} stuck tasks.`);
      // Refresh scheduler status
      const status = getSchedulerStatus();
      setSchedulerStatus(status);
    } catch (error) {
      alert('Audit failed. Check console for details.');
    }
  };

  const handleSyncData = async () => {
    try {
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-data');
        console.log('🔄 Manual data sync triggered');
        alert('Data sync initiated. Check results in a moment.');
      } else {
        alert('Background sync not supported in this browser.');
      }
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      alert('Failed to start data sync.');
    }
  };

  const handleRequestNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedData = await importDataFromFile(file);

      // Update all data (settings + pillars + everything)
      window.location.reload(); // Reload to apply imported data

      console.log('✅ Data imported');
    } catch (error) {
      console.error('❌ Import failed:', error);
      alert('Failed to import data. Please check the file format.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  console.log('🎛️ SettingsPremium LOADED');
  console.log('  - voice enabled:', voice?.enabled);
  console.log('  - ai enabled:', ai?.enabled);
  console.log('  - data:', data);

  if (!data || !data.settings) {
    console.error('❌ SettingsPremium: data or data.settings is undefined!');
    return (
      <div className="min-h-screen flex items-center justify-center text-white">ERROR: No data</div>
    );
  }

  return (
    <div data-component="Settings" className="min-h-screen pb-32 pt-8 px-4 md:px-6">
      {/* Header */}
      <motion.div
        className="widget-container-narrow mb-16"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={onBack} className="btn-premium btn-cyan mb-8">
          ← Back to Mission Control
        </button>

        <h1 className="text-5xl md:text-6xl font-extrabold uppercase tracking-wider mb-3 text-gradient-gold">
          System Settings
        </h1>
        <p className="text-base text-gray-300 leading-relaxed">
          Configure voice alerts, AI assistance, and mission data management
        </p>
      </motion.div>

      {/* SECTION 1: Voice Notifications */}
      <motion.div
        className="widget-container-narrow mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Section Header */}
        <div className="mb-6 pb-5 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl neon-breath">🔊</span>
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-gradient-neon">
              Voice Notifications
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-400 pl-0 md:pl-12 leading-relaxed">
            Configure audio alerts for mission-critical events
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Voice Toggle Card */}
          <div className="glass-card glass-card-magenta space-widget">
            <div className="flex items-start justify-between mb-5">
              <div className="flex-1 pr-3">
                <h3 className="text-base font-bold text-white mb-1">Enable Voice Alerts</h3>
                <p className="text-xs text-gray-400">Spoken notifications</p>
              </div>

              <div
                className={`toggle-premium flex-shrink-0 ${voice.enabled ? 'active' : ''}`}
                onClick={() =>
                  onUpdateSettings({
                    ...data.settings,
                    voice: { ...voice, enabled: !voice.enabled },
                  })
                }
              >
                <div className="toggle-thumb" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  voice.enabled ? 'bg-neon-cyan neon-breath' : 'bg-gray-600'
                }`}
              />
              <span
                className={`text-xs uppercase tracking-wider font-bold ${
                  voice.enabled ? 'text-glow-cyan' : 'text-gray-500'
                }`}
              >
                {voice.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Volume Card */}
          <div className="glass-card glass-card-cyan space-widget">
            <div className="flex justify-between items-center mb-4">
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Output Volume</h3>
                <p className="text-xs text-gray-400 mt-0.5">Audio level</p>
              </div>
              <span className="text-xl font-bold text-glow-cyan flex-shrink-0 ml-2">
                {voice.volume}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={voice.volume}
              onChange={(e) =>
                onUpdateSettings({
                  ...data.settings,
                  voice: { ...voice, volume: parseInt(e.target.value) },
                })
              }
              className="w-full h-2 bg-glass-heavy rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none 
                [&::-webkit-slider-thumb]:w-6 
                [&::-webkit-slider-thumb]:h-6 
                [&::-webkit-slider-thumb]:rounded-full 
                [&::-webkit-slider-thumb]:bg-gradient-to-br
                [&::-webkit-slider-thumb]:from-neon-cyan
                [&::-webkit-slider-thumb]:to-neon-magenta
                [&::-webkit-slider-thumb]:shadow-glow-cyan
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-110"
            />

            <div className="flex justify-between mt-3 text-xs text-gray-500 uppercase tracking-wider">
              <span>Off</span>
              <span className="text-neon-cyan">Recommended</span>
              <span>Maximum</span>
            </div>

            {/* Test Audio Button */}
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <button
                onClick={() => {
                  // Test voice synthesis
                  const utterance = new SpeechSynthesisUtterance(
                    `Voice test: Volume ${voice.volume}%. AI assistant is ready to help with your missions.`
                  );
                  utterance.volume = voice.volume / 100;
                  utterance.rate = voice.speed || 1.0;
                  utterance.pitch = 1.0;

                  // Try to use a pleasant voice if available
                  const voices = speechSynthesis.getVoices();
                  const preferredVoice = voices.find(
                    (v) =>
                      v.name.includes('Female') ||
                      v.name.includes('Google') ||
                      v.lang.startsWith('en')
                  );
                  if (preferredVoice) {
                    utterance.voice = preferredVoice;
                  }

                  speechSynthesis.speak(utterance);
                }}
                className="btn-premium btn-cyan w-full"
                disabled={!voice.enabled}
              >
                🔊 Test Audio
              </button>
              <p className="text-xs text-gray-400 mt-2 text-center">
                {voice.enabled ? 'Click to test voice settings' : 'Enable voice alerts first'}
              </p>
            </div>
          </div>

          {/* Speech Rate Card */}
          <div className="glass-card glass-card-magenta space-widget">
            <div className="flex justify-between items-center mb-4">
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Speech Speed</h3>
                <p className="text-xs text-gray-400 mt-0.5">Playback rate</p>
              </div>
              <span className="text-xl font-bold text-glow-magenta flex-shrink-0 ml-2">
                {voice.speed.toFixed(1)}x
              </span>
            </div>

            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.1"
              value={voice.speed}
              onChange={(e) =>
                onUpdateSettings({
                  ...data.settings,
                  voice: { ...voice, speed: parseFloat(e.target.value) },
                })
              }
              className="w-full h-2 bg-glass-heavy rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none 
                [&::-webkit-slider-thumb]:w-6 
                [&::-webkit-slider-thumb]:h-6 
                [&::-webkit-slider-thumb]:rounded-full 
                [&::-webkit-slider-thumb]:bg-gradient-to-br
                [&::-webkit-slider-thumb]:from-neon-magenta
                [&::-webkit-slider-thumb]:to-gold
                [&::-webkit-slider-thumb]:shadow-glow-magenta
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-110"
            />

            <div className="flex justify-between mt-3 text-xs text-gray-500 uppercase tracking-wider">
              <span>Slower</span>
              <span className="text-neon-magenta">Standard</span>
              <span>Faster</span>
            </div>
          </div>

          {/* Test Button */}
          <div className="glass-card space-widget flex flex-col justify-center">
            <button className="btn-premium btn-magenta w-full mb-3">🔊 Test Audio System</button>
            <p className="text-xs text-gray-400 text-center">
              Play sample notification to verify settings
            </p>
          </div>
        </div>
      </motion.div>

      {/* SECTION 2: AI Assistant */}
      <motion.div
        className="widget-container-narrow mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Section Header */}
        <div className="mb-6 pb-5 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl neon-breath">🤖</span>
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-gradient-gold">
              AI Assistant
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-400 pl-0 md:pl-12 leading-relaxed">
            Enable AI-powered analysis and priority recommendations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Toggle */}
          <div className="glass-card glass-card-gold space-widget">
            <div className="flex items-start justify-between mb-5">
              <div className="flex-1 pr-3">
                <h3 className="text-base font-bold text-white mb-1">Enable AI Support</h3>
                <p className="text-xs text-gray-400">Intelligent assistance</p>
              </div>

              <div
                className={`toggle-premium flex-shrink-0 ${ai?.enabled ? 'active' : ''}`}
                onClick={() =>
                  onUpdateSettings({
                    ...data.settings,
                    ai: { ...ai, enabled: !ai?.enabled },
                  })
                }
              >
                <div className="toggle-thumb" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  ai?.enabled ? 'bg-gold neon-breath' : 'bg-gray-600'
                }`}
              />
              <span
                className={`text-xs uppercase tracking-wider font-bold ${
                  ai?.enabled ? 'text-glow-gold' : 'text-gray-500'
                }`}
              >
                {ai?.enabled ? 'Connected' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* API Key */}
          <div className="glass-card space-widget md:col-span-2">
            <div className="mb-4">
              <label
                htmlFor="api-key-input"
                className="block text-base md:text-lg font-bold text-white mb-2"
              >
                API Authentication Key
              </label>
              <p id="api-key-description" className="text-xs text-gray-400 leading-relaxed">
                OpenAI-compatible key • Stored locally only • Never shared with servers
              </p>
            </div>
            <input
              id="api-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                // Clear error when user starts typing
                if (apiKeyError) setApiKeyError('');
              }}
              onBlur={() => {
                const validation = validateApiKey(apiKey);
                if (validation.isValid) {
                  setApiKeyError('');
                  onUpdateSettings({
                    ...data.settings,
                    ai: { ...ai, apiKey: apiKey.trim() },
                  });
                } else {
                  setApiKeyError(validation.error || 'Invalid API key');
                }
              }}
              placeholder="Paste your API key here (e.g., gsk_...)"
              autoComplete="off"
              aria-describedby={
                apiKeyError ? 'api-key-error api-key-description' : 'api-key-description'
              }
              aria-invalid={!!apiKeyError}
              className={`input-premium ${apiKeyError ? 'border-red-500 focus:ring-red-500' : ''}`}
              style={{
                WebkitAppearance: 'none',
                boxShadow: 'none',
              }}
            />
            {apiKeyError && (
              <p
                id="api-key-error"
                className="text-red-400 text-sm mt-2 flex items-center gap-2"
                role="alert"
                aria-live="polite"
              >
                <span>⚠️</span>
                {apiKeyError}
              </p>
            )}
            <div className="mt-3 p-3 bg-glass-light rounded-widget border border-gray-700/50">
              <p className="text-xs text-gray-400 leading-relaxed break-words">
                <span className="font-semibold text-white block mb-1">Get a free API key:</span>
                <a
                  href="https://console.groq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-glow-cyan hover:underline break-all"
                >
                  console.groq.com
                </a>
                <span className="block mt-1">Free tier: 30 requests/min</span>
              </p>
            </div>
          </div>
        </div>

        {/* AI Context Settings */}
        <div className="mt-8">
          <div className="glass-card space-widget">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white mb-2">AI Context & Personality</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Customize how AI assistant understands your work style and goals
              </p>
            </div>

            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onBlur={() =>
                onUpdateSettings({
                  ...data.settings,
                  ai: { ...ai, customSystemPrompt: customPrompt },
                })
              }
              placeholder="Describe your work style, goals, or how you want AI to interact with you. Leave empty to use default personality."
              className="input-premium w-full"
              rows={4}
            />

            <div className="mt-4 p-3 bg-glass-light rounded-widget border border-gray-700/50">
              <p className="text-xs text-gray-400 leading-relaxed">
                <span className="font-semibold text-white block mb-1">Examples:</span>
                <span className="block mb-1">
                  • "I work best with short, actionable tasks and prefer detailed explanations"
                </span>
                <span className="block mb-1">
                  • "Focus on time management and breaking down complex projects"
                </span>
                <span className="block">
                  • "I'm an entrepreneur who needs strategic advice and motivation"
                </span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* SECTION 2.5: Advanced Voice Commands */}
      <motion.div
        className="widget-container-narrow mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {/* Section Header */}
        <div className="mb-6 pb-5 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🎙️</span>
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-gradient-neon">
              Voice Commands
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-400 pl-0 md:pl-12 leading-relaxed">
            Advanced voice notifications and smart triggers
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Voice Command Examples */}
          <div className="glass-card glass-card-magenta space-widget">
            <h3 className="text-lg font-bold text-white mb-4">Available Voice Commands</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-glass-light rounded-widget">
                <span className="text-neon-magenta">🔔</span>
                <div>
                  <p className="text-white font-medium">Mission completed</p>
                  <p className="text-xs text-gray-400">Celebrates task completion</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-glass-light rounded-widget">
                <span className="text-neon-cyan">⏰</span>
                <div>
                  <p className="text-white font-medium">Sprint deadline approaching</p>
                  <p className="text-xs text-gray-400">Warns about time pressure</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-glass-light rounded-widget">
                <span className="text-gold">🎯</span>
                <div>
                  <p className="text-white font-medium">Daily priority selected</p>
                  <p className="text-xs text-gray-400">Announces focus task</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-glass-light rounded-widget">
                <span className="text-neon-magenta">🔥</span>
                <div>
                  <p className="text-white font-medium">Stuck project detected</p>
                  <p className="text-xs text-gray-400">Motivational support message</p>
                </div>
              </div>
            </div>
          </div>

          {/* Voice Settings Summary */}
          <div className="glass-card space-widget">
            <h3 className="text-lg font-bold text-white mb-4">Current Voice Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-glow-cyan mb-1">{voice.volume}%</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Volume</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-glow-magenta mb-1">
                  {voice.speed || 1.0}x
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Speed</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${voice.enabled ? 'bg-neon-cyan neon-breath' : 'bg-gray-600'}`}
                />
                <span
                  className={`text-sm uppercase tracking-wider font-bold ${voice.enabled ? 'text-glow-cyan' : 'text-gray-500'}`}
                >
                  {voice.enabled ? 'Voice Commands Active' : 'Voice Commands Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* SECTION 3: Data & Backup */}
      <motion.div
        className="widget-container-narrow mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Section Header */}
        <div className="mb-6 pb-5 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">💾</span>
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-white">
              Data & Backup
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-400 pl-0 md:pl-12 leading-relaxed">
            Export or import your complete mission configuration
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Card */}
          <div className="glass-card glass-card-cyan space-widget">
            <div className="mb-5">
              <h3 className="text-base md:text-lg font-bold text-white mb-2">
                Export Mission Data
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-2">
                Download complete setup as JSON file for backup or transfer
              </p>
              <p className="text-xs text-neon-cyan font-mono">Storage: {storageType}</p>
            </div>
            <button onClick={handleExport} className="btn-premium btn-cyan w-full text-sm">
              <span className="mr-2">📥</span>
              Download Backup
            </button>
          </div>

          {/* Scheduler & Notifications Card */}
          <div className="glass-card glass-card-cyan space-widget">
            <div className="mb-5">
              <h3 className="text-base md:text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span>🕐</span>
                Stuck Tasks Scheduler
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">
                Automatic daily audit of tasks stuck at 90%+. Runs every day at 10:00.
              </p>

              {/* Scheduler Status */}
              <div className="mb-4 p-3 rounded-lg bg-black/30">
                <div className="text-sm text-white mb-2">
                  <strong>Status:</strong>{' '}
                  <span className={schedulerStatus?.isRunning ? 'text-green-400' : 'text-red-400'}>
                    {schedulerStatus?.isRunning ? '🟢 Running' : '🔴 Stopped'}
                  </span>
                </div>
                {schedulerStatus?.lastAudit && (
                  <div className="text-sm text-gray-300">
                    <strong>Last Audit:</strong>{' '}
                    {new Date(schedulerStatus.lastAudit.timestamp).toLocaleString()}
                    {' • '}
                    {schedulerStatus.lastAudit.stuckTasksCount} stuck tasks found
                  </div>
                )}
              </div>

              {/* Notification Permission */}
              <div className="mb-4 p-3 rounded-lg bg-black/30">
                <div className="text-sm text-white mb-2">
                  <strong>Notifications:</strong>{' '}
                  <span
                    className={
                      notificationPermission === 'granted'
                        ? 'text-green-400'
                        : notificationPermission === 'denied'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                    }
                  >
                    {notificationPermission === 'granted'
                      ? '🔔 Enabled'
                      : notificationPermission === 'denied'
                        ? '🚫 Denied'
                        : '❓ Unknown'}
                  </span>
                </div>
                {notificationPermission !== 'granted' && (
                  <button
                    onClick={handleRequestNotifications}
                    className="btn-premium btn-cyan text-xs mt-2"
                  >
                    Request Permission
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleRunAudit} className="btn-premium btn-cyan flex-1 text-sm">
                <span className="mr-2">🔍</span>
                Run Audit Now
              </button>
              <button
                onClick={handleSyncData}
                className="btn-premium btn-magenta flex-1 text-sm"
                title="Sync pending data to server"
              >
                <span className="mr-2">🔄</span>
                Sync Data
              </button>
            </div>

            {/* Sync Status */}
            {schedulerStatus?.lastSync && (
              <div
                className="mt-3 p-3 rounded-lg bg-black/30 border"
                style={{
                  borderColor:
                    schedulerStatus.lastSync.result === 'success' ? '#00f3ff' : '#ff6b6b',
                }}
              >
                <div className="text-xs text-gray-400 mb-1">
                  Last Sync: {new Date(schedulerStatus.lastSync.timestamp).toLocaleString()}
                </div>
                <div
                  className="text-xs"
                  style={{
                    color: schedulerStatus.lastSync.result === 'success' ? '#00f3ff' : '#ff6b6b',
                  }}
                >
                  {schedulerStatus.lastSync.result === 'success'
                    ? `✅ Synced ${schedulerStatus.lastSync.itemsSynced || 0} items`
                    : `❌ Failed to sync ${schedulerStatus.lastSync.itemsFailed || 0} items`}
                </div>
              </div>
            )}
          </div>

          {/* Import Card */}
          <div className="glass-card glass-card-magenta space-widget">
            <div className="mb-5">
              <h3 className="text-base md:text-lg font-bold text-white mb-2">
                Import Mission Data
              </h3>
              <p className="text-xs text-red-300 leading-relaxed font-semibold mb-2">
                ⚠️ Warning: Replaces Current Config
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Upload JSON file to restore mission setup
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button onClick={handleImport} className="btn-premium btn-magenta w-full text-sm">
              <span className="mr-2">📤</span>
              Upload & Restore
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(SettingsPremium);
