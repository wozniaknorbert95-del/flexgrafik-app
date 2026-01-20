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
    return `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
      isActive ? 'text-cyber-magenta' : 'text-gray-500 hover:text-gray-300'
    }`;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-cyber-dark border-t border-gray-800 z-50 px-2 shadow-lg">
      <div className="flex justify-between items-center h-full max-w-md mx-auto">
        <button onClick={() => setView('home')} className={getButtonClass('home')}>
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-medium tracking-wider">HOME</span>
        </button>
        <button onClick={() => setView('today')} className={getButtonClass('today')}>
          <span className="text-xl">🎯</span>
          <span className="text-[10px] font-medium tracking-wider">TODAY</span>
        </button>
        <button
          onClick={() => setView('finish')}
          className={`${getButtonClass('finish')} relative`}
        >
          <span className="text-xl">🔥</span>
          <span className="text-[10px] font-medium tracking-wider">FINISH</span>
          {stuckCount > 0 && (
            <span className="absolute top-1 right-4 w-2 h-2 bg-cyber-red rounded-full animate-pulse" />
          )}
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
