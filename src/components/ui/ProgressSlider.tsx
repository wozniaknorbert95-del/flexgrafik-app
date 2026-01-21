import React from 'react';

interface ProgressSliderProps {
  value: number; // 0-100
  onChange: (value: number) => void;
  disabled?: boolean;
  showLabel?: boolean;
}

export function ProgressSlider({
  value,
  onChange,
  disabled = false,
  showLabel = true
}: ProgressSliderProps) {

  // Color coding based on progress
  const getColor = () => {
    if (value === 0) return 'bg-gray-600';
    if (value < 80) return 'bg-cyan-500';
    if (value < 100) return 'bg-yellow-500'; // 80-99% = warning (stuck zone)
    return 'bg-green-500';
  };

  const getGlow = () => {
    if (value >= 80 && value < 100) {
      return 'shadow-[0_0_15px_rgba(234,179,8,0.5)]'; // Yellow glow for stuck
    }
    return '';
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-caption text-gray-400">Progress</span>
          <span className={`text-sm font-medium ${
            value >= 80 && value < 100 ? 'text-yellow-400' : 'text-gray-300'
          }`}>
            {value}%
          </span>
        </div>
      )}

      {/* Visual progress bar */}
      <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-300 ${getColor()} ${getGlow()}`}
          style={{ width: `${value}%` }}
        />

        {/* 80% marker (alert threshold) */}
        <div
          className="absolute inset-y-0 w-0.5 bg-yellow-500/50"
          style={{ left: '80%' }}
          title="Alert threshold"
        />
      </div>

      {/* Slider input */}
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-transparent cursor-pointer appearance-none slider-thumb"
        aria-label="Task progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      />

      {/* Warning message for stuck tasks */}
      {value >= 80 && value < 100 && (
        <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
          <span>⚠️</span>
          <span>Alert zone - finish this task to avoid stuck status</span>
        </p>
      )}
    </div>
  );
}