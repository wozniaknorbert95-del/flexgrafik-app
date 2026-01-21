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
    <div className="pb-24 pt-6 px-6 max-w-md mx-auto fade-in" style={{ backgroundColor: 'var(--background)' }}>
      <div className="mb-8 text-center">
        <h1 className="heading-1 mb-2">Today</h1>
        <p className="small">Focus on what matters most</p>
      </div>

      {activeStuckProject && (
        <div className="mb-8 card" style={{ borderColor: 'var(--danger)' }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)' }}>
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="flex-1">
              <h2 className="heading-3 mb-1" style={{ color: 'var(--danger)' }}>Resume Project</h2>
              <p className="body mb-2">{activeStuckProject.name} is 90% complete</p>
              <p className="caption">{activeStuckProject.days_stuck} days without progress</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            {mustCloseTasks.length > 0 ? mustCloseTasks.map((task, idx) => (
              <div key={`must-${task.pillarId}-${task.name}-${idx}`} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-secondary)' }}>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => onToggleTask(task.pillarId, task.name)}
                  className="w-5 h-5 rounded border-2"
                  style={{ borderColor: 'var(--danger)', accentColor: 'var(--danger)' }}
                />
                <span className="body flex-1" style={{ textDecoration: task.done ? 'line-through' : 'none', color: task.done ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                  {task.name}
                </span>
              </div>
            )) : (
              <div className="text-center py-6">
                <span className="text-4xl mb-2 block">🎉</span>
                <p className="body" style={{ color: 'var(--success)' }}>All critical tasks completed!</p>
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="caption mb-4" style={{ color: 'var(--text-secondary)' }}>
              About 2 hours needed to complete
            </p>
            <button
              onClick={onStartTimer}
              className="btn btn-primary"
            >
              Start Focus Session
            </button>
          </div>
        </div>
      )}

      {!activeStuckProject && (
        <div className="mb-6">
          <h2 className="heading-2 mb-4">Available Tasks</h2>
          <div className="space-y-3">
            {otherTasks.map((task, idx) => (
              <div key={`build-${task.pillarId}-${task.name}-${idx}`} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="body mb-1">{task.name}</p>
                    <p className="caption" style={{ color: 'var(--text-tertiary)' }}>{task.pillarName}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => onToggleTask(task.pillarId, task.name)}
                    className="w-5 h-5 rounded"
                    style={{ accentColor: 'var(--primary)' }}
                  />
                </div>
              </div>
            ))}
            {otherTasks.length === 0 && (
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">✨</span>
                <h3 className="heading-3 mb-2">All caught up!</h3>
                <p className="body" style={{ color: 'var(--text-secondary)' }}>
                  No tasks available. Add new tasks in Projects.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Add Task Section */}
      <div className="mb-6 card">
        <h3 className="heading-3 mb-4">Add New Task</h3>
        <div className="space-y-4">
          <div>
            <label className="caption block mb-2">Project</label>
            <select
              value={selectedPillar}
              onChange={(e) => setSelectedPillar(Number(e.target.value))}
              className="select"
              style={{ width: '100%' }}
            >
              {data.pillars.map(pillar => (
                <option key={pillar.id} value={pillar.id}>
                  {pillar.name} ({pillar.completion}% complete)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="caption block mb-2">Task Name</label>
            <input
              type="text"
              placeholder="What needs to be done?"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addQuickTask()}
              className="input"
              style={{ width: '100%' }}
            />
          </div>

          <button
            onClick={addQuickTask}
            disabled={!newTaskText.trim()}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default Today;
