import { AppData } from '../types';

// Voice queue management
let currentUtterance: SpeechSynthesisUtterance | null = null;
let voiceQueue: Array<{ text: string; priority: 'normal' | 'urgent' | 'critical'; settings: AppData['settings']['voice'] }> = [];

// Centralized voice notification utility
export const createVoiceNotify = (voiceSettings: AppData['settings']['voice']) => {
  return (text: string, priority: 'normal' | 'urgent' | 'critical' = 'normal'): void => {
    if (!voiceSettings.enabled) return;

    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // CANCEL current speech if new priority is higher
    if (priority === 'critical' && currentUtterance) {
      window.speechSynthesis.cancel();
      voiceQueue = []; // Clear queue for critical messages
    }

    // If already speaking and not critical, queue it
    if (window.speechSynthesis.speaking && priority !== 'critical') {
      voiceQueue.push({ text, priority, settings: voiceSettings });
      console.log('🎤 Voice queued:', text.substring(0, 30) + '...');
      return;
    }

    speakNow(text, priority, voiceSettings);
  };

  function speakNow(text: string, priority: 'normal' | 'urgent' | 'critical', settings: AppData['settings']['voice']) {
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;

    const voices = window.speechSynthesis.getVoices();
    const polishVoice = voices.find(voice => voice.lang.startsWith('pl'));
    const englishVoice = voices.find(voice => voice.lang.startsWith('en'));

    utterance.voice = polishVoice || englishVoice || voices[0];
    utterance.lang = polishVoice ? 'pl-PL' : 'en-US';
    utterance.volume = (settings.volume / 100) * (priority === 'normal' ? 1 : priority === 'urgent' ? 1.3 : 1.5);
    utterance.rate = settings.speed;

    if (priority === 'urgent' || priority === 'critical') {
      utterance.onend = () => {
        currentUtterance = null;

        // Process queue
        if (voiceQueue.length > 0) {
          const next = voiceQueue.shift()!;
          console.log('🎤 Processing queued voice:', next.text.substring(0, 30) + '...');
          speakNow(next.text, next.priority, next.settings);
        }
      };
    } else {
      utterance.onend = () => {
        currentUtterance = null;

        // Process queue
        if (voiceQueue.length > 0) {
          const next = voiceQueue.shift()!;
          console.log('🎤 Processing queued voice:', next.text.substring(0, 30) + '...');
          speakNow(next.text, next.priority, next.settings);
        }
      };
    }

    utterance.onerror = (event) => {
      // ONLY log if not interrupted (interrupted is normal when canceling)
      if (event.error !== 'interrupted') {
        console.error('Speech synthesis error:', event.error);
      }
      currentUtterance = null;

      // Still process queue even on error
      if (voiceQueue.length > 0) {
        const next = voiceQueue.shift()!;
        speakNow(next.text, next.priority, next.settings);
      }
    };

    console.log('🔊 Speaking:', text.substring(0, 30) + '...');
    window.speechSynthesis.speak(utterance);
  }
};

// Hook for using voice notifications in components
export const useVoiceNotify = (voiceSettings: AppData['settings']['voice']) => {
  return createVoiceNotify(voiceSettings);
};