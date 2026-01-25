/**
 * CONFIGURATION CONSTANTS
 * Centralized configuration for the Anti-Dip System
 */

// Stuck Task Detection Thresholds
export const STUCK_THRESHOLD_DAYS = 3; // Days without progress to be considered stuck
export const STUCK_PROGRESS_MIN = 90; // Minimum progress % to trigger stuck detection
export const STUCK_PROGRESS_MAX = 99; // Maximum progress % for stuck detection (below 100)

// UI Debouncing
export const PROGRESS_UPDATE_DEBOUNCE_MS = 500; // Debounce progress updates
export const API_REQUEST_TIMEOUT_MS = 10000; // API request timeout

// AI Integration
export const OLLAMA_BASE_URL = 'http://localhost:11434';
export const OLLAMA_MODEL = 'llama2';
export const AI_NUDGE_MAX_LENGTH = 200; // Max length for AI-generated nudges
export const AI_NUDGE_TEMPERATURE = 0.9;

// Database
export const DB_DATE_FORMAT = 'TIMESTAMPTZ'; // Always use timezone-aware timestamps

// UI Animations
export const STUCK_PULSE_DURATION_MS = 2000; // Stuck card pulse animation duration
export const PROGRESS_BAR_ANIMATION_MS = 800; // Progress bar animation duration

// Psychology Constants
export const COMPLETION_ENTITLEMENT_THRESHOLD = 90; // % when user feels entitled to complete
export const MICRO_STEP_DURATION_MINUTES = 5; // Standard micro-step duration
export const IMPLEMENTATION_INTENTION_TEMPLATES = [
  {
    trigger: 'pomyślę, że to już prawie gotowe',
    action: 'sprawdzę wszystkie kryteria DONE i uzupełnię brakujące',
  },
  {
    trigger: 'zechcę odłożyć zadanie na później',
    action: 'zrobię jeden mały krok (5 minut) natychmiast',
  },
  {
    trigger: 'usłyszę dzwonek telefonu',
    action: 'przypomnę sobie o wykonaniu jednego mikro-kroku',
  },
  {
    trigger: 'otworzę przeglądarkę',
    action: 'sprawdzę postęp w aplikacji i wykonam jeden krok',
  },
  {
    trigger: 'poczuję zmęczenie',
    action: 'zrobię 5-minutową przerwę i wrócę',
  },
];

// Analytics
export const ANALYTICS_RETENTION_DAYS = 90; // How long to keep task history
export const HEALTH_SCORE_STUCK_PENALTY = 10; // Points deducted per stuck task
export const HEALTH_SCORE_FAST_COMPLETION_BONUS = 20; // Bonus for completing within 7 days
