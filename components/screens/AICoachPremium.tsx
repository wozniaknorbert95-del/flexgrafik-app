import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppData, ChatMessage } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
// import { NormalizedSelectors } from '../../types/normalized'; // TEMPORARILY DISABLED

// Using any to avoid runtime type references

interface AICoachProps {
  data: AppData;
  normalizedData?: any; // Phase 2: optional for gradual migration
  onSendMessage: (message: string) => Promise<void>;
  onBack: () => void;
}

const AICoachPremium: React.FC<AICoachProps> = ({
  data,
  normalizedData,
  onSendMessage,
  onBack,
}) => {
  const { aiStatus, setCurrentView, handleUpdateSettings } = useAppContext();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Phase 2: Use normalized data if available, fallback to legacy
  const useNormalized = normalizedData !== null;

  // TEMPORARILY DISABLED: Phase 2 normalized data - causing runtime errors
  // TODO: Fix normalized data access issues in production build
  const chatHistory = useMemo(() => {
    // Legacy: direct access
    return data.aiChatHistory;
  }, [data.aiChatHistory]);

  const isAiEnabled = Boolean((data as any)?.settings?.ai?.enabled);

  // Memoize scroll function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Only scroll when chat history length changes (not on every data change)
  const chatHistoryLength = useMemo(() => chatHistory.length, [chatHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistoryLength, scrollToBottom]);

  // Memoize submit handler
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const message = input.trim();
      setInput('');
      setIsLoading(true);

      try {
        await onSendMessage(message);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, onSendMessage]
  );

  return (
    <div data-component="AICoach" className="min-h-screen pb-32 pt-8 px-6 flex flex-col">
      {/* Header */}
      <motion.div
        className="widget-container-narrow mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={onBack} className="btn-premium btn-cyan mb-8">
          ← Back to Command Center
        </button>

        <div className="flex items-center gap-4 mb-3">
          <span className="text-5xl md:text-6xl neon-breath">🤖</span>
          <h1 className="text-4xl md:text-6xl font-extrabold uppercase tracking-wider text-gradient-gold">
            AI Assistant
          </h1>
        </div>
        <p className="text-sm md:text-base text-gray-300 leading-relaxed">
          Strategic analysis powered by artificial intelligence
        </p>

        {/* AI status banner */}
        <div
          className={`mt-4 rounded-widget border px-4 py-3 text-sm ${
            aiStatus.state === 'online'
              ? 'border-green-500/40 bg-green-500/10 text-green-200'
              : aiStatus.state === 'disabled'
                ? 'border-gray-500/30 bg-gray-500/10 text-gray-200'
                : 'border-red-500/40 bg-red-500/10 text-red-200'
          }`}
          role="status"
          aria-live="polite"
        >
          {aiStatus.state === 'online' && <span>🟢 AI enabled</span>}
          {aiStatus.state === 'offline' && <span>🔴 AI offline (using fallback)</span>}
          {aiStatus.state === 'disabled' && (
            <span>⚪ AI disabled (Config ⚙ → AI Assistant → Enable AI Support)</span>
          )}
        </div>

        {/* Emergency: make it impossible to get stuck without a path */}
        {aiStatus.state === 'disabled' && (
          <div className="mt-3 flex flex-col md:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                // Local-first: enable AI flag (Ollama may still be offline; fallback will handle it).
                const currentAi = (data as any)?.settings?.ai ?? {};
                handleUpdateSettings({
                  ai: { ...currentAi, enabled: true },
                } as any);
              }}
              className="btn-premium btn-magenta"
            >
              ✅ Enable AI now
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('settings')}
              className="btn-premium btn-cyan"
            >
              ⚙ Open Config
            </button>
          </div>
        )}
      </motion.div>

      {/* Messages */}
      <div className="widget-container-narrow flex-1 mb-8">
        <div className="glass-card space-widget-lg min-h-[500px] max-h-[600px] overflow-y-auto">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              {/* Icon & Title */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <span className="text-7xl block mb-4 neon-breath">🤖</span>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  AI Assistant Ready
                </h3>
                <p className="text-gray-400 text-sm md:text-base max-w-lg">
                  Ask strategic questions, analyze mission progress, or get priority recommendations
                </p>
              </motion.div>

              {/* Suggested Prompts (production / finish-first) */}
              <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <motion.div
                  className="glass-card space-widget text-left cursor-pointer hover:scale-105 transition-transform border border-neon-cyan/40 hover:shadow-glow-cyan"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  onClick={() => setInput('Co powinienem dziś domknąć?')}
                >
                  <div className="text-3xl mb-2">🏁</div>
                  <h4 className="text-white font-bold text-sm mb-1">Co dziś domykamy?</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    "Co powinienem dziś domknąć?"
                  </p>
                </motion.div>

                <motion.div
                  className="glass-card space-widget text-left cursor-pointer hover:scale-105 transition-transform border border-neon-magenta/40 hover:shadow-glow-magenta"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 }}
                  onClick={() =>
                    setInput('Daj mi mikrokrok (5–10 min) dla taska, który mam teraz domknąć.')
                  }
                >
                  <div className="text-3xl mb-2">🧩</div>
                  <h4 className="text-white font-bold text-sm mb-1">Mikrokrok</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    "Daj mi mikrokrok (5–10 min) dla taska, który mam teraz domknąć."
                  </p>
                </motion.div>

                <motion.div
                  className="glass-card space-widget text-left cursor-pointer hover:scale-105 transition-transform border border-gold/40 hover:shadow-glow-gold"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => setInput('Co mnie teraz blokuje?')}
                >
                  <div className="text-3xl mb-2">🚧</div>
                  <h4 className="text-white font-bold text-sm mb-1">Co mnie blokuje?</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    "Co mnie teraz blokuje?"
                  </p>
                </motion.div>

                <motion.div
                  className="glass-card glass-card-warning space-widget text-left cursor-pointer hover:scale-105 transition-transform"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  onClick={() => setInput('Jak przebić się przez 90% i zrobić realny finisz?')}
                >
                  <div className="text-3xl mb-2">🎯</div>
                  <h4 className="text-white font-bold text-sm mb-1">Przebicie 90%</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    "Jak przebić się przez 90% i zrobić realny finisz?"
                  </p>
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence>
                {chatHistory.map((msg, index) => (
                  <motion.div
                    key={index}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {/* Avatar */}
                    {msg.role === 'assistant' && (
                      <div className="w-12 h-12 rounded-widget flex items-center justify-center bg-gradient-to-br from-neon-cyan/25 to-neon-cyan/10 border-2 border-neon-cyan/60 shadow-glow-cyan flex-shrink-0">
                        <span className="text-2xl">🤖</span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[80%] md:max-w-[70%] rounded-widget p-5 md:p-6 backdrop-blur-xl ${
                        msg.role === 'user'
                          ? 'bg-neon-magenta/10 border-2 border-neon-magenta/60 shadow-glow-magenta'
                          : 'bg-gradient-to-br from-glass-medium to-glass-light border-2 border-neon-cyan/50 shadow-glow-cyan'
                      }`}
                    >
                      <div
                        className={`text-[10px] uppercase tracking-widest font-bold mb-3 flex items-center gap-2 ${
                          msg.role === 'user' ? 'text-neon-magenta' : 'text-neon-cyan'
                        }`}
                      >
                        {msg.role === 'user' ? '👤 OPERATOR' : '🤖 AI ASSISTANT'}
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-500 font-normal">NOW</span>
                      </div>
                      <div className="text-white text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>

                    {/* User Avatar */}
                    {msg.role === 'user' && (
                      <div className="w-12 h-12 rounded-widget flex items-center justify-center bg-gradient-to-br from-neon-magenta/40 to-neon-cyan/40 border-2 border-neon-magenta/60 shadow-glow-magenta flex-shrink-0">
                        <span className="text-2xl">👤</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  className="flex justify-start gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  {/* AI Avatar */}
                  <div className="w-12 h-12 rounded-widget flex items-center justify-center bg-gradient-to-br from-neon-cyan/25 to-neon-cyan/10 border-2 border-neon-cyan/60 shadow-glow-cyan flex-shrink-0">
                    <span className="text-2xl">🤖</span>
                  </div>

                  {/* Loading Bubble */}
                  <div className="bg-gradient-to-br from-glass-medium to-glass-light border-2 border-neon-cyan/40 shadow-glow-cyan rounded-widget p-5 backdrop-blur-xl">
                    <div className="text-[10px] uppercase tracking-widest font-bold mb-3 text-neon-cyan flex items-center gap-2">
                      🤖 AI ASSISTANT
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500 font-normal">ANALYZING...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="w-3 h-3 rounded-full bg-neon-cyan shadow-glow-cyan"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-3 h-3 rounded-full bg-neon-cyan shadow-glow-cyan"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-3 h-3 rounded-full bg-neon-cyan shadow-glow-cyan"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                      />
                      <span className="text-gray-400 text-sm ml-2">Processing query...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Section */}
      <div className="widget-container-narrow">
        <motion.div
          className="glass-card glass-card-magenta space-widget"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-800">
            <button
              type="button"
              onClick={() => setInput('What should I focus on today?')}
              className="btn btn-ghost btn-primary btn-sm text-xs whitespace-nowrap"
            >
              🎯 Daily Focus
            </button>
            <button
              type="button"
              onClick={() => setInput('Analyze my progress')}
              className="btn btn-ghost btn-primary btn-sm text-xs whitespace-nowrap"
            >
              📊 Progress
            </button>
            <button
              type="button"
              onClick={() => setInput('Suggest priorities')}
              className="btn btn-ghost btn-secondary btn-sm text-xs whitespace-nowrap"
            >
              ⚡ Priorities
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-lg pointer-events-none z-10">
                💬
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question here..."
                disabled={isLoading}
                autoComplete="off"
                className="w-full bg-glass-heavy border border-gray-700/50 rounded-widget pl-12 pr-4 md:pr-24 py-4 text-white text-sm placeholder-gray-500 
                focus:border-neon-magenta focus:shadow-glow-magenta focus:outline-none 
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all appearance-none"
                style={{
                  WebkitAppearance: 'none',
                  boxShadow: 'none',
                  outline: 'none',
                }}
              />
              <div className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-600 uppercase tracking-wider pointer-events-none">
                ENTER ↵
              </div>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="btn btn-secondary btn-lg px-8 py-4 text-sm font-bold whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  <span className="hidden md:inline">Processing...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  📤 <span>Send</span>
                </span>
              )}
            </button>
          </form>

          {/* Hint Text */}
          <div className="mt-4 pt-3 border-t border-gray-800">
            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="text-gold font-semibold">💡 TIP:</span> Ask strategic questions or
              use quick actions above
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(AICoachPremium);
