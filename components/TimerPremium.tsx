import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TimerProps {
  onTimerStart?: (state: any) => void;
  onTimerPause?: (state: any) => void;
  onTimerComplete?: (state: any) => void;
  onTimerReset?: () => void;
}

const TimerPremium: React.FC<TimerProps> = ({
  onTimerStart,
  onTimerPause,
  onTimerComplete,
  onTimerReset,
}) => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');

  const totalSeconds = minutes * 60 + seconds;
  const initialSeconds = mode === 'focus' ? 25 * 60 : 5 * 60;
  const progress = ((initialSeconds - totalSeconds) / initialSeconds) * 100;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && (minutes > 0 || seconds > 0)) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            setIsRunning(false);
            onTimerComplete?.({});
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, minutes, seconds, onTimerComplete]);

  const handleStart = () => {
    setIsRunning(true);
    onTimerStart?.({});
  };

  const handlePause = () => {
    setIsRunning(false);
    onTimerPause?.({});
  };

  const handleReset = () => {
    setIsRunning(false);
    setMinutes(mode === 'focus' ? 25 : 5);
    setSeconds(0);
    onTimerReset?.();
  };

  const handleModeSwitch = (newMode: 'focus' | 'break') => {
    setMode(newMode);
    setIsRunning(false);
    setMinutes(newMode === 'focus' ? 25 : 5);
    setSeconds(0);
  };

  return (
    <div className="glass-card glass-card-magenta space-widget-lg max-w-lg mx-auto">
      {/* Mode Selector */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => handleModeSwitch('focus')}
          className={`
            flex-1 py-4 rounded-widget font-bold uppercase tracking-wider 
            transition-all duration-300 text-sm
            ${
              mode === 'focus'
                ? 'bg-gradient-to-br from-neon-magenta/40 to-neon-cyan/40 border-2 border-neon-magenta text-white shadow-glow-magenta'
                : 'bg-glass-light border border-gray-700/50 text-gray-400 hover:border-neon-magenta/50 hover:text-gray-300'
            }
          `}
        >
          ⚡ Focus (25 min)
        </button>
        <button
          onClick={() => handleModeSwitch('break')}
          className={`
            flex-1 py-4 rounded-widget font-bold uppercase tracking-wider 
            transition-all duration-300 text-sm
            ${
              mode === 'break'
                ? 'bg-gradient-to-br from-neon-cyan/40 to-neon-magenta/40 border-2 border-neon-cyan text-white shadow-glow-cyan'
                : 'bg-glass-light border border-gray-700/50 text-gray-400 hover:border-neon-cyan/50 hover:text-gray-300'
            }
          `}
        >
          ☕ Break (5 min)
        </button>
      </div>

      {/* Circular Progress */}
      <div className="relative w-64 h-64 mx-auto mb-8">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="128"
            cy="128"
            r="110"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="12"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="128"
            cy="128"
            r="110"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={690}
            initial={{ strokeDashoffset: 690 }}
            animate={{ strokeDashoffset: 690 - (690 * progress) / 100 }}
            transition={{ duration: 0.5 }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff00ff" />
              <stop offset="100%" stopColor="#00f3ff" />
            </linearGradient>
          </defs>
        </svg>

        {/* Time Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            className="text-6xl font-bold font-mono tabular-nums text-white"
            animate={isRunning ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </motion.div>
          <div className="text-sm uppercase tracking-wider text-gray-500 mt-2">
            {mode === 'focus' ? 'Focus Time' : 'Break Time'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        {!isRunning ? (
          <button onClick={handleStart} className="btn-premium btn-magenta flex-1 text-lg">
            ▶️ Start
          </button>
        ) : (
          <button onClick={handlePause} className="btn-premium btn-cyan flex-1 text-lg">
            ⏸️ Pause
          </button>
        )}
        <button onClick={handleReset} className="btn-premium btn-gold px-8">
          🔄 Reset
        </button>
      </div>

      {/* Stats */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <div className="grid grid-cols-2 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-gradient-neon mb-1">
              {Math.round(progress)}%
            </div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Progress</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-glow-gold mb-1">{initialSeconds / 60}:00</div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Duration</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerPremium;
