/**
 * SCHEDULER SYSTEM - Cykliczny audyt niedokończonych zadań
 * Automatyczne sprawdzanie zadań stuck at 90% i powiadomienia
 */

import { detectStuckAt90 } from './taskHelpers';
import { Task } from '../types';
import { loadAppData } from './storageManager';

// ============================================================================
// SCHEDULER CORE
// ============================================================================

/**
 * Główna funkcja planowania zadań
 */
export const scheduleStuckTasksAudit = () => {
  // Sprawdź czy scheduler już działa
  if (typeof window !== 'undefined') {
    const schedulerRunning = localStorage.getItem('stuckTasksScheduler');
    if (schedulerRunning === 'running') {
      console.log('🕐 Stuck tasks scheduler already running');
      return;
    }

    // Oznacz scheduler jako uruchomiony
    localStorage.setItem('stuckTasksScheduler', 'running');

    // Uruchom codzienny audyt
    scheduleDaily(checkStuckTasks, '10:00');

    console.log('🕐 Stuck tasks scheduler started - daily audits at 10:00');
  }
};

/**
 * Pobierz zadania bezpośrednio z PostgreSQL
 */
const fetchTasksFromDatabase = async (): Promise<Task[]> => {
  // Local-first: scheduler operates on locally persisted AppData (IndexedDB/localStorage).
  try {
    const appData = await loadAppData();
    const pillars = appData?.pillars ?? [];
    return pillars.flatMap((pillar) => pillar?.tasks ?? []);
  } catch (error) {
    console.error('❌ Failed to load tasks from local storage:', error);
    return [];
  }
};

/**
 * Funkcja sprawdzająca zadania stuck at 90%
 */
export const checkStuckTasks = async () => {
  try {
    console.log('🔍 Running stuck tasks audit...');

    // Pobierz zadania bezpośrednio z PostgreSQL
    const allTasks = await fetchTasksFromDatabase();
    const stuckTasks: Task[] = [];

    // Przeszukaj wszystkie zadania pod kątem stuck detection
    allTasks.forEach((task) => {
      if (detectStuckAt90(task)) {
        stuckTasks.push(task);
      }
    });

    console.log(
      `📊 Audit complete: ${stuckTasks.length} stuck tasks found from ${allTasks.length} total tasks`
    );

    // Jeśli są stuck tasks, pokaż powiadomienie (ale tylko jeśli nie wysyłaliśmy ostatnio)
    if (stuckTasks.length > 0) {
      const shouldNotify = await shouldSendNotification(stuckTasks);
      if (shouldNotify) {
        await showStuckTasksNotification(stuckTasks);

        // Zapisz informację o wysłanym powiadomieniu
        await logAuditNotification(stuckTasks);
      } else {
        console.log('📅 Skipping notification - sent recently for these tasks');
      }
    }

    // Zapisz informacje o audycie do localStorage dla debugowania
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        'lastStuckTasksAudit',
        JSON.stringify({
          timestamp: new Date().toISOString(),
          stuckTasksCount: stuckTasks.length,
          totalTasks: allTasks.length,
          stuckTasks: stuckTasks.map((t) => ({ id: t.id, name: t.name, progress: t.progress })),
        })
      );
    }

    return stuckTasks;
  } catch (error) {
    console.error('❌ Stuck tasks audit failed:', error);
    return [];
  }
};

// ============================================================================
// NOTIFICATION DEDUPLICATION
// ============================================================================

/**
 * Sprawdź czy powinniśmy wysłać powiadomienie (unika duplikatów)
 */
const shouldSendNotification = async (stuckTasks: Task[]): Promise<boolean> => {
  try {
    // Local-first: dedupe via localStorage only (no backend dependency).
    const lastNotification = localStorage.getItem('lastStuckNotification');
    if (lastNotification) {
      const lastData = JSON.parse(lastNotification);
      const lastTime = new Date(lastData.timestamp);
      const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);

      // Sprawdź czy to te same zadania
      const sameTasks = lastData.stuckTaskIds?.some((id: number) =>
        stuckTasks.some((task) => task.id === id)
      );

      if (sameTasks) {
        return hoursSince > 6; // Nie wysyłaj częściej niż co 6 godzin dla tych samych zadań
      }
    }

    return true; // Pierwsze powiadomienie lub nowe zadania
  } catch (error) {
    console.warn('❌ Failed to check notification eligibility:', error);
    // Fallback do mniej restrykcyjnego sprawdzania
    const lastNotification = localStorage.getItem('lastStuckNotification');
    if (lastNotification) {
      const lastTime = new Date(JSON.parse(lastNotification).timestamp);
      const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
      return hoursSince > 12; // Bardziej konserwatywny fallback
    }
    return true;
  }
};

