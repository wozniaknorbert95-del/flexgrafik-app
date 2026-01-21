import React, { useState, useEffect } from 'react';
import { AppData, Pillar } from '../types';
import { generateMotivation } from '../services/aiService';
import { useVoiceNotify } from '../utils/voiceUtils';
import { withErrorHandling } from '../utils/errorHandler';

interface FinishModeProps {
  data: AppData;
  projectId: number | null; // If null, auto-select first stuck or prioritized project
  onToggleTask: (pillarId: number, taskName: string) => void;
  onExit: () => void;
}

const FinishMode: React.FC<FinishModeProps> = ({ data, projectId, onToggleTask, onExit }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [aiMotivation, setAiMotivation] = useState<string>('');
  const voiceNotify = useVoiceNotify(data.settings.voice);

  // Determine project: Explicit ID -> Stuck Project -> First In Progress
  let project: Pillar | undefined;
  if (projectId) {
    project = data.pillars.find(p => p.id === projectId);
  } else {
    project = data.pillars.find(p => p.ninety_percent_alert) || 
              data.pillars.find(p => p.completion >= 90) ||
              data.pillars.find(p => p.status === 'in_progress');
  }

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Play sound or vibrate here in real app
      if(navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Check if all tasks done
  useEffect(() => {
    if (project && project.tasks.every(t => t.progress >= 100)) {
      setShowConfetti(true);
    }
  }, [project]);

  // Auto-generate AI motivation when entering Finish Mode
  useEffect(() => {
    if (project && data.settings.ai?.enabled && data.settings.ai.apiKey && project.completion >= 90) {
      (async () => {
        const motivation = await withErrorHandling(
          () => generateMotivation(project.name, project.days_stuck || 0, data),
          {
            component: 'FinishMode',
            action: 'autoMotivation',
            shouldShowToUser: false // Don't show error alerts in Finish Mode
          }
        );

        if (motivation) {
          setAiMotivation(motivation);

          if (data.settings.voice.enabled) {
            voiceNotify(motivation, 'urgent');
          }
        }
      })();
    }
  }, [project, data.settings.ai, voiceNotify]);

  if (!project) {
    return (
        <div className="h-screen flex items-center justify-center p-6 text-center">
            <div>
                <h2 className="text-gray-500 mb-4">No critical projects found.</h2>
                <button onClick={onExit} className="text-cyber-cyan underline">Return Home</button>
            </div>
        </div>
    )
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const tasksLeft = project.tasks.filter(t => t.progress < 100).length;

  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col relative overflow-hidden">
      {/* Background Pulse */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${isActive ? 'opacity-20' : 'opacity-5'}`}>
         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyber-magenta rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-cyber-magenta font-black tracking-widest text-lg">🔥 FINISH MODE</h1>
            <div className="text-right">
                <p className="text-xs text-gray-400">PROJECT</p>
                <p className="text-sm font-bold">{project.name} ({project.completion}%)</p>
            </div>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center justify-center py-8 mb-8">
            <div className="text-7xl font-mono font-bold tracking-tighter text-white mb-6 tabular-nums">
                {formatTime(timeLeft)}
            </div>
            <div className="flex gap-4">
                <button 
                    onClick={() => setIsActive(!isActive)}
                    className={`px-8 py-3 rounded font-bold text-black transition-all ${isActive ? 'bg-gray-400' : 'bg-cyber-cyan shadow-[0_0_20px_#00ffff]'}`}
                >
                    {isActive ? 'PAUSE' : 'START FOCUS'}
                </button>
                <button 
                    onClick={() => setTimeLeft(25 * 60)}
                    className="px-4 py-3 rounded border border-gray-700 text-gray-400 hover:text-white"
                >
                    RESET
                </button>
            </div>
        </div>

        {/* Checklist */}
        <div className="bg-gray-900/80 border border-gray-700 rounded-lg p-6 flex-1">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">📋 Closing Checklist ({project.tasks.length - tasksLeft}/{project.tasks.length})</h3>
            <div className="space-y-4">
                {project.tasks.map((task, idx) => (
                    <div key={idx} className={`flex items-center gap-4 transition-all ${task.progress >= 100 ? 'opacity-40' : 'opacity-100'}`}>
                         <button
                            onClick={() => onToggleTask(project!.id, task.name)}
                            className={`w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${task.progress >= 100 ? 'bg-cyber-green border-cyber-green' : 'border-gray-500 hover:border-cyber-magenta'}`}
                        >
                            {task.progress >= 100 && <span className="text-black font-bold">✓</span>}
                        </button>
                        <span className={`text-sm ${task.progress >= 100 ? 'line-through' : ''}`}>{task.name}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Done Definition */}
        <div className="mt-6 p-4 border border-gray-800 rounded bg-black/50">
            <p className="text-xs text-gray-500 uppercase mb-1">🎯 Battle Definition</p>
            <p className="text-sm italic text-gray-300">"{project.done_definition.battle}"</p>
        </div>

        {/* AI Motivation */}
        {aiMotivation && (
          <div className="mt-4 p-4 border border-cyber-magenta rounded bg-cyber-magenta/10">
            <p className="text-xs text-cyber-magenta uppercase mb-2">🤖 AI Coach</p>
            <p className="text-sm text-white font-medium">{aiMotivation}</p>
          </div>
        )}

        <button 
            onClick={() => {
                if (tasksLeft > 0) {
                    if (window.confirm(`Zostało ${project!.completion < 100 ? 100 - project!.completion : 0}% do końca. Czy na pewno chcesz wyjść?`)) {
                        onExit();
                    }
                } else {
                    onExit();
                }
            }}
            className="mt-8 mx-auto text-gray-600 text-sm hover:text-red-500 transition-colors pb-4"
        >
            ❌ Exit Mode
        </button>
      </div>

      {showConfetti && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50 bg-black/80">
              <div className="text-center animate-bounce">
                  <h1 className="text-6xl mb-4">🎉</h1>
                  <h2 className="text-cyber-green text-3xl font-bold">BATTLE DONE!</h2>
                  <p className="text-gray-400 mt-2">Filar ukończony.</p>
                  <button onClick={onExit} className="mt-8 bg-cyber-green text-black px-6 py-2 rounded font-bold pointer-events-auto">Wracam do Bazy</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default FinishMode;
