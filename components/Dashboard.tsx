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
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6 border-b border-gray-800 pb-4">
        <h1 className="text-xl font-bold text-cyber-cyan tracking-widest uppercase mb-1">FlexGrafik OS</h1>
        <p className="text-xs text-gray-400 font-mono">
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Alerts Section */}
      {(stuckProjects.length > 0 || checkinNeeded) && (
        <div className="mb-8 space-y-3">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">⚠️ Active Alerts</h2>
          {stuckProjects.map(p => (
            <div 
              key={p.id}
              onClick={() => onAlertClick('stuck', p.id)}
              className="bg-red-900/20 border border-cyber-red p-3 rounded-lg flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🔴</span>
                <div>
                  <p className="text-sm font-bold text-red-200">{p.name} Stuck</p>
                  <p className="text-xs text-red-400">{p.days_stuck} dni bez progresu</p>
                </div>
              </div>
              <span className="text-xs bg-cyber-red text-black px-2 py-1 rounded font-bold">FINISH</span>
            </div>
          ))}
          {checkinNeeded && (
            <div 
              onClick={() => onAlertClick('checkin')}
              className="bg-yellow-900/20 border border-cyber-gold p-3 rounded-lg flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🔔</span>
                <div>
                  <p className="text-sm font-bold text-yellow-200">Daily Check-in</p>
                  <p className="text-xs text-yellow-400">Brak aktywności dzisiaj</p>
                </div>
              </div>
              <span className="text-xs bg-cyber-gold text-black px-2 py-1 rounded font-bold">LOG</span>
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
                alert(`🤖 AI Coach: ${priorities}`);
                if (data.settings.voice.enabled) {
                  voiceNotify(priorities, 'normal');
                }
              }
              setAiLoading(false);
            }}
            disabled={aiLoading}
            className="w-full bg-cyber-magenta hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-3 px-4 rounded-lg transition-colors mb-4"
          >
            {aiLoading ? '⏳ AI myśli...' : '🤖 AI Priorytety na dziś'}
          </button>
        </div>
      )}

      {/* Pillars Grid */}
      <div className="mb-8">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">📊 Firmowe Filary ({data.pillars.length})</h2>
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
      <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">📅 Sprint Tydzień {data.sprint.week}</h2>
          <span className="text-cyber-magenta font-mono text-xs">{data.sprint.progress.filter(d => d.checked).length}/7</span>
        </div>
        <p className="text-sm text-white mb-3 italic">"{data.sprint.goal}"</p>
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
