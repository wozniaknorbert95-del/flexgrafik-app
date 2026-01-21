import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { PremiumButton } from './PremiumButton';
import { ANIMATION_VARIANTS } from '../../constants/design';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <motion.div
      className={`text-center py-16 ${className}`}
      variants={ANIMATION_VARIANTS.fadeInUp}
      initial="initial"
      animate="animate"
    >
      <GlassCard className="p-12 max-w-md mx-auto">
        {/* Animated Icon */}
        <motion.div
          className="text-7xl mb-6"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {icon}
        </motion.div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-gradient-gold mb-3">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-[var(--color-text-tertiary)] text-sm mb-6 max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        )}

        {/* Action Button */}
        {actionLabel && onAction && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <PremiumButton
              variant="primary"
              size="lg"
              glowColor="cyan"
              onClick={onAction}
            >
              {actionLabel}
            </PremiumButton>
          </motion.div>
        )}
      </GlassCard>
    </motion.div>
  );
};

export default React.memo(EmptyState);
