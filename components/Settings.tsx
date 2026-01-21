import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AppData } from '../types';
import { generateDailyPriorities, chatWithAI } from '../services/aiService';
import { getSystemPrompt } from '../prompts/systemPrompt';
import { useVoiceNotify } from '../utils/voiceUtils';
import { withErrorHandling, handleError } from '../utils/errorHandler';
import { GlassCard } from './ui/GlassCard';
import { PremiumButton } from './ui/PremiumButton';
import { ANIMATION_VARIANTS } from '../constants/design';

// Strategy validation and management utilities
const validateStrategy = (json: unknown): boolean => {
  if (typeof json !== 'object' || json === null) return false;
  const data = json as Record<string, unknown>;
  try {
    // Check required fields exist
    if (!data.pillars || !Array.isArray(data.pillars)) return false;
    if (!data.phases || !Array.isArray(data.phases)) return false;
    if (!data.sprint || typeof data.sprint !== 'object') return false;

    // Check pillars structure
    if (data.pillars.length === 0) return false;
    const pillarsValid = data.pillars.every((p: unknown) => {
      if (typeof p !== 'object' || p === null) return false;
      const pillar = p as Record<string, unknown>;
      return pillar.id && pillar.name && typeof pillar.completion === 'number' &&
        pillar.done_definition && Array.isArray(pillar.tasks);
    });
    if (!pillarsValid) return false;

    // Check phases structure
    const phasesValid = data.phases.every((phase: unknown) => {
      if (typeof phase !== 'object' || phase === null) return false;
      const p = phase as Record<string, unknown>;
      return p.phase && p.name && typeof p.completion === 'number' &&
        Array.isArray(p.checklist);
    });
    if (!phasesValid) return false;

    return true;
  } catch (error) {
    handleError(error, {
      component: 'Settings',
      action: 'validateStrategy',
      userMessage: 'Strategy validation failed'
    });
    return false;
  }
};

