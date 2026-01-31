/**
 * Time Window Selector
 *
 * Component for selecting time window (start and end time) for a declaration.
 * Handles midnight crossover and validation.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
// Note: formatTime and parseTimeToDate imported but not used in current implementation
// Keeping for potential future use
import { isTimeInWindow } from '../utils/dateHelpers';

interface TimeWindowSelectorProps {
  start: string; // HH:mm
  end: string; // HH:mm
  onChange: (start: string, end: string) => void;
  disabled?: boolean;
}

export const TimeWindowSelector: React.FC<TimeWindowSelectorProps> = ({
  start,
  end,
  onChange,
  disabled = false,
}) => {
  const [startTime, setStartTime] = useState(start);
  const [endTime, setEndTime] = useState(end);
  const [error, setError] = useState<string | null>(null);

  const validateAndUpdate = (newStart: string, newEnd: string) => {
    setError(null);

    // Validate format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newStart) || !timeRegex.test(newEnd)) {
      setError('Nieprawidłowy format czasu (użyj HH:mm)');
      return;
    }

    // Parse times
    const [startH, startM] = newStart.split(':').map(Number);
    const [endH, endM] = newEnd.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Check if valid (allow midnight crossover)
    if (startMinutes === endMinutes) {
      setError('Czas rozpoczęcia i zakończenia nie mogą być takie same');
      return;
    }

    // If not midnight crossover, start must be before end
    if (endMinutes > startMinutes) {
      // Normal case: start < end
      if (endMinutes - startMinutes < 30) {
        setError('Okno czasowe musi trwać minimum 30 minut');
        return;
      }
    } else {
      // Midnight crossover: end < start (e.g., 23:00 - 01:00)
      const totalMinutes = 24 * 60 - startMinutes + endMinutes;
      if (totalMinutes < 30) {
        setError('Okno czasowe musi trwać minimum 30 minut');
        return;
      }
    }

    setStartTime(newStart);
    setEndTime(newEnd);
    onChange(newStart, newEnd);
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    validateAndUpdate(newStart, endTime);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    validateAndUpdate(startTime, newEnd);
  };

  // Quick time presets
  const presets = [
    { label: 'Poranek', start: '09:00', end: '12:00' },
    { label: 'Południe', start: '12:00', end: '15:00' },
    { label: 'Popołudnie', start: '14:00', end: '17:00' },
    { label: 'Wieczór', start: '18:00', end: '21:00' },
  ];

  const applyPreset = (preset: (typeof presets)[0]) => {
    validateAndUpdate(preset.start, preset.end);
  };

  const isOvernight = () => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return endMinutes < startMinutes;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 border border-neon-cyan/20 rounded-lg"
    >
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-neon-cyan" />
        <h4 className="text-sm font-semibold text-white">Okno czasowe</h4>
      </div>

      <div className="space-y-3">
        {/* Time inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Od</label>
            <input
              type="time"
              value={startTime}
              onChange={handleStartChange}
              disabled={disabled}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Do</label>
            <input
              type="time"
              value={endTime}
              onChange={handleEndChange}
              disabled={disabled}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Overnight indicator */}
        {isOvernight() && (
          <div className="text-xs text-yellow-400 flex items-center gap-1">
            <span>⚠️</span>
            <span>Okno czasowe przechodzi przez północ</span>
          </div>
        )}

        {/* Error message */}
        {error && <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">{error}</div>}

        {/* Quick presets */}
        {!disabled && (
          <div>
            <label className="block text-xs text-gray-400 mb-2">Szybkie wybory:</label>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1 text-xs rounded-lg border border-gray-700 hover:border-neon-cyan text-gray-300 hover:text-neon-cyan transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
