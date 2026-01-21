import React, { useState } from 'react';
import { AppData, Pillar } from '../types';
import { generateDailyPriorities } from '../services/aiService';
import { useVoiceNotify } from '../utils/voiceUtils';
import { handleError, withErrorHandling } from '../utils/errorHandler';
import { generateDailyPriority } from '../utils/dailyPriority';
import { Button } from './ui/Button';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface DashboardProps {
  data: AppData;
  onPillarClick: (id: number) => void;
  onAlertClick: (type: 'stuck' | 'checkin', projectId?: number) => void;
  setView?: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onPillarClick, onAlertClick, setView }) => {
  const stuckProjects = data.pillars.filter(p => p.ninety_percent_alert);
  const checkinNeeded = !data.user.last_checkin || new Date(data.user.last_checkin).getDate() !== new Date().getDate();
  const [aiLoading, setAiLoading] = useState(false);
  const [lastTaskToggle, setLastTaskToggle] = useState<Record<string, number>>({});
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const voiceNotify = useVoiceNotify(data.settings.voice);

  // AI-powered daily priority
  const dailyPriority = generateDailyPriority(data);

  // Add keyboard shortcuts for power users
  useKeyboardShortcuts([
    {
      key: 't',
      action: () => setView?.('today'),
      description: 'Go to Today view'
    },
    {
      key: 's',
      action: () => setView?.('sprint'),
      description: 'Go to Sprint view'
    },
    {
      key: 'a',
      action: () => setView?.('ai_coach'),
      description: 'Open AI Coach'
    },
    {
      key: '?',
      shiftKey: true,
      action: () => setShowKeyboardHelp(true),
      description: 'Show keyboard shortcuts'
    }
  ]);

  const getStatusColor = (p: Pillar) => {
    if (p.ninety_percent_alert) return 'border-cyber-red text-cyber-red shadow-[0_0_8px_rgba(239,68,68,0.4)]';
    if (p.completion === 100) return 'border-cyber-green text-cyber-green';
    if (p.status === 'in_progress') return 'border-cyber-gold text-cyber-gold';
    return 'border-gray-700 text-gray-500';
  };

  return (
    <div className="pb-24 pt-6 px-6 max-w-md mx-auto animate-fade-in" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header - Cyberpunk neon gradient */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold uppercase tracking-widest">
          <span className="text-glow-magenta">Flex</span>
          <span className="text-glow-cyan">Grafik</span>
        </h1>
        <p className="text-gray-400 text-xs mt-2 uppercase tracking-wide">Accountability OS</p>
      </div>

      {/* Primary CTA - Dominant but not obnoxious */}
      <div className="mb-6">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          className="h-14"
          onClick={() => onPillarClick(stuckProjects.length > 0 ? stuckProjects[0].id : data.pillars[0]?.id)}
        >
          <span className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <span>Start Today's Priority</span>
          </span>
        </Button>
      </div>

      {/* DAILY PRIORITY AI CARD */}
      {dailyPriority && (
        <div className="mb-6 bg-gradient-to-r from-fuchsia-900/20 to-purple-900/20 border border-fuchsia-500/30 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-caption text-fuchsia-400 uppercase tracking-wide mb-1">
                AI Recommended Priority
              </p>
              <h3 className="text-h3 text-white mb-2">
                {dailyPriority.task.name}
              </h3>
              <p className="text-caption text-gray-400 mb-1">
                {dailyPriority.reason}
              </p>
              <p className="text-caption text-gray-500">
                {dailyPriority.pillar.name} • {dailyPriority.task.progress}% complete
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                // Navigate to Today view to work on this task
                onPillarClick(dailyPriority.pillar.id);
              }}
            >
              Start
            </Button>
          </div>
        </div>
      )}

      {/* Active Alerts - Glassmorphism with neon border */}
      {(stuckProjects.length > 0 || checkinNeeded) && (
        <div className="glass-panel rounded-lg p-4 mb-6 border-2 border-neon-magenta/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-neon-magenta animate-pulse border-glow"/>
            <h2 className="text-sm font-bold text-neon-magenta uppercase tracking-widest">
              🚨 ACTIVE ALERTS
            </h2>
          </div>

          <div className="space-y-2">
            {stuckProjects.map(p => (
              <div
                key={p.id}
                onClick={() => onAlertClick('stuck', p.id)}
                className="flex items-start gap-3 py-2 border-l-2 border-red-500/30 pl-3 mb-2 cursor-pointer hover:bg-gray-800/30 transition-colors rounded"
              >
                <span className="text-red-400 text-xs font-mono uppercase">STUCK</span>
                <div className="flex-1">
                  <p className="text-gray-300 text-sm font-medium">{p.name}</p>
                  <p className="text-gray-500 text-xs">{p.days_stuck} days without progress</p>
                </div>
                <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onAlertClick('stuck', p.id); }}>
                  Resume
                </Button>
              </div>
            ))}
            {checkinNeeded && (
              <div
                onClick={() => onAlertClick('checkin')}
                className="flex items-start gap-3 py-2 border-l-2 border-cyan-500/30 pl-3 cursor-pointer hover:bg-gray-800/30 transition-colors rounded"
              >
                <span className="text-cyan-400 text-xs font-mono uppercase">CHECK-IN</span>
                <div className="flex-1">
                  <p className="text-gray-300 text-sm font-medium">Complete today's check-in</p>
                  <p className="text-gray-500 text-xs">Daily progress tracking</p>
                </div>
                <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onAlertClick('checkin'); }}>
                  Check In
                </Button>
              </div>
            )}
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

      {/* Projects - Grid with depth */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Projects ({data.pillars.length})
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {data.pillars.map(pillar => (
            <div
              key={pillar.id}
              onClick={() => onPillarClick(pillar.id)}
              className="glass-panel rounded-lg p-4 cursor-pointer group transition-all duration-300 hover:border-neon-cyan hover:border-glow-cyan"
            >
              <h3 className="text-white font-bold mb-2 group-hover:text-glow-cyan transition-all truncate uppercase tracking-wide text-sm">
                {pillar.name}
              </h3>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl font-bold text-gray-500 group-hover:text-neon-cyan transition-colors">
                  {pillar.completion}%
                </span>
                {pillar.ninety_percent_alert && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gold/10 border border-gold text-gold">
                    ⚠️ STUCK
                  </span>
                )}
              </div>

              {/* Progress bar with neon glow */}
              <div className="mt-2 progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${pillar.completion}%` }}
                />
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

      {/* Keyboard shortcuts indicator */}
      <div className="fixed bottom-20 right-4 text-caption text-gray-600 pointer-events-none">
        Press <kbd className="px-2 py-1 bg-gray-800 rounded">?</kbd> for shortcuts
      </div>

      {/* Keyboard shortcuts help modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowKeyboardHelp(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Go to Today</span>
                <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">T</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Go to Sprint</span>
                <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">S</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Open AI Coach</span>
                <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">A</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Show this help</span>
                <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Shift + ?</kbd>
              </div>
            </div>
            <button
              onClick={() => setShowKeyboardHelp(false)}
              className="mt-4 w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(Dashboard);
