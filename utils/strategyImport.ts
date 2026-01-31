import type {
  GoalStrategy,
  IfThenPlan,
  Milestone,
  Obstacle,
  SuccessCriterion,
  TaskType,
} from '../types';
import { generateUUID } from './uuid';

export type StrategyImportResponseMode = 'strict' | 'psycho' | 'facts';

export type StrategyImportTask = {
  name: string;
  type: TaskType;
  definitionOfDone?: string;
  implementationIntention?: { trigger: string; action: string; active?: boolean };
};

export type StrategyImportPayload = {
  vision: string;
  successCriteria: string[];
  milestones: Array<{ title: string; description?: string; deadline?: string }>;
  obstacles: Array<{ description: string; countermeasure: string }>;
  ifThenPlans: Array<{ trigger: string; action: string; isActive: boolean }>;
  tasks: StrategyImportTask[];
};

export type StrategyImportParseResult =
  | { ok: true; payload: StrategyImportPayload; rawJson: string }
  | { ok: false; error: string };

export const STRATEGY_IMPORT_JSON_START = '---JSON_START---';
export const STRATEGY_IMPORT_JSON_END = '---JSON_END---';

export const STRATEGY_IMPORT_DRAFT_STORAGE_KEY = 'mc_strategy_import_draft';

export function getStrategyImportTemplateText(): string {
  // Purposefully simple & copy-paste friendly (no comments inside JSON).
  const example = {
    vision: 'Jedno zdanie: co i po co dowożę (konkretny efekt).',
    successCriteria: ['Kryterium 1 (mierzalne/obserwowalne)', 'Kryterium 2', 'Kryterium 3'],
    milestones: [
      { title: 'M1: pierwszy rezultat', description: 'Co ma być gotowe', deadline: '2026-02-15' },
      { title: 'M2: domknięcie', description: 'Warunek domknięcia', deadline: '2026-03-01' },
    ],
    obstacles: [
      {
        description: 'Przeszkoda: brak energii po pracy',
        countermeasure: 'Plan B: 10 min mikrokrok + timer',
      },
      {
        description: 'Przeszkoda: perfekcjonizm na końcówce',
        countermeasure: 'Plan B: Definicja DONE w 3 punktach',
      },
    ],
    ifThenPlans: [
      {
        trigger: 'czuję, że to prawie gotowe (70–90%)',
        action: 'otwieram DONE i domykam 1 punkt',
        isActive: true,
      },
      {
        trigger: 'zaczynam scrollować zamiast działać',
        action: 'włączam 5 minut i robię jeden mikrokrok',
        isActive: true,
      },
    ],
    tasks: [
      {
        name: 'Zadanie 1 (build)',
        type: 'build',
        definitionOfDone: 'DONE (3): 1) ... 2) ... 3) ...',
      },
      {
        name: 'Zadanie 2 (close)',
        type: 'close',
        definitionOfDone: 'DONE (3): 1) ... 2) ... 3) ...',
        implementationIntention: {
          trigger: 'gdy utknę na końcówce',
          action: 'robię 1 brakujący punkt DONE',
          active: true,
        },
      },
    ],
  };

  return `${STRATEGY_IMPORT_JSON_START}\n${JSON.stringify(example, null, 2)}\n${STRATEGY_IMPORT_JSON_END}`;
}

function compact(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  const cleaned = input.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.length > maxLen ? `${cleaned.slice(0, Math.max(0, maxLen - 1))}…` : cleaned;
}

export function extractStrategyImportJsonCandidate(
  text: string
): { json: string; source: 'delimited' | 'raw' } | null {
  const raw = String(text || '');
  const start = raw.indexOf(STRATEGY_IMPORT_JSON_START);
  const end = raw.indexOf(STRATEGY_IMPORT_JSON_END);
  if (start >= 0 && end > start) {
    const json = raw.slice(start + STRATEGY_IMPORT_JSON_START.length, end).trim();
    return json ? { json, source: 'delimited' } : null;
  }
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return { json: trimmed, source: 'raw' };
  }
  return null;
}

export function extractStrategyImportBlockText(text: string): string | null {
  const raw = String(text || '');
  const start = raw.indexOf(STRATEGY_IMPORT_JSON_START);
  const end = raw.indexOf(STRATEGY_IMPORT_JSON_END);
  if (start >= 0 && end > start) {
    const block = raw.slice(start, end + STRATEGY_IMPORT_JSON_END.length).trim();
    return block || null;
  }
  // Raw JSON fallback → wrap into delimited block for copy/paste consistency.
  const candidate = extractStrategyImportJsonCandidate(raw);
  if (candidate?.source === 'raw' && candidate.json) {
    return `${STRATEGY_IMPORT_JSON_START}\n${candidate.json}\n${STRATEGY_IMPORT_JSON_END}`;
  }
  return null;
}

function asString(value: unknown, maxLen: number): string {
  return typeof value === 'string' ? compact(value, maxLen) : '';
}

