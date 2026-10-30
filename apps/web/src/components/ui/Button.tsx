import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const base =
      'inline-flex items-center justify-center font-medium transition-colors border select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enp-blue-primary focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants: Record<string, string> = {
      primary:
        'bg-enp-blue-primary hover:bg-enp-blue-dark text-white border-transparent active:bg-enp-blue-dark shadow-subtle',
      secondary:
        'bg-enp-blue-light hover:bg-[#D4E4F1] text-enp-blue-primary border-transparent active:bg-[#BED5E7]',
      outline:
        'bg-white hover:bg-enp-blue-ice text-enp-black border-enp-border hover:border-enp-blue-primary active:bg-enp-blue-light',
      danger:
        'bg-enp-red-error hover:bg-enp-red-inst text-white border-transparent active:bg-[#991B1B] shadow-subtle',
      success:
        'bg-enp-green-valid hover:bg-[#116947] text-white border-transparent active:bg-[#0E5439] shadow-subtle',
      ghost:
        'bg-transparent hover:bg-enp-blue-ice text-enp-black border-transparent active:bg-enp-blue-light',
    };

    const sizes: Record<string, string> = {
      xs: 'text-[11px] px-2 py-1 min-h-[28px] gap-1',
      sm: 'text-xs px-2.5 py-1.5 min-h-[34px] gap-1.5',
      md: 'text-sm px-4 py-2 min-h-[40px] gap-2',
      lg: 'text-base px-5 py-2.5 min-h-[46px] gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
