import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  subtext?: string;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number | string;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  label,
  title,
  value,
  subtext,
  description,
  icon,
  trend,
  variant = 'default',
  className = '',
  onClick,
}: StatCardProps) {
  const finalLabel = title ?? label ?? '';
  const finalSubtext = description ?? subtext;

  const borderVariants = {
    default: 'border-enp-border hover:border-enp-blue-primary/40',
    primary: 'border-l-4 border-l-enp-blue-primary border-t-enp-border border-r-enp-border border-b-enp-border',
    success: 'border-l-4 border-l-enp-green-valid border-t-enp-border border-r-enp-border border-b-enp-border',
    warning: 'border-l-4 border-l-[#D97706] border-t-enp-border border-r-enp-border border-b-enp-border',
    danger: 'border-l-4 border-l-enp-red-error border-t-enp-border border-r-enp-border border-b-enp-border',
  };

  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`bg-white border p-5 transition-colors overflow-hidden min-w-0 ${borderVariants[variant]} ${
        isClickable ? 'cursor-pointer hover:bg-enp-blue-ice/30' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
          {finalLabel}
        </span>
        {icon && <div className="text-enp-blue-primary shrink-0">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-enp-black font-sans break-words">
          {value}
        </span>
        {trend && (
          <span
            className={`inline-flex items-center text-xs font-semibold ${
              trend.direction === 'up'
                ? 'text-enp-green-valid'
                : trend.direction === 'down'
                ? 'text-enp-red-error'
                : 'text-enp-gray-medium'
            }`}
          >
            {trend.direction === 'up' && <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />}
            {trend.direction === 'down' && <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />}
            {trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5" aria-hidden="true" />}
            {trend.value}
          </span>
        )}
      </div>

      {finalSubtext && <p className="text-xs text-enp-gray-medium leading-relaxed">{finalSubtext}</p>}
    </div>
  );
}
