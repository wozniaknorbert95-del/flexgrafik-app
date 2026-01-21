import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
}

export function Button({
  variant = 'tertiary',
  size = 'md',
  fullWidth = false,
  icon,
  loading = false,
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

  // VARIANT STYLES (visual hierarchy)
  const variantStyles = {
    // PRIMARY - Magenta glow, dominant (use ONCE per screen max)
    primary: `
      bg-gradient-to-r from-pink-600 to-fuchsia-600
      text-white font-bold uppercase tracking-wide
      shadow-[0_0_20px_rgba(255,0,128,0.5)]
      hover:shadow-[0_0_30px_rgba(255,0,128,0.7)]
      hover:scale-[1.02]
      focus:ring-pink-500
    `,

    // SECONDARY - Cyan outline, supporting actions
    secondary: `
      bg-transparent
      border-2 border-cyan-500
      text-cyan-400
      shadow-[0_0_10px_rgba(0,255,255,0.2)]
      hover:bg-cyan-500/10
      hover:shadow-[0_0_20px_rgba(0,255,255,0.4)]
      focus:ring-cyan-500
    `,

    // TERTIARY - Subtle gray, passive actions
    tertiary: `
      bg-gray-800/50
      border border-gray-700
      text-gray-300
      hover:bg-gray-700/50
      hover:border-gray-600
      focus:ring-gray-600
    `,

    // DANGER - Red, destructive actions
    danger: `
      bg-red-600/20
      border border-red-500/50
      text-red-400
      hover:bg-red-600/30
      hover:border-red-500
      focus:ring-red-500
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
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span>⏳</span>}
      {icon && !loading && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

// Backward compatibility export
export default React.memo(Button);