import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { CalendarEntry, Declaration, EveningProtocol, SharedCalendar } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { showError, showInfo, showSuccess } from '../utils/toastService';
import { generateUUID } from '../utils/uuid';

type EntryType = CalendarEntry['type'];

const WEEKDAY_SHORT_PL = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
const PROTOCOL_TARGET_DATE_STORAGE_KEY = 'fg_protocol_target_date';
const WEEK_REVIEW_WEEK_START_STORAGE_KEY = 'fg_weekly_review_week_start';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDayLabel(date: Date): string {
  const weekday = WEEKDAY_SHORT_PL[(date.getDay() + 6) % 7] || '';
  return `${weekday} ${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}`;
}

function toIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function startOfWeekMonday(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday=0
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

function addDays(d: Date, days: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

function parseTimeHHMM(value: string): { h: number; m: number } | null {
  const m = String(value || '')
    .trim()
    .match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return { h, m: mm };
}

function localDateTimeToIso(dateIso: string, timeHHMM: string): string | null {
  const m = String(dateIso || '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = parseTimeHHMM(timeHHMM);
  if (!m || !t) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d, t.h, t.m, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function createEntryId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      return (crypto as any).randomUUID();
    }
  } catch {
    // ignore
  }
  return `cal_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function ensureCalendar(raw: any): SharedCalendar {
  const base: SharedCalendar = {
    entries: [],
    defaultWorkingHours: { start: '09:00', end: '18:00' },
    blockedDays: [],
  };
  if (!raw || typeof raw !== 'object') return base;
  return {
    entries: Array.isArray(raw.entries) ? raw.entries : [],
    defaultWorkingHours:
      raw.defaultWorkingHours &&
      typeof raw.defaultWorkingHours === 'object' &&
      typeof raw.defaultWorkingHours.start === 'string' &&
      typeof raw.defaultWorkingHours.end === 'string'
        ? { start: raw.defaultWorkingHours.start, end: raw.defaultWorkingHours.end }
        : base.defaultWorkingHours,
    blockedDays: Array.isArray(raw.blockedDays) ? raw.blockedDays : [],
  };
}

function computeFreeSlotsForDay(params: {
  day: Date;
  calendar: SharedCalendar;
  minMinutes?: number;
}): Array<{ startIso: string; endIso: string; minutes: number }> {
  const minMinutes = Math.max(10, Math.floor(Number(params.minMinutes ?? 30)) || 30);
  const dayIso = toIsoDateLocal(params.day);

  if (params.calendar.blockedDays.includes(dayIso)) return [];

  const whStart = parseTimeHHMM(params.calendar.defaultWorkingHours?.start || '09:00') ?? {
    h: 9,
    m: 0,
  };
  const whEnd = parseTimeHHMM(params.calendar.defaultWorkingHours?.end || '18:00') ?? {
    h: 18,
    m: 0,
  };
  const start = new Date(
    params.day.getFullYear(),
    params.day.getMonth(),
    params.day.getDate(),
    whStart.h,
    whStart.m,
    0,
    0
  );
  const end = new Date(
    params.day.getFullYear(),
    params.day.getMonth(),
    params.day.getDate(),
    whEnd.h,
    whEnd.m,
    0,
    0
  );
  if (end.getTime() <= start.getTime()) return [];

  const entries = (params.calendar.entries || [])
    .filter((e) => e && typeof e.startTime === 'string' && typeof e.endTime === 'string')
    .filter((e) => {
      const st = new Date(e.startTime);
      const et = new Date(e.endTime);
      if (Number.isNaN(st.getTime()) || Number.isNaN(et.getTime())) return false;
      return et.getTime() > start.getTime() && st.getTime() < end.getTime();
    })
    .map((e) => {
      const st = new Date(e.startTime);
      const et = new Date(e.endTime);
      return {
        startMs: Math.max(start.getTime(), st.getTime()),
        endMs: Math.min(end.getTime(), et.getTime()),
      };
    })
    .filter((x) => x.endMs > x.startMs)
    .sort((a, b) => a.startMs - b.startMs);

  // Merge overlaps
  const merged: Array<{ startMs: number; endMs: number }> = [];
  for (const it of entries) {
    const last = merged[merged.length - 1];
    if (!last || it.startMs > last.endMs) {
      merged.push({ ...it });
    } else {
      last.endMs = Math.max(last.endMs, it.endMs);
    }
  }

  const slots: Array<{ startIso: string; endIso: string; minutes: number }> = [];
  let cursor = start.getTime();
  for (const block of merged) {
    const gap = block.startMs - cursor;
    const minutes = Math.floor(gap / (60 * 1000));
    if (minutes >= minMinutes) {
      slots.push({
        startIso: new Date(cursor).toISOString(),
        endIso: new Date(block.startMs).toISOString(),
        minutes,
      });
    }
    cursor = Math.max(cursor, block.endMs);
  }
  const tailGap = end.getTime() - cursor;
  const tailMinutes = Math.floor(tailGap / (60 * 1000));
  if (tailMinutes >= minMinutes) {
    slots.push({
      startIso: new Date(cursor).toISOString(),
      endIso: new Date(end).toISOString(),
      minutes: tailMinutes,
    });
  }

  return slots;
}

function pickLatestProtocolForDate(
  protocols: EveningProtocol[],
  targetDate: string
): EveningProtocol | null {
  const matches = (protocols || []).filter((p) => p && p.targetDate === targetDate);
  if (matches.length === 0) return null;
  matches.sort(
    (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
  );
  return matches[matches.length - 1] ?? null;
}

function getDeclarationBadge(
  decl: Declaration,
  dayIso: string,
  todayIso: string
): {
  label: string;
  className: string;
} {
  const status = String((decl as any)?.status ?? '');

  // Terminal/explicit first
  if (status === 'cancelled') {
    return {
      label: 'Anulowane',
      className: 'bg-white/5 border border-white/10 text-gray-300',
    };
  }

  if ((decl as any)?.completedAt || status === 'completed') {
    return {
      label: 'Dowiezione',
      className:
        'bg-[color:color-mix(in_srgb,var(--accent-success)_18%,transparent)] border border-[color:color-mix(in_srgb,var(--accent-success)_50%,transparent)] text-[var(--accent-success)]',
    };
  }

  if ((decl as any)?.failedAt || status === 'failed') {
    return {
      label: 'Nie dowiezione',
      className:
        'bg-[color:color-mix(in_srgb,var(--accent-danger)_18%,transparent)] border border-[color:color-mix(in_srgb,var(--accent-danger)_50%,transparent)] text-[var(--accent-danger)]',
    };
  }

  // Derived by date (local ISO YYYY-MM-DD compares lexicographically)
  if (dayIso < todayIso) {
    return {
      label: 'Nie dowiezione',
      className:
        'bg-[color:color-mix(in_srgb,var(--accent-danger)_18%,transparent)] border border-[color:color-mix(in_srgb,var(--accent-danger)_50%,transparent)] text-[var(--accent-danger)]',
    };
  }

  if (dayIso > todayIso) {
    return {
      label: 'Plan',
      className: 'bg-neon-cyan/10 border border-neon-cyan/25 text-neon-cyan',
    };
  }

  // Today: keep current live-ish status label
  if (status === 'in_progress') {
    return {
      label: 'W trakcie',
      className: 'bg-gold/10 border border-gold/30 text-gold',
    };
  }

  if (status === 'active') {
    return {
      label: 'Aktywne',
      className: 'bg-neon-cyan/10 border border-neon-cyan/25 text-neon-cyan',
    };
  }

  return {
    label: 'Plan',
    className: 'bg-white/5 border border-white/10 text-gray-300',
  };
}

export const CalendarPremium: React.FC = () => {
  const { data, setData, setCurrentView, setActiveProjectId, startFinishSession } = useAppContext();
  const calendar = useMemo(() => ensureCalendar((data as any)?.calendar), [data]);

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(
    () => addDays(startOfWeekMonday(new Date()), weekOffset * 7),
    [weekOffset]
  );
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const todayIso = useMemo(() => toIsoDateLocal(new Date()), []);

  const tasksById = useMemo(() => {
    const map = new Map<number, { name: string; goalId: number; goalName: string }>();
    const pillars = Array.isArray((data as any)?.pillars) ? (data as any).pillars : [];
    for (const p of pillars) {
      const goalId = Number(p?.id);
      const goalName = String(p?.name ?? '').trim();
      const tasks = Array.isArray(p?.tasks) ? p.tasks : [];
      for (const t of tasks) {
        const taskId = Number(t?.id);
        if (!Number.isFinite(taskId) || map.has(taskId)) continue;
        map.set(taskId, {
          name: String(t?.name ?? '').trim() || `Zadanie #${taskId}`,
          goalId,
          goalName,
        });
      }
    }
    return map;
  }, [data]);

  const protocolByDay = useMemo(() => {
    const protocols = Array.isArray((data as any)?.eveningProtocols)
      ? (data as any).eveningProtocols
      : [];
    const map = new Map<string, EveningProtocol | null>();
    for (const d of days) {
      const iso = toIsoDateLocal(d);
      map.set(iso, pickLatestProtocolForDate(protocols, iso));
    }
    return map;
  }, [data, days]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => toIsoDateLocal(new Date()));
  const [draftStart, setDraftStart] = useState('09:00');
  const [draftEnd, setDraftEnd] = useState('09:30');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftType, setDraftType] = useState<EntryType>('finish_session');

  const entriesByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const d of days) {
      map.set(toIsoDateLocal(d), []);
    }
    const entries = Array.isArray(calendar.entries) ? calendar.entries : [];
    for (const e of entries) {
      const st = new Date(e.startTime);
      if (Number.isNaN(st.getTime())) continue;
      const key = toIsoDateLocal(st);
      if (!map.has(key)) continue;
      map.get(key)!.push(e);
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      map.set(k, list);
    }
    return map;
  }, [calendar.entries, days]);

  const milestonesByDay = useMemo(() => {
    const map = new Map<string, Array<{ goalName: string; title: string }>>();
    for (const d of days) {
      map.set(toIsoDateLocal(d), []);
    }
    const pillars = Array.isArray((data as any)?.pillars) ? (data as any).pillars : [];
    for (const p of pillars) {
      const goalName = String(p?.name ?? '').trim();
      const milestones =
        p?.strategy && typeof p.strategy === 'object' && Array.isArray(p.strategy.milestones)
          ? p.strategy.milestones
          : [];
      for (const m of milestones) {
        const dl = typeof m?.deadline === 'string' ? String(m.deadline).trim() : '';
        if (!dl) continue;
        const d = new Date(dl);
        if (Number.isNaN(d.getTime())) {
          // Try YYYY-MM-DD
          const m2 = dl.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (!m2) continue;
          const dd = new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]), 12, 0, 0, 0);
          if (Number.isNaN(dd.getTime())) continue;
          const key = toIsoDateLocal(dd);
          if (!map.has(key)) continue;
          map.get(key)!.push({ goalName, title: String(m?.title ?? '').trim() });
          continue;
        }
        const key = toIsoDateLocal(d);
        if (!map.has(key)) continue;
        map.get(key)!.push({ goalName, title: String(m?.title ?? '').trim() });
      }
    }
    return map;
  }, [data, days]);

  const toggleBlockedDay = (dayIso: string) => {
    setData((prev) => {
      const cal = ensureCalendar((prev as any)?.calendar);
      const blocked = new Set<string>(Array.isArray(cal.blockedDays) ? cal.blockedDays : []);
      if (blocked.has(dayIso)) blocked.delete(dayIso);
      else blocked.add(dayIso);
      const next: SharedCalendar = { ...cal, blockedDays: Array.from(blocked) };
      return { ...(prev as any), calendar: next };
    });
  };

  const addEntry = () => {
    const title = draftTitle.trim();
    if (!title) {
      showError('Podaj tytuł bloku.', 4000);
      return;
    }
    const startIso = localDateTimeToIso(draftDate, draftStart);
    const endIso = localDateTimeToIso(draftDate, draftEnd);
    if (!startIso || !endIso) {
      showError('Nieprawidłowa data lub czas.', 4000);
      return;
    }
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      showError('Czas zakończenia musi być po czasie startu.', 5000);
      return;
    }

    const entry: CalendarEntry = {
      id: createEntryId(),
      type: draftType,
      startTime: startIso,
      endTime: endIso,
      title,
    };

    setData((prev) => {
      const cal = ensureCalendar((prev as any)?.calendar);
      const next: SharedCalendar = { ...cal, entries: [entry, ...(cal.entries || [])] };
      return { ...(prev as any), calendar: next };
    });

    setDraftTitle('');
    setIsAddOpen(false);
    showSuccess('Dodano blok w kalendarzu.', 3000);
  };

  const removeEntry = (entryId: string) => {
    if (!entryId) return;
    setData((prev) => {
      const cal = ensureCalendar((prev as any)?.calendar);
      const nextEntries = (cal.entries || []).filter((e) => e.id !== entryId);
      const next: SharedCalendar = { ...cal, entries: nextEntries };
      return { ...(prev as any), calendar: next };
    });
    showSuccess('Usunięto blok.', 2500);
  };

  const typeLabel = (t: EntryType): string => {
    if (t === 'finish_session') return 'Tryb Domykania';
    if (t === 'blocked') return 'Zablokowane';
    if (t === 'available') return 'Dostępne';
    return 'Deklaracja';
  };

  return (
    <div data-component="Calendar" className="min-h-screen pb-32 pt-8 px-6">
      <motion.div
        className="widget-container-narrow mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={() => setCurrentView('home')} className="btn-premium btn-cyan mb-8">
          ← Wróć
        </button>

        <div className="flex items-center gap-4 mb-3">
          <span className="text-6xl">🗓️</span>
          <h1 className="text-6xl font-extrabold uppercase tracking-wider text-gradient-gold">
            Tydzień
          </h1>
        </div>
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          /// Widok tygodnia + deklaracje + luki & deadlines
        </p>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((v) => v - 1)}
            className="btn-premium btn-cyan text-sm"
          >
            ← Poprzedni tydzień
          </button>
          <div className="text-sm text-gray-300">Tydzień od {formatDayLabel(weekStart)}</div>
          <button
            type="button"
            onClick={() => setWeekOffset((v) => v + 1)}
            className="btn-premium btn-cyan text-sm"
          >
            Następny tydzień →
          </button>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(WEEK_REVIEW_WEEK_START_STORAGE_KEY, toIsoDateLocal(weekStart));
              } catch {
                // ignore
              }
              setCurrentView('weekly_review');
            }}
            className="btn-premium btn-magenta text-sm"
          >
            Przegląd tygodnia →
          </button>
        </div>
      </motion.div>

      <motion.div
        className="widget-container-narrow mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="glass-card space-widget">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-white uppercase tracking-wider">
                Dodaj blok
              </div>
              <div className="text-xs text-gray-400">
                Zaplanuj sesję lub blok czasu (local-first).
              </div>
            </div>
            <button onClick={() => setIsAddOpen((v) => !v)} className="btn-premium btn-magenta">
              {isAddOpen ? 'Zamknij' : '➕ Dodaj'}
            </button>
          </div>

          {isAddOpen && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Data
                </label>
                <input
                  type="date"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                  className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-neon-cyan"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Typ
                </label>
                <select
                  value={draftType}
                  onChange={(e) => setDraftType(e.target.value as EntryType)}
                  className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-neon-cyan"
                >
                  <option value="finish_session">Tryb Domykania</option>
                  <option value="blocked">Zablokowane</option>
                  <option value="available">Dostępne</option>
                  <option value="declaration">Deklaracja</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Start
                </label>
                <input
                  type="time"
                  value={draftStart}
                  onChange={(e) => setDraftStart(e.target.value)}
                  className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-neon-cyan"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Koniec
                </label>
                <input
                  type="time"
                  value={draftEnd}
                  onChange={(e) => setDraftEnd(e.target.value)}
                  className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-neon-cyan"
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Tytuł
                </label>
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value.slice(0, 120))}
                  placeholder="Np. „Tryb Domykania: domknięcie oferty”"
                  className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan"
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button onClick={addEntry} className="btn-premium btn-cyan">
                  Zapisz blok
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        className="widget-container-narrow"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div className="space-y-4">
          {days.map((day) => {
            const dayIso = toIsoDateLocal(day);
            const entries = entriesByDay.get(dayIso) ?? [];
            const deadlines = milestonesByDay.get(dayIso) ?? [];
            const isBlocked = calendar.blockedDays.includes(dayIso);
            const freeSlots = computeFreeSlotsForDay({ day, calendar, minMinutes: 30 });
            const protocol = protocolByDay.get(dayIso) ?? null;

            const protocolDeclarations = (() => {
              if (!protocol) return [];
              const base = Array.isArray(protocol.declarations) ? protocol.declarations : [];
              const denorm = Array.isArray((data as any)?.declarations)
                ? ((data as any).declarations as Declaration[]).filter(
                    (d) => d?.protocolId === protocol.id
                  )
                : [];
              const denormById = new Map<string, Declaration>(denorm.map((d) => [d.id, d]));
              // overlay denormalized status (agent / in-app updates)
              return base.map((d) => denormById.get(d.id) ?? d);
            })();

            const openProtocolForDay = () => {
              try {
                if (isIsoDate(dayIso))
                  localStorage.setItem(PROTOCOL_TARGET_DATE_STORAGE_KEY, dayIso);
              } catch {
                // ignore
              }
              setCurrentView('evening_protocol');
            };

            const rolloverToTomorrow = () => {
              if (!protocol) return;
              const tomorrowIso = toIsoDateLocal(addDays(day, 1));
              const candidates = protocolDeclarations.filter((d) => {
                const status = String((d as any)?.status ?? '');
                if (status === 'cancelled') return false;
                if ((d as any)?.completedAt || status === 'completed') return false;
                // keep failed/in_progress/active/pending -> rollover allowed
                return true;
              });

              if (candidates.length === 0) {
                showInfo('Brak niedokończonych deklaracji do przeniesienia.', 3000);
                return;
              }

              // Best-effort count (dedupe by taskId if already planned for tomorrow).
              const existingTomorrowTaskIds = (() => {
                const protocols = Array.isArray((data as any)?.eveningProtocols)
                  ? (data as any).eveningProtocols
                  : [];
                const t = pickLatestProtocolForDate(protocols, tomorrowIso);
                const ids = new Set<number>();
                const decl = Array.isArray((t as any)?.declarations) ? (t as any).declarations : [];
                for (const d of decl) {
                  const taskId = Number((d as any)?.taskId);
                  if (Number.isFinite(taskId)) ids.add(taskId);
                }
                return ids;
              })();
              const dedupedCount = candidates.filter(
                (d) => !existingTomorrowTaskIds.has(Number((d as any)?.taskId))
              ).length;

              setData((prev) => {
                const prevProtocols: EveningProtocol[] = Array.isArray(
                  (prev as any)?.eveningProtocols
                )
                  ? ((prev as any).eveningProtocols as EveningProtocol[])
                  : [];

                const sourceProtocolId = String((protocol as any)?.id ?? '');
                const sourceDeclIds = new Set<string>(candidates.map((d) => d.id));

                // Cancel old "accountable" declarations to avoid penalties/guilt.
                const prevDeclarations: Declaration[] = Array.isArray((prev as any)?.declarations)
                  ? ((prev as any).declarations as Declaration[])
                  : [];
                const nextDeclarations = prevDeclarations.map((d) => {
                  if (d?.protocolId !== sourceProtocolId) return d;
                  if (!sourceDeclIds.has(d.id)) return d;
                  const status = String((d as any)?.status ?? '');
                  if (status === 'cancelled') return d;
                  if ((d as any)?.completedAt || status === 'completed') return d;
                  return { ...d, status: 'cancelled' as any };
                });

                // Find target draft protocol for tomorrow (prefer latest draft, else create new draft).
                const targetCandidates = prevProtocols.filter(
                  (p) => p && p.targetDate === tomorrowIso
                );
                targetCandidates.sort(
                  (a, b) =>
                    new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
                );
                const latest = targetCandidates[targetCandidates.length - 1] ?? null;

                let targetProtocol: EveningProtocol;
                const shouldReuseLatest = latest && latest.status === 'draft';
                if (shouldReuseLatest) {
                  targetProtocol = latest!;
                } else {
                  targetProtocol = {
                    id: generateUUID(),
                    targetDate: tomorrowIso,
                    createdAt: new Date().toISOString(),
                    completedAt: null,
                    status: 'draft',
                    declarations: [],
                    implementationIntentions: [],
                    rules: [],
                    metadata: {
                      version: 1,
                      goalIds: [],
                      totalDeclarations: 0,
                    },
                  } as EveningProtocol;
                }

                const existingTaskIds = new Set<number>(
                  (Array.isArray((targetProtocol as any)?.declarations)
                    ? (targetProtocol as any).declarations
                    : []
                  )
                    .map((d: any) => Number(d?.taskId))
                    .filter((x: number) => Number.isFinite(x))
                );

                const cloned: Declaration[] = [];
                for (const d of candidates) {
                  const taskId = Number((d as any)?.taskId);
                  if (!Number.isFinite(taskId)) continue;
                  if (existingTaskIds.has(taskId)) continue;
                  existingTaskIds.add(taskId);

                  cloned.push({
                    ...d,
                    id: generateUUID(),
                    protocolId: targetProtocol.id,
                    status: 'pending',
                    startedAt: null,
                    completedAt: null,
                    failedAt: null,
                    // keep doneCriteria + timeWindow + goalId; reset agent evaluation
                    agentEvaluation: {
                      checkedAt: null,
                      penaltyPoints: 0,
                      reason: null,
                      severity: 'none',
                    },
                    createdAt: new Date().toISOString(),
                  } as Declaration);
                }

                const nextTarget: EveningProtocol = {
                  ...targetProtocol,
                  declarations: [...(targetProtocol.declarations || []), ...cloned],
                  metadata: {
                    ...(targetProtocol as any).metadata,
                    version: (targetProtocol as any)?.metadata?.version ?? 1,
                    goalIds: Array.from(
                      new Set<number>([
                        ...(((targetProtocol as any)?.metadata?.goalIds as number[]) ?? []),
                        ...cloned
                          .map((d) => Number((d as any)?.goalId))
                          .filter((x) => Number.isFinite(x)),
                      ])
                    ),
                    totalDeclarations: (targetProtocol.declarations?.length ?? 0) + cloned.length,
                  },
                };

                const nextProtocols = (() => {
                  const list = prevProtocols.filter((p) => p && p.id !== nextTarget.id);
                  return [...list, nextTarget];
                })();

                return {
                  ...(prev as any),
                  eveningProtocols: nextProtocols,
                  declarations: nextDeclarations,
                };
              });

              showSuccess(
                dedupedCount === candidates.length
                  ? `Przeniesiono ${dedupedCount} deklaracji na jutro.`
                  : `Przeniesiono ${dedupedCount} deklaracji na jutro (pominięto duplikaty).`,
                4000
              );
              try {
                if (isIsoDate(tomorrowIso))
                  localStorage.setItem(PROTOCOL_TARGET_DATE_STORAGE_KEY, tomorrowIso);
              } catch {
                // ignore
              }
              setCurrentView('evening_protocol');
            };

            return (
              <div key={dayIso} className="glass-card space-widget border border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-white">{formatDayLabel(day)}</div>
                    <div className="text-xs text-gray-400">
                      Godziny pracy: {calendar.defaultWorkingHours.start}–
                      {calendar.defaultWorkingHours.end}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleBlockedDay(dayIso)}
                    className={`min-h-[40px] px-3 rounded-lg border text-xs font-bold uppercase tracking-wider ${
                      isBlocked
                        ? 'bg-red-500/15 border-red-500/40 text-red-200'
                        : 'bg-white/5 border-white/10 text-gray-200'
                    }`}
                  >
                    {isBlocked ? 'Zablokowany' : 'Zablokuj dzień'}
                  </button>
                </div>

                {/* Declarations (Evening Protocol) */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-gray-300 uppercase tracking-wider font-semibold">
                      Deklaracje
                    </div>
                    <div className="flex items-center gap-2">
                      {protocol && dayIso <= todayIso && (
                        <button
                          type="button"
                          onClick={rolloverToTomorrow}
                          className="min-h-[36px] px-3 rounded-lg bg-gold/10 border border-gold/25 text-gold text-[11px] font-bold uppercase tracking-wider"
                        >
                          Przenieś na jutro
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={openProtocolForDay}
                        className="min-h-[36px] px-3 rounded-lg bg-neon-magenta/10 border border-neon-magenta/25 text-neon-magenta text-[11px] font-bold uppercase tracking-wider"
                      >
                        Otwórz protokół →
                      </button>
                    </div>
                  </div>

                  {!protocol ? (
                    <div className="mt-2 text-sm text-gray-400">
                      Brak protokołu dla tego dnia. Kliknij „Otwórz protokół”, żeby zaplanować 1–3
                      deklaracje.
                    </div>
                  ) : protocolDeclarations.length === 0 ? (
                    <div className="mt-2 text-sm text-gray-400">
                      Protokół istnieje, ale nie ma deklaracji.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {protocolDeclarations.slice(0, 6).map((decl) => {
                        const taskId = Number((decl as any)?.taskId);
                        const goalId = Number((decl as any)?.goalId);
                        const meta = tasksById.get(taskId);
                        const badge = getDeclarationBadge(decl, dayIso, todayIso);
                        const timeLabel = `${String((decl as any)?.timeWindow?.start ?? '—')}–${String(
                          (decl as any)?.timeWindow?.end ?? '—'
                        )}`;

                        return (
                          <div
                            key={decl.id}
                            className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="text-sm text-white font-semibold break-words">
                                  {meta?.name ?? `Zadanie #${taskId}`}
                                </div>
                                <span
                                  className={`text-[11px] px-2 py-1 rounded border ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {meta?.goalName ? `${meta.goalName} • ` : ''}
                                {timeLabel}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const resolvedGoalId = Number.isFinite(meta?.goalId)
                                  ? meta!.goalId
                                  : goalId;
                                if (!Number.isFinite(taskId) || !Number.isFinite(resolvedGoalId)) {
                                  showError(
                                    'Nie mogę uruchomić Domykania: brak celu lub zadania.',
                                    5000
                                  );
                                  return;
                                }
                                setActiveProjectId(resolvedGoalId);
                                setCurrentView('finish');
                                try {
                                  startFinishSession(taskId, resolvedGoalId);
                                  showInfo(
                                    'Start: Tryb Domykania uruchomiony dla deklaracji.',
                                    2500
                                  );
                                } catch {
                                  // ignore
                                }
                              }}
                              className="min-h-[40px] px-3 rounded-lg bg-gold/10 border border-gold/25 text-gold text-[11px] font-bold uppercase tracking-wider"
                            >
                              Domykanie →
                            </button>
                          </div>
                        );
                      })}
                      {protocolDeclarations.length > 6 && (
                        <div className="text-xs text-gray-500">
                          Pokazuję 6 z {protocolDeclarations.length} deklaracji.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {deadlines.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {deadlines.slice(0, 6).map((d, idx) => (
                      <span
                        key={`${dayIso}_${idx}_${d.title}`}
                        className="text-[11px] px-2 py-1 rounded border border-gold/30 bg-gold/10 text-gold"
                      >
                        Deadline: {d.goalName ? `${d.goalName} — ` : ''}
                        {d.title || 'milestone'}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {entries.length === 0 ? (
                    <div className="text-sm text-gray-400">
                      {isBlocked ? 'Dzień zablokowany — brak planowanych bloków.' : 'Brak bloków.'}
                    </div>
                  ) : (
                    entries.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white font-semibold break-words">
                            {e.title}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatTime(e.startTime)}–{formatTime(e.endTime)} • {typeLabel(e.type)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeEntry(e.id)}
                          className="min-h-[40px] px-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs font-bold"
                        >
                          Usuń
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {!isBlocked && freeSlots.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="text-[11px] text-gray-300 uppercase tracking-wider font-semibold mb-2">
                      Luki (≥ 30 min)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {freeSlots.slice(0, 6).map((s) => (
                        <span
                          key={`${dayIso}_${s.startIso}_${s.endIso}`}
                          className="text-[11px] px-2 py-1 rounded border border-neon-cyan/25 bg-neon-cyan/10 text-neon-cyan"
                        >
                          {formatTime(s.startIso)}–{formatTime(s.endIso)} ({s.minutes} min)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(CalendarPremium);
