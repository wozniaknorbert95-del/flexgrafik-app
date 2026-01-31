import type { AppData, Declaration, EveningProtocol, FinishSession } from '../types';

export type WeeklyStatsDay = {
  dateIso: string; // YYYY-MM-DD (local)
  focusMinutes: number;
  finishSessionsCompleted: number;
};

export type WeeklyDeclarationStats = {
  total: number;
  completed: number;
  cancelled: number;
  missed: number;
  planned: number;
};

export type WeeklyStats = {
  weekStartIso: string;
  days: WeeklyStatsDay[];
  totalFocusMinutes: number;
  totalFinishSessionsCompleted: number;
  declarations: WeeklyDeclarationStats;
};

function isValidIsoDateTime(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(new Date(value).getTime());
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoLocalDateKey(iso: string): Date | null {
  const m = String(iso || '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d, 12, 0, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function addDays(d: Date, days: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

function computeWeekDateSet(weekStartIso: string): { days: string[]; set: Set<string> } {
  const base = parseIsoLocalDateKey(weekStartIso);
  if (!base) return { days: [], set: new Set() };
  const days: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    days.push(toLocalDateKey(addDays(base, i)));
  }
  return { days, set: new Set(days) };
}

function computeFinishSessions(
  appData: AppData,
  weekStartIso: string
): { days: WeeklyStatsDay[]; totalMinutes: number; totalCount: number } {
  const { days: dayList, set } = computeWeekDateSet(weekStartIso);
  const map = new Map<string, WeeklyStatsDay>();
  for (const iso of dayList) {
    map.set(iso, { dateIso: iso, focusMinutes: 0, finishSessionsCompleted: 0 });
  }

  const sessions: FinishSession[] = appData.finishSessionsHistory ?? [];
  let totalMinutes = 0;
  let totalCount = 0;

  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    if (!isValidIsoDateTime(s.startTime) || !isValidIsoDateTime(s.endTime)) continue;
    const start = new Date(s.startTime).getTime();
    const end = new Date(s.endTime).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;

    const endedAt = new Date(s.endTime);
    const dayKey = toLocalDateKey(endedAt);
    if (!set.has(dayKey)) continue;

    const minutes = Math.max(0, Math.round((end - start) / 60000));
    const slot = map.get(dayKey);
    if (!slot) continue;
    slot.focusMinutes += minutes;
    slot.finishSessionsCompleted += 1;
    map.set(dayKey, slot);

    totalMinutes += minutes;
    totalCount += 1;
  }

  return { days: dayList.map((k) => map.get(k)!).filter(Boolean), totalMinutes, totalCount };
}

function computeDeclarationStats(appData: AppData, weekStartIso: string): WeeklyDeclarationStats {
  const { set } = computeWeekDateSet(weekStartIso);
  const todayIso = toLocalDateKey(new Date());

  const protocols: EveningProtocol[] = appData.eveningProtocols ?? [];
  const protocolDateById = new Map<string, string>();
  for (const p of protocols) {
    if (!p || typeof p.id !== 'string') continue;
    if (typeof p.targetDate !== 'string') continue;
    protocolDateById.set(p.id, String(p.targetDate).slice(0, 10));
  }

  const declarations: Declaration[] = appData.declarations ?? [];

  const stats: WeeklyDeclarationStats = {
    total: 0,
    completed: 0,
    cancelled: 0,
    missed: 0,
    planned: 0,
  };

  for (const d of declarations) {
    const protocolDate = protocolDateById.get(String((d as any)?.protocolId ?? ''));
    if (!protocolDate) continue;
    if (!set.has(protocolDate)) continue;

    stats.total += 1;

    const status = String((d as any)?.status ?? '');
    if (status === 'cancelled') {
      stats.cancelled += 1;
      continue;
    }

    if ((d as any)?.completedAt || status === 'completed') {
      stats.completed += 1;
      continue;
    }

    if ((d as any)?.failedAt || status === 'failed') {
      stats.missed += 1;
      continue;
    }

    // Derived: if the day is in the past and nothing resolved => treat as missed.
    if (protocolDate < todayIso) {
      stats.missed += 1;
      continue;
    }

    stats.planned += 1;
  }

  return stats;
}

export function computeWeeklyStats(appData: AppData, weekStartIso: string): WeeklyStats {
  const { days, totalMinutes, totalCount } = computeFinishSessions(appData, weekStartIso);
  const decl = computeDeclarationStats(appData, weekStartIso);

  return {
    weekStartIso,
    days,
    totalFocusMinutes: totalMinutes,
    totalFinishSessionsCompleted: totalCount,
    declarations: decl,
  };
}