/**
 * Zapisz informację o wysłanym powiadomieniu
 */
const logAuditNotification = async (stuckTasks: Task[]) => {
  // Local-first: persist audit marker in localStorage.
  try {
    localStorage.setItem(
      'lastStuckNotification',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        stuckTaskIds: stuckTasks.map((t) => t.id),
        count: stuckTasks.length,
      })
    );
    console.log('💾 Notification logged in localStorage');
  } catch (storageError) {
    console.error('❌ Failed to log notification in localStorage:', storageError);
  }
};

// ============================================================================
// SCHEDULER UTILITIES
// ============================================================================

/**
 * Zaplanuj codzienne wykonanie funkcji (wersja przeglądarkowa)
 * Uwaga: Zawiedzie po zamknięciu karty przeglądarki.
 * W produkcji należy użyć Service Worker lub backend cron job.
 */
export const scheduleDaily = (callback: () => void | Promise<void>, timeString: string) => {
  const [hours, minutes] = timeString.split(':').map(Number);

  const scheduleNextRun = () => {
    const now = new Date();
    const nextRun = new Date();

    // Ustaw czas wykonania na dziś
    nextRun.setHours(hours, minutes, 0, 0);

    // Jeśli czas już minął dzisiaj, zaplanuj na jutro
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const timeUntilNextRun = nextRun.getTime() - now.getTime();

    // Nie planuj jeśli czas jest zbyt odległy (ochrona przed błędami)
    if (timeUntilNextRun > 24 * 60 * 60 * 1000) {
      // 24 godziny
      console.warn('⚠️ Scheduling time too far in future, resetting to tomorrow');
      nextRun.setTime(now.getTime() + 24 * 60 * 60 * 1000);
    }

    console.log(`📅 Next stuck tasks audit scheduled for: ${nextRun.toLocaleString()}`);
    console.log(`⏰ Time until next run: ${Math.round(timeUntilNextRun / 1000 / 60)} minutes`);

    const timeoutId = setTimeout(async () => {
      try {
        // Wykonaj funkcję
        await callback();

        // Zaplanuj następne wykonanie tylko jeśli karta jest wciąż otwarta
        if (!document.hidden) {
          scheduleNextRun();
        } else {
          console.log('📱 Tab hidden, stopping scheduler to save resources');
        }
      } catch (error) {
        console.error('❌ Scheduled callback failed:', error);
        // Mimo błędu, spróbuj zaplanować następne wykonanie
        setTimeout(() => scheduleNextRun(), 60000); // Spróbuj ponownie za 1 minutę
      }
    }, timeUntilNextRun);

    // Cleanup przy zamknięciu/odświeżeniu strony
    const cleanup = () => {
      clearTimeout(timeoutId);
      localStorage.removeItem('stuckTasksScheduler');
    };

    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('unload', cleanup);
  };

  // Uruchom pierwsze planowanie
  scheduleNextRun();
};

/**
 * Pokaż powiadomienie o stuck tasks z AI-generated content
 */
