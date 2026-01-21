import React from 'react';
import { ViewState } from '../types';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  stuckCount: number;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView, stuckCount }) => {
  const getButtonClass = (view: ViewState) => {
    const isActive = currentView === view;
    return `flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${
      isActive 
        ? 'text-neon-magenta text-glow scale-110' 
        : 'text-gray-500 hover:text-neon-cyan hover:scale-105'
    }`;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-dark-bg/95 backdrop-blur-lg border-t-2 border-neon-cyan/30 z-50 px-2 shadow-[0_-5px_20px_rgba(0,243,255,0.2)]">
      <div className="flex justify-between items-center h-full max-w-md mx-auto">
        <button onClick={() => setView('home')} className={getButtonClass('home')}>
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-medium tracking-wider">HOME</span>
        </button>
        <button onClick={() => setView('today')} className={getButtonClass('today')}>
          <span className="text-xl">🎯</span>
          <span className="text-[10px] font-medium tracking-wider">TODAY</span>
        </button>
        <button onClick={() => setView('timer')} className={getButtonClass('timer')}>
          <span className="text-xl">⏰</span>
          <span className="text-[10px] font-medium tracking-wider">TIMER</span>
        </button>
        <button onClick={() => setView('sprint')} className={getButtonClass('sprint')}>
          <span className="text-xl">📅</span>
          <span className="text-[10px] font-medium tracking-wider">SPRINT</span>
        </button>
        <button onClick={() => setView('settings')} className={getButtonClass('settings')}>
          <span className="text-xl">⚙️</span>
          <span className="text-[10px] font-medium tracking-wider">SETTINGS</span>
        </button>
        <button onClick={() => setView('rules')} className={getButtonClass('rules')}>
          <span className="text-xl">📋</span>
          <span className="text-[10px] font-medium tracking-wider">RULES</span>
        </button>
        <button onClick={() => setView('ai_coach')} className={getButtonClass('ai_coach')}>
          <span className="text-xl">🤖</span>
          <span className="text-[10px] font-medium tracking-wider">AI COACH</span>
        </button>
      </div>
    </nav>
  );
};

export default React.memo(Navigation);
