import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export interface AdaptiveGridProps {
  children: React.ReactNode;
  className?: string;
  minItemWidth?: number;
  maxColumns?: number;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  aspectRatio?: 'square' | 'video' | 'card' | 'auto';
  responsive?: boolean;
  staggerAnimation?: boolean;
  animationDelay?: number;
}

/**
 * Adaptive Grid Component
 * Responsive grid that automatically adjusts columns based on content and screen size
 */
export const AdaptiveGrid: React.FC<AdaptiveGridProps> = ({
  children,
  className = '',
  minItemWidth = 250,
  maxColumns = 6,
  gap = 'md',
  aspectRatio = 'auto',
  responsive = true,
  staggerAnimation = false,
  animationDelay = 0.1,
}) => {
  const [columns, setColumns] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Gap size mappings
  const gapSizes = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  // Aspect ratio classes
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    card: 'aspect-card',
    auto: '',
  };

  // Calculate optimal columns based on container width
  const calculateColumns = React.useCallback(
    (width: number) => {
      if (!responsive) return maxColumns;

      const availableColumns = Math.floor(width / minItemWidth);
      return Math.min(Math.max(availableColumns, 1), maxColumns);
    },
    [minItemWidth, maxColumns, responsive]
  );

  // Update columns when container resizes
  useEffect(() => {
    const updateColumns = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
        setColumns(calculateColumns(width));
      }
    };

    updateColumns();

    const resizeObserver = new ResizeObserver(updateColumns);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [calculateColumns]);

  // Convert children to array for mapping
  const childrenArray = React.Children.toArray(children);

  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerAnimation ? animationDelay : 0,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  };

  // Generate grid template columns
  const gridColumns = `repeat(${columns}, 1fr)`;

  return (
    <motion.div
      ref={containerRef}
      className={`grid ${gapSizes[gap]} ${className}`}
      style={{ gridTemplateColumns: gridColumns }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {childrenArray.map((child, index) => (
        <motion.div
          key={index}
          className={`${aspectClasses[aspectRatio]} relative`}
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Specialized grid variants for common use cases

export const CardGrid: React.FC<Omit<AdaptiveGridProps, 'aspectRatio' | 'minItemWidth'>> = (
  props
) => <AdaptiveGrid minItemWidth={280} aspectRatio="card" gap="lg" {...props} />;

export const ImageGrid: React.FC<Omit<AdaptiveGridProps, 'aspectRatio' | 'minItemWidth'>> = (
  props
) => <AdaptiveGrid minItemWidth={200} aspectRatio="square" gap="md" {...props} />;

export const ProductGrid: React.FC<Omit<AdaptiveGridProps, 'aspectRatio' | 'minItemWidth'>> = (
  props
) => (
  <AdaptiveGrid
    minItemWidth={320}
    maxColumns={4}
    aspectRatio="card"
    gap="lg"
    staggerAnimation={true}
    {...props}
  />
);

export const GalleryGrid: React.FC<Omit<AdaptiveGridProps, 'aspectRatio' | 'minItemWidth'>> = (
  props
) => (
  <AdaptiveGrid
    minItemWidth={180}
    maxColumns={8}
    aspectRatio="square"
    gap="sm"
    responsive={true}
    {...props}
  />
);

export default AdaptiveGrid;
