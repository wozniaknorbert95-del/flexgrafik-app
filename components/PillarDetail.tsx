import React from 'react';
import { Pillar } from '../types';

interface PillarDetailProps {
  pillar: Pillar;
  onBack: () => void;
  onToggleTask: (pillarId: number, taskName: string) => void;
  onEnterFinishMode: () => void;
}

const PillarDetail: React.FC<PillarDetailProps> = ({ pillar, onBack, onToggleTask, onEnterFinishMode }) => {
  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-fade-in">
        <button onClick={onBack} className="text-gray-500 mb-4 hover:text-white flex items-center text-sm">
            ← Wróć
        </button>

        <div className="flex justify-between items-start mb-6">
            <div>
                 <h1 className="text-2xl font-bold text-white mb-1">{pillar.name}</h1>
                 <p className="text-gray-400 text-sm">{pillar.description}</p>
            </div>
             <div className="text-right">
                <div className={`text-2xl font-bold ${pillar.completion === 100 ? 'text-cyber-green' : 'text-cyber-cyan'}`}>
                    {pillar.completion}%
                </div>
                {pillar.ninety_percent_alert && (
                    <span className="text-xs bg-red-900 text-red-200 px-1 rounded">STUCK</span>
                )}
            </div>
        </div>

        {/* Done Definitions Accordion-like */}
        <div className="space-y-3 mb-8">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">🎯 DEFINICJA DONE</h2>
            
            <div className={`p-3 rounded border ${pillar.completion >= 33 ? 'bg-green-900/10 border-green-900 text-gray-300' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>
                <span className="text-xs font-bold block mb-1">1. TECH DONE</span>
                <p className="text-sm">"{pillar.done_definition.tech}"</p>
            </div>
             <div className={`p-3 rounded border ${pillar.completion >= 66 ? 'bg-green-900/10 border-green-900 text-gray-300' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>
                <span className="text-xs font-bold block mb-1">2. LIVE DONE</span>
                <p className="text-sm">"{pillar.done_definition.live}"</p>
            </div>
             <div className={`p-3 rounded border ${pillar.completion >= 90 ? 'bg-green-900/10 border-green-900 text-gray-300' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>
                <span className="text-xs font-bold block mb-1">3. BATTLE DONE</span>
                <p className="text-sm">"{pillar.done_definition.battle}"</p>
            </div>
        </div>

        {/* Tasks */}
        <div className="mb-8">
             <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">📋 TASKS</h2>
             <div className="space-y-2">
                 {pillar.tasks.map((task, idx) => (
                     <div key={idx} className="flex items-center gap-3 bg-cyber-panel p-3 rounded border border-gray-800">
                        <button 
                            onClick={() => onToggleTask(pillar.id, task.name)}
                            className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${task.done ? 'bg-cyber-cyan border-cyber-cyan' : 'border-gray-600'}`}
                        >
                            {task.done && <span className="text-black text-xs font-bold">✓</span>}
                        </button>
                        <div className="flex-1">
                             <p className={`text-sm ${task.done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{task.name}</p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${task.type === 'close' ? 'bg-red-900 text-red-200' : 'bg-blue-900 text-blue-200'}`}>
                            {task.type}
                        </span>
                     </div>
                 ))}
             </div>
        </div>

        <button 
            onClick={onEnterFinishMode}
            className="w-full bg-cyber-magenta text-white font-bold py-3 rounded shadow-[0_0_10px_#ff00ff] hover:brightness-110 transition-all"
        >
            ENTER FINISH MODE 🔥
        </button>
         <button className="w-full mt-3 text-gray-600 text-xs py-2 hover:text-gray-400">
            Edit Pillar (Locked)
        </button>
    </div>
  );
};

export default PillarDetail;
