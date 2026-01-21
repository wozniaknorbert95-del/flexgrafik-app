import React from 'react';
import { AppData, Task } from '../types';

interface TodayProps {
  data: AppData;
  onToggleTask: (pillarId: number, taskName: string) => void;
  onStartTimer: () => void;
  isTimerRunning: boolean;
}

const Today: React.FC<TodayProps> = ({ data, onToggleTask, onStartTimer }) => {
  // Logic: Prioritize tasks from >90% projects ("Close" type)
  // If block exists, show block message
  
  const stuckProjects = data.pillars.filter(p => p.ninety_percent_alert);
  const activeStuckProject = stuckProjects.length > 0 ? stuckProjects[0] : null;

  // Flatten tasks logic
  const allTasks = data.pillars.flatMap(p => 
    p.tasks.map(t => ({ ...t, pillarId: p.id, pillarName: p.name, isStuck: p.ninety_percent_alert }))
  );

  const mustCloseTasks = allTasks.filter(t => t.isStuck && t.progress < 100 && t.type === 'close');
  const otherTasks = allTasks.filter(t => !t.isStuck && t.progress < 100).slice(0, 3); // Just show top 3 others if no emergency

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-fade-in">
      <h1 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span>🎯</span> DZISIAJ
      </h1>

      {activeStuckProject && (
        <div className="mb-8 border border-cyber-red bg-red-950/30 rounded-lg p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-20 text-6xl">🔥</div>
          <h2 className="text-cyber-red font-bold text-sm uppercase tracking-wider mb-2">🔴 MUST CLOSE (90% Stuck)</h2>
          <p className="text-white font-bold text-lg mb-4">{activeStuckProject.name}</p>
          
          <div className="space-y-3 mb-6">
            {mustCloseTasks.length > 0 ? mustCloseTasks.map((task, idx) => (
              <div key={idx} className="flex items-start gap-3">
                 <button 
                  onClick={() => onToggleTask(task.pillarId, task.name)}
                  className="mt-0.5 w-5 h-5 rounded border border-cyber-red flex items-center justify-center flex-shrink-0 hover:bg-red-900/50"
                >
                  {task.progress >= 100 && <div className="w-3 h-3 bg-cyber-red rounded-sm" />}
                </button>
                <span className="text-gray-200 text-sm">{task.name}</span>
              </div>
            )) : <p className="text-green-400 text-sm">Wszystkie zadania krytyczne zrobione!</p>}
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs text-red-300 mb-1">⏱️ 2h estimated for final push</div>
            <button 
              onClick={onStartTimer}
              className="bg-cyber-red text-black font-bold py-3 rounded shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:scale-[1.02] transition-transform active:scale-95"
            >
              START 25min FOCUS ⏱️
            </button>
          </div>
        </div>
      )}

      {!activeStuckProject && (
        <div className="mb-6">
           <h2 className="text-cyber-gold font-bold text-sm uppercase tracking-wider mb-3">🟡 BUILD TASKS</h2>
           <div className="space-y-4">
            {otherTasks.map((task, idx) => (
                <div key={idx} className="bg-cyber-panel border border-gray-800 p-4 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">{task.pillarName}</div>
                    <div className="flex items-start gap-3">
                         <button 
                            onClick={() => onToggleTask(task.pillarId, task.name)}
                            className="mt-0.5 w-5 h-5 rounded border border-cyber-gold flex items-center justify-center flex-shrink-0"
                            >
                            {task.progress >= 100 && <div className="w-3 h-3 bg-cyber-gold rounded-sm" />}
                        </button>
                        <span className="text-gray-200">{task.name}</span>
                    </div>
                </div>
            ))}
            {otherTasks.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    Brak aktywnych zadań. Dodaj nowe w Filarach.
                </div>
            )}
           </div>
        </div>
      )}

      {activeStuckProject && (
        <div className="bg-gray-900/50 border border-gray-700 border-dashed rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm mb-2">⚠️ BLOKADA</p>
            <p className="text-xs text-gray-500">Nie możesz dodać nowych zadań dopóki "{activeStuckProject.name}" nie jest BattleDone.</p>
        </div>
      )}
    </div>
  );
};

export default Today;
