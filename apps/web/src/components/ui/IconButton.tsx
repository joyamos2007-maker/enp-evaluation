import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      children,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const base =
      'inline-flex items-center justify-center transition-colors border select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enp-blue-primary focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants: Record<string, string> = {
      primary: 'bg-enp-blue-primary hover:bg-enp-blue-deep text-white border-transparent',
      secondary: 'bg-enp-blue-light hover:bg-[#D5E5F3] text-enp-blue-deep border-transparent',
      outline: 'bg-white hover:bg-enp-blue-ice text-enp-black border-enp-border hover:border-enp-blue-primary',
      danger: 'bg-enp-red-error hover:bg-enp-red-inst text-white border-transparent',
      ghost: 'bg-transparent hover:bg-enp-blue-ice text-enp-black border-transparent',
    };

    const sizes: Record<string, string> = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : children}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';

