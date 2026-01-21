import { AI_CONFIG } from '../constants';
import { AppData } from '../types';
import { getSystemPrompt } from '../prompts/systemPrompt';
import { handleError } from '../utils/errorHandler';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Simple cache (1h TTL)
const cache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

export const getCachedOrFetch = async (
  cacheKey: string,
  fetchFn: () => Promise<string>
): Promise<string> => {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }

  const response = await fetchFn();
  cache.set(cacheKey, { response, timestamp: Date.now() });
  return response;
};

// Rate limiting
let requestCount = 0;
let lastResetTime = Date.now();

const checkRateLimit = (): boolean => {
  const now = Date.now();
  if (now - lastResetTime > 60000) {
    requestCount = 0;
    lastResetTime = now;
  }
  return requestCount < AI_CONFIG.rateLimit.requests;
};

export const callGroqAPI = async (
  messages: GroqMessage[],
  apiKey: string
): Promise<string> => {
  if (!checkRateLimit()) {
    throw new Error('Rate limit exceeded. Spróbuj za minutę.');
  }

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Brak API Key. Dodaj w Settings → AI Coach.');
  }

  requestCount++;

  try {
    const response = await fetch(AI_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages,
        max_tokens: AI_CONFIG.maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data: GroqResponse = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    handleError(error, {
      component: 'AIService',
      action: 'chatWithAI',
      userMessage: 'AI service is currently unavailable'
    });
    throw error;
  }
};

// AI Functions
export const generateDailyPriorities = async (
  appData: AppData
): Promise<string> => {
  const cacheKey = `priorities_${appData.user.id}_${new Date().toDateString()}`;

  return await getCachedOrFetch(cacheKey, async () => {
    const systemPrompt = getSystemPrompt(appData);
    const userPrompt = `Na podstawie stanu projektów: co powinienem dziś zrobić?
    Priorytet: projekty przy 90%+ i zadania closing.
    Odpowiedź: maksymalnie 2 zadania, konkretnie.`;

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    return await callGroqAPI(messages, appData.settings.ai.apiKey);
  });
};

export const generateSprintRetrospective = async (
  appData: AppData
): Promise<string> => {
  const currentSprint = appData.sprint;
  if (!currentSprint) {
    return 'Brak aktywnego sprintu do analizy.';
  }

  const cacheKey = `retrospective_${appData.user.id}_sprint_${currentSprint.week}_${currentSprint.year}`;

  return await getCachedOrFetch(cacheKey, async () => {
    const systemPrompt = getSystemPrompt(appData);
    const completedDays = currentSprint.progress.filter(d => d.checked).length;
    const userPrompt = `Sprint "${currentSprint.goal}":
    - Postęp: ${completedDays}/7 dni
    - Done: ${currentSprint.done_tasks?.length || 0} zadań
    - Blocked: ${currentSprint.blocked_tasks?.length || 0} zadań

    Retrospektywa: co poszło dobrze, co poprawić, jaki cel na następny tydzień?
    Odpowiedź: maksymalnie 3 zdania.`;

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    return await callGroqAPI(messages, appData.settings.ai.apiKey);
  });
};

export const generateMotivation = async (
  projectName: string,
  daysStuck: number,
  appData: AppData
): Promise<string> => {
  const cacheKey = `motivation_${projectName}_${daysStuck}_${new Date().toDateString()}`;

  return await getCachedOrFetch(cacheKey, async () => {
    const systemPrompt = getSystemPrompt(appData);
    const userPrompt = `Projekt "${projectName}" jest stuck od ${daysStuck} dni przy 90%+ completion.
  Wygeneruj motywującą wiadomość (1 zdanie) żeby pomóc zamknąć ostatnie 10%.`;

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    return await callGroqAPI(messages, appData.settings.ai.apiKey);
  });
};

// AI Chat functionality
export const chatWithAI = async (
  messages: Array<{role: 'user' | 'assistant', content: string}>,
  systemPrompt: string,
  apiKey: string
): Promise<string> => {
  const groqMessages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))
  ];

  return await callGroqAPI(groqMessages, apiKey);
};