const SECURE_KEY = 'flexgrafik_secure_settings';

interface SecureSettings {
  aiApiKey?: string;
}

const safeParse = (raw: string | null): SecureSettings => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const aiApiKey =
      typeof (parsed as any).aiApiKey === 'string' ? String((parsed as any).aiApiKey) : undefined;
    return aiApiKey ? { aiApiKey } : {};
  } catch {
    return {};
  }
};

const safeStringify = (value: SecureSettings): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
};

export const secureStorage = {
  get: (): SecureSettings => {
    try {
      const raw = localStorage.getItem(SECURE_KEY);
      return safeParse(raw);
    } catch {
      return {};
    }
  },

  set: (settings: SecureSettings): void => {
    try {
      localStorage.setItem(SECURE_KEY, safeStringify(settings));
    } catch {
      // ignore (e.g. blocked storage)
    }
  },

  getApiKey: (): string | undefined => {
    const key = secureStorage.get().aiApiKey;
    const trimmed = typeof key === 'string' ? key.trim() : '';
    return trimmed ? trimmed : undefined;
  },

  setApiKey: (key: string): void => {
    const trimmed = String(key || '').trim();
    if (!trimmed) return;
    const current = secureStorage.get();
    secureStorage.set({ ...current, aiApiKey: trimmed });
  },

  clearApiKey: (): void => {
    const current = secureStorage.get();
    if (!current.aiApiKey) return;
    const next = { ...current };
    delete next.aiApiKey;
    secureStorage.set(next);
  },
};
