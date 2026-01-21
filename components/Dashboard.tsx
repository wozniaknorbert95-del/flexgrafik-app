import React, { useState } from 'react';
import { AppData, Pillar } from '../types';
import { generateDailyPriorities } from '../services/aiService';
import { useVoiceNotify } from '../utils/voiceUtils';
import { handleError, withErrorHandling } from '../utils/errorHandler';

interface DashboardProps {
  data: AppData;
  onPillarClick: (id: number) => void;
  onAlertClick: (type: 'stuck' | 'checkin', projectId?: number) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onPillarClick, onAlertClick, addToast }) => {
  const stuckProjects = data.pillars.filter(p => p.ninety_percent_alert);
  const checkinNeeded = !data.user.last_checkin || new Date(data.user.last_checkin).getDate() !== new Date().getDate();
  const [aiLoading, setAiLoading] = useState(false);
  const [lastTaskToggle, setLastTaskToggle] = useState<Record<string, number>>({});
  const voiceNotify = useVoiceNotify(data.settings.voice);

  const getStatusData = (p: Pillar) => {
    if (p.ninety_percent_alert) return { status: 'stuck', color: 'text-cyber-neon-red' };
    if (p.completion === 100) return { status: 'done', color: 'text-cyber-gold' };
    if (p.status === 'in_progress') return { status: 'in-progress', color: 'text-cyber-cyan' };
    return { status: 'idle', color: 'text-gray-500' };
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-fade-in" style={{ backgroundColor: 'var(--cyber-black)' }}>
      {/* Header */}
      <div className="mb-6 border-b border-cyber-magenta pb-4">
        <h1 className="cyber-h1">FLEXGRAFIK COMMAND CENTER</h1>
        <p className="cyber-small font-mono">
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Alerts Section */}
      {(stuckProjects.length > 0 || checkinNeeded) && (
        <div className="mb-8 space-y-3">
          <h2 className="cyber-h2 mb-4">⚠️ ACTIVE ALERTS</h2>
          {stuckProjects.map(p => (
            <div
              key={p.id}
              onClick={() => onAlertClick('stuck', p.id)}
              className="card cursor-pointer glow-magenta"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔴</span>
                  <div>
                    <p className="cyber-small font-bold" style={{ color: 'var(--danger)' }}>{p.name} STUCK</p>
                    <p className="cyber-small" style={{ color: 'var(--danger)' }}>{p.days_stuck} DNI BEZ PROGRESU</p>
                  </div>
                </div>
                <span className="cyber-small glow-magenta" style={{ backgroundColor: 'var(--danger)', color: '#000', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>FINISH</span>
              </div>
            </div>
          ))}
          {checkinNeeded && (
            <div
              onClick={() => onAlertClick('checkin')}
              className="card cursor-pointer glow-gold"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔔</span>
                  <div>
                    <p className="cyber-small font-bold" style={{ color: 'var(--cyber-gold)' }}>DAILY CHECK-IN</p>
                    <p className="cyber-small" style={{ color: 'var(--cyber-gold)' }}>BRAK AKTYWNOŚCI DZISIAJ</p>
                  </div>
                </div>
                <span className="cyber-small glow-gold" style={{ backgroundColor: 'var(--cyber-gold)', color: '#000', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>LOG</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Priorities Button */}
      {data.settings.ai?.enabled && data.settings.ai.apiKey && (
        <div className="mb-8">
          <button
            onClick={async () => {
              setAiLoading(true);
              const priorities = await withErrorHandling(
                () => generateDailyPriorities(data),
                {
                  component: 'Dashboard',
                  action: 'generateDailyPriorities',
                  userMessage: 'Nie udało się pobrać priorytetów AI.'
                }
              );

              if (priorities) {
                addToast(`🤖 AI Coach: ${priorities}`, 'info');
                if (data.settings.voice.enabled) {
                  voiceNotify(priorities, 'normal');
                }
              }
              setAiLoading(false);
            }}
            disabled={aiLoading}
            className="btn-primary w-full mb-4"
          >
            {aiLoading ? (
              <>
                <div className="loading-spinner mr-2" style={{width: '16px', height: '16px'}}></div>
                AI MYŚLI...
              </>
            ) : (
              '🤖 AI PRIORYTETY NA DZIŚ'
            )}
          </button>
        </div>
      )}

      {/* Pillars Grid */}
      <div className="mb-8">
        <h2 className="cyber-h2 mb-4">📊 FIRMOWE FILARY ({data.pillars.length})</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {data.pillars.map(pillar => {
            const statusData = getStatusData(pillar);
            return (
              <div
                key={pillar.id}
                onClick={() => onPillarClick(pillar.id)}
                className="pillar-card cursor-pointer"
                data-status={statusData.status}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', color: 'var(--text-primary)' }}>{pillar.name}</span>
                  {pillar.ninety_percent_alert && <span style={{ fontSize: '18px' }}>⚠️</span>}
                </div>

                <div style={{ marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    <span style={{ color: statusData.color === 'text-cyber-gold' ? 'var(--cyber-gold)' : statusData.color === 'text-cyber-cyan' ? 'var(--cyber-cyan)' : 'var(--danger)' }}>{pillar.completion}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${pillar.completion}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sprint Overview */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 className="cyber-h3">📅 SPRINT TYDZIEŃ {data.sprint.week}</h3>
          <span className="cyber-small font-mono glow-magenta" style={{ color: 'var(--cyber-magenta)' }}>{data.sprint.progress.filter(d => d.checked).length}/7</span>
        </div>
        <p className="cyber-body mb-4 italic" style={{ color: 'var(--cyber-cyan)' }}>"{data.sprint.goal}"</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2px' }}>
          {data.sprint.progress.map((day, idx) => (
            <div
              key={idx}
              style={{
                height: '8px',
                flex: 1,
                borderRadius: '4px',
                transition: 'all 0.3s ease',
                backgroundColor: day.checked ? 'var(--cyber-magenta)' : 'var(--cyber-mid-gray)',
                boxShadow: day.checked ? '0 0 8px rgba(255, 0, 255, 0.6)' : 'none'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Dashboard);
