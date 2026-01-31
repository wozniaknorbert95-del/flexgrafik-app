import React, { useMemo, useState } from 'react';
import type {
  GoalStrategy,
  GoalStrategyStructurePhase,
  GoalStrategyTactic,
  IfThenPlan,
  Milestone,
  Obstacle,
  SuccessCriterion,
  SuccessCriterionStatus,
} from '../types';

interface GoalStrategyEditorProps {
  strategy: GoalStrategy;
  onChange: (strategy: GoalStrategy) => void;
  onSave?: () => void;
  /**
   * Optional list of tasks available in this goal.
   * Used to build a simple task-tree by assigning tasks to phases.
   */
  availableTasks?: Array<{ id: number; name: string }>;
}

type SectionId =
  | 'vision'
  | 'success'
  | 'milestones'
  | 'ifthen'
  | 'obstacles'
  | 'structure'
  | 'tactics';

const STATUS_LABEL: Record<SuccessCriterionStatus, string> = {
  not_met: 'Nie spełnione',
  partially_met: 'Częściowo spełnione',
  met: 'Spełnione',
};

const MILESTONE_STATUS_LABEL: Record<Milestone['status'], string> = {
  not_started: 'Nie zaczęte',
  in_progress: 'W trakcie',
  done: 'Zrobione',
};

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeCriterionStatus(c: SuccessCriterion): SuccessCriterionStatus {
  if (c.status === 'not_met' || c.status === 'partially_met' || c.status === 'met') return c.status;
  return c.isMet ? 'met' : 'not_met';
}

