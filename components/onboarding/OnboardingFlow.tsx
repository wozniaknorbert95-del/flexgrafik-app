/**
 * Minimal Onboarding Flow
 *
 * Simple 3-step guide for first-time users.
 * Follows "minimum complexity, maximum effectiveness" principle.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Moon, Flag, Sparkles } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: 'Witaj w FlexGrafik OS',
    description:
      'Aplikacja pomaga kończyć rzeczy, nie zaczynać nowych. Skupiamy się na domykaniu zadań, nie na planowaniu.',
    icon: '🎯',
  },
  {
    id: 2,
    title: 'Protokół wieczorny',
    description:
      'Wieczorem planujesz jutro: wybierasz zadania, ustawiasz okna czasowe i definiujesz kryteria ukończenia.',
    icon: '🌙',
    action: 'evening_protocol',
  },
  {
    id: 3,
    title: 'Tryb Domykania',
    description:
      'Rano widzisz plan i pracujesz w Trybie Domykania — skupiasz się na jednym zadaniu aż do końca.',
    icon: '🏁',
    action: 'finish_mode',
  },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-obsidian/95 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 max-w-md w-full border border-neon-cyan/30"
        style={{ borderRadius: '16px' }}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Pomiń onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicator */}
        <div className="flex gap-2 mb-6 justify-center">
          {ONBOARDING_STEPS.map((s, idx) => (
            <div
              key={s.id}
              className={`h-1 rounded-full transition-all ${
                idx === currentStep
                  ? 'bg-neon-cyan w-8'
                  : idx < currentStep
                    ? 'bg-neon-cyan/50 w-4'
                    : 'bg-gray-700 w-4'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="text-6xl mb-6">{step.icon}</div>
            <h2 className="text-2xl font-bold text-white mb-4">{step.title}</h2>
            <p className="text-gray-300 mb-8 leading-relaxed">{step.description}</p>
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-3 justify-between mt-8">
          <button onClick={handleSkip} className="btn-premium btn-gray text-sm">
            Pomiń
          </button>
          <button onClick={handleNext} className="btn-premium btn-cyan flex items-center gap-2">
            {isLastStep ? 'Zacznij' : 'Dalej'}
            {!isLastStep && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
