import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, startIcon, endIcon, id, className = '', disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-enp-gray-dark mb-1.5">
            {label} {props.required && <span className="text-enp-red-error" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {startIcon && (
            <div className="absolute left-3 pointer-events-none text-enp-gray-medium">
              {startIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full bg-white text-enp-black text-sm border px-3 py-2 min-h-[40px] transition-colors placeholder:text-enp-gray-medium/60 focus:outline-none focus:border-enp-blue-primary focus:ring-1 focus:ring-enp-blue-primary disabled:bg-enp-bg disabled:text-enp-gray-medium disabled:cursor-not-allowed ${
              startIcon ? 'pl-9' : ''
            } ${endIcon ? 'pr-9' : ''} ${
              error
                ? 'border-enp-red-error focus:border-enp-red-error focus:ring-enp-red-error'
                : 'border-enp-border hover:border-enp-gray-medium/60'
            } ${className}`}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3 flex items-center text-enp-gray-medium">
              {endIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-xs text-enp-red-error font-medium" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="mt-1 text-xs text-enp-gray-medium">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

