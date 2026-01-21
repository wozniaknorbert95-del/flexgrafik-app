import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppData, ChatMessage } from '../../types';
import { chatWithAI } from '../../services/aiService';
import { getSystemPrompt } from '../../prompts/systemPrompt';
import { handleError } from '../../utils/errorHandler';
import { GlassCard } from '../ui/GlassCard';
import { PremiumButton } from '../ui/PremiumButton';
import { ANIMATION_VARIANTS } from '../../constants/design';

interface AICoachProps {
  data: AppData;
  onUpdateChatHistory: (messages: ChatMessage[]) => void;
  onBack: () => void;
}

const AICoach: React.FC<AICoachProps> = ({ data, onUpdateChatHistory, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(data.aiChatHistory);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!data.settings.ai.enabled || !data.settings.ai.apiKey) {
      alert('Włącz AI Coach i dodaj API key w Settings');
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    onUpdateChatHistory(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const systemPrompt = data.settings.ai.customSystemPrompt ||
        getSystemPrompt(data);

      const conversationHistory = newMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const aiResponse = await chatWithAI(conversationHistory, systemPrompt, data.settings.ai.apiKey);

      const aiMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      onUpdateChatHistory(finalMessages);
    } catch (error: any) {
      handleError(error, {
        component: 'AICoach',
        action: 'sendMessage',
        userMessage: 'Failed to send message to AI coach'
      });
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: `Przepraszam, wystąpił błąd: ${error.message}. Spróbuj ponownie.`,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);
      onUpdateChatHistory(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Czy na pewno chcesz wyczyścić całą historię rozmowy?')) {
      setMessages([]);
      onUpdateChatHistory([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <motion.div 
      className="pb-24 pt-6 px-6 max-w-3xl mx-auto min-h-screen flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Premium Header */}
      <motion.div 
        className="mb-6 pb-6 border-b border-[var(--color-border-subtle)] flex justify-between items-center"
        variants={ANIMATION_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
      >
        <PremiumButton
          variant="ghost"
          size="sm"
          onClick={onBack}
        >
          ← Back
        </PremiumButton>
        
        <h1 className="text-2xl font-extrabold uppercase tracking-[0.3em]">
          <span className="text-glow-cyan">AI Coach</span>
        </h1>
        
        <PremiumButton
          variant="ghost"
          size="sm"
          onClick={handleClearChat}
          disabled={messages.length === 0}
        >
          🗑️ Clear
        </PremiumButton>
      </motion.div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto mb-6 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-16"
            >
              <GlassCard className="p-12">
                <motion.div 
                  className="text-7xl mb-6"
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  🤖
                </motion.div>
                <h2 className="text-2xl font-bold text-gradient-gold mb-3">
                  Welcome to AI Coach!
                </h2>
                <p className="text-[var(--color-text-secondary)] text-sm max-w-md mx-auto">
                  Ask questions or request advice about your projects, productivity, or goals.
                </p>
              </GlassCard>
            </motion.div>
          ) : (
            messages.map((message, index) => (
              <motion.div
                key={message.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                  delay: index * 0.05
                }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`max-w-[85%] ${message.role === 'user' ? 'ml-8' : 'mr-8'}`}
                >
                  <GlassCard
                    variant={message.role === 'user' ? 'hover-glow' : 'default'}
                    glowColor={message.role === 'user' ? 'magenta' : 'cyan'}
                    className={`p-4 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-[var(--color-accent-magenta)]/20 to-[var(--color-accent-magenta)]/5 border-[var(--color-accent-magenta)]/30'
                        : 'bg-gradient-to-br from-[var(--color-accent-cyan)]/20 to-[var(--color-accent-cyan)]/5 border-[var(--color-accent-cyan)]/30'
                    }`}
                  >
                    {/* Message Content */}
                    <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    
                    {/* Timestamp */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                      <div className={`text-xs font-medium uppercase tracking-wider ${
                        message.role === 'user' ? 'text-[var(--color-accent-magenta)]' : 'text-[var(--color-accent-cyan)]'
                      }`}>
                        {message.role === 'user' ? 'You' : 'AI Coach'}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {new Date(message.timestamp).toLocaleTimeString('pl-PL', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              </motion.div>
            ))
          )}

          {/* Typing Indicator */}
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[85%] mr-8">
                <GlassCard 
                  className="p-4 bg-gradient-to-br from-[var(--color-accent-cyan)]/20 to-[var(--color-accent-cyan)]/5 border-[var(--color-accent-cyan)]/30"
                >
                  <div className="flex items-center space-x-3">
                    <motion.div 
                      className="text-2xl"
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      🤔
                    </motion.div>
                    <div className="flex space-x-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-[var(--color-accent-cyan)]"
                          animate={{
                            y: [0, -8, 0],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.15,
                            ease: "easeInOut"
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-[var(--color-text-secondary)]">AI is thinking...</span>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <motion.div 
        className="border-t border-[var(--color-border-subtle)] pt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard className="p-4">
          <div className="flex space-x-3">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message AI Coach..."
              className="flex-1 bg-black/50 border border-[var(--color-border-subtle)] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[var(--color-accent-magenta)] focus:shadow-[0_0_15px_rgba(255,0,255,0.3)] resize-none transition-all"
              rows={2}
              disabled={isLoading}
            />
            <PremiumButton
              variant="primary"
              glowColor="magenta"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="flex-shrink-0 !px-6"
            >
              {isLoading ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  ⏳
                </motion.span>
              ) : (
                '📤'
              )}
            </PremiumButton>
          </div>

          <div className="text-xs text-[var(--color-text-muted)] mt-3 text-center">
            Press <kbd className="px-2 py-0.5 bg-black/50 rounded border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)] font-mono text-xs">Enter</kbd> to send • <kbd className="px-2 py-0.5 bg-black/50 rounded border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)] font-mono text-xs">Shift+Enter</kbd> for new line
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

export default React.memo(AICoach);
