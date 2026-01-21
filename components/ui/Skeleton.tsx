import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

/**
 * Premium Skeleton Loader with Shimmer Effect
 * Replaces ugly spinners with beautiful loading placeholders
 */
export const Skeleton = React.memo<SkeletonProps>(({ 
  className = '',
  variant = 'rectangular',
  width,
  height,
  count = 1 
}) => {
  const variantStyles = {
    text: 'h-4 rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <motion.div
      key={i}
      className={`shimmer bg-gray-800/50 ${variantStyles[variant]} ${className}`}
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: i * 0.05 }}
    />
  ));

  return count === 1 ? skeletons[0] : <div className="space-y-3">{skeletons}</div>;
});

Skeleton.displayName = 'Skeleton';

/**
 * Skeleton presets for common use cases
 */
export const SkeletonCard = () => (
  <div className="glass-card p-6 space-y-4">
    <Skeleton variant="rectangular" height={24} width="60%" />
    <Skeleton variant="text" count={3} />
    <div className="flex gap-2 mt-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
      </div>
    </div>
  </div>
);

export const SkeletonList = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);
