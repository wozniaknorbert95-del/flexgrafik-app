type FeedbackConfig = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  volume?: number; // 0..1
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

function safeVibrate(pattern: number | number[], enabled: boolean): void {
  if (!enabled) return;
  try {
    if (typeof navigator === 'undefined') return;
    const vib = (navigator as any).vibrate;
    if (typeof vib === 'function') vib.call(navigator, pattern);
  } catch {
    // ignore
  }
}

function playTone(config: FeedbackConfig, freqHz: number, durationMs: number): void {
  if (!config.soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    const vol = Math.max(0, Math.min(1, Number(config.volume ?? 0.35)));

    osc.type = 'sine';
    osc.frequency.value = Math.max(60, Math.min(2000, freqHz));

    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    const dur = Math.max(20, durationMs) / 1000;

    // Short attack/decay envelope (no clicks)
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.01);
    gain.gain.linearRampToValueAtTime(0.0001, now + dur);

    // Resume context if suspended (mobile)
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    osc.start(now);
    osc.stop(now + dur + 0.02);
  } catch {
    // ignore
  }
}

export function triggerTaskCompleteFeedback(config: FeedbackConfig): void {
  // "Ding" + short haptic
  playTone(config, 880, 90);
  safeVibrate([10, 20, 10], config.hapticsEnabled);
}

export function triggerLevelUpFeedback(config: FeedbackConfig): void {
  // Tiny "fanfare" (no audio assets, WebAudio only)
  safeVibrate([30, 40, 30, 40, 60], config.hapticsEnabled);
  playTone(config, 523.25, 110); // C5
  setTimeout(() => playTone(config, 659.25, 110), 120); // E5
  setTimeout(() => playTone(config, 783.99, 140), 240); // G5
  setTimeout(() => playTone(config, 1046.5, 160), 390); // C6
}