const migrateStrategy = (json: unknown): Partial<AppData> => {
  // Add missing fields with defaults
  const migrated: Partial<AppData> = { ...(json as Partial<AppData>) };

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
    <motion.div 
      className="pb-24 pt-6 px-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Premium Sticky Header */}
      <motion.div 
        className="sticky top-0 z-20 mb-8 pb-6 backdrop-blur-xl bg-[var(--color-background-primary)]/80 border-b border-[var(--color-border-subtle)]"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <PremiumButton
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4"
        >
          ← BACK
        </PremiumButton>
        
        {/* Holographic Header */}
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-[0.3em] mb-2 text-gradient-gold">
          Settings
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] font-mono uppercase tracking-[0.3em]">
          /// SYSTEM CONFIGURATION TERMINAL
        </p>
      </motion.div>

      {/* Voice Settings Section - WIDGET GRID */}
      <motion.div 
        className="mb-12"
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
      >
        {/* Section Header with Gradient */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-[var(--color-accent-magenta)] to-[var(--color-accent-cyan)] rounded-full" />
          <h2 className="text-2xl font-extrabold uppercase tracking-wider text-gradient-gold">
            🔊 Voice Notifications
          </h2>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={ANIMATION_VARIANTS.staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Enable/Disable Toggle - WIDGET CARD */}
          <motion.div
            variants={ANIMATION_VARIANTS.fadeInUp}
          >
            <GlassCard variant="hover-glow" glowColor="magenta" className="p-6 h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">Voice Alerts</h3>
                <p className="text-xs text-gray-500 leading-relaxed">Receive spoken alerts and real-time notifications</p>
              </div>
              
              {/* Cyberpunk Toggle Switch */}
              <button
                onClick={handleVoiceToggle}
                className={`ml-4 w-14 h-7 rounded-full transition-all duration-300 relative ${
                  voice.enabled 
                    ? 'bg-neon-cyan shadow-[0_0_15px_rgba(0,243,255,0.6)]' 
                    : 'bg-gray-700'
                }`}
              >
                <div className={`w-6 h-6 bg-white rounded-full transition-all duration-300 absolute top-0.5 shadow-lg ${
                  voice.enabled ? 'translate-x-7' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white border-opacity-5">
              <div className={`w-2 h-2 rounded-full ${voice.enabled ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}/>
              <span className={`text-xs font-mono uppercase tracking-wider ${voice.enabled ? 'text-green-400' : 'text-gray-600'}`}>
                {voice.enabled ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            </GlassCard>
          </motion.div>

          {/* Volume Slider - WIDGET CARD */}
          <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
            <GlassCard variant="hover-glow" glowColor="cyan" className="p-6 h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white uppercase tracking-wide">Volume</h3>
              <span className="text-2xl font-mono font-bold text-neon-cyan">{voice.volume}%</span>
            </div>
            
            {/* Custom Neon Slider */}
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value={voice.volume}
                onChange={handleVolumeChange}
                className="w-full h-2 bg-gray-900 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,215,0,0.8)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${voice.volume}%, #1a1a1a ${voice.volume}%, #1a1a1a 100%)`
                }}
              />
            </div>
            
            {/* Volume Indicator */}
            <div className="flex justify-between mt-3 text-xs font-mono text-gray-600">
              <span>MUTE</span>
              <span className="text-green-400">OPTIMAL</span>
              <span>MAX</span>
            </div>
            </GlassCard>
          </motion.div>

          {/* Speed Slider - WIDGET CARD */}
          <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
            <GlassCard variant="hover-glow" glowColor="magenta" className="p-6 h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white uppercase tracking-wide">Speech Rate</h3>
              <span className="text-2xl font-mono font-bold text-neon-magenta">{voice.speed.toFixed(1)}x</span>
            </div>
            
            {/* Custom Neon Slider */}
            <div className="relative">
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.1"
                value={voice.speed}
                onChange={handleSpeedChange}
                className="w-full h-2 bg-gray-900 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,215,0,0.8)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                style={{
                  background: `linear-gradient(to right, #ff00ff 0%, #00f3ff ${((voice.speed - 0.8) / 0.4) * 100}%, #1a1a1a ${((voice.speed - 0.8) / 0.4) * 100}%, #1a1a1a 100%)`
                }}
              />
            </div>
            
            {/* Speed Indicator */}
            <div className="flex justify-between mt-3 text-xs font-mono text-gray-600">
              <span>SLOW</span>
              <span className="text-neon-cyan">NORMAL</span>
              <span>FAST</span>
            </div>
            </GlassCard>
          </motion.div>

          {/* Test Button - WIDGET CARD (Spans 2 columns on desktop) */}
          <motion.div 
            className="md:col-span-2"
            variants={ANIMATION_VARIANTS.fadeInUp}
          >
            <GlassCard variant="gradient-border" glowColor="magenta" className="p-6">
              <PremiumButton
                variant="primary"
                size="lg"
                fullWidth
                glowColor="magenta"
                onClick={handleTestVoice}
              >
                <span className="text-xl">🎵</span>
                <span>Test Voice Notification</span>
              </PremiumButton>
              <p className="text-xs text-[var(--color-text-muted)] mt-3 text-center font-mono uppercase tracking-wider">
                /// Verify audio output settings
              </p>
            </GlassCard>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* AI Coach Settings Section - WIDGET GRID */}
      <motion.div 
        className="mb-12"
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
      >
        {/* Section Header with Gradient */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-[var(--color-accent-gold)] to-[var(--color-accent-magenta)] rounded-full" />
          <h2 className="text-2xl font-extrabold uppercase tracking-wider text-gradient-gold">
            🤖 AI Coach
          </h2>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={ANIMATION_VARIANTS.staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Enable/Disable AI Toggle - WIDGET CARD */}
          <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
            <GlassCard variant="hover-glow" glowColor="gold" className="p-6 h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">AI Assistant</h3>
                <p className="text-xs text-gray-500 leading-relaxed">AI-powered insights and daily priorities</p>
              </div>
              
              {/* Cyberpunk Toggle Switch */}
              <motion.button
                onClick={() => onUpdateSettings({
                  ...data.settings,
                  ai: { ...ai, enabled: !ai.enabled }
                })}
                className={`ml-4 w-14 h-7 rounded-full transition-all duration-300 relative ${
                  ai.enabled 
                    ? 'bg-gold shadow-[0_0_15px_rgba(255,215,0,0.6)]' 
                    : 'bg-gray-700'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div 
                  className="w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-lg"
                  animate={{
                    x: ai.enabled ? 28 : 2
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white border-opacity-5">
              <div className={`w-2 h-2 rounded-full ${ai.enabled ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}/>
              <span className={`text-xs font-mono uppercase tracking-wider ${ai.enabled ? 'text-gold' : 'text-gray-600'}`}>
                {ai.enabled ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            </GlassCard>
          </motion.div>

          {/* API Key Input - WIDGET CARD */}
          <motion.div 
            className="md:col-span-2"
            variants={ANIMATION_VARIANTS.fadeInUp}
          >
            <GlassCard variant="hover-glow" glowColor="magenta" className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wide">Groq API Key</h3>
            
            {/* Cyberpunk Input */}
            <div className="relative mb-4">
              <input
                type="password"
                value={ai.apiKey}
                onChange={(e) => onUpdateSettings({
                  ...data.settings,
                  ai: { ...ai, apiKey: e.target.value }
                })}
                placeholder="Enter your API key..."
                className="w-full bg-black/50 border-0 border-b-2 border-neon-magenta border-opacity-50 px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-neon-magenta focus:shadow-[0_2px_10px_#ff00ff] transition-all placeholder:text-gray-700 placeholder:uppercase placeholder:tracking-wider"
              />
            </div>
            
            <p className="text-xs text-gray-500 font-mono">
              Get free key: <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-neon-cyan hover:text-gold transition-colors underline">console.groq.com</a> (30 req/min free tier)
            </p>
            </GlassCard>
          </motion.div>

          {/* AI Test Button - WIDGET CARD */}
          <motion.div 
            className="md:col-span-2"
            variants={ANIMATION_VARIANTS.fadeInUp}
          >
            <GlassCard variant="gradient-border" glowColor="gold" className="p-6">
              <PremiumButton
                variant="primary"
                size="lg"
                fullWidth
                glowColor="gold"
                loading={loading}
                disabled={!ai.enabled}
                onClick={async () => {
                  if (!ai.apiKey) {
                    alert('Add API Key first');
                    return;
                  }
                  setLoading(true);
                  const response = await withErrorHandling(
                    () => generateDailyPriorities(data),
                    {
                      component: 'Settings',
                      action: 'testAI',
                      userMessage: 'Failed to test AI.'
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
              >
                <span className="text-xl">🧪</span>
                <span>{loading ? 'AI THINKING...' : 'Test AI Priority Generator'}</span>
              </PremiumButton>
            </GlassCard>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* AI Coach Personality Section - WIDGET GRID */}
      <motion.div 
        className="mb-12"
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.2 }}
      >
        {/* Section Header with Gradient */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-[var(--color-accent-cyan)] to-[var(--color-accent-gold)] rounded-full" />
          <h2 className="text-2xl font-extrabold uppercase tracking-wider text-gradient-gold">
            🎭 AI Personality
          </h2>
        </div>

        <motion.div 
          className="grid grid-cols-1 gap-6"
          variants={ANIMATION_VARIANTS.staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* System Prompt Editor - FULL WIDTH WIDGET */}
          <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
            <GlassCard variant="hover-glow" glowColor="cyan" className="p-6">
            <h3 className="text-lg font-bold text-white mb-3 uppercase tracking-wide">System Prompt</h3>
            <p className="text-xs text-gray-500 mb-4 font-mono uppercase tracking-wider">
              /// Customize AI behavior and personality
            </p>
            
            {/* Cyberpunk Textarea */}
            <textarea
              value={ai.customSystemPrompt || getSystemPrompt(data)}
              onChange={(e) => onUpdateSettings({
                ...data.settings,
                ai: { ...ai, customSystemPrompt: e.target.value }
              })}
              className="w-full bg-black/50 border-2 border-neon-cyan border-opacity-30 rounded-2xl px-4 py-3 text-white text-xs focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(0,243,255,0.3)] resize-none font-mono transition-all placeholder:text-gray-700"
              rows={8}
              placeholder="Enter system prompt..."
            />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button
                onClick={() => onUpdateSettings({
                  ...data.settings,
                  ai: { ...ai, customSystemPrompt: undefined }
                })}
                className="bg-gray-800 hover:bg-gray-700 hover:scale-[1.02] text-white font-bold py-3 px-4 rounded-xl text-sm transition-all uppercase tracking-wider"
              >
                🔄 Reset Default
              </button>
              <button
                onClick={async () => {
                  if (!ai.apiKey) {
                    alert('Add API Key first');
                    return;
                  }

                  const testPrompt = ai.customSystemPrompt || getSystemPrompt(data);
                  const testMessages = [{ role: 'user' as const, content: 'Hi! Who are you and how can you help?' }];

                  setLoading(true);
                  const response = await withErrorHandling(
                    () => chatWithAI(testMessages, testPrompt, ai.apiKey),
                    {
                      component: 'Settings',
                      action: 'testPrompt',
                      userMessage: 'Failed to test prompt.'
                    }
                  );

                  if (response) {
                    alert(`🤖 Test Response:\n\n${response}`);
                    if (voice.enabled) {
                      voiceNotify(response, 'normal');
                    }
                  }
                  setLoading(false);
                }}
                disabled={loading || !ai.enabled}
                className="bg-gradient-to-r from-neon-cyan to-neon-magenta hover:scale-[1.02] disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-black font-bold py-3 px-4 rounded-xl text-sm transition-all uppercase tracking-wider shadow-[0_0_15px_rgba(0,243,255,0.3)]"
              >
                {loading ? '⏳ Testing...' : '🧪 Test Prompt'}
              </button>
            </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Strategy Management Section - WIDGET GRID */}
      <motion.div 
        className="mb-12"
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
      >
        {/* Section Header with Gradient */}
        <h2 className="text-2xl font-extrabold uppercase tracking-wider mb-6 text-transparent bg-clip-text bg-gradient-to-r from-neon-magenta to-neon-cyan">
          📋 Strategy Management
        </h2>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={ANIMATION_VARIANTS.staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Export Strategy - WIDGET CARD */}
          <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
            <GlassCard variant="hover-glow" glowColor="cyan" className="p-6">
            <h3 className="text-lg font-bold text-white mb-3 uppercase tracking-wide">💾 Export Strategy</h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Download current strategic plan as JSON for backup or editing
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

                alert('Strategy downloaded!');
              }}
              className="w-full bg-gradient-to-r from-green-500 to-green-400 hover:scale-[1.02] active:scale-95 text-black font-bold py-3 px-4 rounded-xl transition-all uppercase tracking-wider shadow-[0_0_15px_rgba(34,197,94,0.4)]"
            >
              💾 Export JSON
            </button>
            </GlassCard>
          </motion.div>

          {/* Import Strategy - WIDGET CARD (Spans 2 columns) */}
          <motion.div className="md:col-span-2" variants={ANIMATION_VARIANTS.fadeInUp}>
            <GlassCard variant="hover-glow" className="p-6" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <h3 className="text-lg font-bold text-white mb-3 uppercase tracking-wide">📥 Import Strategy</h3>
            <p className="text-xs text-red-400 mb-4 font-bold uppercase tracking-wider">
              ⚠️ Warning: This will replace your current plan (irreversible!)
            </p>

            {/* Cyberpunk Textarea */}
            <textarea
              placeholder="Paste JSON strategy here..."
              className="w-full bg-black/50 border-2 border-red-500/30 rounded-2xl px-4 py-3 text-white text-xs focus:outline-none focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.3)] resize-none font-mono mb-4 transition-all placeholder:text-gray-700"
              rows={6}
              style={{ tabSize: 2 }}
            />

            <button
              onClick={async () => {
                const textarea = document.querySelector('textarea[placeholder*="Paste JSON"]') as HTMLTextAreaElement;
                const jsonText = textarea?.value?.trim();

                if (!jsonText) {
                  alert('Paste JSON strategy first.');
                  return;
                }

                try {
                  const importedData = JSON.parse(jsonText);

                  // Validate structure
                  if (!validateStrategy(importedData)) {
                    alert('❌ Invalid JSON structure. Check if all required fields are present.');
                    return;
                  }

                  // Confirm replacement
                  const confirmMessage = `⚠️ This will replace your current strategic plan!\n\nImported data contains:\n• ${importedData.pillars?.length || 0} pillars\n• ${importedData.phases?.length || 0} phases\n• ${importedData.customRules?.length || 0} rules\n\nContinue?`;

                  if (!confirm(confirmMessage)) {
                    return;
                  }

                  // Migrate and apply
                  const migratedData = migrateStrategy(importedData);
                  const newAppData = { ...data, ...migratedData };

                  // Update all settings at once
                  onUpdateSettings(newAppData.settings);

                  // Trigger full app reload to apply changes
                  alert('✅ Strategy imported! Refreshing app...');
                  window.location.reload();

                } catch (error) {
                  alert('❌ JSON parsing error. Check syntax.');
                  handleError(error, {
                    component: 'Settings',
                    action: 'importStrategy',
                    userMessage: 'Failed to import strategy'
                  });
                }
              }}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:scale-[1.02] active:scale-95 text-white font-bold py-3 px-4 rounded-xl transition-all uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.4)]"
            >
              📥 Import & Replace
            </button>
            </GlassCard>
          </motion.div>

          {/* Quick Stats - WIDGET CARD */}
          <motion.div className="md:col-span-2" variants={ANIMATION_VARIANTS.fadeInUp}>
            <GlassCard variant="hover-glow" glowColor="magenta" className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wide">🎯 Quick Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black/50 rounded-2xl p-4 text-center border border-neon-magenta border-opacity-20 hover:border-neon-magenta border-opacity-50 transition-all">
                <div className="text-3xl font-bold text-neon-magenta mb-1">{data.pillars.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">Pillars</div>
              </div>
              <div className="bg-black/50 rounded-2xl p-4 text-center border border-neon-cyan border-opacity-20 hover:border-neon-cyan border-opacity-50 transition-all">
                <div className="text-3xl font-bold text-neon-cyan mb-1">{data.phases.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">Phases</div>
              </div>
              <div className="bg-black/50 rounded-2xl p-4 text-center border border-gold border-opacity-20 hover:border-gold/50 transition-all">
                <div className="text-3xl font-bold text-gold mb-1">{data.customRules.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">Rules</div>
              </div>
              <div className="bg-black/50 rounded-2xl p-4 text-center border border-green-500 border-opacity-20 hover:border-green-500/50 transition-all">
                <div className="text-3xl font-bold text-green-400 mb-1">{data.aiChatHistory.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">AI Chats</div>
              </div>
            </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Data Management Section - WIDGET GRID */}
      <motion.div 
        className="mb-12"
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.2 }}
      >
        {/* Section Header with Gradient */}
        <h2 className="text-2xl font-extrabold uppercase tracking-wider mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-neon-cyan">
          💾 Data Management
        </h2>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={ANIMATION_VARIANTS.staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Export Backup - WIDGET CARD */}
          <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
            <GlassCard variant="hover-glow" glowColor="cyan" className="p-6">
            <button
              onClick={() => {
                const data = localStorage.getItem('flexgrafik-data');
                if (!data) return;

                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `flexgrafik-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full bg-gradient-to-r from-neon-cyan to-blue-500 hover:scale-[1.02] active:scale-95 text-black font-bold py-4 px-4 rounded-xl transition-all uppercase tracking-wider shadow-[0_0_15px_rgba(0,243,255,0.4)]"
            >
              💾 Export<br/>Backup
            </button>
            </GlassCard>
          </motion.div>

          {/* Import Backup - WIDGET CARD */}
          <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
            <GlassCard variant="hover-glow" glowColor="magenta" className="p-6">
            <label className="block">
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const data = JSON.parse(event.target?.result as string);
                      localStorage.setItem('flexgrafik-data', JSON.stringify(data));
                      window.location.reload();
                    } catch (error) {
                      alert('Invalid backup file');
                    }
                  };
                  reader.readAsText(file);
                }}
                className="hidden"
              />
              <button
                onClick={() => document.querySelector('input[type="file"]')?.click()}
                className="w-full bg-gray-700 hover:bg-gray-600 hover:scale-[1.02] active:scale-95 text-white font-bold py-4 px-4 rounded-xl transition-all uppercase tracking-wider"
              >
                📥 Import<br/>Backup
              </button>
            </label>
            </GlassCard>
          </motion.div>

          {/* Clear Data - WIDGET CARD */}
          <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
            <GlassCard variant="hover-glow" className="p-6" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <button
              onClick={() => {
                const confirmed = confirm('Are you sure you want to clear all data? This cannot be undone.');
                if (confirmed) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:scale-[1.02] active:scale-95 text-white font-bold py-4 px-4 rounded-xl transition-all uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.4)]"
            >
              🗑️ Clear All<br/>Data
            </button>
            </GlassCard>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* System Info Section */}
      <motion.div 
        className="mb-12"
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
      >
        {/* System Info - WIDGET CARD */}
        <GlassCard className="p-6">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">ℹ️ System Information</h3>
          <ul className="text-xs text-gray-600 space-y-2 font-mono">
            <li className="flex items-start gap-2">
              <span className="text-neon-cyan">▸</span>
              <span>Priorities: Normal, Urgent (repeated), Critical (repeated)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neon-magenta">▸</span>
              <span>Language: Polish (with English fallback)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold">▸</span>
              <span>Web Speech API required for voice notifications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">▸</span>
              <span>Strategies are fully backward compatible</span>
            </li>
          </ul>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

export default Settings;