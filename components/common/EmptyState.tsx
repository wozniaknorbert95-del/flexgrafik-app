/**
 * Reusable Empty State Component
 *
 * Provides consistent, actionable empty states across the app.
 * Follows "minimum complexity, maximum effectiveness" principle.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Main heading */
  title: string;
  /** Descriptive text */
  description: string;
  /** Primary action button */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Secondary action (optional) */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Optional illustration/emoji */
  illustration?: string;
}

/**
 * Empty state component with consistent styling
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  illustration,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12 px-4"
    >
      {illustration && <div className="text-6xl mb-6 animate-pulse">{illustration}</div>}

      <div className="mb-6 flex justify-center">
        <div className="p-4 rounded-full bg-neon-cyan/10 border border-neon-cyan/30">
          <Icon className="w-12 h-12 text-neon-cyan" />
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-300 max-w-md mx-auto mb-8 leading-relaxed">{description}</p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            className="btn-premium btn-cyan flex items-center gap-2 min-w-[200px] justify-center"
          >
            {primaryAction.icon && <primaryAction.icon className="w-5 h-5" />}
            {primaryAction.label}
          </button>
        )}

        {secondaryAction && (
          <button onClick={secondaryAction.onClick} className="btn-premium btn-gray text-sm">
            {secondaryAction.label}
          </button>
        )}
      </div>
    </motion.div>
  );
};
