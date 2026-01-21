import React from 'react';
import { motion } from 'framer-motion';
import { ViewState } from '../types';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  stuckCount: number;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView, stuckCount }) => {
  const navItems = [
    { id: 'home' as ViewState, icon: '🏠', label: 'Home' },
    { id: 'today' as ViewState, icon: '📋', label: 'Today' },
    { id: 'timer' as ViewState, icon: '⏰', label: 'Timer' },
    { id: 'ai_coach' as ViewState, icon: '🤖', label: 'AI' },
    { id: 'settings' as ViewState, icon: '⚙️', label: 'Settings' },
  ];

  return (
    <motion.nav 
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Premium Glassmorphic Navigation */}
      <div className="glass-card mx-4 mb-4 rounded-2xl border-2 border-[var(--color-accent-cyan)]/20 overflow-hidden">
        {/* Subtle Top Glow */}
        <div 
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent-cyan)] to-transparent opacity-50"
        />
        
        <div className="grid grid-cols-5 p-2">
          {navItems.map((item, index) => {
            const isActive = currentView === item.id;
            
            return (
              <motion.button
                key={item.id}
                onClick={() => setView(item.id)}
                className="relative flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--color-accent-magenta)]/20 to-[var(--color-accent-cyan)]/20 border border-[var(--color-accent-cyan)]/50"
                    layoutId="activeTab"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    style={{
                      boxShadow: 'inset 0 0 20px rgba(0,243,255,0.2)'
                    }}
                  />
                )}
                
                {/* Icon */}
                <motion.span 
                  className={`text-2xl mb-1 relative z-10 ${
                    isActive ? 'filter drop-shadow-[0_0_8px_var(--color-accent-cyan)]' : ''
                  }`}
                  animate={isActive ? {
                    scale: [1, 1.15, 1],
                  } : {}}
                  transition={{
                    duration: 0.3,
                    ease: "easeOut"
                  }}
                >
                  {item.icon}
                </motion.span>
                
                {/* Label */}
                <span 
                  className={`text-xs font-bold uppercase tracking-wider relative z-10 transition-all ${
                    isActive 
                      ? 'text-[var(--color-accent-cyan)] text-glow-cyan' 
                      : 'text-[var(--color-text-tertiary)]'
                  }`}
                >
                  {item.label}
                </span>

                {/* Badge for stuck projects */}
                {item.id === 'home' && stuckCount > 0 && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-black flex items-center justify-center z-20"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    <motion.span 
                      className="text-xs font-bold text-white"
                      animate={{
                        scale: [1, 1.2, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      {stuckCount}
                    </motion.span>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
};

export default React.memo(Navigation);
