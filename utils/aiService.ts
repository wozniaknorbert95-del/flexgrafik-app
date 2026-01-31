import { providerGenerateText } from './aiProvider';

function clip(input: unknown, maxLen: number): string {
  const s = typeof input === 'string' ? input : String(input ?? '');
  const cleaned = s.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen - 1) + '…' : cleaned;
}

function buildContextBlock(params: {
  goalName?: string;
  taskName: string;
  progress?: number;
  definitionOfDone?: string;
  strategyVision?: string;
  obstacle?: string;
}): string {
  const lines: string[] = [];
  lines.push(`Task: "${clip(params.taskName, 120)}"`);
  if (params.goalName) lines.push(`Cel: "${clip(params.goalName, 120)}"`);
  if (typeof params.progress === 'number' && Number.isFinite(params.progress)) {
    lines.push(`Progres: ${Math.round(params.progress)}%`);
  }
  if (params.definitionOfDone)
    lines.push(`Definicja DONE: "${clip(params.definitionOfDone, 260)}"`);
  if (params.strategyVision) lines.push(`Strategia (skrót): "${clip(params.strategyVision, 260)}"`);
  if (params.obstacle) lines.push(`Przeszkoda: "${clip(params.obstacle, 180)}"`);
  return lines.join('\n');
}

export async function generateMicrostep(params: {
  apiKey: string;
  taskName: string;
  context?: {
    goalName?: string;
    progress?: number;
    definitionOfDone?: string;
    strategyVision?: string;
  };
}): Promise<string | null> {
  const apiKey = String(params.apiKey || '').trim();
  if (!apiKey) return null;

  const prompt = [
    'SYSTEM (The Coach / Action / Goggins):',
    '- Język: polski.',
    '- Ton: krótko, szorstko, nastawiony na działanie.',
    '- Zero teorii. Zero gadania.',
    '- Output: dokładnie 1 zdanie, max 18 słów. Bez cudzysłowów. Bez list.',
    '',
    'Kontekst (FAKTY):',
    buildContextBlock({
      goalName: params.context?.goalName,
      taskName: params.taskName,
      progress: params.context?.progress,
      definitionOfDone: params.context?.definitionOfDone,
      strategyVision: params.context?.strategyVision,
    }),
    '',
    'Zadanie:',
    'Podaj pierwszy mikrokrok na 5 minut, który realnie pcha task w stronę DONE dzisiaj.',
    'Jeśli Definicja DONE jest pusta: pierwszym krokiem ma być dopisanie 3 punktów DONE.',
  ].join('\n');

  return await providerGenerateText(
    { apiKey, prompt, temperature: 0.5, maxTokens: 80, maxLen: 160 },
    { timeoutMs: 12_000 }
  );
}

export async function generateStrategy(params: {
  apiKey: string;
  taskName: string;
  context?: {
    goalName?: string;
    progress?: number;
    definitionOfDone?: string;
  };
}): Promise<string | null> {
  const apiKey = String(params.apiKey || '').trim();
  if (!apiKey) return null;

  const prompt = [
    'SYSTEM (The Architect / Strategy / Machiavelli):',
    '- Język: polski.',
    '- Ton: analityczny, chłodny, bez emocji.',
    '- Output: 2–3 punkty zaczynające się od "- ". Bez wstępu. Bez podsumowania.',
    '- Każdy punkt max 14 słów. Zero metafor.',
    '',
    'Kontekst (FAKTY):',
    buildContextBlock({
      goalName: params.context?.goalName,
      taskName: params.taskName,
      progress: params.context?.progress,
      definitionOfDone: params.context?.definitionOfDone,
    }),
    '',
    'Zadanie:',
    'Zaproponuj zwięzłą strategię domknięcia: kolejność działań + kryterium stop.',
    'Jeśli Definicja DONE jest pusta: pierwszy punkt ma być dopisaniem DONE.',
  ].join('\n');

  return await providerGenerateText(
    { apiKey, prompt, temperature: 0.4, maxTokens: 160, maxLen: 360 },
    { timeoutMs: 12_000 }
  );
}

export async function generateResiliencePlan(params: {
  apiKey: string;
  taskName: string;
  obstacle: string;
  context?: {
    goalName?: string;
  };
}): Promise<string | null> {
  const apiKey = String(params.apiKey || '').trim();
  if (!apiKey) return null;

  const obstacle = clip(params.obstacle, 160) || 'poczuję opór / rozproszenie';

  const prompt = [
    'SYSTEM (The Stoic / Resilience / Aurelius):',
    '- Język: polski.',
    '- Ton: spokojny, przewidujący trudności, bez dramatyzowania.',
    '- Output: jedna linia w formacie: "Jeśli ..., to ...".',
    '- Max 20 słów. Bez kropki na końcu. Bez list. Bez cudzysłowów.',
    '',
    'Kontekst (FAKTY):',
    buildContextBlock({
      goalName: params.context?.goalName,
      taskName: params.taskName,
      obstacle,
    }),
    '',
    'Zadanie:',
    'Stwórz jeden plan awaryjny (If‑Then) na dziś, praktyczny i wykonalny.',
  ].join('\n');

  return await providerGenerateText(
    { apiKey, prompt, temperature: 0.6, maxTokens: 90, maxLen: 200 },
    { timeoutMs: 12_000 }
  );
}
