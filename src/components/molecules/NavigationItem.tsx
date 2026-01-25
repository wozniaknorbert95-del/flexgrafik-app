import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Button, Badge, Icon } from '../atoms';
import { ButtonProps } from '../atoms/Button';
import { BadgeProps } from '../atoms/Badge';
import { BaseComponentProps } from '../../types/components';

// NavigationItem specific props
export interface NavigationItemProps extends Omit<ButtonProps, 'children'> {
  icon: string;
  label: string;
  isActive?: boolean;
  badge?: string | number;
  badgeVariant?: BadgeProps['variant'];
  shortcut?: string;
  description?: string;
  showLabel?: boolean;
  layout?: 'horizontal' | 'vertical';
}

/**
 * NavigationItem Molecule Component
 * Specialized button for navigation with active states, badges, and shortcuts
 */
export const NavigationItem = forwardRef<HTMLButtonElement, NavigationItemProps>(
  (
    {
      icon,
      label,
      isActive = false,
      badge,
      badgeVariant = 'danger',
      shortcut,
      description,
      showLabel = true,
      layout = 'vertical',
      variant = 'secondary',
      size = 'md',
      className = '',
      onClick,
      'aria-label': ariaLabel,
      'data-testid': testId,
      ...buttonProps
    },
    ref
  ) => {
    // Generate accessible label
    const accessibleLabel =
      ariaLabel ||
      `${label}${description ? ` - ${description}` : ''}${shortcut ? ` (Shortcut: ${shortcut})` : ''}`;

    // Dynamic classes based on state
    const dynamicClasses = `
    relative w-full
    ${
      isActive
        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400/50 shadow-lg shadow-cyan-500/25'
        : 'hover:bg-white/10 border-transparent hover:border-white/20'
    }
    ${layout === 'horizontal' ? 'flex-row items-center gap-3 px-4 py-3' : 'flex-col items-center gap-1 px-3 py-4'}
  `.trim();

    return (
      <motion.div className="relative" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          ref={ref}
          variant={isActive ? 'primary' : variant}
          size={size}
          className={`${dynamicClasses} ${className}`}
          onClick={onClick}
          aria-label={accessibleLabel}
          aria-current={isActive ? 'page' : undefined}
          data-testid={testId}
          {...buttonProps}
        >
          {/* Icon with active state animation */}
          <motion.div
            className="relative"
            animate={
              isActive
                ? {
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }
                : {}
            }
            transition={{
              duration: 0.6,
              repeat: isActive ? Infinity : 0,
              repeatDelay: 3,
            }}
          >
            <Icon
              name={icon}
              size={layout === 'horizontal' ? 'md' : 'lg'}
              variant={isActive ? 'primary' : 'secondary'}
              glow={isActive}
              pulse={isActive}
            />

            {/* Active indicator glow */}
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(0,243,255,0.3) 0%, transparent 70%)',
                  filter: 'blur(8px)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </motion.div>

          {/* Label */}
          {showLabel && (
            <motion.span
              className={`
              font-semibold text-xs uppercase tracking-wider
              ${isActive ? 'text-cyan-300' : 'text-gray-400'}
              ${layout === 'horizontal' ? 'text-left flex-1' : 'text-center'}
            `}
              animate={
                isActive
                  ? {
                      textShadow: [
                        '0 0 0px currentColor',
                        '0 0 8px currentColor',
                        '0 0 0px currentColor',
                      ],
                    }
                  : {}
              }
              transition={{
                duration: 2,
                repeat: isActive ? Infinity : 0,
                ease: 'easeInOut',
              }}
            >
              {label}
            </motion.span>
          )}

          {/* Shortcut indicator */}
          {shortcut && layout === 'horizontal' && (
            <span className="text-xs text-gray-500 font-mono">{shortcut}</span>
          )}

          {/* Badge */}
          {badge && (
            <motion.div
              className={`
              ${layout === 'horizontal' ? 'absolute -top-1 -right-1' : 'absolute -top-2 -right-2'}
            `}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 15,
              }}
            >
              <Badge variant={badgeVariant} size="xs" pill animated glow>
                {badge}
              </Badge>
            </motion.div>
          )}
        </Button>

        {/* Active indicator line */}
        {isActive && layout === 'vertical' && (
          <motion.div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"
            layoutId="active-nav-indicator"
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 30,
            }}
            style={{
              boxShadow: '0 0 10px rgba(0, 243, 255, 0.8)',
            }}
          />
        )}

        {/* Tooltip for horizontal layout */}
        {description && layout === 'horizontal' && (
          <motion.div
            className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 pointer-events-none z-50 whitespace-nowrap"
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
            whileHover={{ opacity: 1 }}
          >
            {description}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
          </motion.div>
        )}
      </motion.div>
    );
  }
);

NavigationItem.displayName = 'NavigationItem';

// Navigation group component for organizing navigation items
export const NavigationGroup = forwardRef<
  HTMLDivElement,
  BaseComponentProps & {
    title?: string;
    children: React.ReactNode;
    collapsible?: boolean;
    defaultExpanded?: boolean;
  }
>(
  (
    {
      title,
      children,
      collapsible = false,
      defaultExpanded = true,
      className = '',
      'data-testid': testId,
    },
    ref
  ) => {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

    return (
      <motion.div
        ref={ref}
        className={`space-y-2 ${className}`}
        data-testid={testId}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Group header */}
        {title && (
          <div className="flex items-center justify-between px-3 py-2">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{title}</h3>
            {collapsible && (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} section`}
              >
                <Icon name={isExpanded ? 'chevronUp' : 'chevronDown'} size="xs" />
              </Button>
            )}
          </div>
        )}

        {/* Navigation items */}
        <motion.div
          className="space-y-1"
          initial={false}
          animate={{
            height: isExpanded ? 'auto' : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {children}
        </motion.div>
      </motion.div>
    );
  }
);

NavigationGroup.displayName = 'NavigationGroup';

export default NavigationItem;
