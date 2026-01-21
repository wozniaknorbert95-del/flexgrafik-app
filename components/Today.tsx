import React, { useMemo, useState } from 'react';
import { AppData, Task } from '../types';

interface TodayProps {
  data: AppData;
  onToggleTask: (pillarId: number, taskName: string) => void;
  onAddTask: (pillarId: number, taskName: string, taskType?: 'build' | 'close') => void;
  onStartTimer: () => void;
  isTimerRunning: boolean;
}

const Today: React.FC<TodayProps> = ({ data, onToggleTask, onAddTask, onStartTimer }) => {
  // Quick add task state
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedPillar, setSelectedPillar] = useState<number>(data.pillars[0]?.id || 1);

  const addQuickTask = () => {
    if (!newTaskText.trim()) return;

    onAddTask(selectedPillar, newTaskText.trim(), 'build');
    setNewTaskText('');
  };

  // Logic: Prioritize tasks from >90% projects ("Close" type)
  // If block exists, show block message

  const stuckProjects = data.pillars.filter(p => p.ninety_percent_alert);
  const activeStuckProject = stuckProjects.length > 0 ? stuckProjects[0] : null;

  // Memoized task filtering with deduplication
  const { mustCloseTasks, otherTasks } = useMemo(() => {
    // Flatten tasks with pillar context
    const allTasks = data.pillars.flatMap(p =>
      p.tasks.map(t => ({
        ...t,
        pillarId: p.id,
        pillarName: p.name,
        isStuck: p.ninety_percent_alert
      }))
    );

    // Deduplicate tasks by pillarId + taskName to prevent duplicates
    const uniqueTasks = Array.from(
      new Map(
        allTasks.map(task => [`${task.pillarId}-${task.name}`, task])
      ).values()
    );

    // Filter for must-close tasks (stuck projects, close type, not done)
    const mustCloseTasks = uniqueTasks.filter(t => t.isStuck && !t.done && t.type === 'close');

    // Filter for other build tasks (not stuck, not done, limit to 3)
    const otherTasks = uniqueTasks.filter(t => !t.isStuck && !t.done).slice(0, 3);

    return { mustCloseTasks, otherTasks };
  }, [data.pillars]);

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-fade-in" style={{ backgroundColor: 'var(--cyber-black)' }}>
      <h1 className="cyber-h1 mb-6" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🎯</span> DZISIAJ
      </h1>

      {activeStuckProject && (
        <div className="mb-8 card glow-magenta" style={{ position: 'relative', overflow: 'hidden', borderColor: 'var(--danger)' }}>
          <div style={{ position: 'absolute', top: '0', right: '0', padding: '8px', opacity: 0.2, fontSize: '48px' }}>🔥</div>
          <h2 className="cyber-h2 mb-2" style={{ color: 'var(--danger)' }}>🔴 MUST CLOSE (90% Stuck)</h2>
          <p className="cyber-body font-bold mb-4" style={{ color: 'var(--text-primary)', fontSize: '18px' }}>{activeStuckProject.name}</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {mustCloseTasks.length > 0 ? mustCloseTasks.map((task, idx) => (
              <div key={`must-${task.pillarId}-${task.name}-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                 <button
                  onClick={() => onToggleTask(task.pillarId, task.name)}
                  style={{
                    marginTop: '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: `2px solid var(--danger)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 0, 64, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {task.done && <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--danger)', borderRadius: '2px' }} />}
                </button>
                <span className="cyber-body" style={{ color: 'var(--text-secondary)' }}>{task.name}</span>
              </div>
            )) : <p className="cyber-body" style={{ color: 'var(--success)' }}>Wszystkie zadania krytyczne zrobione!</p>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="cyber-small" style={{ color: 'var(--danger)', marginBottom: '4px' }}>⏱️ 2h estimated for final push</div>
            <button
              onClick={onStartTimer}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, var(--danger) 0%, #CC0040 100%)', borderColor: 'var(--danger)', boxShadow: '0 0 20px rgba(255, 0, 64, 0.5)' }}
            >
              START 25min FOCUS ⏱️
            </button>
          </div>
        </div>
      )}

      {!activeStuckProject && (
        <div className="mb-6">
           <h2 className="cyber-h2 mb-3" style={{ color: 'var(--cyber-gold)' }}>🟡 BUILD TASKS</h2>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {otherTasks.map((task, idx) => (
                <div key={`build-${task.pillarId}-${task.name}-${idx}`} className="card">
                    <div className="cyber-small mb-1" style={{ color: 'var(--text-muted)' }}>{task.pillarName}</div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                         <button
                            onClick={() => onToggleTask(task.pillarId, task.name)}
                            style={{
                              marginTop: '2px',
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              border: `2px solid var(--cyber-gold)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            {task.done && <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--cyber-gold)', borderRadius: '2px' }} />}
                        </button>
                        <span className="cyber-body" style={{ color: 'var(--text-secondary)' }}>{task.name}</span>
                    </div>
                </div>
            ))}
            {otherTasks.length === 0 && (
                <div className="empty-state">
                    <div className="glitch-text">NO ACTIVE TASKS</div>
                    <p className="cyber-small">Dodaj nowe zadania w Filarach</p>
                </div>
            )}
           </div>
        </div>
      )}

      {/* Quick Add Task Section */}
      <div className="mb-6 card glow-cyan">
        <h3 className="cyber-h3 mb-3" style={{ color: 'var(--cyber-cyan)' }}>➕ SZYBKIE DODANIE ZADANIA</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <select
            value={selectedPillar}
            onChange={(e) => setSelectedPillar(Number(e.target.value))}
            className="select-cyber"
          >
            {data.pillars.map(pillar => (
              <option key={pillar.id} value={pillar.id}>
                {pillar.name} ({pillar.completion}%)
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Nowe zadanie na dziś..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addQuickTask()}
              className="input-cyber"
              style={{ flex: 1 }}
            />
            <button
              onClick={addQuickTask}
              disabled={!newTaskText.trim()}
              className="btn-secondary"
            >
              ➕ Dodaj
            </button>
          </div>
        </div>
      </div>

      {activeStuckProject && (
        <div className="card glow-gold" style={{ textAlign: 'center', borderColor: 'var(--warning)' }}>
            <p className="cyber-body mb-2" style={{ color: 'var(--warning)' }}>⚠️ PRIORYTET</p>
            <p className="cyber-small" style={{ color: 'var(--warning)' }}>
              "{activeStuckProject.name}" jest prawie gotowy (90%+). Rozważ dokończenie go najpierw!
            </p>
        </div>
      )}
    </div>
  );
};

export default Today;
