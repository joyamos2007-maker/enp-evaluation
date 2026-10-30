import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, options, children, id, className = '', disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-enp-gray-dark mb-1.5">
            {label} {props.required && <span className="text-enp-red-error" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full appearance-none bg-white text-enp-black text-sm border px-3 py-2 pr-9 min-h-[40px] transition-colors focus:outline-none focus:border-enp-blue-primary focus:ring-1 focus:ring-enp-blue-primary disabled:bg-enp-bg disabled:text-enp-gray-medium disabled:cursor-not-allowed ${
              error
                ? 'border-enp-red-error focus:border-enp-red-error focus:ring-enp-red-error'
                : 'border-enp-border hover:border-enp-gray-medium/60'
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-enp-gray-medium">
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </div>
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

Select.displayName = 'Select';

