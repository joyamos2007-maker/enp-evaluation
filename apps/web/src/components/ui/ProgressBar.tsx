import React from 'react';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showPercent?: boolean;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = true,
  showValue,
  size = 'md',
  variant = 'primary',
  className = '',
}: ProgressBarProps) {
  const displayPercent = showValue !== undefined ? showValue : showPercent;
  const percent = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const barColors = {
    primary: 'bg-enp-blue-primary',
    success: 'bg-enp-green-valid',
    warning: 'bg-[#D97706]',
    danger: 'bg-enp-red-error',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || displayPercent) && (
        <div className="flex justify-between items-center text-xs mb-1 font-medium">
          {label && <span className="text-enp-gray-dark">{label}</span>}
          {displayPercent && <span className="text-enp-blue-deep font-semibold">{percent}%</span>}
        </div>
      )}
      <div
        className={`w-full bg-[#E2E8F0] overflow-hidden ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`${barColors[variant]} h-full transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
