import type { AppData, FinishSession } from '../types';

export type BasicStats = {
  finishSessionsLast7DaysCount: number;
  finishSessionsLast7DaysTotalMinutes: number;
  finishSessionsLast7DaysAvgMinutes: number;
  finishSessionsLast7DaysMedianMinutes: number;
  finishSessionsLast7DaysUniqueTasks: number;

  // Main goal streak (PLAN 5.7 / D-003): consecutive days up to today
  mainGoalStreakDays: number;

  // Optional: relies on Task.completedAt being meaningful
  tasksCompletedLast7DaysCount?: number;

  // Future extensions (scaffolding only):
  // Stuck -> Done conversion rate (Finish Mode classifications, last 7 days)
  stuckTasksClassifiedLast7DaysCount?: number; // unique tasks classified as stuck in last 7d
  stuckToInProgressLast7DaysCount?: number; // unique tasks that moved stuck -> in_progress in last 7d
  stuckToDoneLast7DaysCount?: number; // unique tasks that moved stuck -> done in last 7d
  stuckToDoneRateLast7Days?: number; // 0..1 (stuck->done / stuck tasks in last 7d)
  // TODO(PLAN 5.7): expand streak definition beyond Finish Mode sessions (e.g. other daily activity).
};

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(new Date(value).getTime());
}

function withinLastDays(iso: string, days: number, nowMs: number): boolean {
  const t = new Date(iso).getTime();
  const windowMs = days * 24 * 60 * 60 * 1000;
  return nowMs - t >= 0 && nowMs - t <= windowMs;
}

function getCompletedSessionsLast7Days(sessions: FinishSession[], nowMs: number): FinishSession[] {
  return sessions.filter((s) => {
    return (
      s.status === 'completed' && isValidDate(s.endTime) && withinLastDays(s.endTime, 7, nowMs)
    );
  });
}

function computeStuckResolutionLast7Days(completedLast7: FinishSession[]): {
  stuckTasksClassifiedLast7DaysCount: number;
  stuckToInProgressLast7DaysCount: number;
  stuckToDoneLast7DaysCount: number;
  stuckToDoneRateLast7Days: number;
} {
  const byTask = new Map<
    number,
    Array<{ endMs: number; status: 'done' | 'in_progress' | 'stuck' }>
  >();

  for (const s of completedLast7) {
    const taskId = Number(s.taskId);
    if (!Number.isFinite(taskId)) continue;
    const endMs = typeof s.endTime === 'string' ? new Date(s.endTime).getTime() : NaN;
    if (!Number.isFinite(endMs)) continue;

    const classificationStatus = (s as any).classification?.status as
      | 'done'
      | 'in_progress'
      | 'stuck'
      | undefined;
    if (!classificationStatus) continue;

    const list = byTask.get(taskId) ?? [];
    list.push({ endMs, status: classificationStatus });
    byTask.set(taskId, list);
  }

  const stuckTaskIds = new Set<number>();
  const stuckToInProgressTaskIds = new Set<number>();
  const stuckToDoneTaskIds = new Set<number>();

  for (const [taskId, events] of byTask.entries()) {
    events.sort((a, b) => a.endMs - b.endMs);

    let sawStuck = false;
    for (const e of events) {
      if (e.status === 'stuck') {
        sawStuck = true;
        stuckTaskIds.add(taskId);
        continue;
      }

      if (!sawStuck) continue;

      if (e.status === 'in_progress') {
        stuckToInProgressTaskIds.add(taskId);
        continue;
      }

      if (e.status === 'done') {
        stuckToDoneTaskIds.add(taskId);
        // once done, consider this task "resolved" for this window
        break;
      }
    }
  }

  const denom = stuckTaskIds.size;
  const rate = denom > 0 ? stuckToDoneTaskIds.size / denom : 0;

  return {
    stuckTasksClassifiedLast7DaysCount: denom,
    stuckToInProgressLast7DaysCount: stuckToInProgressTaskIds.size,
    stuckToDoneLast7DaysCount: stuckToDoneTaskIds.size,
    stuckToDoneRateLast7Days: rate,
  };
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function computeMainGoalStreakDays(appData: AppData, now: Date): number {
  const pillars = appData.pillars ?? [];
  const mainPillarIds = new Set<number>(
    pillars.filter((p: any) => p?.type === 'main').map((p) => p.id)
  );

  if (mainPillarIds.size === 0) return 0;

  const sessions: FinishSession[] = appData.finishSessionsHistory ?? [];
  const daySet = new Set<string>();

  // Definition (MVP): a day counts if at least one Finish Mode session was completed
  // for any goal of type "main" (PLAN 5.7 / D-003).
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    if (!mainPillarIds.has(s.pillarId)) continue;
    if (!isValidDate(s.endTime)) continue;

    const endedAt = new Date(s.endTime);
    if (Number.isNaN(endedAt.getTime())) continue;
    daySet.add(toLocalDateKey(endedAt));
  }

  let streak = 0;
  const cursor = new Date(now);
  // Count consecutive local days ending "today"
  while (daySet.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeBasicStats(appData: AppData, now: Date = new Date()): BasicStats {
  const nowMs = now.getTime();

  const sessions: FinishSession[] = appData.finishSessionsHistory ?? [];

  const completedLast7 = getCompletedSessionsLast7Days(sessions, nowMs);

  const durationMsList: number[] = [];
  for (const s of completedLast7) {
    if (!isValidDate(s.startTime) || !isValidDate(s.endTime)) continue;
    const start = new Date(s.startTime).getTime();
    const end = new Date(s.endTime).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) continue;
    durationMsList.push(end - start);
  }

  const durationsMinutes = durationMsList.map((ms) => ms / 60000);
  const totalMs = durationMsList.reduce((acc, ms) => acc + ms, 0);

  const finishSessionsLast7DaysTotalMinutes = Math.round(totalMs / 60000);
  const finishSessionsLast7DaysAvgMinutes =
    durationsMinutes.length > 0
      ? durationsMinutes.reduce((acc, m) => acc + m, 0) / durationsMinutes.length
      : 0;
  // Median is resilient to a few extremely long sessions (less "skewed" than average).
  const finishSessionsLast7DaysMedianMinutes = computeMedian(durationsMinutes);
  const finishSessionsLast7DaysUniqueTasks = new Set(completedLast7.map((s) => s.taskId)).size;
  const mainGoalStreakDays = computeMainGoalStreakDays(appData, now);

  // Optional task completion metric (if completedAt exists in data)
  // TODO(PLAN 5.7 / BACKLOG stats): ensure `completedAt` reflects *actual* completion time.
  // Some migrations may synthesize `completedAt` which can inflate "last 7 days" counts.
  const allTasks = (appData.pillars || []).flatMap((p) => p.tasks || []);
  const tasksCompletedLast7DaysCount = allTasks.filter(
    (t) => isValidDate(t.completedAt) && withinLastDays(t.completedAt, 7, nowMs)
  ).length;

  const stuckResolution = computeStuckResolutionLast7Days(completedLast7);

  return {
    finishSessionsLast7DaysCount: completedLast7.length,
    finishSessionsLast7DaysTotalMinutes,
    finishSessionsLast7DaysAvgMinutes,
    finishSessionsLast7DaysMedianMinutes,
    finishSessionsLast7DaysUniqueTasks,
    mainGoalStreakDays,
    tasksCompletedLast7DaysCount,
    ...stuckResolution,
  };
}
