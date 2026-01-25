import React, { useRef, useState, useEffect } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';

export interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  swipeThreshold?: number;
  className?: string;
  disabled?: boolean;
  showIndicators?: boolean;
  hapticFeedback?: boolean;
}

/**
 * Swipeable Card Component
 * Mobile-first swipe gestures with visual feedback
 */
export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  swipeThreshold = 100,
  className = '',
  disabled = false,
  showIndicators = true,
  hapticFeedback = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Transform values for visual feedback
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);
  const scale = useTransform([x, y], ([x, y]) => {
    const distance = Math.sqrt(x * x + y * y);
    return Math.max(0.95, 1 - distance / 500);
  });

  // Trigger haptic feedback
  const triggerHaptic = React.useCallback(() => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [hapticFeedback]);

  // Handle drag start
  const handleDragStart = () => {
    if (disabled) return;
    setIsDragging(true);
  };

  // Handle drag end
  const handleDragEnd = (event: any, info: PanInfo) => {
    if (disabled) return;

    setIsDragging(false);
    const { offset } = info;

    // Determine swipe direction and trigger actions
    if (Math.abs(offset.x) > swipeThreshold) {
      if (offset.x > 0 && onSwipeRight) {
        setDragDirection('right');
        onSwipeRight();
        triggerHaptic();
      } else if (offset.x < 0 && onSwipeLeft) {
        setDragDirection('left');
        onSwipeLeft();
        triggerHaptic();
      }
    } else if (Math.abs(offset.y) > swipeThreshold) {
      if (offset.y > 0 && onSwipeDown) {
        setDragDirection('down');
        onSwipeDown();
        triggerHaptic();
      } else if (offset.y < 0 && onSwipeUp) {
        setDragDirection('up');
        onSwipeUp();
        triggerHaptic();
      }
    }

    // Reset after animation
    setTimeout(() => setDragDirection(null), 300);
  };

  // Get direction indicator
  const getDirectionIndicator = () => {
    if (!showIndicators || !dragDirection) return null;

    const indicators = {
      left: { icon: '←', label: 'Swipe Left', color: 'text-red-400' },
      right: { icon: '→', label: 'Swipe Right', color: 'text-green-400' },
      up: { icon: '↑', label: 'Swipe Up', color: 'text-blue-400' },
      down: { icon: '↓', label: 'Swipe Down', color: 'text-yellow-400' },
    };

    const indicator = indicators[dragDirection];
    return (
      <motion.div
        className={`absolute inset-0 flex items-center justify-center ${indicator.color} pointer-events-none z-10`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">{indicator.icon}</div>
          <div className="text-sm font-semibold">{indicator.label}</div>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative ${className}`}
      style={{ x, y, rotateX, rotateY, scale }}
      drag={!disabled}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Swipe indicators */}
      {getDirectionIndicator()}

      {/* Card content */}
      <div className={`relative ${isDragging ? 'pointer-events-none' : ''}`}>{children}</div>

      {/* Drag feedback overlay */}
      {isDragging && (
        <motion.div
          className="absolute inset-0 bg-cyan-400/10 rounded-lg pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
    </motion.div>
  );
};

export default SwipeableCard;
