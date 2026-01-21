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
    <div className="pb-24 pt-6 px-6 max-w-md mx-auto fade-in" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="heading-1">FlexGrafik</h1>
        <p className="small text-center">
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Alerts Section */}
      {(stuckProjects.length > 0 || checkinNeeded) && (
        <div className="mb-8 space-y-4">
          {stuckProjects.map(p => (
            <div
              key={p.id}
              onClick={() => onAlertClick('stuck', p.id)}
              className="card cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="status-indicator status-error">Stuck</span>
                    <span className="caption">{p.days_stuck} days without progress</span>
                  </div>
                  <p className="body font-medium">{p.name}</p>
                </div>
                <button className="btn btn-primary ml-4">Resume</button>
              </div>
            </div>
          ))}
          {checkinNeeded && (
            <div
              onClick={() => onAlertClick('checkin')}
              className="card cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="status-indicator status-info">Check-in</span>
                    <span className="caption">Daily progress tracking</span>
                  </div>
                  <p className="body font-medium">Complete today's check-in</p>
                </div>
                <button className="btn btn-secondary ml-4">Check In</button>
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
                  userMessage: 'Could not fetch AI priorities.'
                }
              );

              if (priorities) {
                addToast(`AI Coach: ${priorities}`, 'success');
                if (data.settings.voice.enabled) {
                  voiceNotify(priorities, 'normal');
                }
              }
              setAiLoading(false);
            }}
            disabled={aiLoading}
            className="btn btn-primary w-full"
          >
            {aiLoading ? (
              <>
                <div className="loading-spinner mr-2"></div>
                Thinking...
              </>
            ) : (
              'Get AI Priorities'
            )}
          </button>
        </div>
      )}

      {/* Projects Grid */}
      <div className="mb-8">
        <h2 className="heading-2 mb-6">Projects ({data.pillars.length})</h2>
        <div className="grid grid-cols-2 gap-4">
          {data.pillars.map(pillar => {
            const statusData = getStatusData(pillar);
            const getStatusColor = () => {
              switch (statusData.status) {
                case 'done': return 'var(--success)';
                case 'in-progress': return 'var(--primary)';
                case 'stuck': return 'var(--danger)';
                default: return 'var(--text-secondary)';
              }
            };

            return (
              <div
                key={pillar.id}
                onClick={() => onPillarClick(pillar.id)}
                className="card cursor-pointer"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="heading-3 flex-1 truncate">{pillar.name}</h3>
                  {pillar.ninety_percent_alert && (
                    <span className="status-indicator status-error ml-2">Stuck</span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="caption">Progress</span>
                    <span className="small font-medium" style={{ color: getStatusColor() }}>
                      {pillar.completion}%
                    </span>
                  </div>
                  <div className="progress-container">
                    <div
                      className="progress-fill"
                      style={{ width: `${pillar.completion}%`, backgroundColor: getStatusColor() }}
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
        <div className="flex justify-between items-center mb-3">
          <h3 className="heading-3">Sprint Week {data.sprint.week}</h3>
          <span className="caption font-mono font-medium" style={{ color: 'var(--primary)' }}>
            {data.sprint.progress.filter(d => d.checked).length}/7 days
          </span>
        </div>
        <p className="body mb-4 italic text-center" style={{ color: 'var(--text-secondary)' }}>
          "{data.sprint.goal}"
        </p>
        <div className="flex justify-between gap-1">
          {data.sprint.progress.map((day, idx) => (
            <div
              key={idx}
              className="h-2 flex-1 rounded transition-all duration-300"
              style={{
                backgroundColor: day.checked ? 'var(--primary)' : 'var(--surface-secondary)',
                boxShadow: day.checked ? '0 0 4px rgba(0, 122, 255, 0.3)' : 'none'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Dashboard);
