import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { PremiumButton } from './ui/PremiumButton';
import { GlassCard } from './ui/GlassCard';
import { handleError } from '../utils/errorHandler';
import { ANIMATION_VARIANTS } from '../constants/design';

// Timer interfaces
export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  mode: 'work' | 'break';
  workDuration: number;
  breakDuration: number;
  remaining: number;
  sessionCount: number;
  totalTimeToday: number;
  startTime?: number;
  pauseTime?: number;
  completedAt?: number;
}

export interface TimerProps {
  initialState?: Partial<TimerState>;
  onTimerComplete?: (completedSession: TimerState) => void;
  onTimerStart?: (timerState: TimerState) => void;
  onTimerPause?: (timerState: TimerState) => void;
  onTimerReset?: () => void;
  className?: string;
}

// Default timer configuration
const DEFAULT_WORK_DURATION = 25 * 60;
const DEFAULT_BREAK_DURATION = 5 * 60;

// localStorage keys
const TIMER_STATE_KEY = 'flexgrafik-timer-state';

// Audio context for completion sound
let audioContext: AudioContext | null = null;

const Timer: React.FC<TimerProps> = ({
  initialState,
  onTimerComplete,
  onTimerStart,
  onTimerPause,
  onTimerReset,
  className = ''
}) => {
  // Timer state
  const [timerState, setTimerState] = useState<TimerState>(() => {
    const savedState = loadTimerState();
    return {
      isRunning: false,
      isPaused: false,
      mode: 'work',
      workDuration: DEFAULT_WORK_DURATION,
      breakDuration: DEFAULT_BREAK_DURATION,
      remaining: DEFAULT_WORK_DURATION,
      sessionCount: 0,
      totalTimeToday: 0,
      ...savedState,
      ...initialState
    };
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load timer state from localStorage
  function loadTimerState(): Partial<TimerState> {
    try {
      const saved = localStorage.getItem(TIMER_STATE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      handleError(error, {
        component: 'Timer',
        action: 'loadTimerState',
        userMessage: 'Failed to load timer settings'
      });
      return {};
    }
  }

  // Save timer state to localStorage
  const saveTimerState = useCallback((state: TimerState) => {
    try {
      localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      handleError(error, {
        component: 'Timer',
        action: 'saveTimerState',
        userMessage: 'Failed to save timer settings'
      });
    }
  }, []);

  // Play completion sound
  const playCompletionSound = useCallback(() => {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      handleError(error, {
        component: 'Timer',
        action: 'playCompletionSound',
        userMessage: 'Could not play timer completion sound'
      });
    }
  }, []);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate progress percentage
  const getProgressPercentage = useCallback(() => {
    const total = timerState.mode === 'work' ? timerState.workDuration : timerState.breakDuration;
    return ((total - timerState.remaining) / total) * 100;
  }, [timerState.mode, timerState.workDuration, timerState.breakDuration, timerState.remaining]);

  // Start timer
  const startTimer = useCallback(() => {
    if (timerState.isRunning) return;

    const now = Date.now();
    const newState: TimerState = {
      ...timerState,
      isRunning: true,
      isPaused: false,
      startTime: now
    };

    setTimerState(newState);
    saveTimerState(newState);

    onTimerStart?.(newState);

    intervalRef.current = setInterval(() => {
      setTimerState(current => {
        if (current.remaining <= 1) {
          const completedState: TimerState = {
            ...current,
            isRunning: false,
            isPaused: false,
            remaining: 0,
            completedAt: Date.now(),
            sessionCount: current.mode === 'work' ? current.sessionCount + 1 : current.sessionCount,
            totalTimeToday: current.mode === 'work' ? current.totalTimeToday + current.workDuration : current.totalTimeToday
          };

          playCompletionSound();

          if (completedState.mode === 'work') {
            completedState.mode = 'break';
            completedState.remaining = completedState.breakDuration;
          } else {
            completedState.mode = 'work';
            completedState.remaining = completedState.workDuration;
          }

          saveTimerState(completedState);
          onTimerComplete?.(completedState);

          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          return completedState;
        }

        const newRemaining = current.remaining - 1;
        const updatedState = { ...current, remaining: newRemaining };
        saveTimerState(updatedState);
        return updatedState;
      });
    }, 1000);
  }, [timerState, saveTimerState, playCompletionSound, onTimerStart, onTimerComplete]);

  const pauseTimer = useCallback(() => {
    if (!timerState.isRunning) return;

    const newState: TimerState = {
      ...timerState,
      isRunning: false,
      isPaused: true,
      pauseTime: Date.now()
    };

    setTimerState(newState);
    saveTimerState(newState);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    onTimerPause?.(newState);
  }, [timerState, saveTimerState, onTimerPause]);

  const resetTimer = useCallback(() => {
    const resetDuration = timerState.mode === 'work' ? timerState.workDuration : timerState.breakDuration;
    const newState: TimerState = {
      ...timerState,
      isRunning: false,
      isPaused: false,
      remaining: resetDuration,
      startTime: undefined,
      pauseTime: undefined
    };

    setTimerState(newState);
    saveTimerState(newState);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    onTimerReset?.();
  }, [timerState, saveTimerState, onTimerReset]);

  const skipSession = useCallback(() => {
    const nextMode = timerState.mode === 'work' ? 'break' : 'work';
    const nextDuration = nextMode === 'work' ? timerState.workDuration : timerState.breakDuration;

    const newState: TimerState = {
      ...timerState,
      mode: nextMode,
      remaining: nextDuration,
      isRunning: false,
      isPaused: false
    };

    setTimerState(newState);
    saveTimerState(newState);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [timerState, saveTimerState]);

  const resumeTimer = useCallback(() => {
    if (timerState.isRunning || !timerState.isPaused) return;
    startTimer();
  }, [timerState.isRunning, timerState.isPaused, startTimer]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const progressPercentage = getProgressPercentage();
  const isWorkSession = timerState.mode === 'work';
  const strokeDasharray = 2 * Math.PI * 90; // circumference
  const strokeDashoffset = strokeDasharray - (strokeDasharray * progressPercentage) / 100;

  return (
    <motion.div 
      className={`pb-24 pt-6 px-6 max-w-md mx-auto ${className}`}
      variants={ANIMATION_VARIANTS.fadeInUp}
      initial="initial"
      animate="animate"
    >
      <GlassCard 
        variant="gradient-border" 
        glowColor={isWorkSession ? 'magenta' : 'cyan'}
        className="p-8"
      >
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className={`text-3xl font-extrabold uppercase tracking-widest mb-2 ${
            isWorkSession ? 'text-glow-magenta' : 'text-glow-cyan'
          }`}>
            {isWorkSession ? '🎯 FOCUS' : '☕ BREAK'}
          </h2>
          <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-[0.2em]">
            Session {timerState.sessionCount + 1} • {formatTime(timerState.totalTimeToday)} today
          </p>
        </motion.div>

        {/* Premium Circular Progress */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          {/* SVG Circle */}
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="128"
              cy="128"
              r="90"
              stroke="var(--color-glass-light)"
              strokeWidth="8"
              fill="none"
            />
            
            {/* Progress circle with glow */}
            <motion.circle
              cx="128"
              cy="128"
              r="90"
              stroke={isWorkSession ? 'var(--color-accent-magenta)' : 'var(--color-accent-cyan)'}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              initial={{ strokeDashoffset: strokeDasharray }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                strokeDasharray,
                filter: isWorkSession 
                  ? 'drop-shadow(0 0 10px var(--color-accent-magenta))'
                  : 'drop-shadow(0 0 10px var(--color-accent-cyan))'
              }}
            />
          </svg>

          {/* Time Display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <motion.div
                className={`text-6xl font-mono font-black ${
                  isWorkSession ? 'text-glow-magenta' : 'text-glow-cyan'
                }`}
                key={timerState.remaining}
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {formatTime(timerState.remaining)}
              </motion.div>
              <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-[0.3em] mt-2 font-bold">
                {timerState.mode}
              </div>
            </div>
          </div>

          {/* Pulse animation when running */}
          {timerState.isRunning && (
            <motion.div
              className="absolute inset-0 rounded-full border-2"
              style={{
                borderColor: isWorkSession ? 'var(--color-accent-magenta)' : 'var(--color-accent-cyan)'
              }}
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </div>

        {/* Controls */}
        <motion.div 
          className="grid grid-cols-2 gap-4"
          variants={ANIMATION_VARIANTS.staggerContainer}
          initial="initial"
          animate="animate"
        >
          {!timerState.isRunning && !timerState.isPaused ? (
            <motion.div variants={ANIMATION_VARIANTS.fadeInUp} className="col-span-2">
              <PremiumButton
                variant="primary"
                size="lg"
                fullWidth
                glowColor={isWorkSession ? 'magenta' : 'cyan'}
                onClick={startTimer}
              >
                <span className="text-xl">▶</span>
                <span>Start {isWorkSession ? 'Focus' : 'Break'}</span>
              </PremiumButton>
            </motion.div>
          ) : (
            <>
              {timerState.isPaused ? (
                <motion.div variants={ANIMATION_VARIANTS.fadeInUp} className="col-span-2">
                  <PremiumButton
                    variant="primary"
                    size="lg"
                    fullWidth
                    glowColor={isWorkSession ? 'magenta' : 'cyan'}
                    onClick={resumeTimer}
                  >
                    <span className="text-xl">▶</span>
                    <span>Resume</span>
                  </PremiumButton>
                </motion.div>
              ) : (
                <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
                  <PremiumButton
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={pauseTimer}
                  >
                    <span className="text-xl">⏸</span>
                    <span>Pause</span>
                  </PremiumButton>
                </motion.div>
              )}

              <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
                <PremiumButton
                  variant="tertiary"
                  size="lg"
                  fullWidth
                  onClick={resetTimer}
                >
                  <span className="text-xl">🔄</span>
                  <span>Reset</span>
                </PremiumButton>
              </motion.div>
            </>
          )}
        </motion.div>

        {/* Skip button */}
        <motion.div 
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <PremiumButton
            variant="ghost"
            size="sm"
            onClick={skipSession}
          >
            Skip to {timerState.mode === 'work' ? 'Break' : 'Work'} →
          </PremiumButton>
        </motion.div>

        {/* Session info */}
        <motion.div 
          className="mt-6 text-center text-xs text-[var(--color-text-tertiary)] font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {timerState.mode === 'work'
            ? `${Math.floor(timerState.workDuration / 60)}min work • ${Math.floor(timerState.breakDuration / 60)}min break`
            : `${Math.floor(timerState.breakDuration / 60)}min break • Ready for work`
          }
        </motion.div>
      </GlassCard>
    </motion.div>
  );
};

export default React.memo(Timer);