export const GoalStrategyEditor: React.FC<GoalStrategyEditorProps> = ({
  strategy,
  onChange,
  onSave,
  availableTasks,
}) => {
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    vision: true,
    success: false,
    milestones: false,
    ifthen: false,
    obstacles: false,
    structure: false,
    tactics: false,
  });

  const safe = useMemo<GoalStrategy>(() => {
    const base: any = strategy && typeof strategy === 'object' ? strategy : {};
    return {
      ...(base as any),
      vision: typeof base?.vision === 'string' ? base.vision : '',
      successCriteria: Array.isArray(base?.successCriteria) ? base.successCriteria : [],
      milestones: Array.isArray(base?.milestones) ? base.milestones : [],
      ifThenPlans: Array.isArray(base?.ifThenPlans) ? base.ifThenPlans : [],
      obstacles: Array.isArray(base?.obstacles) ? base.obstacles : [],
      structure: base?.structure && typeof base.structure === 'object' ? base.structure : undefined,
      tactics: Array.isArray(base?.tactics) ? base.tactics : [],
      aiContext: base?.aiContext,
    } as GoalStrategy;
  }, [strategy]);

  const toggle = (id: SectionId) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-3">
      {/* Vision */}
      <div className="glass-card space-widget border border-white/10">
        <button
          type="button"
          onClick={() => toggle('vision')}
          className="w-full flex items-center justify-between text-left"
          aria-expanded={open.vision}
        >
          <div>
            <div className="text-sm font-bold text-white">Wizja (dlaczego)</div>
            <div className="text-xs text-gray-400">Co się zmieni, gdy cel będzie osiągnięty?</div>
          </div>
          <div className="text-sm text-gray-300">{open.vision ? '▲' : '▼'}</div>
        </button>

        {open.vision && (
          <div className="mt-3">
            <textarea
              value={safe.vision}
              onChange={(e) => onChange({ ...safe, vision: e.target.value.slice(0, 1200) })}
              className="w-full min-h-[120px] px-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan"
              placeholder="Napisz krótko: dlaczego ten cel jest ważny, co realnie ma dać."
            />
          </div>
        )}
      </div>

      {/* Success criteria */}
      <div className="glass-card space-widget border border-white/10">
        <button
          type="button"
          onClick={() => toggle('success')}
          className="w-full flex items-center justify-between text-left"
          aria-expanded={open.success}
        >
          <div>
            <div className="text-sm font-bold text-white">Kryteria sukcesu (co konkretnie)</div>
            <div className="text-xs text-gray-400">3–5 mierzalnych, obiektywnych kryteriów.</div>
          </div>
          <div className="text-sm text-gray-300">{open.success ? '▲' : '▼'}</div>
        </button>

        {open.success && (
          <div className="mt-3 space-y-3">
            {safe.successCriteria.length === 0 ? (
              <div className="text-sm text-gray-400">Brak kryteriów. Dodaj przynajmniej jedno.</div>
            ) : (
              safe.successCriteria.map((c, idx) => {
                const status = normalizeCriterionStatus(c);
                return (
                  <div
                    key={c.id || idx}
                    className="p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex gap-2 items-start">
                      <select
                        value={status}
                        onChange={(e) => {
                          const nextStatus = e.target.value as SuccessCriterionStatus;
                          const nextList = safe.successCriteria.map((x, i) =>
                            i === idx
                              ? { ...x, status: nextStatus, isMet: nextStatus === 'met' }
                              : x
                          );
                          onChange({ ...safe, successCriteria: nextList });
                        }}
                        className="min-h-[44px] px-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-neon-cyan text-sm"
                        aria-label="Status kryterium"
                      >
                        <option value="not_met">{STATUS_LABEL.not_met}</option>
                        <option value="partially_met">{STATUS_LABEL.partially_met}</option>
                        <option value="met">{STATUS_LABEL.met}</option>
                      </select>

                      <div className="flex-1 space-y-2">
                        <input
                          value={c.description || ''}
                          onChange={(e) => {
                            const nextList = safe.successCriteria.map((x, i) =>
                              i === idx ? { ...x, description: e.target.value.slice(0, 240) } : x
                            );
                            onChange({ ...safe, successCriteria: nextList });
                          }}
                          className="w-full min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm"
                          placeholder="Opis kryterium (np. „3 opinie Google w tym miesiącu”)"
                        />
                        <input
                          value={(c as any).evidence || ''}
                          onChange={(e) => {
                            const nextList = safe.successCriteria.map((x, i) =>
                              i === idx ? { ...x, evidence: e.target.value.slice(0, 240) } : x
                            );
                            onChange({ ...safe, successCriteria: nextList });
                          }}
                          className="w-full min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm"
                          placeholder="Dowód / notatka (opcjonalnie)"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const nextList = safe.successCriteria.filter((_, i) => i !== idx);
                          onChange({ ...safe, successCriteria: nextList });
                        }}
                        className="min-h-[44px] px-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm font-bold"
                        aria-label="Usuń kryterium"
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            <button
              type="button"
              onClick={() => {
                const next: SuccessCriterion = {
                  id: uid('crit'),
                  description: '',
                  status: 'not_met',
                  isMet: false,
                };
                onChange({ ...safe, successCriteria: [...safe.successCriteria, next] });
              }}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan font-bold text-sm"
            >
              ➕ Dodaj kryterium
            </button>
          </div>
        )}
      </div>

      {/* Milestones */}
      <div className="glass-card space-widget border border-white/10">
        <button
          type="button"
          onClick={() => toggle('milestones')}
          className="w-full flex items-center justify-between text-left"
          aria-expanded={open.milestones}
        >
          <div>
            <div className="text-sm font-bold text-white">Kamienie milowe (etapy)</div>
            <div className="text-xs text-gray-400">Podziel cel na mniejsze, domykane kroki.</div>
          </div>
          <div className="text-sm text-gray-300">{open.milestones ? '▲' : '▼'}</div>
        </button>

        {open.milestones && (
          <div className="mt-3 space-y-3">
            {safe.milestones.length === 0 ? (
              <div className="text-sm text-gray-400">Brak milestone’ów. Dodaj pierwszy etap.</div>
            ) : (
              safe.milestones.map((m, idx) => (
                <div key={m.id || idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      value={m.title || ''}
                      onChange={(e) => {
                        const nextList = safe.milestones.map((x, i) =>
                          i === idx ? { ...x, title: e.target.value.slice(0, 120) } : x
                        );
                        onChange({ ...safe, milestones: nextList });
                      }}
                      className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm"
                      placeholder="Tytuł (np. „MVP gotowe”)"
                    />
                    <select
                      value={m.status}
                      onChange={(e) => {
                        const nextStatus = e.target.value as Milestone['status'];
                        const nextList = safe.milestones.map((x, i) =>
                          i === idx ? { ...x, status: nextStatus } : x
                        );
                        onChange({ ...safe, milestones: nextList });
                      }}
                      className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-neon-cyan text-sm"
                      aria-label="Status milestone"
                    >
                      <option value="not_started">{MILESTONE_STATUS_LABEL.not_started}</option>
                      <option value="in_progress">{MILESTONE_STATUS_LABEL.in_progress}</option>
                      <option value="done">{MILESTONE_STATUS_LABEL.done}</option>
                    </select>
                    <input
                      value={m.deadline || ''}
                      onChange={(e) => {
                        const nextList = safe.milestones.map((x, i) =>
                          i === idx ? { ...x, deadline: e.target.value } : x
                        );
                        onChange({ ...safe, milestones: nextList });
                      }}
                      className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-neon-cyan text-sm"
                      placeholder="Deadline (YYYY-MM-DD) — opcjonalnie"
                      type="date"
                    />
                    <input
                      value={m.reward || ''}
                      onChange={(e) => {
                        const nextList = safe.milestones.map((x, i) =>
                          i === idx ? { ...x, reward: e.target.value.slice(0, 160) } : x
                        );
                        onChange({ ...safe, milestones: nextList });
                      }}
                      className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm"
                      placeholder="Nagroda (opcjonalnie)"
                    />
                  </div>

                  <textarea
                    value={m.description || ''}
                    onChange={(e) => {
                      const nextList = safe.milestones.map((x, i) =>
                        i === idx ? { ...x, description: e.target.value.slice(0, 600) } : x
                      );
                      onChange({ ...safe, milestones: nextList });
                    }}
                    className="mt-2 w-full min-h-[90px] px-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm"
                    placeholder="Opis (opcjonalnie)"
                  />

                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const nextList = safe.milestones.filter((_, i) => i !== idx);
                        onChange({ ...safe, milestones: nextList });
                      }}
                      className="min-h-[44px] px-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm font-bold"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              ))
            )}

            <button
              type="button"
              onClick={() => {
                const next: Milestone = {
                  id: uid('ms'),
                  title: '',
                  description: '',
                  status: 'not_started',
                };
                onChange({ ...safe, milestones: [...safe.milestones, next] });
              }}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-neon-magenta/15 border border-neon-magenta/40 text-neon-magenta font-bold text-sm"
            >
              ➕ Dodaj milestone
            </button>
          </div>
        )}
      </div>

      {/* If-Then plans */}
      <div className="glass-card space-widget border border-white/10">
        <button
          type="button"
          onClick={() => toggle('ifthen')}
          className="w-full flex items-center justify-between text-left"
          aria-expanded={open.ifthen}
        >
          <div>
            <div className="text-sm font-bold text-white">Plany Jeśli–To (automatyzacje)</div>
            <div className="text-xs text-gray-400">Ułatwiają decyzje, gdy pojawi się opór.</div>
          </div>
          <div className="text-sm text-gray-300">{open.ifthen ? '▲' : '▼'}</div>
        </button>

        {open.ifthen && (
          <div className="mt-3 space-y-3">
            {safe.ifThenPlans.length === 0 ? (
              <div className="text-sm text-gray-400">Brak planów. Dodaj jeden „Jeśli…, to…”.</div>
            ) : (
              safe.ifThenPlans.map((pl, idx) => (
                <div
                  key={pl.id || idx}
                  className="p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex gap-2 items-start">
                    <button
                      type="button"
                      onClick={() => {
                        const nextList = safe.ifThenPlans.map((x, i) =>
                          i === idx ? { ...x, isActive: !x.isActive } : x
                        );
                        onChange({ ...safe, ifThenPlans: nextList });
                      }}
                      className={`min-h-[44px] px-3 rounded-lg border text-sm font-bold ${
                        pl.isActive
                          ? 'bg-green-500/15 border-green-500/40 text-green-200'
                          : 'bg-white/5 border-white/10 text-gray-300'
                      }`}
                      aria-label="Aktywuj/dezaktywuj plan"
                    >
                      {pl.isActive ? 'Aktywne' : 'Wyłączone'}
                    </button>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        value={pl.trigger || ''}
                        onChange={(e) => {
                          const nextList = safe.ifThenPlans.map((x, i) =>
                            i === idx ? { ...x, trigger: e.target.value.slice(0, 180) } : x
                          );
                          onChange({ ...safe, ifThenPlans: nextList });
                        }}
                        className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm"
                        placeholder="Jeśli… (sytuacja)"
                      />
                      <input
                        value={pl.action || ''}
                        onChange={(e) => {
                          const nextList = safe.ifThenPlans.map((x, i) =>
                            i === idx ? { ...x, action: e.target.value.slice(0, 220) } : x
                          );
                          onChange({ ...safe, ifThenPlans: nextList });
                        }}
                        className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm"
                        placeholder="To… (akcja)"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextList = safe.ifThenPlans.filter((_, i) => i !== idx);
                        onChange({ ...safe, ifThenPlans: nextList });
                      }}
                      className="min-h-[44px] px-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm font-bold"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              ))
            )}

            <button
              type="button"
              onClick={() => {
                const next: IfThenPlan = {
                  id: uid('ifthen'),
                  trigger: '',
                  action: '',
                  isActive: true,
                };
                onChange({ ...safe, ifThenPlans: [...safe.ifThenPlans, next] });
              }}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-gold/10 border border-gold/40 text-gold font-bold text-sm"
            >
              ➕ Dodaj plan Jeśli–To
            </button>
          </div>
        )}
      </div>

      {/* Obstacles */}
      <div className="glass-card space-widget border border-white/10">
        <button
          type="button"
          onClick={() => toggle('obstacles')}
          className="w-full flex items-center justify-between text-left"
          aria-expanded={open.obstacles}
        >
          <div>
            <div className="text-sm font-bold text-white">Przeszkody i plan B</div>
            <div className="text-xs text-gray-400">Przewidziane problemy + kontrmiary.</div>
          </div>
          <div className="text-sm text-gray-300">{open.obstacles ? '▲' : '▼'}</div>
        </button>

        {open.obstacles && (
          <div className="mt-3 space-y-3">
            {safe.obstacles.length === 0 ? (
              <div className="text-sm text-gray-400">
                Brak przeszkód. Dodaj jedną, jeśli znasz ryzyko.
              </div>
            ) : (
              safe.obstacles.map((o, idx) => (
                <div key={o.id || idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      value={o.description || ''}
                      onChange={(e) => {
                        const nextList = safe.obstacles.map((x, i) =>
                          i === idx ? { ...x, description: e.target.value.slice(0, 220) } : x
                        );
                        onChange({ ...safe, obstacles: nextList });
                      }}
                      className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm md:col-span-2"
                      placeholder="Przeszkoda (np. „stracę motywację po 2 tygodniach…”)"
                    />
                    <input
                      value={String((o as any).occurredCount ?? 0)}
                      onChange={(e) => {
                        const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                        const nextList = safe.obstacles.map((x, i) =>
                          i === idx ? { ...x, occurredCount: n } : x
                        );
                        onChange({ ...safe, obstacles: nextList });
                      }}
                      className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-neon-cyan text-sm"
                      type="number"
                      min={0}
                      aria-label="Ile razy wystąpiła"
                      title="Ile razy wystąpiła"
                    />
                  </div>
                  <input
                    value={o.countermeasure || ''}
                    onChange={(e) => {
                      const nextList = safe.obstacles.map((x, i) =>
                        i === idx ? { ...x, countermeasure: e.target.value.slice(0, 220) } : x
                      );
                      onChange({ ...safe, obstacles: nextList });
                    }}
                    className="mt-2 w-full min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm"
                    placeholder="Plan B / kontrmiara (np. „weekly check-in z kimś”)"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const nextList = safe.obstacles.filter((_, i) => i !== idx);
                        onChange({ ...safe, obstacles: nextList });
                      }}
                      className="min-h-[44px] px-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm font-bold"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              ))
            )}

            <button
              type="button"
              onClick={() => {
                const next: Obstacle = {
                  id: uid('obs'),
                  description: '',
                  countermeasure: '',
                  occurredCount: 0,
                };
                onChange({ ...safe, obstacles: [...safe.obstacles, next] });
              }}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white font-bold text-sm"
            >
              ➕ Dodaj przeszkodę
            </button>
          </div>
        )}
      </div>

      {/* Structure (PLAN_v2) */}
      <div className="glass-card space-widget border border-white/10">
        <button
          type="button"
          onClick={() => toggle('structure')}
          className="w-full flex items-center justify-between text-left"
          aria-expanded={open.structure}
        >
          <div>
            <div className="text-sm font-bold text-white">Struktura (jak to rozbić)</div>
            <div className="text-xs text-gray-400">Podsumowanie + etapy wykonania.</div>
          </div>
          <div className="text-sm text-gray-300">{open.structure ? '▲' : '▼'}</div>
        </button>

        {open.structure && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                Podsumowanie (opcjonalnie)
              </label>
              <textarea
                value={String((safe as any)?.structure?.summary ?? '')}
                onChange={(e) => {
                  const phases = Array.isArray((safe as any)?.structure?.phases)
                    ? ((safe as any).structure.phases as GoalStrategyStructurePhase[])
                    : [];
                  const nextStructure = {
                    ...(((safe as any)?.structure && typeof (safe as any).structure === 'object'
                      ? (safe as any).structure
                      : {}) as any),
                    summary: e.target.value.slice(0, 600),
                    phases,
                  };
                  onChange({ ...safe, structure: nextStructure } as GoalStrategy);
                }}
                className="w-full min-h-[90px] px-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm"
                placeholder="1–3 zdania: jaka jest kolejność i co jest wynikiem."
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-bold text-white">Etapy</div>
              {(() => {
                const phases = Array.isArray((safe as any)?.structure?.phases)
                  ? ((safe as any).structure.phases as GoalStrategyStructurePhase[])
                  : [];
                if (phases.length === 0) {
                  return (
                    <div className="text-sm text-gray-400">Brak etapów. Dodaj pierwszy etap.</div>
                  );
                }
                return phases.map((ph, idx) => (
                  <div
                    key={ph.id || idx}
                    className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        value={ph.title || ''}
                        onChange={(e) => {
                          const nextTitle = e.target.value.slice(0, 120);
                          const nextPhases = phases.map((x, i) =>
                            i === idx ? { ...x, title: nextTitle } : x
                          );
                          const nextStructure = {
                            ...(((safe as any)?.structure &&
                            typeof (safe as any).structure === 'object'
                              ? (safe as any).structure
                              : {}) as any),
                            phases: nextPhases,
                          };
                          onChange({ ...safe, structure: nextStructure } as GoalStrategy);
                        }}
                        className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm md:col-span-2"
                        placeholder="Tytuł etapu (np. „MVP”)"
                      />
                      <select
                        value={(ph.status as any) || 'not_started'}
                        onChange={(e) => {
                          const nextStatus = e.target.value as GoalStrategyStructurePhase['status'];
                          const nextPhases = phases.map((x, i) =>
                            i === idx ? { ...x, status: nextStatus } : x
                          );
                          const nextStructure = {
                            ...(((safe as any)?.structure &&
                            typeof (safe as any).structure === 'object'
                              ? (safe as any).structure
                              : {}) as any),
                            phases: nextPhases,
                          };
                          onChange({ ...safe, structure: nextStructure } as GoalStrategy);
                        }}
                        className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-neon-cyan text-sm"
                        aria-label="Status etapu"
                      >
                        <option value="not_started">{MILESTONE_STATUS_LABEL.not_started}</option>
                        <option value="in_progress">{MILESTONE_STATUS_LABEL.in_progress}</option>
                        <option value="done">{MILESTONE_STATUS_LABEL.done}</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        value={
                          typeof (ph as any).order === 'number' ? String((ph as any).order) : ''
                        }
                        onChange={(e) => {
                          const n =
                            e.target.value === ''
                              ? undefined
                              : Math.max(0, Math.floor(Number(e.target.value) || 0));
                          const nextPhases = phases.map((x, i) =>
                            i === idx ? { ...(x as any), order: n } : x
                          );
                          const nextStructure = {
                            ...(((safe as any)?.structure &&
                            typeof (safe as any).structure === 'object'
                              ? (safe as any).structure
                              : {}) as any),
                            phases: nextPhases,
                          };
                          onChange({ ...safe, structure: nextStructure } as GoalStrategy);
                        }}
                        className="min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-neon-cyan text-sm"
                        type="number"
                        min={0}
                        placeholder="Kolejność"
                        aria-label="Kolejność etapu"
                        title="Kolejność etapu"
                      />
                      <div className="md:col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const nextPhases = phases.filter((_, i) => i !== idx);
                            const nextStructure = {
                              ...(((safe as any)?.structure &&
                              typeof (safe as any).structure === 'object'
                                ? (safe as any).structure
                                : {}) as any),
                              phases: nextPhases,
                            };
                            onChange({ ...safe, structure: nextStructure } as GoalStrategy);
                          }}
                          className="min-h-[44px] px-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm font-bold"
                        >
                          Usuń etap
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={ph.description || ''}
                      onChange={(e) => {
                        const nextDesc = e.target.value.slice(0, 600);
                        const nextPhases = phases.map((x, i) =>
                          i === idx ? { ...x, description: nextDesc } : x
                        );
                        const nextStructure = {
                          ...(((safe as any)?.structure &&
                          typeof (safe as any).structure === 'object'
                            ? (safe as any).structure
                            : {}) as any),
                          phases: nextPhases,
                        };
                        onChange({ ...safe, structure: nextStructure } as GoalStrategy);
                      }}
                      className="w-full min-h-[90px] px-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm"
                      placeholder="Opis etapu (opcjonalnie)"
                    />

                    {/* Task assignment (MVP task tree) */}
                    {(availableTasks ?? []).length > 0 && (
                      <div className="pt-2 border-t border-white/10">
                        <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-2">
                          Zadania w etapie (MVP)
                        </div>
                        <div className="max-h-[160px] overflow-y-auto pr-1 space-y-2">
                          {(availableTasks ?? []).slice(0, 24).map((t) => {
                            const selected = new Set<number>(
                              Array.isArray((ph as any).taskIds)
                                ? ((ph as any).taskIds as number[])
                                : []
                            );
                            const isChecked = selected.has(t.id);
                            return (
                              <label
                                key={t.id}
                                className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) selected.delete(t.id);
                                    else selected.add(t.id);
                                    const nextTaskIds = Array.from(selected);
                                    const nextPhases = phases.map((x, i) =>
                                      i === idx ? { ...(x as any), taskIds: nextTaskIds } : x
                                    );
                                    const nextStructure = {
                                      ...(((safe as any)?.structure &&
                                      typeof (safe as any).structure === 'object'
                                        ? (safe as any).structure
                                        : {}) as any),
                                      phases: nextPhases,
                                    };
                                    onChange({ ...safe, structure: nextStructure } as GoalStrategy);
                                  }}
                                  className="w-4 h-4 accent-[var(--accent-cyan)]"
                                />
                                <span className="text-sm text-white break-words">{t.name}</span>
                              </label>
                            );
                          })}
                        </div>
                        {(availableTasks ?? []).length > 24 && (
                          <div className="text-[11px] text-gray-500 mt-2">
                            Pokazuję 24 zadania (lista jest ograniczona dla czytelności).
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ));
              })()}

              <button
                type="button"
                onClick={() => {
                  const phases = Array.isArray((safe as any)?.structure?.phases)
                    ? ((safe as any).structure.phases as GoalStrategyStructurePhase[])
                    : [];
                  const nextPhase: GoalStrategyStructurePhase = {
                    id: uid('phase'),
                    title: '',
                    description: '',
                    status: 'not_started',
                    order: phases.length + 1,
                    taskIds: [],
                  };
                  const nextStructure = {
                    ...(((safe as any)?.structure && typeof (safe as any).structure === 'object'
                      ? (safe as any).structure
                      : {}) as any),
                    summary: String((safe as any)?.structure?.summary ?? ''),
                    phases: [...phases, nextPhase],
                  };
                  onChange({ ...safe, structure: nextStructure } as GoalStrategy);
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan font-bold text-sm"
              >
                ➕ Dodaj etap
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tactics (PLAN_v2) */}
      <div className="glass-card space-widget border border-white/10">
        <button
          type="button"
          onClick={() => toggle('tactics')}
          className="w-full flex items-center justify-between text-left"
          aria-expanded={open.tactics}
        >
          <div>
            <div className="text-sm font-bold text-white">Taktyki (powtarzalne skróty)</div>
            <div className="text-xs text-gray-400">Małe zasady, które obniżają tarcie.</div>
          </div>
          <div className="text-sm text-gray-300">{open.tactics ? '▲' : '▼'}</div>
        </button>

        {open.tactics && (
          <div className="mt-3 space-y-3">
            {(() => {
              const tactics = Array.isArray((safe as any)?.tactics)
                ? ((safe as any).tactics as GoalStrategyTactic[])
                : [];
              if (tactics.length === 0) {
                return <div className="text-sm text-gray-400">Brak taktyk. Dodaj pierwszą.</div>;
              }
              return tactics.map((t, idx) => {
                const tagsText = Array.isArray((t as any).tags) ? (t as any).tags.join(', ') : '';
                return (
                  <div
                    key={t.id || idx}
                    className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2"
                  >
                    <div className="flex gap-2 items-start">
                      <button
                        type="button"
                        onClick={() => {
                          const nextList = tactics.map((x, i) =>
                            i === idx ? { ...x, isActive: !(x as any).isActive } : x
                          );
                          onChange({ ...safe, tactics: nextList } as GoalStrategy);
                        }}
                        className={`min-h-[44px] px-3 rounded-lg border text-sm font-bold ${
                          (t as any).isActive !== false
                            ? 'bg-green-500/15 border-green-500/40 text-green-200'
                            : 'bg-white/5 border-white/10 text-gray-300'
                        }`}
                        aria-label="Aktywuj/dezaktywuj taktykę"
                      >
                        {(t as any).isActive !== false ? 'Aktywna' : 'Wyłączona'}
                      </button>

                      <div className="flex-1 space-y-2">
                        <input
                          value={t.title || ''}
                          onChange={(e) => {
                            const nextTitle = e.target.value.slice(0, 120);
                            const nextList = tactics.map((x, i) =>
                              i === idx ? { ...x, title: nextTitle } : x
                            );
                            onChange({ ...safe, tactics: nextList } as GoalStrategy);
                          }}
                          className="w-full min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm"
                          placeholder="Tytuł (np. „5-min start”)"
                        />
                        <textarea
                          value={t.description || ''}
                          onChange={(e) => {
                            const nextDesc = e.target.value.slice(0, 600);
                            const nextList = tactics.map((x, i) =>
                              i === idx ? { ...x, description: nextDesc } : x
                            );
                            onChange({ ...safe, tactics: nextList } as GoalStrategy);
                          }}
                          className="w-full min-h-[90px] px-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm"
                          placeholder="Opis (opcjonalnie)"
                        />
                        <input
                          value={tagsText}
                          onChange={(e) => {
                            const raw = e.target.value.slice(0, 200);
                            const tags = raw
                              .split(',')
                              .map((x) => x.trim())
                              .filter(Boolean)
                              .slice(0, 12);
                            const nextList = tactics.map((x, i) =>
                              i === idx ? { ...(x as any), tags } : x
                            );
                            onChange({ ...safe, tactics: nextList } as GoalStrategy);
                          }}
                          className="w-full min-h-[44px] px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan text-sm"
                          placeholder="Tagi (opcjonalnie): np. start, fokus, finish"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const nextList = tactics.filter((_, i) => i !== idx);
                          onChange({ ...safe, tactics: nextList } as GoalStrategy);
                        }}
                        className="min-h-[44px] px-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm font-bold"
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                );
              });
            })()}

            <button
              type="button"
              onClick={() => {
                const tactics = Array.isArray((safe as any)?.tactics)
                  ? ((safe as any).tactics as GoalStrategyTactic[])
                  : [];
                const next: GoalStrategyTactic = {
                  id: uid('tactic'),
                  title: '',
                  description: '',
                  isActive: true,
                  tags: [],
                };
                onChange({ ...safe, tactics: [...tactics, next] } as GoalStrategy);
              }}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-neon-magenta/15 border border-neon-magenta/40 text-neon-magenta font-bold text-sm"
            >
              ➕ Dodaj taktykę
            </button>
          </div>
        )}
      </div>

      {/* Save CTA (optional, parent can also auto-save) */}
      {onSave && (
        <div className="sticky bottom-0 pb-safe pt-2">
          <button
            type="button"
            onClick={onSave}
            className="w-full min-h-[48px] rounded-lg bg-neon-cyan text-obsidian font-black uppercase tracking-wider"
          >
            Zapisz strategię
          </button>
        </div>
      )}
    </div>
  );
};
