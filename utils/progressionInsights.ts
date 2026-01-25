import { Task, TaskInsight, Pillar, type FinishSessionClassification } from '../types';
import { detectStuckAt90, daysBetween } from './taskHelpers';
import {
  buildFinishSessionSummaryPrompt,
  buildMotivationTipPrompt,
  ollamaGenerateText,
} from './aiPrompts';

/**
 * PROGRESSION INSIGHTS & ANTI-DIP SYSTEM
 * Silnik analizy postępu zadań z mechanizmami zapobiegania stagnacji
 */

// ============================================================================
// CORE ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Główna funkcja analizy progresu zadania (sync version for immediate analysis)
 */
export const analyzeTaskProgression = (task: Task): TaskInsight => {
  const daysSinceUpdate = calculateDaysSinceLastUpdate(task);
  const isStuck = detectStuckTask(task, daysSinceUpdate);
  const velocity = calculateCompletionVelocity(task);

  return {
    isStuck,
    daysInCurrentState: daysSinceUpdate,
    recommendedAction: determineRecommendedAction(task, isStuck, daysSinceUpdate),
    motivationTip: '', // Will be populated async
    completionVelocity: velocity,
  };
};

/**
 * Async version with Ollama-powered motivation tips
 */
export const analyzeTaskProgressionAsync = async (task: Task): Promise<TaskInsight> => {
  const daysSinceUpdate = calculateDaysSinceLastUpdate(task);
  const isStuck = detectStuckTask(task, daysSinceUpdate);
  const velocity = calculateCompletionVelocity(task);
  const motivationTip = await getContextualMotivationTip(task, isStuck, daysSinceUpdate);

  return {
    isStuck,
    daysInCurrentState: daysSinceUpdate,
    recommendedAction: determineRecommendedAction(task, isStuck, daysSinceUpdate),
    motivationTip,
    completionVelocity: velocity,
  };
};

/**
 * Wykrywanie zadań utkniętych przy 90%+
 */
export const detectStuckTask = (task: Task, daysSinceUpdate: number): boolean => {
  // Use enhanced stuck detection - this is for NEW stuck detection
  // For existing stuck tasks, we check if they should still be considered stuck
  if (task.stuckAtNinety) {
    // If already marked as stuck, check if conditions still apply
    return detectStuckAt90(task);
  } else {
    // If not marked as stuck, check if it should be marked now
    return detectStuckAt90(task);
  }
};

/**
 * Obliczanie dni od ostatniej aktualizacji progresu
 */
export const calculateDaysSinceLastUpdate = (task: Task): number => {
  if (!task.lastProgressUpdate) return 0;

  return daysBetween(task.lastProgressUpdate, new Date());
};

/**
 * Obliczanie prędkości ukończenia (tasks/day)
 */
export const calculateCompletionVelocity = (task: Task): number => {
  if (!task.createdAt || task.progress === 0) return 0;

  const daysSinceCreation = calculateDaysSinceCreation(task);
  if (daysSinceCreation === 0) return 0;

  const progressPerDay = task.progress / daysSinceCreation;
  return Math.round(progressPerDay * 100) / 100; // 2 decimal places
};

/**
 * Obliczanie dni od utworzenia zadania
 */
export const calculateDaysSinceCreation = (task: Task): number => {
  if (!task.createdAt) return 0;

  const creation = new Date(task.createdAt);
  const now = new Date();
  const diffTime = now.getTime() - creation.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24);

  return Math.floor(diffDays);
};

// ============================================================================
// RECOMMENDATION ENGINE
// ============================================================================

/**
 * Determinacja rekomendowanej akcji dla zadania
 */
export const determineRecommendedAction = (
  task: Task,
  isStuck: boolean,
  daysSinceUpdate: number
): TaskInsight['recommendedAction'] => {
  if (isStuck) {
    return 'break-down-remaining';
  }

  if (daysSinceUpdate > 7 && task.progress < 50) {
    return 'set-deadline';
  }

  if (daysSinceUpdate > 14 && task.progress > 0) {
    return 'get-accountability';
  }

  return null;
};

/**
 * Generowanie kontekstualnych tipów motywacyjnych przez Ollamę
 */
export const getContextualMotivationTip = async (
  task: Task,
  isStuck: boolean,
  daysSinceUpdate: number
): Promise<string> => {
  try {
    const prompt = buildMotivationTipPrompt({ task });
    const tip = await ollamaGenerateText(
      { prompt, temperature: 0.7, topP: 0.9, numPredict: 60, maxLen: 120 },
      { timeoutMs: 10_000 }
    );
    if (tip && tip.length <= 100 && tip.length > 5) return tip;

    // Fallback if Ollama fails
    return getFallbackMotivationTip(task, isStuck, daysSinceUpdate);
  } catch (error) {
    console.warn('Ollama integration failed, using fallback:', error);
    return getFallbackMotivationTip(task, isStuck, daysSinceUpdate);
  }
};

