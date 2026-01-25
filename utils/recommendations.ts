import type { FinishSession, Pillar, Task } from '../types';
import { STUCK_PROGRESS_MAX, STUCK_PROGRESS_MIN, STUCK_THRESHOLD_DAYS } from './config';

export type FinishRecommendation = {
  taskId: number;
  taskName: string;
  taskProgress: number;
  pillarId: number;
  pillarName: string;
  score: number;
  reasons: string[];
};

function safeDaysSince(iso: string | undefined | null, now: Date): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / (1000 * 60 * 60 * 24)));
}

function detectStuckAt90(task: Task, now: Date): { isStuck90: boolean; daysSinceUpdate: number } {
  const daysSinceUpdate = safeDaysSince(task.lastProgressUpdate || task.createdAt, now);
  const inRange = task.progress >= STUCK_PROGRESS_MIN && task.progress <= STUCK_PROGRESS_MAX;
  return { isStuck90: inRange && daysSinceUpdate > STUCK_THRESHOLD_DAYS, daysSinceUpdate };
}

function getPillarType(pillar: Pillar): 'main' | 'secondary' | 'lab' | 'unknown' {
  const t = (pillar as any)?.type;
  if (t === 'main' || t === 'secondary' || t === 'lab') return t;
  return 'unknown';
}

function countFinishModeAttempts(params: {
  sessions: FinishSession[];
  taskId: number;
}): { attempts: number; lastAttemptAt: string | null } {
  const list = Array.isArray(params.sessions) ? params.sessions : [];
  const forTask = list.filter((s) => Number(s.taskId) === params.taskId);
  if (forTask.length === 0) return { attempts: 0, lastAttemptAt: null };

  const ended = forTask.filter((s) => s.status !== 'in_progress' && s.endTime);
  const attempts = ended.length;
  const last = ended[ended.length - 1];
  const lastAttemptAt = typeof last?.endTime === 'string' ? last.endTime : null;
  return { attempts, lastAttemptAt };
}

function scoreTask(params: {
  task: Task;
  pillar: Pillar;
  sessions: FinishSession[];
  now: Date;
}): { score: number; reasons: string[] } {
  const { task, pillar, sessions, now } = params;
  const reasons: string[] = [];

  // Exclude done tasks
  if (task.progress >= 100 || task.status === 'done') {
    return { score: -Infinity, reasons: [] };
  }

  const { isStuck90, daysSinceUpdate } = detectStuckAt90(task, now);
  const pillarType = getPillarType(pillar);
  const { attempts, lastAttemptAt } = countFinishModeAttempts({ sessions, taskId: task.id });
  const ageDays = safeDaysSince(task.createdAt, now);

  let score = 0;

  // 1) stuck at 90% gets top priority
  if (task.stuckAtNinety || isStuck90) {
    score += 120;
    reasons.push(`stuck@90 (${task.progress}%, ${daysSinceUpdate}d bez progresu)`);
  }

  // 2) high impact: main goal
  if (pillarType === 'main') {
    score += 70;
    reasons.push('main goal');
  }

  // 3) long delayed / procrastination
  if (daysSinceUpdate >= 7) {
    score += Math.min(35, daysSinceUpdate * 2);
    reasons.push(`odwlekane (${daysSinceUpdate}d bez update)`);
  }
  if (ageDays >= 14) {
    score += 10;
    reasons.push(`stare zadanie (${ageDays}d)`);
  }

  if (attempts >= 2) {
    score += 15 + attempts * 4;
    reasons.push(`próby Finish Mode: ${attempts}${lastAttemptAt ? ` (ostatnia: ${lastAttemptAt.slice(0, 10)})` : ''}`);
  }

  // Prefer finishing tasks & higher priority
  if (task.type === 'close') {
    score += 12;
    reasons.push('typ: close');
  }

  if (task.priority === 'critical') {
    score += 25;
    reasons.push('priority: critical');
  } else if (task.priority === 'high') {
    score += 15;
    reasons.push('priority: high');
  }

  // Favor near-completion tasks, but avoid recommending brand new 0–30% tasks as "finish"
  if (task.progress >= 80 && task.progress < 100) score += 10;
  if (task.progress < 40) score -= 25;

  // Ensure something sensible
  if (score <= 0) {
    return { score: -Infinity, reasons: [] };
  }

  return { score, reasons: reasons.slice(0, 4) };
}

export function getTodaysFinishRecommendations(params: {
  pillars: Pillar[];
  finishSessionsHistory?: FinishSession[] | null;
  limit?: number;
  now?: Date;
}): FinishRecommendation[] {
  const pillars = Array.isArray(params.pillars) ? params.pillars : [];
  const sessions = Array.isArray(params.finishSessionsHistory) ? params.finishSessionsHistory : [];
  const now = params.now ?? new Date();
  const limit = Math.max(1, Math.min(8, Number(params.limit ?? 5)));

  const recs: FinishRecommendation[] = [];

  for (const pillar of pillars) {
    if (!pillar || (pillar as any).status === 'done') continue;
    const tasks = Array.isArray((pillar as any).tasks) ? ((pillar as any).tasks as Task[]) : [];
    for (const task of tasks) {
      const { score, reasons } = scoreTask({ task, pillar, sessions, now });
      if (!Number.isFinite(score)) continue;
      recs.push({
        taskId: task.id,
        taskName: task.name,
        taskProgress: task.progress,
        pillarId: (pillar as any).id,
        pillarName: (pillar as any).name,
        score,
        reasons,
      });
    }
  }

  return recs.sort((a, b) => b.score - a.score).slice(0, limit);
}

