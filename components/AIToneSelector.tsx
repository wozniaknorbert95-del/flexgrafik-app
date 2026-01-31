import React from 'react';
import type { GoalAiTone } from '../types';

interface AIToneSelectorProps {
  value: GoalAiTone;
  onChange: (tone: GoalAiTone) => void;
}

const TONES: Array<{ value: GoalAiTone; label: string; description: string }> = [
  {
    value: 'military',
    label: 'Wojskowy',
    description: 'Surowy i konkretny. Krótkie komunikaty. Zero owijania.',
  },
  {
    value: 'psychoeducation',
    label: 'Psychoedukacyjny',
    description: 'Wyjaśnia mechanizmy ADHD, wspiera, ale trzyma ramy.',
  },
  {
    value: 'raw_facts',
    label: 'Suche fakty',
    description: 'Minimum emocji. Dane, status, następny krok.',
  },
];

export const AIToneSelector: React.FC<AIToneSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-1 gap-2">
      {TONES.map((t) => {
        const selected = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={`min-h-[56px] w-full text-left p-3 rounded-lg border transition-colors ${
              selected
                ? 'bg-neon-cyan/10 border-neon-cyan/40 text-white'
                : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
            }`}
            aria-pressed={selected}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-1 w-4 h-4 rounded-full border flex-shrink-0 ${
                  selected ? 'border-neon-cyan bg-neon-cyan' : 'border-white/30 bg-transparent'
                }`}
                aria-hidden="true"
              />
              <div className="flex-1">
                <div className="text-sm font-bold">{t.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.description}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
