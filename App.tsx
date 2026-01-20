import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { AppData, ViewState } from './types';
import { INITIAL_DATA } from './constants';
import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import Today from './components/Today';
import FinishMode from './components/FinishMode';
import SprintView from './components/SprintView';
import PillarDetail from './components/PillarDetail';
import Settings from './components/Settings';
import Rules from './components/Rules';
import AICoach from './components/screens/AICoach';
// Remove top-level notificationCenter import to fix circular dependency
import { debouncedSave, safeLoad, migrateData } from './utils/storageUtils';
import { handleError } from './utils/errorHandler';
import { useDebounce } from './hooks/useDebounce';

// Voice notification removed - now handled by centralized utility

const App: React.FC = () => {
  // 1. Initialize with default data immediately to prevent black screen (undefined data)
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [notificationCenter, setNotificationCenter] = useState<any>(null);
  const [lastRuleExecution, setLastRuleExecution] = useState<Record<string, number>>({});

  // 2. Initialize Data Effect (Fix for empty LocalStorage)
  useEffect(() => {
    const initializeData = () => {
      try {
        const loadedData = safeLoad('flexgrafik-data-v1', null);

        if (loadedData) {
          // Attempt to migrate old data structure if needed
          const migratedData = migrateData(loadedData);
          setData(migratedData);
          console.log("Loaded and migrated data from LocalStorage");
        } else {
          // LocalStorage is empty, initialize it
          console.log("LocalStorage empty. Initializing with default data.");
          setData(INITIAL_DATA);
        }
      } catch (error) {
        handleError(error, {
          component: 'App',
          action: 'initializeData',
          userMessage: 'Problem z ładowaniem danych. Używam ustawień domyślnych.'
        });
        setData(INITIAL_DATA);
      } finally {
        setIsLoaded(true);
      }
    };

    initializeData();
  }, []);

  // 3. Persistence Effect - Only run if loaded to avoid overwriting LS with initial state on mount
  useEffect(() => {
    if (isLoaded) {
      debouncedSave('flexgrafik-data-v1', data);
    }
  }, [data, isLoaded]);

  // Initialize notification center lazily
  useEffect(() => {
    if (isLoaded) {
      import('./utils/notificationCenter').then(module => {
        const center = module.getNotificationCenter(data, setData);
        setNotificationCenter(center);
      });
    }
  }, [isLoaded, data, setData]);

  // Check check-in status on mount (only after data is loaded)
  useEffect(() => {
    if (!isLoaded) return;
    // Logic: If it's after 12:00 and no checkin today, logic handled in Dashboard
  }, [data.user.last_checkin, isLoaded]);

  // Notification when entering Finish Mode
  useEffect(() => {
    if (currentView === 'finish' && activeProjectId && notificationCenter) {
      const pillar = data.pillars.find(p => p.id === activeProjectId);
      if (pillar) {
        notificationCenter.send('ai',
          `Tryb Finish aktywowany. Skoncentruj się na zamknięciu projektu ${pillar.name}.`,
          'finish_mode_activated'
        );
      }
    }
  }, [currentView, activeProjectId, data.pillars, notificationCenter]);

  // Anti-spam rule evaluation function
  const evaluateRulesWithCooldown = useCallback(() => {
    if (!notificationCenter) return;

    const now = Date.now();

    data.customRules.forEach(rule => {
      if (!rule.active) return;

      // ANTI-SPAM: Check cooldown (60 seconds)
      const lastExec = lastRuleExecution[rule.id] || 0;
      if (now - lastExec < 60000) {
        console.log(`⏸️ Rule "${rule.name}" on cooldown (${Math.round((60000 - (now - lastExec)) / 1000)}s left)`);
        return;
      }

      // Only evaluate if rule should trigger (basic check for performance)
      let shouldTrigger = false;

      try {
        switch (rule.trigger) {
          case 'time':
            const currentTime = `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`;
            shouldTrigger = rule.condition === currentTime;
            break;

          case 'data':
            // Skip complex evaluation for now - will be handled by notificationCenter
            shouldTrigger = false; // Let notificationCenter handle data-based rules
            break;

          case 'manual':
            // Manual rules are triggered by user actions
            shouldTrigger = false;
            break;
        }

        if (shouldTrigger) {
          console.log(`🎯 Rule triggered: ${rule.name}`);

          // UPDATE cooldown timestamp BEFORE executing action
          setLastRuleExecution(prev => ({
            ...prev,
            [rule.id]: now
          }));

          // Use notificationCenter for consistent execution
          notificationCenter.executeRuleAction(rule);
        }
      } catch (error) {
        console.error(`Rule evaluation error for ${rule.name}:`, error);
        // Disable broken rules automatically
        setData(prev => ({
          ...prev,
          customRules: prev.customRules.map(r =>
            r.id === rule.id ? { ...r, active: false } : r
          )
        }));
      }
    });
  }, [data.customRules, notificationCenter, lastRuleExecution]);

  // Rule evaluation system - check every minute for time-based rules
  useEffect(() => {
    if (!isLoaded) return;

    const ruleInterval = setInterval(() => {
      evaluateRulesWithCooldown();
    }, 60000); // Check every minute

    // Initial evaluation
    evaluateRulesWithCooldown();

    return () => clearInterval(ruleInterval);
  }, [isLoaded, evaluateRulesWithCooldown]);

  // Evaluate data-based rules when relevant data changes ONLY
  const debouncedPillars = useDebounce(data.pillars, 5000);
  const debouncedSprint = useDebounce(data.sprint, 5000);
  const debouncedUser = useDebounce(data.user, 5000);

  useEffect(() => {
    if (!isLoaded) return;
    // Data-based rules are handled by individual components when needed
    // This prevents infinite loops from notification history updates
  }, [debouncedPillars, debouncedSprint, debouncedUser, isLoaded]);

  // Sprint deadline warning (simplified - check if less than 3 days left in sprint and completion < 70%)
  useEffect(() => {
    if (!isLoaded || !notificationCenter) return;

    const completedDays = data.sprint.progress.filter(d => d.checked).length;
    const totalDays = data.sprint.progress.length;
    const completionPercent = (completedDays / totalDays) * 100;

    // If sprint is more than 5 days in and completion < 70%, warn
    if (completedDays >= 5 && completionPercent < 70) {
      notificationCenter.send('deadline',
        `Ostrzeżenie: Sprint kończy się za ${totalDays - completedDays} dni, zostało ${Math.round(100 - completionPercent)} procent zadań.`,
        'sprint_deadline_warning'
      );
    }
  }, [data.sprint.progress, isLoaded, notificationCenter]);

  // --- Actions ---

  const handleToggleTask = (pillarId: number, taskName: string) => {
    const taskId = `${pillarId}_${taskName}`;
    const now = Date.now();
    const lastToggle = lastRuleExecution[taskId] || 0;

    // Prevent rapid toggles (500ms cooldown per task)
    if (now - lastToggle < 500) {
      return;
    }

    setData(prev => {
      const newPillars = prev.pillars.map(p => {
        if (p.id !== pillarId) return p;

        const newTasks = p.tasks.map(t =>
          t.name === taskName ? { ...t, done: !t.done } : t
        );

        // Recalculate completion
        const total = newTasks.length;
        const done = newTasks.filter(t => t.done).length;
        const completion = total === 0 ? 0 : Math.round((done / total) * 100);

        // Check 90% logic update
        const ninety_alert = completion >= 90 && completion < 100 && (p.days_stuck || 0) > 5;

        return {
          ...p,
          tasks: newTasks,
          completion,
          ninety_percent_alert: ninety_alert,
          last_activity_date: new Date().toISOString()
        };
      });

      // Notification for task completion (only when marking as done, not undone)
      const pillar = prev.pillars.find(p => p.id === pillarId);
      if (pillar) {
        const oldTask = pillar.tasks.find(t => t.name === taskName);

        // Find the updated task in newPillars
        const newPillar = newPillars.find(p => p.id === pillarId);
        const newTask = newPillar?.tasks.find(t => t.name === taskName);

        // Only notify if task was just completed (changed from false to true)
        if (oldTask && !oldTask.done && newTask && newTask.done) {
          // Update cooldown timestamp
          setLastRuleExecution(prev => ({
            ...prev,
            [taskId]: now
          }));

          // Use notification center for consistent handling
          setTimeout(() => {
            if (notificationCenter) {
              notificationCenter.send('ai', "Gratulacje! Zadanie ukończone.", 'task_completion');
            }
          }, 100);
        }
      }

      return { ...prev, pillars: newPillars };
    });
  };

  const handleSprintDayToggle = (idx: number) => {
    setData(prev => {
      const newProgress = [...prev.sprint.progress];
      newProgress[idx] = { ...newProgress[idx], checked: !newProgress[idx].checked };
      return {
        ...prev,
        sprint: { ...prev.sprint, progress: newProgress },
        user: { ...prev.user, last_checkin: new Date().toISOString(), streak: prev.user.streak + 1 }
      };
    });
  };

  const handlePillarClick = (id: number) => {
    setActiveProjectId(id);
    setCurrentView('pillar_detail');
  };

  const handleAlertClick = (type: 'stuck' | 'checkin', projectId?: number) => {
    if (type === 'stuck' && projectId) {
      const pillar = data.pillars.find(p => p.id === projectId);
      if (pillar && notificationCenter) {
        notificationCenter.send('stuck',
          `UWAGA! Projekt ${pillar.name} stuck od ${pillar.days_stuck || 0} dni. Włączam Finish Mode.`,
          'stuck_alert'
        );
      }
      setActiveProjectId(projectId);
      setCurrentView('finish');
    } else if (type === 'checkin' && notificationCenter) {
      notificationCenter.send('checkin',
        "Dzień dobry! Brak check-in dziś. Sprint deadline za 3 dni.",
        'daily_checkin_reminder'
      );
      setCurrentView('accountability');
      // Auto checkin for today
      handleSprintDayToggle(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1); // rough approx for demo
      alert("Check-in logged!");
    }
  };

  const resetSprint = () => {
    if(confirm("Start new sprint? current one will be archived (simulated).")) {
        setData(prev => ({
            ...prev,
            sprint: {
                ...INITIAL_DATA.sprint,
                week: prev.sprint.week + 1,
                progress: prev.sprint.progress.map(d => ({...d, checked: false}))
            }
        }));
    }
  };

  const handleUpdateSettings = useCallback((newSettings: AppData['settings']) => {
    setData(prev => ({
      ...prev,
      settings: newSettings
    }));
  }, []);

  const handleUpdateRules = useCallback((newRules: AppData['customRules']) => {
    setData(prev => ({
      ...prev,
      customRules: newRules
    }));
  }, []);

  const handleUpdateChatHistory = useCallback((newChatHistory: AppData['aiChatHistory']) => {
    setData(prev => ({
      ...prev,
      aiChatHistory: newChatHistory
    }));
  }, []);

  // --- Render ---

  // Loading Screen to prevent flickering or access before data sync
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center text-cyber-cyan font-mono animate-pulse">
        Initializing FlexGrafik OS...
      </div>
    );
  }

  const renderView = () => {
    // Safety check in case data is still somehow null
    if (!data) return null;

    switch (currentView) {
      case 'home':
        return <Dashboard data={data} onPillarClick={handlePillarClick} onAlertClick={handleAlertClick} />;
      case 'today':
        return <Today 
          data={data} 
          onToggleTask={handleToggleTask} 
          onStartTimer={() => setCurrentView('finish')} 
          isTimerRunning={false} 
        />;
      case 'finish':
        return <FinishMode 
          data={data} 
          projectId={activeProjectId} 
          onToggleTask={handleToggleTask}
          onExit={() => setCurrentView('home')} 
        />;
      case 'sprint':
        return <SprintView 
          data={data} 
          onToggleDay={handleSprintDayToggle} 
          onResetSprint={resetSprint}
        />;
      case 'pillar_detail':
        const pillar = data.pillars.find(p => p.id === activeProjectId);
        if (!pillar) return <Dashboard data={data} onPillarClick={handlePillarClick} onAlertClick={handleAlertClick} />;
        return <PillarDetail 
            pillar={pillar} 
            onBack={() => setCurrentView('home')} 
            onToggleTask={handleToggleTask}
            onEnterFinishMode={() => setCurrentView('finish')}
        />;
      case 'accountability':
         return (
           <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-fade-in">
             {/* Header */}
             <div className="mb-6 border-b border-gray-800 pb-4">
               <button
                 onClick={() => setCurrentView('home')}
                 className="text-cyber-cyan hover:text-cyber-magenta transition-colors mb-2"
               >
                 ← Powrót
               </button>
               <h1 className="text-xl font-bold text-cyber-cyan tracking-widest uppercase mb-1">Accountability Hub</h1>
               <p className="text-xs text-gray-400 font-mono">Historia powiadomień i accountability</p>
             </div>

             {/* Stats */}
             <div className="mb-6 grid grid-cols-2 gap-4">
               <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4 text-center">
                 <div className="text-2xl font-bold text-cyber-magenta">{data.user.streak}</div>
                 <div className="text-xs text-gray-400 uppercase">Streak (dni)</div>
               </div>
               <div className="bg-cyber-panel border border-gray-800 rounded-lg p-4 text-center">
                 <div className="text-2xl font-bold text-cyber-cyan">{data.notificationHistory.length}</div>
                 <div className="text-xs text-gray-400 uppercase">Powiadomień</div>
               </div>
             </div>

             {/* Notification History */}
             <div className="space-y-3">
               <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">🔔 Historia Powiadomień</h2>

               {data.notificationHistory.length === 0 ? (
                 <div className="text-center py-8 text-gray-500">
                   <p>Brak powiadomień w historii</p>
                   <p className="text-xs mt-2">Powiadomienia będą się tutaj pojawiać</p>
                 </div>
               ) : (
                 data.notificationHistory.slice(0, 20).map(notification => (
                   <div key={notification.id} className="bg-cyber-panel border border-gray-800 rounded-lg p-3">
                     <div className="flex items-start justify-between mb-2">
                       <div className="flex items-center gap-2">
                         <span className="text-xs font-bold uppercase tracking-wider">
                           {notification.type === 'checkin' && '📝'}
                           {notification.type === 'stuck' && '🚨'}
                           {notification.type === 'deadline' && '⏰'}
                           {notification.type === 'custom' && '📋'}
                           {notification.type === 'ai' && '🤖'}
                         </span>
                         <span className="text-xs text-gray-400">
                           {new Date(notification.timestamp).toLocaleString('pl-PL', {
                             month: 'short',
                             day: 'numeric',
                             hour: '2-digit',
                             minute: '2-digit'
                           })}
                         </span>
                       </div>
                       {notification.response && (
                         <span className={`text-xs px-2 py-1 rounded ${
                           notification.response === 'checked_in' ? 'bg-green-900/50 text-green-400' :
                           notification.response === 'acknowledged' ? 'bg-blue-900/50 text-blue-400' :
                           'bg-gray-900/50 text-gray-400'
                         }`}>
                           {notification.response === 'checked_in' ? '✓' :
                            notification.response === 'acknowledged' ? '👁️' : '?'}
                         </span>
                       )}
                     </div>
                     <p className="text-sm text-gray-200">{notification.message}</p>
                     {notification.ruleId && (
                       <p className="text-xs text-gray-500 mt-1">
                         Reguła: {data.customRules.find(r => r.id === notification.ruleId)?.name || notification.ruleId}
                       </p>
                     )}
                   </div>
                 ))
               )}

               {data.notificationHistory.length > 20 && (
                 <p className="text-xs text-center text-gray-500 mt-4">
                   Pokazano ostatnie 20 z {data.notificationHistory.length} powiadomień
                 </p>
               )}
             </div>
           </div>
         );
      case 'settings':
        return <Settings
          data={data}
          onUpdateSettings={handleUpdateSettings}
          onBack={() => setCurrentView('home')}
        />;
      case 'rules':
        return <Rules
          data={data}
          onUpdateRules={handleUpdateRules}
          onBack={() => setCurrentView('home')}
        />;
      case 'ai_coach':
        return <AICoach
          data={data}
          onUpdateChatHistory={handleUpdateChatHistory}
          onBack={() => setCurrentView('home')}
        />;
      default:
        return <Dashboard data={data} onPillarClick={handlePillarClick} onAlertClick={handleAlertClick} />;
    }
  };

  const stuckCount = data?.pillars?.filter(p => p.ninety_percent_alert).length || 0;

  return (
    <div className="min-h-screen bg-cyber-black text-gray-200 font-sans selection:bg-cyber-magenta selection:text-white pb-safe">
      {renderView()}
      
      {/* Show Nav unless in Finish Mode */}
      {currentView !== 'finish' && (
        <Navigation 
          currentView={currentView} 
          setView={setCurrentView} 
          stuckCount={stuckCount}
        />
      )}
    </div>
  );
};

// Mount
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

export default App;