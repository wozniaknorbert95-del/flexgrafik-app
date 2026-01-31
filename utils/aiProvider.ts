import { AI_CONFIG } from '../constants';

function compactText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  const cleaned = input
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 1)}…` : cleaned;
}

/**
 * OpenAI-compatible text generation via chat completions (Groq/OpenAI/etc.).
 * Local-first behavior is handled by callers (fallback messaging).
 */
export async function providerGenerateText(
  params: {
    apiKey: string;
    prompt: string;
    endpoint?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    maxLen?: number;
  },
  opts?: { timeoutMs?: number }
): Promise<string | null> {
  const apiKey = (params.apiKey || '').trim();
  const prompt = (params.prompt || '').trim();
  if (!apiKey || !prompt) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 12_000);

  try {
    const response = await fetch(params.endpoint ?? AI_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: params.model ?? AI_CONFIG.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: params.temperature ?? 0.6,
        max_tokens: params.maxTokens ?? 700,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = await response.json();
    const raw =
      typeof data?.choices?.[0]?.message?.content === 'string'
        ? data.choices[0].message.content
        : '';
    const text = compactText(raw, params.maxLen ?? 700);
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
