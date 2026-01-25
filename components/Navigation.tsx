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
    {
      id: 'home' as ViewState,
      icon: '🎯',
      label: 'Mission',
      ariaLabel: 'Navigate to Mission Control - Operations Dashboard',
      shortcut: '1',
    },
    {
      id: 'today' as ViewState,
      icon: '⚡',
      label: 'Today',
      ariaLabel: 'Navigate to Today - Daily Task Execution',
      shortcut: '2',
    },
    {
      id: 'finish' as ViewState,
      icon: '🏁',
      label: 'Finish',
      ariaLabel: 'Navigate to Finish Mode - Complete Stuck Tasks',
      shortcut: '3',
    },
    {
      id: 'ai_coach' as ViewState,
      icon: '🧠',
      label: 'AI',
      ariaLabel: 'Navigate to AI Coach - Strategic Intelligence',
      shortcut: '4',
    },
    {
      id: 'settings' as ViewState,
      icon: '⚙',
      label: 'Config',
      ariaLabel: 'Navigate to Configuration - System Settings',
      shortcut: '5',
    },
  ];

  // Keyboard shortcuts (1-5 for navigation)
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if not typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const num = parseInt(e.key);
      if (num >= 1 && num <= navItems.length) {
        e.preventDefault();
        setView(navItems[num - 1].id);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setView]);

  return (
    <>
      {/* Screen Reader Announcement */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Current view: {navItems.find((item) => item.id === currentView)?.label}
      </div>

      <nav
        id="navigation"
        aria-label="Main navigation"
        className="fixed left-1/2 z-50"
        style={{
          bottom: '1.5rem',
          transform: 'translateX(-50%)',
          animation: 'fadeIn 0.5s ease-out 0.2s backwards',
        }}
      >
        {/* Floating Glassmorphic Dock */}
        <div
          className="glass-card px-6 py-4 flex items-center justify-center gap-2 w-full max-w-sm shadow-2xl shadow-black/50 backdrop-blur-xl border border-white/10"
          role="group"
          aria-label="Navigation buttons (use keys 1-4 for quick access)"
          style={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {navItems.map((item, index) => {
            const isActive = currentView === item.id;

            return (
              <div key={item.id} className="relative">
                <motion.button
                  onClick={() => {
                    console.log('🔘 Navigation clicked:', item.id, item.label);
                    setView(item.id);
                  }}
                  aria-label={item.ariaLabel}
                  aria-current={isActive ? 'page' : undefined}
                  title={`${item.label} (Shortcut: ${item.shortcut})`}
                  className={`
                  relative flex flex-col items-center justify-center
                  px-4 py-3 rounded-xl flex-1 min-w-0 h-16
                  transition-all duration-300
                  focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-obsidian
                  ${
                    isActive
                      ? 'bg-gradient-to-br from-neon-magenta/30 to-neon-cyan/30 shadow-lg shadow-neon-cyan/20'
                      : 'hover:bg-white/10 hover:shadow-md hover:shadow-white/5'
                  }
                `}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Active Glow Effect */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-widget-sm"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255,0,255,0.1), rgba(0,243,255,0.1))',
                        filter: 'blur(8px)',
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}

                  {/* Icon with Neon Breathing */}
                  <motion.span
                    className={`text-2xl mb-1 relative z-10 ${isActive ? 'neon-breath' : ''}`}
                    style={{
                      filter: isActive ? 'drop-shadow(0 0 8px rgba(0, 243, 255, 0.8))' : 'none',
                    }}
                    animate={
                      isActive
                        ? {
                            scale: [1, 1.1, 1],
                          }
                        : {}
                    }
                    transition={{
                      duration: 0.4,
                      ease: 'easeOut',
                    }}
                  >
                    {item.icon}
                  </motion.span>

                  {/* Label */}
                  <span
                    className={`
                    text-[10px] font-semibold uppercase tracking-wider
                    relative z-10 transition-all duration-300
                    ${isActive ? 'text-glow-cyan' : 'text-gray-400'}
                  `}
                  >
                    {item.label}
                  </span>

                  {/* Stuck Badge */}
                  {item.id === 'home' && stuckCount > 0 && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-obsidian flex items-center justify-center z-20"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 15,
                      }}
                    >
                      <motion.span
                        className="text-[10px] font-bold text-white"
                        animate={{
                          scale: [1, 1.2, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      >
                        {stuckCount}
                      </motion.span>
                    </motion.div>
                  )}
                </motion.button>

                {/* Active Indicator Dot */}
                {isActive && (
                  <motion.div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon-cyan"
                    layoutId="activeIndicator"
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 30,
                    }}
                    style={{
                      boxShadow: '0 0 10px rgba(0, 243, 255, 0.8)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Subtle Reflection Effect */}
        <div
          className="absolute inset-x-0 -bottom-2 h-8 opacity-20 blur-xl"
          aria-hidden="true"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 243, 255, 0.3), transparent)',
          }}
        />
      </nav>
    </>
  );
};

export default React.memo(Navigation);
