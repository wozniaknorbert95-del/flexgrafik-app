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
import { providerGenerateText } from '../utils/aiProvider';
import { showError, showInfo, showSuccess, showWarning } from '../utils/toastService';
import { secureStorage } from '../utils/secureStorage';
import { triggerLevelUpFeedback, triggerTaskCompleteFeedback } from '../utils/feedbackService';
import { ACHIEVEMENTS } from '../utils/achievementEngine';

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
  const goals = (data.settings as any)?.goals ?? { maxActive: 3 };
  const gamification = (data.settings as any)?.gamification ?? {
    soundEnabled: true,
    hapticsEnabled: true,
  };
  const unlocked = Array.isArray((data as any)?.userStats?.achievementsUnlocked)
    ? (data as any).userStats.achievementsUnlocked
    : [];
  const unlockedIds = new Set<string>(unlocked.map((u: any) => String(u?.achievementId)));
  const [savedApiKey, setSavedApiKey] = useState(
    () => secureStorage.getApiKey() || ai?.apiKey || ''
  );
  const [apiKey, setApiKey] = useState(() => secureStorage.getApiKey() || ai?.apiKey || '');
  const [apiKeyError, setApiKeyError] = useState<string>('');
  const [apiConnectionStatus, setApiConnectionStatus] = useState<
    'unknown' | 'testing' | 'connected' | 'disconnected'
  >('unknown');
  const [customPrompt, setCustomPrompt] = useState(ai?.customSystemPrompt || '');
  const [apiKeyDirty, setApiKeyDirty] = useState(false);

  const [exportIncludeApiKey, setExportIncludeApiKey] = useState(false);

  // Legacy compatibility: if key exists in AppData, move it to secureStorage and clear AppData.
  React.useEffect(() => {
    const legacyKey = String(ai?.apiKey ?? '').trim();
    const secureKey = secureStorage.getApiKey() || '';
    if (legacyKey && !secureKey) {
      secureStorage.setApiKey(legacyKey);
      setSavedApiKey(legacyKey);
      setApiKey(legacyKey);
      onUpdateSettings({
        ...data.settings,
        ai: { ...ai, apiKey: '' },
      } as any);
      return;
    }
    if (secureKey && secureKey !== savedApiKey) {
      setSavedApiKey(secureKey);
    }
    // Jeśli użytkownik nie edytuje (brak "dirty"), synchronizuj draft z zapisanym kluczem.
    if (secureKey && !apiKeyDirty && secureKey !== apiKey) {
      setApiKey(secureKey);
    }
  }, [ai?.apiKey, apiKey, apiKeyDirty, savedApiKey]);
  const [storageType, setStorageType] = useState<string>('loading...');
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>('unknown');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAiEnabled = Boolean(ai?.enabled);
  const hasSavedApiKey = Boolean(savedApiKey.trim());
  const isApiKeyDirty = apiKey.trim() !== savedApiKey.trim();
  const canSaveApiKey = (() => {
    const trimmed = apiKey.trim();
    if (!trimmed) return false;
    const validation = validateApiKey(trimmed);
    if (!validation.isValid) return false;
    return isApiKeyDirty;
  })();
  const aiUiState: 'disabled' | 'enabled_no_key' | 'enabled_ready' = !isAiEnabled
    ? 'disabled'
    : hasSavedApiKey
      ? 'enabled_ready'
      : 'enabled_no_key';

  // Test API connection
  const testApiConnection = async (keyToTest: string, autoEnable: boolean = false) => {
    if (!keyToTest.trim()) {
      setApiConnectionStatus('disconnected');
      return;
    }

    setApiConnectionStatus('testing');
    try {
      const result = await providerGenerateText(
        {
          apiKey: keyToTest.trim(),
          prompt: 'Test connection. Reply with "OK" only.',
          maxTokens: 10,
          maxLen: 10,
        },
        { timeoutMs: 5000 }
      );

      if (result && result.trim().toLowerCase().includes('ok')) {
        setApiConnectionStatus('connected');
        setApiKeyError('');

        // Automatically enable AI if test succeeds and autoEnable is true
        if (autoEnable && !isAiEnabled) {
          secureStorage.setApiKey(keyToTest.trim());
          onUpdateSettings({
            ...data.settings,
            ai: { ...ai, enabled: true, apiKey: '' },
          });
        }
      } else {
        setApiConnectionStatus('disconnected');
        setApiKeyError('Test połączenia nie powiódł się. Sprawdź klucz API.');
      }
    } catch (error) {
      setApiConnectionStatus('disconnected');
      setApiKeyError('Błąd połączenia. Sprawdź internet i klucz API.');
      console.error('API connection test error:', error);
    }
  };

  // Phase 2: Use normalized data if available, fallback to legacy
  const useNormalized = normalizedData !== null;

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('⚙️ Settings using data format:', useNormalized ? 'NORMALIZED' : 'LEGACY');
  }

  // Get storage info on mount
  React.useEffect(() => {
    getStorageInfo().then((info) => {
      const type = info.type === 'indexeddb' ? '🚀 IndexedDB' : '💾 localStorage';
      const size =
        typeof (info as any)?.size === 'number' ? `${(info as any).size} bytes` : 'size n/a';
      setStorageType(`${type} (${size})`);
    });

    // Check scheduler status
    const status = getSchedulerStatus();
    setSchedulerStatus(status);

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Test API connection on mount if key exists
    if (savedApiKey.trim() && isAiEnabled) {
      testApiConnection(savedApiKey.trim());
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
      if (!exportIncludeApiKey) {
        exportDataToFile(data, { includeApiKey: false });
      } else {
        const key = secureStorage.getApiKey() || '';
        const withKey = {
          ...(data as any),
          settings: {
            ...(data as any).settings,
            ai: {
              ...((data as any)?.settings?.ai ?? {}),
              apiKey: key,
            },
          },
        } as AppData;
        exportDataToFile(withKey, { includeApiKey: true });
      }
      showSuccess('Dane wyeksportowane do pliku.', 4000);
    } catch (error) {
      console.error('❌ Export failed:', error);
      showError('Nie udało się wyeksportować danych.', 7000);
    }
  };

  // Import handler
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleRunAudit = async () => {
    try {
      const stuckTasks = await runStuckTasksAuditNow();
      showSuccess(`Audyt ukończony. Wykryto ${stuckTasks.length} zadań „stuck”.`, 6000);
      // Refresh scheduler status
      const status = getSchedulerStatus();
      setSchedulerStatus(status);
    } catch (error) {
      showError('Nie udało się uruchomić audytu. Sprawdź konsolę (dev).', 7000);
    }
  };

  const handleSyncData = async () => {
    try {
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-data');
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('🔄 Manual data sync triggered');
        }
        showInfo('Synchronizacja danych uruchomiona. Wynik pojawi się za chwilę.', 6000);
      } else {
        showWarning('Ten browser nie wspiera Background Sync.', 7000);
      }
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      showError('Nie udało się uruchomić synchronizacji danych.', 7000);
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

      showSuccess('Dane zaimportowane. Odświeżam aplikację…', 4000);
    } catch (error) {
      console.error('❌ Import failed:', error);
      showError('Nie udało się zaimportować danych. Sprawdź format pliku.', 7000);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('🎛️ SettingsPremium LOADED');
    // eslint-disable-next-line no-console
    console.log('  - voice enabled:', voice?.enabled);
    // eslint-disable-next-line no-console
    console.log('  - ai enabled:', ai?.enabled);
    // eslint-disable-next-line no-console
    console.log('  - data:', data);
  }

  if (!data || !data.settings) {
    console.error('❌ SettingsPremium: data or data.settings is undefined!');
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Błąd: brak danych
      </div>
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
          ← Wróć
        </button>

        <h1 className="text-5xl md:text-6xl font-extrabold uppercase tracking-wider mb-3 text-gradient-gold">
          Ustawienia systemu
        </h1>
        <p className="text-base text-gray-300 leading-relaxed">
          Konfiguruj alerty głosowe, wsparcie AI oraz zarządzanie danymi aplikacji
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
            <span className="text-3xl">🔊</span>
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-gradient-neon">
              Powiadomienia głosowe
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-400 pl-0 md:pl-12 leading-relaxed">
            Skonfiguruj alerty audio dla zdarzeń krytycznych
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Voice Toggle Card */}
          <div className="glass-card glass-card-magenta space-widget">
            <div className="flex items-start justify-between mb-5">
              <div className="flex-1 pr-3">
                <h3 className="text-base font-bold text-white mb-1">Włącz alerty głosowe</h3>
                <p className="text-xs text-gray-400">Komunikaty głosowe</p>
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
                  voice.enabled ? 'bg-neon-cyan' : 'bg-[var(--border-subtle)]'
                }`}
              />
              <span
                className={`text-xs uppercase tracking-wider font-bold ${
                  voice.enabled ? 'text-glow-cyan' : 'text-[var(--text-muted)]'
                }`}
              >
                {voice.enabled ? 'Aktywne' : 'Wyłączone'}
              </span>
            </div>
          </div>

          {/* Volume Card */}
          <div className="glass-card glass-card-cyan space-widget">
            <div className="flex justify-between items-center mb-4">
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Głośność</h3>
                <p className="text-xs text-gray-400 mt-0.5">Poziom dźwięku</p>
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
              <span>Wył.</span>
              <span className="text-neon-cyan">Rekomendowane</span>
              <span>Maks.</span>
            </div>

            {/* Test Audio Button */}
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <button
                onClick={() => {
                  // Test voice synthesis
                  const utterance = new SpeechSynthesisUtterance(
                    `Test głosu: głośność ${voice.volume}%. Asystent AI jest gotowy do wsparcia.`
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
                      v.lang.toLowerCase().startsWith('pl')
                  );
                  if (preferredVoice) {
                    utterance.voice = preferredVoice;
                  }

                  speechSynthesis.speak(utterance);
                }}
                className="btn-premium btn-cyan w-full"
                disabled={!voice.enabled}
              >
                🔊 Test dźwięku
              </button>
              <p className="text-xs text-gray-400 mt-2 text-center">
                {voice.enabled
                  ? 'Kliknij, aby przetestować ustawienia głosu'
                  : 'Najpierw włącz alerty głosowe'}
              </p>
            </div>
          </div>

          {/* Speech Rate Card */}
          <div className="glass-card glass-card-magenta space-widget">
            <div className="flex justify-between items-center mb-4">
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Szybkość mowy</h3>
                <p className="text-xs text-gray-400 mt-0.5">Tempo odtwarzania</p>
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
              <span>Wolniej</span>
              <span className="text-neon-magenta">Standard</span>
              <span>Szybciej</span>
            </div>
          </div>

          {/* Test Button */}
          <div className="glass-card space-widget flex flex-col justify-center">
            <button className="btn-premium btn-magenta w-full mb-3">🔊 Test systemu audio</button>
            <p className="text-xs text-gray-400 text-center">
              Odtwórz przykładowe powiadomienie, żeby zweryfikować ustawienia
            </p>
          </div>
        </div>
      </motion.div>

      {/* SECTION 1.5: Gamification Feedback */}
      <motion.div
        className="widget-container-narrow mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        <div className="mb-6 pb-5 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🎮</span>
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-gradient-magenta">
              Grywalizacja
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-400 pl-0 md:pl-12 leading-relaxed">
            Natychmiastowy feedback (dźwięk + wibracje) przy sukcesach.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card glass-card-cyan space-widget">
            <div className="flex items-start justify-between mb-5">
              <div className="flex-1 pr-3">
                <h3 className="text-base font-bold text-white mb-1">Dźwięki sukcesu</h3>
                <p className="text-xs text-gray-400">„Ding” task • „Fanfary” level</p>
              </div>
              <div
                className={`toggle-premium flex-shrink-0 ${gamification.soundEnabled ? 'active' : ''}`}
                onClick={() =>
                  onUpdateSettings({
                    ...data.settings,
                    gamification: {
                      ...gamification,
                      soundEnabled: !Boolean(gamification.soundEnabled),
                    },
                  } as any)
                }
              >
                <div className="toggle-thumb" />
              </div>
            </div>
            <div className="text-xs text-gray-400">
              Uwaga: przeglądarki mogą blokować audio bez interakcji. Test zadziała po kliknięciu.
            </div>
          </div>

          <div className="glass-card glass-card-magenta space-widget">
            <div className="flex items-start justify-between mb-5">
              <div className="flex-1 pr-3">
                <h3 className="text-base font-bold text-white mb-1">Wibracje (mobile)</h3>
                <p className="text-xs text-gray-400">Haptic feedback, jeśli urządzenie wspiera</p>
              </div>
              <div
                className={`toggle-premium flex-shrink-0 ${gamification.hapticsEnabled ? 'active' : ''}`}
                onClick={() =>
                  onUpdateSettings({
                    ...data.settings,
                    gamification: {
                      ...gamification,
                      hapticsEnabled: !Boolean(gamification.hapticsEnabled),
                    },
                  } as any)
                }
              >
                <div className="toggle-thumb" />
              </div>
            </div>
            <div className="text-xs text-gray-400">
              Jeśli nie działa: iOS Safari często nie wspiera wibracji w PWA.
            </div>
          </div>

          <div className="glass-card space-widget flex flex-col justify-center">
            <button
              type="button"
              className="btn-premium btn-cyan w-full mb-3"
              onClick={() => {
                triggerTaskCompleteFeedback({
                  soundEnabled: Boolean(gamification.soundEnabled),
                  hapticsEnabled: Boolean(gamification.hapticsEnabled),
                });
                showInfo('Test: ukończenie zadania (ding + wibracje).', 2500);
              }}
            >
              ✅ Test: zadanie
            </button>
            <p className="text-xs text-gray-400 text-center">
              Symuluje ukończenie zadania (+50 XP).
            </p>
          </div>

          <div className="glass-card space-widget flex flex-col justify-center">
            <button
              type="button"
              className="btn-premium btn-magenta w-full mb-3"
              onClick={() => {
                triggerLevelUpFeedback({
                  soundEnabled: Boolean(gamification.soundEnabled),
                  hapticsEnabled: Boolean(gamification.hapticsEnabled),
                });
                showInfo('Test: awans poziomu (fanfary + wibracje).', 2500);
              }}
            >
              🎉 Test: level up
            </button>
            <p className="text-xs text-gray-400 text-center">Symuluje awans poziomu.</p>
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
            <span className="text-3xl">🤖</span>
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-gradient-gold">
              Asystent AI
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-400 pl-0 md:pl-12 leading-relaxed">
            Włącz analizy i rekomendacje priorytetów wspierane przez AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Toggle */}
          <div className="glass-card glass-card-gold space-widget">
            <div className="flex items-start justify-between mb-5">
              <div className="flex-1 pr-3">
                <h3 className="text-base font-bold text-white mb-1">Włącz wsparcie AI</h3>
                <p className="text-xs text-gray-400">Inteligentne wsparcie</p>
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
                  aiUiState === 'enabled_ready'
                    ? 'bg-[var(--accent-success)]'
                    : aiUiState === 'enabled_no_key'
                      ? 'bg-[var(--accent-warning)]'
                      : 'bg-[var(--border-subtle)]'
                }`}
              />
              <span
                className={`text-xs uppercase tracking-wider font-bold ${
                  aiUiState === 'enabled_ready'
                    ? 'text-[var(--accent-success)]'
                    : aiUiState === 'enabled_no_key'
                      ? 'text-[var(--accent-warning)]'
                      : 'text-[var(--text-muted)]'
                }`}
              >
                {aiUiState === 'enabled_ready'
                  ? 'Włączone + klucz'
                  : aiUiState === 'enabled_no_key'
                    ? 'Włączone (brak klucza) → tryb awaryjny'
                    : 'Wyłączone'}
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
                Klucz API (uwierzytelnianie)
              </label>
              <p id="api-key-description" className="text-xs text-gray-400 leading-relaxed">
                Klucz zgodny z OpenAI • Zapisywany tylko lokalnie • Nie jest wysyłany na serwery
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <input
                id="api-key-input"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setApiKeyDirty(true);
                  // Clear error when user starts typing
                  if (apiKeyError) setApiKeyError('');
                  setApiConnectionStatus('unknown');
                }}
                onBlur={() => {
                  const trimmed = apiKey.trim();
                  if (!trimmed) {
                    setApiKeyError('');
                    setApiConnectionStatus('unknown');
                    return;
                  }
                  const validation = validateApiKey(trimmed);
                  if (!validation.isValid) {
                    setApiKeyError(validation.error || 'Nieprawidłowy klucz API');
                    setApiConnectionStatus('disconnected');
                  }
                }}
                placeholder="Wklej klucz API (np. gsk_...)"
                autoComplete="off"
                aria-describedby={
                  apiKeyError ? 'api-key-error api-key-description' : 'api-key-description'
                }
                aria-invalid={!!apiKeyError}
                className={`input-premium flex-1 ${apiKeyError ? 'border-[var(--accent-danger)] focus:ring-[color:var(--accent-danger)]' : ''}`}
                style={{
                  WebkitAppearance: 'none',
                  boxShadow: 'none',
                }}
              />

              {isApiKeyDirty && (
                <div className="text-[11px] text-yellow-200/90">
                  Masz niezapisane zmiany klucza API. Kliknij „Zapisz klucz”, aby je zastosować.
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = apiKey.trim();
                    const validation = validateApiKey(trimmed);
                    if (!trimmed) return;
                    if (!validation.isValid) {
                      setApiKeyError(validation.error || 'Nieprawidłowy klucz API');
                      setApiConnectionStatus('disconnected');
                      return;
                    }
                    secureStorage.setApiKey(trimmed);
                    setSavedApiKey(trimmed);
                    setApiKeyDirty(false);
                    setApiKeyError('');
                    setApiConnectionStatus('unknown');
                    onUpdateSettings({
                      ...data.settings,
                      ai: { ...ai, apiKey: '' },
                    } as any);
                    showSuccess('Zapisano klucz API.', 2500);
                  }}
                  disabled={!canSaveApiKey}
                  className="btn-premium btn-magenta text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💾 Zapisz klucz
                </button>

                {hasSavedApiKey && (
                  <button
                    type="button"
                    onClick={async () => {
                      await testApiConnection(savedApiKey.trim(), true);
                    }}
                    disabled={apiConnectionStatus === 'testing'}
                    className="btn-premium btn-cyan text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {apiConnectionStatus === 'testing'
                      ? 'Testuję…'
                      : apiConnectionStatus === 'connected'
                        ? '✓ Połączenie OK'
                        : apiConnectionStatus === 'disconnected'
                          ? '✗ Test nieudany'
                          : 'Testuj połączenie'}
                  </button>
                )}
              </div>
            </div>
            {/* Connection Status */}
            {hasSavedApiKey && apiConnectionStatus !== 'unknown' && (
              <div className="mt-2">
                {apiConnectionStatus === 'testing' && (
                  <p className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                    Testuję połączenie…
                  </p>
                )}
                {apiConnectionStatus === 'connected' && (
                  <p className="text-xs text-green-400 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    Połączenie działa
                  </p>
                )}
                {apiConnectionStatus === 'disconnected' && (
                  <p className="text-xs text-red-400 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                    Połączenie nie działa
                  </p>
                )}
              </div>
            )}
            {apiKeyError && (
              <p
                id="api-key-error"
                className="text-[var(--accent-danger)] text-sm mt-2 flex items-center gap-2"
                role="alert"
                aria-live="polite"
              >
                <span>⚠️</span>
                {apiKeyError}
              </p>
            )}
            <div className="mt-3 p-3 bg-glass-light rounded-widget border border-gray-700/50">
              <p className="text-xs text-gray-400 leading-relaxed break-words">
                <span className="font-semibold text-white block mb-1">Darmowy klucz API:</span>
                <a
                  href="https://console.groq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-glow-cyan hover:underline break-all"
                >
                  console.groq.com
                </a>
                <span className="block mt-1">Darmowy limit: 30 zapytań/min</span>
              </p>
            </div>
          </div>
        </div>

        {/* AI Context Settings */}
        <div className="mt-8">
          <div className="glass-card space-widget">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white mb-2">Kontekst i styl pracy AI</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Ustaw, jak Asystent AI ma rozumieć Twój styl pracy i cele
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
              placeholder="Opisz swój styl pracy, cele i to, jak AI ma z Tobą rozmawiać. Zostaw puste, aby użyć domyślnego stylu."
              className="input-premium w-full"
              rows={4}
            />

            <div className="mt-4 p-3 bg-glass-light rounded-widget border border-gray-700/50">
              <p className="text-xs text-gray-400 leading-relaxed">
                <span className="font-semibold text-white block mb-1">Przykłady:</span>
                <span className="block mb-1">
                  • „Działam najlepiej na krótkich, konkretnych zadaniach. Daj 1–2 kroki na 10
                  minut.”
                </span>
                <span className="block mb-1">
                  • „Skupiaj się na zarządzaniu czasem i rozbijaniu złożonych celów na etapy.”
                </span>
                <span className="block">
                  • „Prowadzę firmę — potrzebuję strategicznych rekomendacji i motywacji, ale bez
                  lania wody.”
                </span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* SECTION 4: Odznaki (Achievements) */}
      <motion.div
        className="widget-container-narrow mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="mb-6 pb-5 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🏅</span>
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-gradient-gold">
              Odznaki
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-400 pl-0 md:pl-12 leading-relaxed">
            Gablotka trofeów. Zbieraj i domykaj.
          </p>
        </div>

        <div className="glass-card p-6 border border-white/10 rounded-widget">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-gray-300">
              Zdobyte: <span className="font-bold text-white">{unlockedIds.size}</span> /{' '}
              <span className="font-bold text-gray-200">{ACHIEVEMENTS.length}</span>
            </div>
            <div className="text-xs text-gray-500">Odznaki są lokalne (offline-first).</div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACHIEVEMENTS.map((a) => {
              const isUnlocked = unlockedIds.has(a.id);
              const meta = unlocked.find((u: any) => String(u?.achievementId) === a.id);
              return (
                <div
                  key={a.id}
                  className={`p-4 rounded-lg border ${
                    isUnlocked ? 'bg-gold/10 border-gold/35' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`text-white font-bold ${isUnlocked ? 'text-gold' : ''}`}>
                        {a.title}
                      </div>
                      <div className="text-xs text-gray-300 mt-1">{a.description}</div>
                      {isUnlocked && meta?.unlockedAt ? (
                        <div className="text-[11px] text-gray-400 mt-2">
                          Zdobyto: {new Date(String(meta.unlockedAt)).toLocaleString()}
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-500 mt-2">Jeszcze niezdobyta.</div>
                      )}
                    </div>
                    <div className="text-2xl flex-shrink-0" aria-hidden="true">
                      {isUnlocked ? '✅' : '⬜'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* SECTION 2.25: Goals (PLAN 5.1) */}
      <motion.div
        className="widget-container-narrow mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
      >
        {/* Section Header */}
        <div className="mb-6 pb-5 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🎯</span>
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-gradient-gold">
              Cele
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-400 pl-0 md:pl-12 leading-relaxed">
            Finish-first: mniej aktywnych celów = większy fokus na domykanie.
          </p>
        </div>

        <div className="glass-card space-widget">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h3 className="text-base font-bold text-white mb-1">
                Maksymalna liczba aktywnych celów
              </h3>
              <p className="text-xs text-gray-400">
                Domyślnie 3 (1 main / 1 secondary / 1 lab). Zakres: 1–5.
              </p>
            </div>
            <div className="text-2xl font-black text-glow-gold">
              {Math.max(1, Math.min(5, Math.floor(Number(goals?.maxActive ?? 3) || 3)))}
            </div>
          </div>

          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={Math.max(1, Math.min(5, Math.floor(Number(goals?.maxActive ?? 3) || 3)))}
            onChange={(e) => {
              const next = Math.max(1, Math.min(5, Math.floor(Number(e.target.value) || 3)));
              onUpdateSettings({
                ...data.settings,
                goals: { ...(data.settings as any).goals, maxActive: next },
              } as any);
            }}
            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
          />

          <div className="mt-3 text-xs text-gray-400">
            Uwaga: limit dotyczy celów oznaczonych jako aktywne (backlog jest poza głównym loopem).
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
              Komendy głosowe
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-400 pl-0 md:pl-12 leading-relaxed">
            Zaawansowane powiadomienia głosowe i inteligentne wyzwalacze
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Voice Command Examples */}
          <div className="glass-card glass-card-magenta space-widget">
            <h3 className="text-lg font-bold text-white mb-4">Dostępne komendy</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-glass-light rounded-widget">
                <span className="text-neon-magenta">🔔</span>
                <div>
                  <p className="text-white font-medium">Misja zakończona</p>
                  <p className="text-xs text-gray-400">Świętuje ukończenie zadania</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-glass-light rounded-widget">
                <span className="text-neon-cyan">⏰</span>
                <div>
                  <p className="text-white font-medium">Zbliża się deadline sprintu</p>
                  <p className="text-xs text-gray-400">Ostrzega o presji czasu</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-glass-light rounded-widget">
                <span className="text-gold">🎯</span>
                <div>
                  <p className="text-white font-medium">Wybrano priorytet dnia</p>
                  <p className="text-xs text-gray-400">Ogłasza zadanie do fokusu</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-glass-light rounded-widget">
                <span className="text-neon-magenta">🔥</span>
                <div>
                  <p className="text-white font-medium">Wykryto utknięcie celu</p>
                  <p className="text-xs text-gray-400">Wiadomość wsparcia motywacyjnego</p>
                </div>
              </div>
            </div>
          </div>

          {/* Voice Settings Summary */}
          <div className="glass-card space-widget">
            <h3 className="text-lg font-bold text-white mb-4">Aktualna konfiguracja głosu</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-glow-cyan mb-1">{voice.volume}%</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Głośność</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-glow-magenta mb-1">
                  {voice.speed || 1.0}x
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Szybkość</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${voice.enabled ? 'bg-neon-cyan' : 'bg-[var(--border-subtle)]'}`}
                />
                <span
                  className={`text-sm uppercase tracking-wider font-bold ${voice.enabled ? 'text-glow-cyan' : 'text-[var(--text-muted)]'}`}
                >
                  {voice.enabled ? 'Komendy głosowe: aktywne' : 'Komendy głosowe: wyłączone'}
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
              Dane i kopie zapasowe
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-400 pl-0 md:pl-12 leading-relaxed">
            Eksportuj lub importuj całą konfigurację aplikacji
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Card */}
          <div className="glass-card glass-card-cyan space-widget">
            <div className="mb-5">
              <h3 className="text-base md:text-lg font-bold text-white mb-2">Eksport danych</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-2">
                Pobierz pełną konfigurację jako plik JSON (kopia zapasowa / przeniesienie)
              </p>
              <label className="mt-3 flex items-start gap-3 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={exportIncludeApiKey}
                  onChange={(e) => setExportIncludeApiKey(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Eksportuj z kluczem API (niezalecane).
                  <span className="block text-[11px] text-gray-400 mt-1">
                    Domyślnie klucz API nie jest eksportowany. Zaznacz tylko jeśli wiesz, co robisz.
                  </span>
                </span>
              </label>
              <p className="text-xs text-neon-cyan font-mono">Storage: {storageType}</p>
            </div>
            <button onClick={handleExport} className="btn-premium btn-cyan w-full text-sm">
              <span className="mr-2">📥</span>
              Pobierz kopię
            </button>
          </div>

          {/* Scheduler & Notifications Card */}
          <div className="glass-card glass-card-cyan space-widget">
            <div className="mb-5">
              <h3 className="text-base md:text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span>🕐</span>
                Harmonogram kontroli utknięć
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">
                Automatyczny dzienny audyt zadań utkwionych na 90%+. Uruchamia się codziennie o
                10:00.
              </p>

              {/* Scheduler Status */}
              <div className="mb-4 p-3 rounded-lg bg-black/30">
                <div className="text-sm text-white mb-2">
                  <strong>Status:</strong>{' '}
                  <span
                    className={
                      schedulerStatus?.isRunning
                        ? 'text-[var(--accent-success)]'
                        : 'text-[var(--accent-danger)]'
                    }
                  >
                    {schedulerStatus?.isRunning ? '🟢 Działa' : '🔴 Zatrzymany'}
                  </span>
                </div>
                {schedulerStatus?.lastAudit && (
                  <div className="text-sm text-gray-300">
                    <strong>Ostatni audyt:</strong>{' '}
                    {new Date(schedulerStatus.lastAudit.timestamp).toLocaleString()}
                    {' • '}
                    wykryto: {schedulerStatus.lastAudit.stuckTasksCount} utkwionych zadań
                  </div>
                )}
              </div>

              {/* Notification Permission */}
              <div className="mb-4 p-3 rounded-lg bg-black/30">
                <div className="text-sm text-white mb-2">
                  <strong>Powiadomienia:</strong>{' '}
                  <span
                    className={
                      notificationPermission === 'granted'
                        ? 'text-[var(--accent-success)]'
                        : notificationPermission === 'denied'
                          ? 'text-[var(--accent-danger)]'
                          : 'text-[var(--accent-warning)]'
                    }
                  >
                    {notificationPermission === 'granted'
                      ? '🔔 Włączone'
                      : notificationPermission === 'denied'
                        ? '🚫 Odmowa'
                        : '❓ Nieznane'}
                  </span>
                </div>
                {notificationPermission !== 'granted' && (
                  <button
                    onClick={handleRequestNotifications}
                    className="btn-premium btn-cyan text-xs mt-2"
                  >
                    Poproś o uprawnienie
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleRunAudit} className="btn-premium btn-cyan flex-1 text-sm">
                <span className="mr-2">🔍</span>
                Uruchom audyt teraz
              </button>
              <button
                onClick={handleSyncData}
                className="btn-premium btn-magenta flex-1 text-sm"
                title="Sync pending data to server"
              >
                <span className="mr-2">🔄</span>
                Synchronizuj dane
              </button>
            </div>

            {/* Sync Status */}
            {schedulerStatus?.lastSync && (
              <div
                className="mt-3 p-3 rounded-lg bg-black/30 border"
                style={{
                  borderColor:
                    schedulerStatus.lastSync.result === 'success'
                      ? 'var(--accent-cyan)'
                      : 'var(--accent-danger)',
                }}
              >
                <div className="text-xs text-gray-400 mb-1">
                  Ostatnia synchronizacja:{' '}
                  {new Date(schedulerStatus.lastSync.timestamp).toLocaleString()}
                </div>
                <div
                  className="text-xs"
                  style={{
                    color:
                      schedulerStatus.lastSync.result === 'success'
                        ? 'var(--accent-cyan)'
                        : 'var(--accent-danger)',
                  }}
                >
                  {schedulerStatus.lastSync.result === 'success'
                    ? `✅ Zsynchronizowano: ${schedulerStatus.lastSync.itemsSynced || 0}`
                    : `❌ Nie udało się zsynchronizować: ${schedulerStatus.lastSync.itemsFailed || 0}`}
                </div>
              </div>
            )}
          </div>

          {/* Import Card */}
          <div className="glass-card glass-card-magenta space-widget">
            <div className="mb-5">
              <h3 className="text-base md:text-lg font-bold text-white mb-2">Import danych</h3>
              <p className="text-xs text-[var(--accent-danger)] leading-relaxed font-semibold mb-2">
                ⚠️ Uwaga: nadpisuje obecną konfigurację
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Wgraj plik JSON, aby przywrócić konfigurację
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
              Wgraj i przywróć
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(SettingsPremium);
