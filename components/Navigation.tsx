import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  Flag,
  LayoutDashboard,
  Lightbulb,
  MoreHorizontal,
  Settings,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ViewState } from '../types';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  stuckCount: number;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView, stuckCount }) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const NavItem = useMemo(() => {
    return function NavItemInner(props: {
      id?: ViewState;
      label: string;
      icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
      onClick?: () => void;
      badge?: number;
      isActive?: boolean;
      ariaLabel?: string;
    }) {
      const Icon = props.icon;
      const isActive = Boolean(props.isActive);
      const badge = Number(props.badge ?? 0);

      return (
        <button
          type="button"
          onClick={props.onClick ?? (props.id ? () => setView(props.id as ViewState) : undefined)}
          aria-label={props.ariaLabel ?? props.label}
          aria-current={isActive ? 'page' : undefined}
          className={[
            'relative',
            'flex flex-col items-center justify-center',
            'min-w-[52px] min-h-[52px] px-2 py-1',
            'rounded-xl transition-all duration-200',
            isActive
              ? 'text-[var(--accent-cyan)]'
              : 'text-[var(--text-muted)] hover:text-[var(--accent-cyan)]',
          ].join(' ')}
        >
          <Icon
            size={22}
            strokeWidth={isActive ? 2 : 1.5}
            className={
              isActive
                ? 'drop-shadow-[0_0_8px_var(--accent-cyan)]'
                : 'transition-all duration-200 group-hover:drop-shadow-[0_0_6px_var(--accent-cyan)]'
            }
          />
          <span className="text-[10px] mt-1 font-medium leading-none">{props.label}</span>

          {badge > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent-danger)] rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {badge}
            </span>
          )}
        </button>
      );
    };
  }, [setView]);

  const primaryItems = useMemo(
    () => [
      {
        id: 'home' as ViewState,
        label: 'Pulpit',
        ariaLabel: 'Otwórz pulpit - na czym dziś się skupić',
        icon: LayoutDashboard,
      },
      {
        id: 'finish' as ViewState,
        label: 'Domykanie',
        ariaLabel: 'Otwórz Tryb Domykania - wybierz zadanie i domknij',
        icon: Flag,
        badge: stuckCount,
      },
      {
        id: 'ai_coach' as ViewState,
        label: 'AI',
        ariaLabel: 'Otwórz Asystenta AI - czat i priorytety',
        icon: Sparkles,
      },
    ],
    [stuckCount]
  );

  const secondaryItems = useMemo(
    () => [
      { id: 'today' as ViewState, label: 'Dziś', icon: Zap },
      // FAZA 3: „Sprint” = wspólny widok tygodnia (na bazie kalendarza)
      { id: 'sprint' as ViewState, label: 'Tydzień', icon: CalendarDays },
      { id: 'ideas' as ViewState, label: 'Pomysły', icon: Lightbulb },
      { id: 'accountability' as ViewState, label: 'Statystyki', icon: BarChart3 },
      { id: 'rules' as ViewState, label: 'Zasady', icon: Shield },
      { id: 'settings' as ViewState, label: 'Ustawienia', icon: Settings },
    ],
    []
  );

  const viewLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    primaryItems.forEach((it) => m.set(it.id, it.label));
    secondaryItems.forEach((it) => m.set(it.id, it.label));
    m.set('more', 'Więcej');
    return m;
  }, [primaryItems, secondaryItems]);

  const currentViewLabel = viewLabelMap.get(String(currentView)) ?? String(currentView);

  return (
    <>
      {/* Screen Reader Announcement */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Aktualny ekran: {currentViewLabel}
      </div>

      <nav
        id="navigation"
        aria-label="Główna nawigacja"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[50]"
        style={{
          // Keep nav above iOS home indicator / safe-area.
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
          animation: 'fadeIn 0.5s ease-out 0.2s backwards',
        }}
      >
        <div className="glass-card px-4 py-3 flex items-center overflow-hidden shadow-glass backdrop-blur-xl border border-white/10">
          <AnimatePresence mode="wait">
            {!isMoreOpen ? (
              <motion.div
                key="primary"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex items-center gap-1"
              >
                {primaryItems.map((it) => (
                  <NavItem
                    key={it.id}
                    id={it.id}
                    label={it.label}
                    ariaLabel={it.ariaLabel}
                    icon={it.icon}
                    badge={it.id === 'finish' ? stuckCount : 0}
                    isActive={currentView === it.id}
                    onClick={() => {
                      setIsMoreOpen(false);
                      setView(it.id);
                    }}
                  />
                ))}

                <NavItem
                  label="Więcej"
                  icon={MoreHorizontal}
                  isActive={false}
                  onClick={() => setIsMoreOpen(true)}
                  ariaLabel="Otwórz więcej ekranów: Dziś, Sprint, Kalendarz, Pomysły, Statystyki, Zasady, Ustawienia"
                />
              </motion.div>
            ) : (
              <motion.div
                key="secondary"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 40, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex items-center gap-1"
              >
                <NavItem
                  label="Wróć"
                  icon={ChevronLeft}
                  onClick={() => setIsMoreOpen(false)}
                  ariaLabel="Wróć do głównej nawigacji"
                />

                {secondaryItems.map((it) => (
                  <NavItem
                    key={it.id}
                    id={it.id}
                    label={it.label}
                    icon={it.icon}
                    isActive={currentView === it.id}
                    onClick={() => {
                      setIsMoreOpen(false);
                      setView(it.id);
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </>
  );
};

export default React.memo(Navigation);