export const showStuckTasksNotification = async (stuckTasks: Task[]) => {
  try {
    // Generuj dynamiczny tytuł i treść przez Ollama
    const { title, body } = await generateNotificationContent(stuckTasks);

    showNotification({
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'stuck-tasks-audit', // Zapobiega duplikatom powiadomień
      requireInteraction: false,
      silent: false,
      actions: [
        {
          action: 'finish-mode',
          title: '🏁 Przejdź do Finish Mode',
        },
        {
          action: 'dismiss',
          title: 'Później',
        },
      ],
      data: {
        stuckTasksCount: stuckTasks.length,
        stuckTasks: stuckTasks.map((t) => ({ id: t.id, name: t.name, progress: t.progress })),
      },
    });
  } catch (error) {
    console.warn('❌ AI content generation failed, using fallback:', error);
    // Fallback do statycznego tekstu
    const title = `🎯 ${stuckTasks.length} zadań na finiszu`;
    const body = `Masz ${stuckTasks.length} zadań powyżej 90%, które czekają na ukończenie. Czas je domknąć!`;

    showNotification({
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'stuck-tasks-audit',
      requireInteraction: false,
      silent: false,
      actions: [
        { action: 'finish-mode', title: '🏁 Przejdź do Finish Mode' },
        { action: 'dismiss', title: 'Później' },
      ],
      data: {
        stuckTasksCount: stuckTasks.length,
        stuckTasks: stuckTasks.map((t) => ({ id: t.id, name: t.name, progress: t.progress })),
      },
    });
  }
};

/**
 * Generuj treść powiadomienia przez Ollama (Summary of Shame)
 */
const generateNotificationContent = async (
  stuckTasks: Task[]
): Promise<{ title: string; body: string }> => {
  const taskNames = stuckTasks.map((t) => t.name).join(', ');
  const taskCount = stuckTasks.length;

  const prompt = `Stwórz krótkie, motywujące powiadomienie o ${taskCount} zadaniach stuck at 90%+: ${taskNames}.

  Format: Tytuł (max 8 słów) + Treść (max 25 słów)
  Styl: Motywujący ale brutalnie szczery, jak Navy SEALs coach.
  Przykład: "Nie bądź amatorem" + "Gra i Oferta czekają. Dokoncz to dzisiaj albo przestań udawać profesjonalistę."

  Odpowiedź w formacie JSON: {"title": "...", "body": "..."}`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama2',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.8,
          top_p: 0.9,
          num_predict: 100,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const aiResponse = data.response?.trim();

      // Spróbuj parsować JSON z odpowiedzi AI
      try {
        const parsed = JSON.parse(aiResponse);
        if (parsed.title && parsed.body) {
          return {
            title: parsed.title.substring(0, 50), // Limit długości
            body: parsed.body.substring(0, 120),
          };
        }
      } catch (parseError) {
        // Jeśli AI nie zwrócił prawidłowego JSON, użyj surowej odpowiedzi
        console.warn('AI returned invalid JSON, using raw response');
        return {
          title: `🎯 ${taskCount} zadań czeka`,
          body: aiResponse.substring(0, 120),
        };
      }
    }

    throw new Error('Ollama API failed');
  } catch (error) {
    console.warn('Ollama notification generation failed:', error);
    throw error;
  }
};

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

/**
 * Główna funkcja wyświetlania powiadomień
 */
export const showNotification = (
  options: NotificationOptions & {
    title: string;
    body: string;
    actions?: NotificationAction[];
    data?: any;
  }
) => {
  // Sprawdź czy mamy uprawnienia do powiadomień
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      // Pokaż powiadomienie natywne
      showNativeNotification(options);
    } else if (Notification.permission !== 'denied') {
      // Poproś o uprawnienia
      requestNotificationPermission().then((permission) => {
        if (permission === 'granted') {
          showNativeNotification(options);
        } else {
          // Fallback: pokaż in-app powiadomienie
          showInAppNotification(options);
        }
      });
    } else {
      // Fallback: pokaż in-app powiadomienie
      showInAppNotification(options);
    }
  } else {
    // Brak wsparcia dla powiadomień - użyj in-app
    showInAppNotification(options);
  }
};

/**
 * Pokaż natywne powiadomienie przeglądarki
 */
