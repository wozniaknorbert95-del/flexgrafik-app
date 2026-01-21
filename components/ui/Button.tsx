import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
  children?: React.ReactNode;

  // NEW: Accessibility props
  ariaLabel?: string;  // For icon-only buttons
  isLoading?: boolean; // Loading state with aria-busy
}

export function Button({
  variant = 'tertiary',
  size = 'md',
  fullWidth = false,
  icon,
  loading = false,
  ariaLabel,
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {

  // BASE STYLES (all buttons)
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  // VARIANT STYLES - CYBERPUNK (.cursorrules compliant)
  const variantStyles = {
    // PRIMARY - Neon Magenta (main actions)
    primary: `
      relative overflow-hidden
      bg-transparent
      border-2 border-neon-magenta
      text-neon-magenta
      font-bold uppercase tracking-widest
      
      /* Neon glow on hover */
      hover:text-white
      hover:shadow-[0_0_20px_rgba(255,0,255,0.8),0_0_40px_rgba(255,0,255,0.4)]
      hover:border-glow-magenta
      
      /* Subtle background pulse */
      hover:bg-neon-magenta/10
      
      active:scale-95
      transition-all duration-300
    `,

    // SECONDARY - Neon Cyan (highlights, supporting actions)
    secondary: `
      bg-transparent
      border-2 border-neon-cyan
      text-neon-cyan
      font-semibold uppercase tracking-wide
      
      hover:text-white
      hover:shadow-[0_0_20px_rgba(0,243,255,0.8),0_0_40px_rgba(0,243,255,0.4)]
      hover:border-glow-cyan
      hover:bg-neon-cyan/10
      
      transition-all duration-300
    `,

    // TERTIARY - Subtle dark (passive actions)
    tertiary: `
      bg-dark-card/50
      border border-gray-700
      text-gray-300
      
      hover:bg-dark-card
      hover:border-gray-600
      hover:text-white
      
      transition-all duration-200
    `,

    // DANGER - Red glow (destructive actions)
    danger: `
      bg-transparent
      border-2 border-red-500
      text-red-400
      
      hover:text-white
      hover:shadow-[0_0_20px_rgba(239,68,68,0.8)]
      hover:bg-red-500/10
      
      transition-all duration-300
    `
  };

  // SIZE STYLES
  const sizeStyles = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-4 text-base min-h-[44px]', // Touch-friendly
    lg: 'h-14 px-6 text-lg min-h-[48px]'
  };

  const classes = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  return (
    <button
      className={classes}
      disabled={disabled || loading || isLoading}
      aria-label={ariaLabel}
      aria-busy={loading || isLoading}
      {...props}
    >
      {(loading || isLoading) ? (
        <>
          <span className="loading-spinner mr-2" aria-hidden="true">⟳</span>
          <span className="sr-only">Loading...</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}

// Backward compatibility export
export default React.memo(Button);