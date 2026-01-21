import React, { useState } from 'react';
import { AppData, Pillar } from '../types';
import { generateDailyPriorities } from '../services/aiService';
import { useVoiceNotify } from '../utils/voiceUtils';
import { handleError, withErrorHandling } from '../utils/errorHandler';

interface DashboardProps {
  data: AppData;
  onPillarClick: (id: number) => void;
  onAlertClick: (type: 'stuck' | 'checkin', projectId?: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onPillarClick, onAlertClick }) => {
  const stuckProjects = data.pillars.filter(p => p.ninety_percent_alert);
  const checkinNeeded = !data.user.last_checkin || new Date(data.user.last_checkin).getDate() !== new Date().getDate();
  const [aiLoading, setAiLoading] = useState(false);
  const [lastTaskToggle, setLastTaskToggle] = useState<Record<string, number>>({});
  const voiceNotify = useVoiceNotify(data.settings.voice);

  const getStatusColor = (p: Pillar) => {
    if (p.ninety_percent_alert) return 'border-cyber-red text-cyber-red shadow-[0_0_8px_rgba(239,68,68,0.4)]';
    if (p.completion === 100) return 'border-cyber-green text-cyber-green';
    if (p.status === 'in_progress') return 'border-cyber-gold text-cyber-gold';
    return 'border-gray-700 text-gray-500';
  };

  return (
    <div className="pb-24 pt-6 px-6 max-w-md mx-auto animate-fade-in" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-h1 text-cyan-400">
          FlexGrafik
        </h1>
        <p className="text-caption mt-1">
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* PRIMARY CTA - One dominant action per screen */}
      <div className="mb-8">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => onPillarClick(stuckProjects.length > 0 ? stuckProjects[0].id : data.pillars[0]?.id)}
          icon={<span>🎯</span>}
        >
          Start Today's Priority
        </Button>
      </div>

      {/* Alerts Section - Subtle, not aggressive */}
      {(stuckProjects.length > 0 || checkinNeeded) && (
        <div className="mb-8">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-warning">⚠️</span>
              <h3 className="text-h3">Active Alerts</h3>
            </div>
            <div className="space-y-2">
              {stuckProjects.map(p => (
                <div
                  key={p.id}
                  onClick={() => onAlertClick('stuck', p.id)}
                  className="bg-gray-800/30 border border-gray-700 rounded p-3 cursor-pointer hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="status-indicator status-error">Stuck</span>
                        <span className="caption">{p.days_stuck} days without progress</span>
                      </div>
                      <p className="text-body font-medium">{p.name}</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onAlertClick('stuck', p.id); }}>
                      Resume
                    </Button>
                  </div>
                </div>
              ))}
              {checkinNeeded && (
                <div
                  onClick={() => onAlertClick('checkin')}
                  className="bg-gray-800/30 border border-gray-700 rounded p-3 cursor-pointer hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="status-indicator status-info">Check-in</span>
                        <span className="caption">Daily progress tracking</span>
                      </div>
                      <p className="text-body font-medium">Complete today's check-in</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onAlertClick('checkin'); }}>
                      Check In
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Priorities Button */}
      {data.settings.ai?.enabled && data.settings.ai.apiKey && (
        <div className="mb-8">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            loading={aiLoading}
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
          >
            Get AI Priorities
          </Button>
        </div>
      )}

      {/* Projects Grid - Tertiary content */}
      <div className="mb-8">
        <h2 className="text-h2 mb-4">Projects ({data.pillars.length})</h2>
        <div className="grid grid-cols-2 gap-3">
          {data.pillars.map(pillar => (
            <div 
              key={pillar.id}
              onClick={() => onPillarClick(pillar.id)}
              className={`p-3 rounded-lg border bg-cyber-panel flex flex-col justify-between h-28 cursor-pointer active:bg-gray-900 transition-colors ${getStatusColor(pillar)}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-sm truncate w-full">{pillar.name}</span>
                {pillar.ninety_percent_alert && <span className="text-xs">⚠️</span>}
              </div>
              
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1 font-mono">
                  <span>{pillar.completion}%</span>
                </div>
                <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${pillar.ninety_percent_alert ? 'bg-cyber-red' : (pillar.completion === 100 ? 'bg-cyber-green' : 'bg-cyber-gold')}`} 
                    style={{ width: `${pillar.completion}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sprint Overview */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-h3">Sprint Week {data.sprint.week}</h3>
          <span className="caption font-mono font-medium" style={{ color: 'var(--color-primary)' }}>
            {data.sprint.progress.filter(d => d.checked).length}/7 days
          </span>
        </div>
        <p className="text-body mb-4 italic" style={{ color: 'var(--text-secondary)' }}>
          "{data.sprint.goal}"
        </p>
        <div className="flex justify-between gap-1">
          {data.sprint.progress.map((day, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 flex-1 rounded-full ${day.checked ? 'bg-cyber-magenta shadow-[0_0_5px_#ff00ff]' : 'bg-gray-800'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Dashboard);