const showNativeNotification = (
  options: NotificationOptions & {
    title: string;
    body: string;
    actions?: NotificationAction[];
    data?: any;
  }
) => {
  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/icon-192x192.png',
      badge: options.badge || '/badge-72x72.png',
      tag: options.tag || 'stuck-tasks',
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
      actions: options.actions,
      data: options.data,
    });

    // Obsługa kliknięć w powiadomienie
    notification.onclick = () => {
      // Zamknij powiadomienie
      notification.close();

      // Przejdź do aplikacji
      if (typeof window !== 'undefined') {
        window.focus();

        // Jeśli kliknięto w akcję "finish-mode"
        if (options.data?.action === 'finish-mode') {
          // Tutaj można dodać logikę nawigacji do Finish Mode
          // Na przykład: window.location.hash = '#/finish';
          console.log('📍 Navigating to Finish Mode...');
        }
      }
    };

    // Auto-zamykanie po 10 sekundach
    setTimeout(() => {
      notification.close();
    }, 10000);
  } catch (error) {
    console.error('❌ Failed to show native notification:', error);
    // Fallback do in-app
    showInAppNotification(options);
  }
};

/**
 * Poproś o uprawnienia do powiadomień
 */
export const requestNotificationPermission = (): Promise<NotificationPermission> => {
  return new Promise((resolve) => {
    if (!('Notification' in window)) {
      resolve('denied');
      return;
    }

    if (Notification.permission === 'granted') {
      resolve('granted');
      return;
    }

    if (Notification.permission === 'denied') {
      resolve('denied');
      return;
    }

    Notification.requestPermission().then((permission) => {
      resolve(permission);
    });
  });
};

/**
 * Pokaż in-app powiadomienie (fallback)
 */
const showInAppNotification = (options: {
  title: string;
  body: string;
  actions?: NotificationAction[];
  data?: any;
}) => {
  // Tutaj można zaimplementować własny system powiadomień in-app
  // Na przykład: toast notifications, modal, etc.

  console.log('🔔 In-app notification:', {
    title: options.title,
    body: options.body,
    actions: options.actions,
    data: options.data,
  });

  // Można dodać do globalnego stanu powiadomień
  if (typeof window !== 'undefined') {
    // Wyemituj custom event
    window.dispatchEvent(
      new CustomEvent('stuckTasksNotification', {
        detail: {
          title: options.title,
          body: options.body,
          actions: options.actions,
          data: options.data,
        },
      })
    );
  }
};

// ============================================================================
// SCHEDULER MANAGEMENT
// ============================================================================

/**
 * Zatrzymaj scheduler
 */
export const stopStuckTasksScheduler = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('stuckTasksScheduler');
    console.log('🕐 Stuck tasks scheduler stopped');
  }
};

/**
 * Sprawdź status scheduler'a
 */
export const getSchedulerStatus = () => {
  if (typeof window !== 'undefined') {
    const status = localStorage.getItem('stuckTasksScheduler');
    return {
      isRunning: status === 'running',
      lastAudit: localStorage.getItem('lastStuckTasksAudit')
        ? JSON.parse(localStorage.getItem('lastStuckTasksAudit')!)
        : null,
    };
  }
  return { isRunning: false, lastAudit: null };
};

/**
 * Ręczne uruchomienie audytu (dla debugowania)
 */
export const runStuckTasksAuditNow = async () => {
  console.log('🔍 Running manual stuck tasks audit...');
  return await checkStuckTasks();
};

/**
 * Debug function - force audit (dostępne z konsoli)
 */
export const debugForceAudit = async () => {
  console.log('🔧 DEBUG: Force running stuck tasks audit...');
  console.log('📊 Current scheduler status:', getSchedulerStatus());

  try {
    const stuckTasks = await checkStuckTasks();
    console.log('✅ Debug audit completed successfully');
    console.log(
      `📈 Found ${stuckTasks.length} stuck tasks:`,
      stuckTasks.map((t) => `${t.name} (${t.progress}%)`)
    );

    return {
      success: true,
      stuckTasksCount: stuckTasks.length,
      stuckTasks: stuckTasks,
    };
  } catch (error) {
    console.error('❌ Debug audit failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Make debug function globally available
if (typeof window !== 'undefined') {
  (window as any).debugForceAudit = debugForceAudit;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Auto-start scheduler gdy moduł się załaduje (tylko w przeglądarce)
if (typeof window !== 'undefined') {
  // Opóźnij start o 5 sekund po załadowaniu strony
  setTimeout(() => {
    scheduleStuckTasksAudit();
  }, 5000);
}
