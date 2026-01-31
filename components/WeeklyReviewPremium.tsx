import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { WeeklyReview } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { showError, showSuccess } from '../utils/toastService';
import { generateUUID } from '../utils/uuid';
import { computeWeeklyStats } from '../utils/weeklyStats';

const WEEKDAY_SHORT_PL = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
const WEEK_REVIEW_WEEK_START_STORAGE_KEY = 'fg_weekly_review_week_start';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
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

function formatDayLabel(date: Date): string {
  const weekday = WEEKDAY_SHORT_PL[(date.getDay() + 6) % 7] || '';
  return `${weekday} ${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}`;
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

function pickLatestWeeklyReview(reviews: WeeklyReview[], weekStart: string): WeeklyReview | null {
  const list = (reviews || []).filter((r) => r && r.weekStart === weekStart);
  if (list.length === 0) return null;
  list.sort(
    (a, b) =>
      new Date(a.updatedAt ?? a.createdAt ?? 0).getTime() -
      new Date(b.updatedAt ?? b.createdAt ?? 0).getTime()
  );
  return list[list.length - 1] ?? null;
}

function createEmptyReview(weekStart: string): WeeklyReview {
  const now = new Date().toISOString();
  return {
    id: generateUUID(),
    weekStart,
    createdAt: now,
    updatedAt: now,
    wentWell: '',
    improve: '',
    decision: '',
  };
}

export const WeeklyReviewPremium: React.FC = () => {
  const { data, setData, setCurrentView } = useAppContext();

  const initialWeekOffset = useMemo(() => {
    try {
      const stored = localStorage.getItem(WEEK_REVIEW_WEEK_START_STORAGE_KEY);
      if (!stored) return 0;
      const storedDate = parseIsoLocalDateKey(stored);
      if (!storedDate) return 0;
      const currentStart = startOfWeekMonday(new Date());
      const diffDays = Math.round(
        (startOfWeekMonday(storedDate).getTime() - currentStart.getTime()) / (24 * 60 * 60 * 1000)
      );
      if (!Number.isFinite(diffDays)) return 0;
      return Math.round(diffDays / 7);
    } catch {
      return 0;
    }
  }, []);

  const [weekOffset, setWeekOffset] = useState<number>(initialWeekOffset);
  const weekStart = useMemo(
    () => addDays(startOfWeekMonday(new Date()), weekOffset * 7),
    [weekOffset]
  );
  const weekStartIso = useMemo(() => toIsoDateLocal(weekStart), [weekStart]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  useEffect(() => {
    try {
      localStorage.setItem(WEEK_REVIEW_WEEK_START_STORAGE_KEY, weekStartIso);
    } catch {
      // ignore
    }
  }, [weekStartIso]);

  const existing = useMemo(() => {
    const reviews = Array.isArray((data as any)?.weeklyReviews)
      ? ((data as any).weeklyReviews as WeeklyReview[])
      : [];
    return pickLatestWeeklyReview(reviews, weekStartIso);
  }, [data, weekStartIso]);

  const weeklyStats = useMemo(() => {
    return computeWeeklyStats(data as any, weekStartIso);
  }, [data, weekStartIso]);
  const maxDayMinutes = useMemo(() => {
    const list = weeklyStats.days.map((d) => Number(d.focusMinutes) || 0);
    const max = Math.max(0, ...list);
    return max > 0 ? max : 1;
  }, [weeklyStats.days]);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<WeeklyReview>(
    () => existing ?? createEmptyReview(weekStartIso)
  );

  useEffect(() => {
    setDraft(existing ?? createEmptyReview(weekStartIso));
    setStep(0);
  }, [existing?.id, weekStartIso]);

  const canSave = useMemo(() => {
    return Boolean(draft.wentWell.trim() || draft.improve.trim() || draft.decision.trim());
  }, [draft.decision, draft.improve, draft.wentWell]);

  const save = () => {
    if (!canSave) {
      showError('Wpisz chociaż 1 zdanie (bez spiny).', 4000);
      return;
    }

    const now = new Date().toISOString();
    const next: WeeklyReview = {
      ...draft,
      weekStart: weekStartIso,
      createdAt: draft.createdAt || now,
      updatedAt: now,
    };

    setData((prev) => {
      const list: WeeklyReview[] = Array.isArray((prev as any)?.weeklyReviews)
        ? ((prev as any).weeklyReviews as WeeklyReview[])
        : [];
      // One review per week: replace by weekStart.
      const filtered = list.filter((r) => r && r.weekStart !== weekStartIso);
      return { ...(prev as any), weeklyReviews: [...filtered, next] };
    });

    showSuccess('Zapisano przegląd tygodnia.', 2500);
  };

  const stepTitle = (idx: number): string => {
    if (idx === 0) return 'Co poszło dobrze?';
    if (idx === 1) return 'Co poprawić?';
    if (idx === 2) return '1 decyzja na następny tydzień';
    return 'Podsumowanie';
  };

  return (
    <div data-component="WeeklyReview" className="min-h-screen pb-32 pt-8 px-6">
      <motion.div
        className="widget-container-narrow mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={() => setCurrentView('sprint')} className="btn-premium btn-cyan mb-8">
          ← Wróć
        </button>

        <div className="flex items-center gap-4 mb-3">
          <span className="text-6xl">🧾</span>
          <h1 className="text-5xl md:text-6xl font-extrabold uppercase tracking-wider text-gradient-gold">
            Przegląd tygodnia
          </h1>
        </div>
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          /// Zamknij tydzień bez poczucia winy
        </p>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((v) => v - 1)}
            className="btn-premium btn-cyan text-sm"
          >
            ← Poprzedni tydzień
          </button>
          <div className="text-sm text-gray-300 text-center">
            Tydzień: {formatDayLabel(weekStart)} – {formatDayLabel(weekEnd)}
          </div>
          <button
            type="button"
            onClick={() => setWeekOffset((v) => v + 1)}
            className="btn-premium btn-cyan text-sm"
          >
            Następny tydzień →
          </button>
        </div>
      </motion.div>

      <motion.div
        className="widget-container-narrow"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="glass-card space-widget border border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                Krok {Math.min(step + 1, 4)}/4
              </div>
              <div className="text-xl font-bold text-white mt-1">{stepTitle(step)}</div>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className={[
                'min-h-[44px] px-4 rounded-lg border text-sm font-bold uppercase tracking-wider',
                canSave
                  ? 'bg-neon-cyan/15 border-neon-cyan/40 text-neon-cyan'
                  : 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed',
              ].join(' ')}
            >
              Zapisz
            </button>
          </div>

          <div className="mt-4">
            {step === 0 && (
              <textarea
                value={draft.wentWell}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, wentWell: e.target.value.slice(0, 1600) }))
                }
                className="w-full min-h-[180px] px-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan"
                placeholder="3–7 bulletów też może być. Nawet małe rzeczy się liczą."
              />
            )}

            {step === 1 && (
              <textarea
                value={draft.improve}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, improve: e.target.value.slice(0, 1600) }))
                }
                className="w-full min-h-[180px] px-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan"
                placeholder="Bez samobiczowania. Jedno zdanie: co zmienić, żeby było łatwiej."
              />
            )}

            {step === 2 && (
              <textarea
                value={draft.decision}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, decision: e.target.value.slice(0, 600) }))
                }
                className="w-full min-h-[140px] px-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan"
                placeholder="Jedna decyzja = jedna dźwignia. Np. „Codziennie 1 sesja Domykania przed 12:00”."
              />
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Co poszło dobrze
                  </div>
                  <div className="mt-2 text-sm text-white whitespace-pre-wrap">
                    {draft.wentWell.trim() ? draft.wentWell.trim() : '—'}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Co poprawić
                  </div>
                  <div className="mt-2 text-sm text-white whitespace-pre-wrap">
                    {draft.improve.trim() ? draft.improve.trim() : '—'}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Decyzja
                  </div>
                  <div className="mt-2 text-sm text-white whitespace-pre-wrap">
                    {draft.decision.trim() ? draft.decision.trim() : '—'}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gold/10 border border-gold/30">
                  <div className="text-xs text-gray-300 uppercase tracking-wider font-semibold">
                    Statystyki tygodnia
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-[11px] text-gray-400 uppercase tracking-wider">
                        Fokus (min)
                      </div>
                      <div className="text-2xl font-black text-white mt-1">
                        {Math.round(Number(weeklyStats.totalFocusMinutes || 0))}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-[11px] text-gray-400 uppercase tracking-wider">
                        Sesje
                      </div>
                      <div className="text-2xl font-black text-white mt-1">
                        {weeklyStats.totalFinishSessionsCompleted || 0}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-[11px] text-gray-400 uppercase tracking-wider">
                        Deklaracje dowiezione
                      </div>
                      <div className="text-2xl font-black text-white mt-1">
                        {weeklyStats.declarations.completed || 0}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-[11px] text-gray-400 uppercase tracking-wider">
                        Nie dowiezione
                      </div>
                      <div className="text-2xl font-black text-white mt-1">
                        {weeklyStats.declarations.missed || 0}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-[11px] text-gray-300 uppercase tracking-wider font-semibold mb-2">
                      Fokus per dzień
                    </div>
                    <div className="flex items-end gap-2 h-24">
                      {weeklyStats.days.map((d) => {
                        const pct = Math.max(
                          0,
                          Math.min(100, (Number(d.focusMinutes || 0) / maxDayMinutes) * 100)
                        );
                        const dt = parseIsoLocalDateKey(d.dateIso);
                        const label = dt ? formatDayLabel(dt) : d.dateIso;
                        return (
                          <div key={d.dateIso} className="flex-1 min-w-0">
                            <div
                              className="w-full rounded-md border border-neon-cyan/25 bg-neon-cyan/10"
                              style={{ height: `${pct}%` }}
                              title={`${label}: ${d.focusMinutes} min`}
                            />
                            <div className="mt-2 text-[10px] text-gray-300 text-center truncate">
                              {label.replace(/^(\w{2})\s/, '$1 ')}
                            </div>
                            <div className="text-[10px] text-gray-400 text-center">
                              {d.focusMinutes}m
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded border border-white/10 bg-white/5 text-gray-200">
                      Wszystkie: {weeklyStats.declarations.total || 0}
                    </div>
                    <div className="p-2 rounded border border-white/10 bg-white/5 text-gray-200">
                      Anulowane: {weeklyStats.declarations.cancelled || 0}
                    </div>
                    <div className="p-2 rounded border border-white/10 bg-white/5 text-gray-200">
                      Plan (nie rozliczone): {weeklyStats.declarations.planned || 0}
                    </div>
                    <div className="p-2 rounded border border-white/10 bg-white/5 text-gray-200">
                      Dowiezione: {weeklyStats.declarations.completed || 0}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className={[
                'min-h-[44px] px-4 rounded-lg border text-sm font-bold uppercase tracking-wider',
                step === 0
                  ? 'bg-white/5 border-white/10 text-gray-600 cursor-not-allowed'
                  : 'bg-white/5 border-white/10 text-gray-200 hover:text-neon-cyan',
              ].join(' ')}
            >
              ← Wstecz
            </button>

            <button
              type="button"
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              disabled={step >= 3}
              className={[
                'min-h-[44px] px-4 rounded-lg border text-sm font-bold uppercase tracking-wider',
                step >= 3
                  ? 'bg-white/5 border-white/10 text-gray-600 cursor-not-allowed'
                  : 'bg-neon-magenta/10 border-neon-magenta/25 text-neon-magenta hover:opacity-90',
              ].join(' ')}
            >
              Dalej →
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(WeeklyReviewPremium);