/**
 * Fallback motivation tips when Ollama is unavailable
 */
export const getFallbackMotivationTip = (
  task: Task,
  isStuck: boolean,
  daysSinceUpdate: number
): string => {
  if (isStuck) {
    return 'Podziel pozostałe 10% na 3 mikro-kroki. Wykonaj pierwszy natychmiast.';
  }

  if (daysSinceUpdate > 7) {
    return 'Ustal konkretny deadline dziś. Napisz go na kartce.';
  }

  if (task.progress >= 50) {
    return 'Świetna robota! Zrób jeden mały krok, by utrzymać momentum.';
  }

  return 'Zacznij od 5 minut. Najważniejsze to przełamać inercję.';
};

// ============================================================================
// FINISH MODE – AI SESSION SUMMARY (D-030, D-032; PLAN 5.3)
// ============================================================================

function safeShortText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  // remove control chars, keep it compact
  const cleaned = input
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 1)}…` : cleaned;
}

function getToneLabel(pillar: Pillar | null): string {
  const tone = pillar?.aiTone;
  if (tone === 'military') return 'military (krótko, bez owijki)';
  if (tone === 'raw_facts') return 'raw_facts (suche fakty, minimum emocji)';
  return 'psychoeducation (wyjaśnij mechanizm dopaminy/pseudofiniszu)';
}

function getFallbackFinishSessionSummary(params: {
  pillar: Pillar | null;
  task: Task;
  classification: FinishSessionClassification;
  userNote?: string;
}): string {
  const goalName = params.pillar?.name || 'nieznany cel';
  const goalType = (params.pillar as any)?.type || 'not set';
  const doneDef = safeShortText(params.task.definitionOfDone, 120);
  const note = safeShortText(params.userNote ?? params.classification.note, 180);

  const status = params.classification.status;
  const progress = params.task.progress;
  const isNinetyMoment = status !== 'done' && progress >= 70 && progress < 100;

  if (status === 'done') {
    return `Domknięte. Cel: "${goalName}" (${String(goalType)}). To jest realny finisz, nie pseudofinisz 90%. Zapisz jeden mały "win" i zamknij pętlę: co dokładnie doprowadziło do DONE?`;
  }

  if (status === 'stuck') {
    return `Utknięcie na finiszu w celu "${goalName}" (${String(goalType)}). ${isNinetyMoment ? 'To wygląda jak klasyczny moment 70–90% (pseudofinisz + spadek dopaminy).' : 'To jest sygnał blokady, nie lenistwa.'} Następny krok: doprecyzuj 1 brakujący warunek DONE${doneDef ? ` (${doneDef})` : ''} i zaplanuj 25 min tylko na ten element.${note ? ` Notatka: ${note}` : ''}`;
  }

  // in_progress
  return `W trakcie w celu "${goalName}" (${String(goalType)}). ${isNinetyMoment ? 'Uważaj na pseudofinisz przy 70–90%: mózg już chce nagrody.' : 'Trzymaj momentum.'} Następny krok: zapisz jeden konkretny mikro-krok na dziś i wróć do Finish Mode po jego domknięciu.${note ? ` Notatka: ${note}` : ''}`;
}

export async function generateFinishSessionSummary(params: {
  pillar: Pillar | null;
  task: Task;
  classification: FinishSessionClassification;
  userNote?: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
}): Promise<string> {
  try {
    const prompt = buildFinishSessionSummaryPrompt({
      pillar: params.pillar,
      task: params.task,
      classification: params.classification,
      userNote: params.userNote,
      sessionStartTime: params.sessionStartTime,
      sessionEndTime: params.sessionEndTime,
    });

    const summary = await ollamaGenerateText(
      { prompt, temperature: 0.6, topP: 0.9, numPredict: 180, maxLen: 420 },
      { timeoutMs: 12_000 }
    );

    if (!summary) {
      return getFallbackFinishSessionSummary({
        pillar: params.pillar,
        task: params.task,
        classification: params.classification,
        userNote: params.userNote,
      });
    }

    return summary;
  } catch (error) {
    console.warn('Finish summary AI failed, using fallback:', error);
    return getFallbackFinishSessionSummary({
      pillar: params.pillar,
      task: params.task,
      classification: params.classification,
      userNote: params.userNote,
    });
  }
}

// ============================================================================
// IMPLEMENTATION INTENTIONS SYSTEM
// ============================================================================

/**
 * Aktywacja Implementation Intention dla zadania
 */
export const activateImplementationIntention = (task: Task): string => {
  if (!task.implementationIntention?.active) {
    return 'Brak aktywnej Implementation Intention';
  }

  const { trigger, action } = task.implementationIntention;

  return `Jeśli ${trigger}, wtedy ${action}`;
};

/**
 * Sugestie Implementation Intentions
 */
export const getImplementationIntentionSuggestions = (): Array<{
  trigger: string;
  action: string;
}> => [
  {
    trigger: 'poczuję, że zadanie jest prawie gotowe',
    action: 'sprawdzę wszystkie kryteria DONE i uzupełnię brakujące',
  },
  {
    trigger: 'zechcę odłożyć zadanie na później',
    action: 'zrobię jeden mały krok (5 minut) natychmiast',
  },
  {
    trigger: 'usłyszę dzwonek telefonu',
    action: 'przypomnę sobie o wykonaniu jednego mikro-kroku',
  },
  {
    trigger: 'otworzę przeglądarkę',
    action: 'sprawdzę postęp w aplikacji i wykonam jeden krok',
  },
];

// ============================================================================
// PILLAR-LEVEL INSIGHTS
// ============================================================================

/**
 * Analiza całego projektu (pillar)
 */
export const analyzePillarProgression = (
  pillar: Pillar
): {
  completionRate: number;
  stuckTasksCount: number;
  averageCompletionTime: number;
  healthScore: number; // 0-100, gdzie 100 = zdrowy projekt
} => {
  const tasks = pillar.tasks;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.progress === 100).length;
  const stuckTasks = tasks.filter((t) => t.progress >= 90 && t.progress < 100).length;

  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Średni czas ukończenia (w dniach)
  const completedWithTime = tasks.filter((t) => t.completedAt && t.createdAt);
  const averageCompletionTime =
    completedWithTime.length > 0
      ? completedWithTime.reduce((acc, task) => {
          const created = new Date(task.createdAt!);
          const completed = new Date(task.completedAt!);
          const days = (completed.getTime() - created.getTime()) / (1000 * 3600 * 24);
          return acc + days;
        }, 0) / completedWithTime.length
      : 0;

  // Health score: wyższa completion rate + mniej stuck tasks = lepszy score
  const healthScore = Math.max(
    0,
    Math.min(100, completionRate - stuckTasks * 10 + (averageCompletionTime < 7 ? 20 : 0))
  );

  return {
    completionRate,
    stuckTasksCount: stuckTasks,
    averageCompletionTime,
    healthScore,
  };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formatowanie czasu w czytelny sposób
 */
export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

  if (diffDays === 0) return 'dzisiaj';
  if (diffDays === 1) return 'wczoraj';
  if (diffDays < 7) return `${diffDays} dni temu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tygodni temu`;
  return `${Math.floor(diffDays / 30)} miesięcy temu`;
};

/**
 * Generowanie raportu tygodniowego progresu
 */
export const generateWeeklyProgressReport = (
  pillars: Pillar[]
): {
  totalTasks: number;
  completedThisWeek: number;
  stuckTasks: number;
  topPerformer: Pillar | null;
  needsAttention: Pillar[];
} => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  let totalTasks = 0;
  let completedThisWeek = 0;
  let stuckTasks = 0;
  let topPerformer: Pillar | null = null;
  let maxCompletionRate = 0;
  const needsAttention: Pillar[] = [];

  pillars.forEach((pillar) => {
    totalTasks += pillar.tasks.length;

    // Tasks completed this week
    const completedThisWeekTasks = pillar.tasks.filter(
      (task) => task.completedAt && new Date(task.completedAt) > weekAgo
    );
    completedThisWeek += completedThisWeekTasks.length;

    // Stuck tasks
    const pillarStuckTasks = pillar.tasks.filter(
      (task) => task.progress >= 90 && task.progress < 100
    );
    stuckTasks += pillarStuckTasks.length;

    // Completion rate for top performer
    const completionRate =
      pillar.tasks.length > 0
        ? (pillar.tasks.filter((t) => t.progress === 100).length / pillar.tasks.length) * 100
        : 0;

    if (completionRate > maxCompletionRate) {
      maxCompletionRate = completionRate;
      topPerformer = pillar;
    }

    // Projects needing attention
    if (pillarStuckTasks.length > 0 || completionRate < 30) {
      needsAttention.push(pillar);
    }
  });

  return {
    totalTasks,
    completedThisWeek,
    stuckTasks,
    topPerformer,
    needsAttention,
  };
};
