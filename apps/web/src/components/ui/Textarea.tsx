import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  maxLengthIndicator?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, maxLengthIndicator, id, className = '', disabled, value, maxLength, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;

    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <label htmlFor={textareaId} className="block text-xs font-semibold uppercase tracking-wider text-enp-gray-dark">
              {label} {props.required && <span className="text-enp-red-error" aria-hidden="true">*</span>}
            </label>
          )}
          {maxLengthIndicator && maxLength && (
            <span className="text-xs text-enp-gray-medium">
              {charCount} / {maxLength}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          value={value}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full bg-white text-enp-black text-sm border p-3 min-h-[90px] transition-colors placeholder:text-enp-gray-medium/60 focus:outline-none focus:border-enp-blue-primary focus:ring-1 focus:ring-enp-blue-primary disabled:bg-enp-bg disabled:text-enp-gray-medium disabled:cursor-not-allowed ${
            error
              ? 'border-enp-red-error focus:border-enp-red-error focus:ring-enp-red-error'
              : 'border-enp-border hover:border-enp-gray-medium/60'
          } ${className}`}
          {...props}
        />
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

Textarea.displayName = 'Textarea';

