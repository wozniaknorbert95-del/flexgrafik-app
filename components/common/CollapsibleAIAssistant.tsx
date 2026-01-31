/**
 * Collapsible AI Assistant Widget
 *
 * Reduces cognitive load on dashboard by making AI assistant collapsible.
 * Follows "minimum complexity, maximum effectiveness" principle.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleAIAssistantProps {
  onOpenAI: () => void;
}

export const CollapsibleAIAssistant: React.FC<CollapsibleAIAssistantProps> = ({ onOpenAI }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      className="widget-container mt-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="glass-card p-4 border border-white/10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm text-gray-400 uppercase tracking-wider font-semibold">
                AI Assistant
              </div>
              <div className="text-white font-bold text-sm">Pomoc w priorytecie i mikrokroku</div>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={onOpenAI}
                  className="w-full btn-premium btn-cyan flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Otwórz AI Coach
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
