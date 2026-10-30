import React from 'react';

export interface RadioOption {
  value: string | number;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  value?: string | number | null;
  onChange: (value: string | number) => void;
  options: RadioOption[];
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  error?: string;
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  label,
  orientation = 'vertical',
  className = '',
  error,
}: RadioGroupProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <p className="block text-xs font-semibold uppercase tracking-wider text-enp-gray-dark mb-2">
          {label}
        </p>
      )}
      <div
        className={`flex ${
          orientation === 'horizontal' ? 'flex-wrap gap-3' : 'flex-col space-y-2'
        }`}
        role="radiogroup"
      >
        {options.map((opt) => {
          const isChecked = value === opt.value;
          const id = `${name}-${opt.value}`;

          return (
            <label
              key={String(opt.value)}
              htmlFor={id}
              className={`flex items-start gap-3 p-2.5 border cursor-pointer select-none transition-colors ${
                isChecked
                  ? 'border-enp-blue-primary bg-enp-blue-light/50 text-enp-blue-deep'
                  : 'border-enp-border bg-white hover:border-enp-gray-medium/60 text-enp-black'
              } ${opt.disabled ? 'opacity-50 cursor-not-allowed bg-enp-bg' : ''}`}
            >
              <div className="relative flex items-center h-5 mt-0.5">
                <input
                  type="radio"
                  id={id}
                  name={name}
                  value={opt.value}
                  checked={isChecked}
                  disabled={opt.disabled}
                  onChange={() => onChange(opt.value)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 border flex items-center justify-center ${
                    isChecked
                      ? 'border-enp-blue-primary bg-white'
                      : 'border-enp-border bg-white'
                  }`}
                >
                  {isChecked && (
                    <div className="w-2 h-2 bg-enp-blue-primary" />
                  )}
                </div>
              </div>
              <div className="text-sm">
                <div className="font-medium">{opt.label}</div>
                {opt.description && (
                  <div className="text-xs text-enp-gray-medium mt-0.5">{opt.description}</div>
                )}
              </div>
            </label>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-enp-red-error font-medium">{error}</p>}
    </div>
  );
}