function toStringArray(value: unknown, maxItems: number, maxItemLen: number): string[] {
  const arr = Array.isArray(value) ? value : [];
  const out: string[] = [];
  for (const v of arr) {
    const s = asString(v, maxItemLen);
    if (!s) continue;
    out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

function toMilestones(value: unknown): StrategyImportPayload['milestones'] {
  const arr = Array.isArray(value) ? value : [];
  const out: StrategyImportPayload['milestones'] = [];
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue;
    const title = asString((it as any).title, 160);
    if (!title) continue;
    const description = asString((it as any).description, 500) || undefined;
    const deadline = asString((it as any).deadline, 32) || undefined;
    out.push({ title, ...(description ? { description } : {}), ...(deadline ? { deadline } : {}) });
    if (out.length >= 30) break;
  }
  return out;
}

function toObstacles(value: unknown): StrategyImportPayload['obstacles'] {
  const arr = Array.isArray(value) ? value : [];
  const out: StrategyImportPayload['obstacles'] = [];
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue;
    const description = asString((it as any).description, 240);
    const countermeasure = asString((it as any).countermeasure, 240);
    if (!description || !countermeasure) continue;
    out.push({ description, countermeasure });
    if (out.length >= 40) break;
  }
  return out;
}

function toIfThenPlans(value: unknown): StrategyImportPayload['ifThenPlans'] {
  const arr = Array.isArray(value) ? value : [];
  const out: StrategyImportPayload['ifThenPlans'] = [];
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue;
    const trigger = asString((it as any).trigger, 200);
    const action = asString((it as any).action, 240);
    if (!trigger || !action) continue;
    const isActive = (it as any).isActive === false ? false : true;
    out.push({ trigger, action, isActive });
    if (out.length >= 40) break;
  }
  return out;
}

function toTasks(value: unknown): StrategyImportPayload['tasks'] {
  const arr = Array.isArray(value) ? value : [];
  const out: StrategyImportPayload['tasks'] = [];
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue;
    const name = asString((it as any).name, 200);
    const rawType = asString((it as any).type, 12);
    const type: TaskType = rawType === 'close' ? 'close' : 'build';
    if (!name) continue;
    const definitionOfDone = asString((it as any).definitionOfDone, 800) || undefined;
    const ii = (it as any).implementationIntention;
    const trigger = ii && typeof ii === 'object' ? asString(ii.trigger, 200) : '';
    const action = ii && typeof ii === 'object' ? asString(ii.action, 240) : '';
    const active = ii && typeof ii === 'object' ? (ii.active === false ? false : true) : true;
    const implementationIntention = trigger && action ? { trigger, action, active } : undefined;
    out.push({
      name,
      type,
      ...(definitionOfDone ? { definitionOfDone } : {}),
      ...(implementationIntention ? { implementationIntention } : {}),
    });
    if (out.length >= 60) break;
  }
  return out;
}

export function parseStrategyImportText(text: string): StrategyImportParseResult {
  const candidate = extractStrategyImportJsonCandidate(text);
  if (!candidate) {
    return {
      ok: false,
      error: `Nie widzę bloku JSON. Wklej tekst z delimiterami:\n${STRATEGY_IMPORT_JSON_START}\n{ ... }\n${STRATEGY_IMPORT_JSON_END}\n(albo sam czysty JSON).`,
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(candidate.json);
  } catch {
    return {
      ok: false,
      error: 'Nie udało się sparsować JSON (błąd składni). Sprawdź przecinki i cudzysłowy.',
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'JSON musi być obiektem (np. { "vision": "...", ... }).' };
  }

  const vision = asString((parsed as any).vision, 1200);
  const successCriteria = toStringArray((parsed as any).successCriteria, 60, 220);
  const milestones = toMilestones((parsed as any).milestones);
  const obstacles = toObstacles((parsed as any).obstacles);
  const ifThenPlans = toIfThenPlans((parsed as any).ifThenPlans);
  const tasks = toTasks((parsed as any).tasks);

  return {
    ok: true,
    rawJson: candidate.json,
    payload: {
      vision,
      successCriteria,
      milestones,
      obstacles,
      ifThenPlans,
      tasks,
    },
  };
}

export function buildGoalStrategyFromImport(payload: StrategyImportPayload): GoalStrategy {
  const successCriteria: SuccessCriterion[] = (payload.successCriteria || [])
    .map((description) => ({
      id: generateUUID(),
      description,
      status: 'not_met',
    }))
    .filter((c) => String(c.description || '').trim().length > 0)
    .slice(0, 60);

  const milestones: Milestone[] = (payload.milestones || [])
    .map((m) => ({
      id: generateUUID(),
      title: String(m.title || '').trim(),
      description: typeof m.description === 'string' ? m.description : undefined,
      deadline: typeof m.deadline === 'string' ? m.deadline : undefined,
      status: 'not_started',
    }))
    .filter((m) => m.title.length > 0)
    .slice(0, 30);

  const ifThenPlans: IfThenPlan[] = (payload.ifThenPlans || [])
    .map((p) => ({
      id: generateUUID(),
      trigger: String(p.trigger || '').trim(),
      action: String(p.action || '').trim(),
      isActive: p.isActive !== false,
    }))
    .filter((p) => p.trigger.length > 0 && p.action.length > 0)
    .slice(0, 40);

  const obstacles: Obstacle[] = (payload.obstacles || [])
    .map((o) => ({
      id: generateUUID(),
      description: String(o.description || '').trim(),
      countermeasure: String(o.countermeasure || '').trim(),
    }))
    .filter((o) => o.description.length > 0 && o.countermeasure.length > 0)
    .slice(0, 40);

  return {
    vision: String(payload.vision || '').trim(),
    successCriteria,
    milestones,
    ifThenPlans,
    obstacles,
  };
}
