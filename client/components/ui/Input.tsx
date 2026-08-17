import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  className = '',
  prefixIcon,
  suffixIcon,
  ...props
}, ref) => {
  return (
    <div className="relative flex items-center w-full">
      {prefixIcon && (
        <div className="absolute left-3 text-theme-text-muted pointer-events-none flex items-center">
          {prefixIcon}
        </div>
      )}
      <input
        ref={ref}
        className={`w-full bg-theme-card border border-theme-border rounded-lg text-xs text-theme-text placeholder:text-theme-text-muted transition-colors focus:outline-none focus:border-theme-accent ${prefixIcon ? 'pl-9' : 'pl-3'} ${suffixIcon ? 'pr-9' : 'pr-3'} py-1.5 ${className}`}
        {...props}
      />
      {suffixIcon && (
        <div className="absolute right-3 text-theme-text-muted flex items-center">
          {suffixIcon}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';
