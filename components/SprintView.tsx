import React, { useState } from 'react';
import { AppData, SprintDay } from '../types';
import { generateSprintRetrospective } from '../services/aiService';
import { generateTrophyPDF } from '../utils/trophyGenerator';
import { useVoiceNotify } from '../utils/voiceUtils';
import { withErrorHandling, handleError } from '../utils/errorHandler';

interface SprintViewProps {
  data: AppData;
  onToggleDay: (idx: number) => void;
  onResetSprint: () => void;
}

const SprintView: React.FC<SprintViewProps> = ({ data, onToggleDay, onResetSprint }) => {
  const { sprint } = data;
  const daysLeft = sprint.progress.filter(d => !d.checked).length;
  const [aiLoading, setAiLoading] = useState(false);
  const voiceNotify = useVoiceNotify(data.settings.voice);

  // Calculate a mock score based on data
  const score = Math.round((sprint.progress.filter(d => d.checked).length / 7) * 100);

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-fade-in">
      <div className="flex justify-between items-end mb-6">
        <div>
             <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📅</span> SPRINT
            </h1>
            <p className="text-xs text-gray-400">Tydzień {sprint.week} / {sprint.year}</p>
        </div>
        <div className="text-right">
             <span className="text-3xl font-black text-cyber-magenta">{score}%</span>
             <p className="text-[10px] text-gray-500 uppercase">Velocity</p>
        </div>
      </div>

      {/* Goal Card */}
      <div className="bg-cyber-panel border-l-4 border-cyber-magenta p-4 rounded-r-lg mb-6 shadow-lg">
        <h2 className="text-xs text-cyber-magenta font-bold uppercase tracking-widest mb-1">CEL TYGODNIA</h2>
        <p className="text-lg text-white font-medium">"{sprint.goal}"</p>
      </div>

      {/* Week Grid */}
      <div className="mb-8">
        <h3 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">PROGRESS ({7 - daysLeft} dni zaliczone)</h3>
        <div className="flex justify-between gap-2">
            {sprint.progress.map((day, idx) => (
                <button 
                    key={idx}
                    onClick={() => onToggleDay(idx)}
                    className={`flex-1 aspect-[3/4] rounded-lg flex flex-col items-center justify-center border transition-all ${day.checked ? 'bg-cyber-magenta border-cyber-magenta text-black' : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-500'}`}
                >
                    <span className="text-xs font-bold mb-1">{day.day}</span>
                    <span className="text-lg">{day.checked ? '✓' : '·'}</span>
                </button>
            ))}
        </div>
      </div>

      {/* Lists */}
      <div className="grid gap-4">
        <div className="bg-green-900/10 border border-green-900/50 p-4 rounded-lg">
            <h3 className="text-cyber-green text-xs font-bold uppercase mb-2">✅ Done this week</h3>
            <ul className="text-sm space-y-1 text-gray-300">
                {sprint.done_tasks.length > 0 ? sprint.done_tasks.map((t, i) => (
                    <li key={i}>• {t}</li>
                )) : <li className="text-gray-600 italic">Jeszcze nic...</li>}
            </ul>
        </div>

        <div className="bg-red-900/10 border border-red-900/50 p-4 rounded-lg">
            <h3 className="text-cyber-red text-xs font-bold uppercase mb-2">🔴 Stuck / Blocked</h3>
            <ul className="text-sm space-y-1 text-gray-300">
                 {sprint.blocked_tasks.length > 0 ? sprint.blocked_tasks.map((t, i) => (
                    <li key={i}>• {t}</li>
                )) : <li className="text-gray-600 italic">Czysto!</li>}
            </ul>
            <div className="mt-3 flex gap-2">
                <button className="text-xs border border-red-800 text-red-400 px-2 py-1 rounded hover:bg-red-900/30">LOG ISSUE</button>
                <button className="text-xs border border-red-800 text-red-400 px-2 py-1 rounded hover:bg-red-900/30">ASK HELP</button>
            </div>
        </div>
      </div>

      {/* Active Rules */}
      <div className="mt-8 p-4 border border-gray-800 rounded bg-black">
        <h3 className="text-xs text-gray-500 font-bold uppercase mb-2">📈 IF-THEN ACTIVE</h3>
        <div className="text-xs text-gray-400 font-mono">
            IF brak check-in do 12:00 <br/>
            → <span className="text-cyber-gold">alert "Sprint risk!"</span>
        </div>
      </div>

      <div className="mt-8 space-y-3">
          <button
            onClick={async () => {
              if (!data.settings.ai?.enabled || !data.settings.ai.apiKey) {
                alert('Włącz AI Coach w Settings');
                return;
              }
              setAiLoading(true);
              const retro = await withErrorHandling(
                () => generateSprintRetrospective(data),
                {
                  component: 'SprintView',
                  action: 'generateSprintRetrospective',
                  userMessage: 'Nie udało się wygenerować retrospektywy AI.'
                }
              );

              if (retro) {
                alert(`📊 AI Retrospektywa:\n\n${retro}`);
                if (data.settings.voice.enabled) {
                  voiceNotify(retro, 'normal');
                }
              }
              setAiLoading(false);
            }}
            disabled={aiLoading || !sprint}
            className="w-full bg-cyber-magenta hover:bg-opacity-80 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {aiLoading ? '⏳ AI myśli...' : '📊 AI Retrospektywa'}
          </button>

          <button
            onClick={() => {
              try {
                const filename = generateTrophyPDF(sprint, data.pillars);
                alert(`🏆 Trophy PDF generated!\n\nFile: ${filename}\n\nCheck your downloads folder!`);
                if (data.settings.voice.enabled) {
                  voiceNotify('Trophy generated! Check your downloads.', 'normal');
                }
              } catch (error) {
                handleError(error, {
                  component: 'SprintView',
                  action: 'generateTrophy',
                  userMessage: 'Failed to generate trophy PDF'
                });
                alert('❌ Error generating trophy PDF. Check console for details.');
              }
            }}
            className="w-full bg-cyber-gold hover:bg-opacity-80 text-black font-bold py-3 px-4 rounded-lg transition-colors"
          >
            🏆 Generate Trophy PDF
          </button>

          <div className="flex gap-3">
            <button
              onClick={onResetSprint}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded text-sm font-bold"
            >
                RETROSPECT
            </button>
             <button
              className="flex-1 border border-gray-700 hover:bg-gray-900 text-gray-400 py-3 rounded text-sm font-bold"
            >
                PLAN NEXT
            </button>
          </div>
      </div>
    </div>
  );
};

export default SprintView;
