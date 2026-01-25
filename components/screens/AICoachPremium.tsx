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
  const { aiStatus } = useAppContext();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Phase 2: Use normalized data if available, fallback to legacy
  const useNormalized = normalizedData !== null;

  console.log('🤖 AICoach using data format:', useNormalized ? 'NORMALIZED' : 'LEGACY');

  // TEMPORARILY DISABLED: Phase 2 normalized data - causing runtime errors
  // TODO: Fix normalized data access issues in production build
  const chatHistory = useMemo(() => {
    // Legacy: direct access
    return data.aiChatHistory;
  }, [data.aiChatHistory]);

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
          {aiStatus.state === 'disabled' && <span>⚪ AI disabled (Settings → AI)</span>}
        </div>
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

              {/* Suggested Prompts */}
              <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <motion.div
                  className="glass-card glass-card-gold space-widget text-left cursor-pointer hover:scale-105 transition-transform"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  onClick={() => setInput('Zasada: max 3 cele aktywne.')}
                >
                  <div className="text-3xl mb-2">🧾</div>
                  <h4 className="text-white font-bold text-sm mb-1">Rule memory (test)</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    "Zasada: max 3 cele aktywne."
                  </p>
                </motion.div>

                <motion.div
                  className="glass-card glass-card-red space-widget text-left cursor-pointer hover:scale-105 transition-transform"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 }}
                  onClick={() => setInput('Chcę dodać 4. cel. Pomóż mi to zrobić.')}
                >
                  <div className="text-3xl mb-2">⛔</div>
                  <h4 className="text-white font-bold text-sm mb-1">Violation (test)</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    "Chcę dodać 4. cel."
                  </p>
                </motion.div>

                <motion.div
                  className="glass-card glass-card-cyan space-widget text-left cursor-pointer hover:scale-105 transition-transform"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => setInput('What should I focus on today?')}
                >
                  <div className="text-3xl mb-2">🎯</div>
                  <h4 className="text-white font-bold text-sm mb-1">Daily Focus</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    "What should I focus on today?"
                  </p>
                </motion.div>

                <motion.div
                  className="glass-card glass-card-magenta space-widget text-left cursor-pointer hover:scale-105 transition-transform"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => setInput('Analyze my progress this week')}
                >
                  <div className="text-3xl mb-2">📊</div>
                  <h4 className="text-white font-bold text-sm mb-1">Progress Review</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    "Analyze my progress this week"
                  </p>
                </motion.div>

                <motion.div
                  className="glass-card glass-card-gold space-widget text-left cursor-pointer hover:scale-105 transition-transform"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => setInput('Help me prioritize my tasks')}
                >
                  <div className="text-3xl mb-2">⚡</div>
                  <h4 className="text-white font-bold text-sm mb-1">Task Priority</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    "Help me prioritize my tasks"
                  </p>
                </motion.div>

                <motion.div
                  className="glass-card space-widget text-left cursor-pointer hover:scale-105 transition-transform"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => setInput('What are my biggest blockers?')}
                >
                  <div className="text-3xl mb-2">🚧</div>
                  <h4 className="text-white font-bold text-sm mb-1">Identify Blockers</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    "What are my biggest blockers?"
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
                      <div className="w-12 h-12 rounded-widget flex items-center justify-center bg-gradient-to-br from-gold/40 to-amber-600/40 border-2 border-gold/60 shadow-glow-gold flex-shrink-0">
                        <span className="text-2xl">🤖</span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[80%] md:max-w-[70%] rounded-widget p-5 md:p-6 backdrop-blur-xl ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-neon-magenta/30 via-neon-magenta/20 to-neon-cyan/30 border-2 border-neon-magenta/70 shadow-glow-magenta'
                          : 'bg-gradient-to-br from-glass-medium to-glass-light border-2 border-gold/40 shadow-glow-gold'
                      }`}
                    >
                      <div
                        className={`text-[10px] uppercase tracking-widest font-bold mb-3 flex items-center gap-2 ${
                          msg.role === 'user' ? 'text-neon-magenta' : 'text-gold'
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
                  <div className="w-12 h-12 rounded-widget flex items-center justify-center bg-gradient-to-br from-gold/40 to-amber-600/40 border-2 border-gold/60 shadow-glow-gold flex-shrink-0">
                    <span className="text-2xl">🤖</span>
                  </div>

                  {/* Loading Bubble */}
                  <div className="bg-gradient-to-br from-glass-medium to-glass-light border-2 border-gold/40 shadow-glow-gold rounded-widget p-5 backdrop-blur-xl">
                    <div className="text-[10px] uppercase tracking-widest font-bold mb-3 text-gold flex items-center gap-2">
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
                        className="w-3 h-3 rounded-full bg-neon-magenta shadow-glow-magenta"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-3 h-3 rounded-full bg-gold shadow-glow-gold"
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
              className="text-xs px-3 py-2 rounded-widget bg-glass-light border border-gray-700/50 text-gray-300 hover:border-neon-cyan hover:text-neon-cyan transition-all whitespace-nowrap"
            >
              🎯 Daily Focus
            </button>
            <button
              type="button"
              onClick={() => setInput('Analyze my progress')}
              className="text-xs px-3 py-2 rounded-widget bg-glass-light border border-gray-700/50 text-gray-300 hover:border-gold hover:text-gold transition-all whitespace-nowrap"
            >
              📊 Progress
            </button>
            <button
              type="button"
              onClick={() => setInput('Suggest priorities')}
              className="text-xs px-3 py-2 rounded-widget bg-glass-light border border-gray-700/50 text-gray-300 hover:border-neon-magenta hover:text-neon-magenta transition-all whitespace-nowrap"
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
                  color: '#ffffff',
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
              className="btn-premium btn-magenta px-8 py-4 text-sm font-bold whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
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
