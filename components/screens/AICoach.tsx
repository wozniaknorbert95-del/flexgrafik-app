import React, { useState, useEffect, useRef } from 'react';
import { AppData, ChatMessage } from '../../types';
import { chatWithAI } from '../../services/aiService';
import { getSystemPrompt } from '../../prompts/systemPrompt';
import { handleError } from '../../utils/errorHandler';

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
      // Use custom system prompt if available, otherwise use default
      const systemPrompt = data.settings.ai.customSystemPrompt ||
        getSystemPrompt(data);

      // Prepare messages for AI (exclude system messages and only include recent conversation)
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
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-fade-in min-h-screen flex flex-col">
      {/* Header */}
      <div className="mb-6 border-b border-gray-800 pb-4 flex justify-between items-center">
        <button
          onClick={onBack}
          className="text-cyber-cyan hover:text-cyber-magenta transition-colors"
        >
          ← Powrót
        </button>
        <h1 className="text-xl font-bold text-cyber-cyan tracking-widest uppercase">AI Coach</h1>
        <button
          onClick={handleClearChat}
          className="text-red-400 hover:text-red-300 text-sm"
          disabled={messages.length === 0}
        >
          🗑️ Wyczyść
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 max-h-[60vh]">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🤖</div>
            <p className="text-lg mb-2">Witaj w AI Coach!</p>
            <p className="text-sm">Zadaj pytanie lub poproś o radę dotyczącą Twoich projektów.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg shadow-lg ${
                  message.role === 'user'
                    ? 'bg-cyber-magenta text-black ml-4'
                    : 'bg-cyber-cyan text-black mr-4 border-2 border-cyber-cyan'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 opacity-70 ${
                  message.role === 'user' ? 'text-black' : 'text-gray-800'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString('pl-PL', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-cyber-cyan text-black p-3 rounded-lg mr-4 border-2 border-cyber-cyan">
              <div className="flex items-center space-x-2">
                <div className="animate-pulse">🤔</div>
                <span className="text-sm">AI myśli...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 pt-4">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Napisz wiadomość do AI Coach..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-cyber-magenta resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-cyber-magenta hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold px-4 py-3 rounded-lg transition-colors flex-shrink-0"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-2 text-center">
          Naciśnij Enter, aby wysłać • Shift+Enter dla nowej linii
        </div>
      </div>
    </div>
  );
};

export default AICoach;