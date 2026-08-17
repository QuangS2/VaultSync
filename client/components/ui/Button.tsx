import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';

  const variantStyles = {
    primary: 'bg-theme-accent text-white hover:bg-theme-accent-hover active:opacity-90 shadow-sm',
    secondary: 'bg-theme-card hover:bg-theme-card-hover text-theme-text border border-theme-border active:bg-theme-bg-subtle',
    outline: 'border border-theme-border text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover',
    ghost: 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800'
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-xs px-3.5 py-1.5 gap-2',
    lg: 'text-sm px-4 py-2 gap-2.5',
    icon: 'p-1.5'
  }[size];

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : null}
      {children}
    </button>
  );
};
