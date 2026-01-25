import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ViewState } from '../types';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  stuckCount: number;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView, stuckCount }) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  // PLAN.md flow: core navigation should be action-first (Dashboard → Finish Mode → AI).
  // Settings/Rules/Timer are secondary and live under "More".
  const navItems = useMemo(
    () => [
      {
        id: 'home' as ViewState,
        icon: '🎯',
        label: 'Dashboard',
        ariaLabel: 'Otwórz Dashboard - na czym dziś się skupić',
        shortcut: '1',
      },
      {
        id: 'finish' as ViewState,
        icon: '🏁',
        label: 'Finish',
        ariaLabel: 'Otwórz Finish Mode - wybierz task i domknij',
        shortcut: '2',
      },
      {
        id: 'ai_coach' as ViewState,
        icon: '🧠',
        label: 'AI',
        ariaLabel: 'Otwórz Asystenta AI - czat i priorytety',
        shortcut: '3',
      },
      {
        id: 'more' as any,
        icon: '⋯',
        label: 'Więcej',
        ariaLabel: 'Więcej: ustawienia, zasady, timer',
        shortcut: '4',
        isMore: true as const,
      },
    ],
    []
  );

  const moreItems = useMemo(
    () =>
      [
        { id: 'today' as ViewState, icon: '⚡', label: 'Dziś' },
        { id: 'timer' as ViewState, icon: '⏰', label: 'Timer' },
        { id: 'sprint' as ViewState, icon: '🗓️', label: 'Sprint' },
        { id: 'accountability' as ViewState, icon: '📊', label: 'Accountability' },
        { id: 'rules' as ViewState, icon: '⚡', label: 'Zasady' },
        { id: 'settings' as ViewState, icon: '⚙', label: 'Ustawienia' },
      ] as const,
    []
  );

  const currentViewLabel =
    navItems.find((item: any) => item.id === currentView)?.label ||
    moreItems.find((item) => item.id === currentView)?.label ||
    String(currentView);
  const isSecondaryViewActive = moreItems.some((item) => item.id === currentView);

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
        const item = navItems[num - 1] as any;
        if (item?.isMore) {
          setIsMoreOpen((v) => !v);
          return;
        }
        setIsMoreOpen(false);
        setView(item.id);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setView]);

  // Close "More" on outside click / escape.
  React.useEffect(() => {
    if (!isMoreOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMoreOpen(false);
    };
    const onPointer = (e: MouseEvent | PointerEvent) => {
      const el = moreRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setIsMoreOpen(false);
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [isMoreOpen]);

  return (
    <>
      {/* Screen Reader Announcement */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Current view: {currentViewLabel}
      </div>

      <nav
        id="navigation"
        aria-label="Main navigation"
        className="fixed left-1/2 z-50"
        style={{
          // Keep nav above iOS home indicator / safe-area.
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
          transform: 'translateX(-50%)',
          animation: 'fadeIn 0.5s ease-out 0.2s backwards',
        }}
      >
        {/* Floating Glassmorphic Dock */}
        <div
          className="glass-card px-6 py-4 flex items-center justify-center gap-2 w-full max-w-sm shadow-glass backdrop-blur-xl border border-white/10"
          role="group"
          aria-label="Navigation buttons (use keys 1-3; 4 opens more)"
        >
          {navItems.map((item, index) => {
            const isMore = Boolean((item as any).isMore);
            const isActive = currentView === item.id || (isMore && isSecondaryViewActive);
            const stuckTitleSuffix =
              item.id === 'finish' && stuckCount > 0 ? ` • ${stuckCount} utknięte` : '';
            const title = `${item.label}${stuckTitleSuffix} (Shortcut: ${item.shortcut})`;
            const ariaLabel =
              item.id === 'finish' && stuckCount > 0
                ? `${item.ariaLabel}. Masz ${stuckCount} utknięte zadania do domknięcia.`
                : item.ariaLabel;

            return (
              <div key={item.id} className="relative">
                <motion.button
                  onClick={() => {
                    if (isMore) {
                      setIsMoreOpen((v) => !v);
                      return;
                    }
                    setIsMoreOpen(false);
                    setView(item.id);
                  }}
                  aria-label={ariaLabel}
                  aria-current={isActive ? 'page' : undefined}
                  title={title}
                  aria-expanded={isMore ? isMoreOpen : undefined}
                  aria-haspopup={isMore ? 'menu' : undefined}
                  className={`
                  relative flex flex-col items-center justify-center
                  px-4 py-3 rounded-xl flex-1 min-w-0 h-16
                  transition-all duration-300
                  focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-obsidian
                  ${
                    isActive
                      ? 'bg-gradient-to-br from-neon-magenta/25 to-neon-cyan/25 border border-white/10'
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
                      className="absolute inset-0 rounded-widget-sm bg-gradient-to-br from-neon-magenta/10 to-neon-cyan/10 blur-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}

                  {/* Icon (subtle glow only when active) */}
                  <motion.span
                    className="text-2xl mb-1 relative z-10"
                    style={{ filter: isActive ? 'drop-shadow(var(--glow-cyan))' : undefined }}
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
                  {item.id === 'finish' && stuckCount > 0 && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--accent-danger)] border-2 border-obsidian flex items-center justify-center z-20"
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
                      boxShadow: 'var(--glow-cyan)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* More menu (secondary screens) */}
        {isMoreOpen && (
          <div
            ref={moreRef}
            role="menu"
            aria-label="Więcej akcji"
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-[320px] max-w-[92vw]"
          >
            <div className="glass-card p-3 border border-white/10 backdrop-blur-xl">
              <div className="grid grid-cols-2 gap-2">
                {moreItems.map((it) => (
                  <button
                    key={it.id}
                    role="menuitem"
                    onClick={() => {
                      setIsMoreOpen(false);
                      setView(it.id);
                    }}
                    className="min-h-[44px] px-3 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-wider hover:bg-white/10"
                  >
                    <span className="mr-2">{it.icon}</span>
                    {it.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Subtle Reflection Effect */}
        <div
          className="absolute inset-x-0 -bottom-2 h-8 opacity-20 blur-xl bg-gradient-to-b from-neon-cyan/30 to-transparent"
          aria-hidden="true"
        />
      </nav>
    </>
  );
};

export default React.memo(Navigation);
