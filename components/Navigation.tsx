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
    return `nav-button ${isActive ? 'active' : ''}`;
  };

  return (
    <nav className="bottom-nav">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', maxWidth: '28rem', margin: '0 auto', padding: '0 8px' }}>
        <button onClick={() => setView('home')} className={getButtonClass('home')}>
          <span style={{ fontSize: '20px' }}>🏠</span>
          <span style={{ fontSize: '10px', fontWeight: '500', letterSpacing: '0.1em' }}>HOME</span>
        </button>
        <button onClick={() => setView('today')} className={getButtonClass('today')}>
          <span style={{ fontSize: '20px' }}>🎯</span>
          <span style={{ fontSize: '10px', fontWeight: '500', letterSpacing: '0.1em' }}>TODAY</span>
        </button>
        <button
          onClick={() => setView('finish')}
          className={getButtonClass('finish')}
          style={{ position: 'relative' }}
        >
          <span style={{ fontSize: '20px' }}>🔥</span>
          <span style={{ fontSize: '10px', fontWeight: '500', letterSpacing: '0.1em' }}>FINISH</span>
          {stuckCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '16px',
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--danger)',
              borderRadius: '50%',
              animation: 'pulse-magenta 2s infinite'
            }} />
          )}
        </button>
        <button onClick={() => setView('sprint')} className={getButtonClass('sprint')}>
          <span style={{ fontSize: '20px' }}>📅</span>
          <span style={{ fontSize: '10px', fontWeight: '500', letterSpacing: '0.1em' }}>SPRINT</span>
        </button>
        <button onClick={() => setView('settings')} className={getButtonClass('settings')}>
          <span style={{ fontSize: '20px' }}>⚙️</span>
          <span style={{ fontSize: '10px', fontWeight: '500', letterSpacing: '0.1em' }}>SETTINGS</span>
        </button>
        <button onClick={() => setView('rules')} className={getButtonClass('rules')}>
          <span style={{ fontSize: '20px' }}>📋</span>
          <span style={{ fontSize: '10px', fontWeight: '500', letterSpacing: '0.1em' }}>RULES</span>
        </button>
        <button onClick={() => setView('ai_coach')} className={getButtonClass('ai_coach')}>
          <span style={{ fontSize: '20px' }}>🤖</span>
          <span style={{ fontSize: '10px', fontWeight: '500', letterSpacing: '0.1em' }}>AI COACH</span>
        </button>
      </div>
    </nav>
  );
};

export default React.memo(Navigation);
