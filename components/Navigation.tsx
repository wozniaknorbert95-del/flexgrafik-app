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
    return `nav-item ${isActive ? 'active' : ''}`;
  };

  return (
    <nav className="nav-bar">
      <div className="flex justify-between items-center h-full max-w-md mx-auto px-4">
        <button onClick={() => setView('home')} className={getButtonClass('home')}>
          <span className="text-xl">🏠</span>
          <span className="text-xs font-medium">Home</span>
        </button>
        <button onClick={() => setView('today')} className={getButtonClass('today')}>
          <span className="text-xl">🎯</span>
          <span className="text-xs font-medium">Today</span>
        </button>
        <button
          onClick={() => setView('finish')}
          className={getButtonClass('finish')}
          style={{ position: 'relative' }}
        >
          <span className="text-xl">🔥</span>
          <span className="text-xs font-medium">Focus</span>
          {stuckCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full"></span>
          )}
        </button>
        <button onClick={() => setView('sprint')} className={getButtonClass('sprint')}>
          <span className="text-xl">📊</span>
          <span className="text-xs font-medium">Sprint</span>
        </button>
        <button onClick={() => setView('settings')} className={getButtonClass('settings')}>
          <span className="text-xl">⚙️</span>
          <span className="text-xs font-medium">Settings</span>
        </button>
      </div>
    </nav>
  );
};

export default React.memo(Navigation);
