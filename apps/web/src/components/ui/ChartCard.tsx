import React from 'react';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  footer,
  className = '',
}: ChartCardProps) {
  return (
    <div className={`bg-white border border-enp-border flex flex-col min-w-0 w-full overflow-hidden ${className}`}>
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-enp-border bg-enp-blue-ice/40 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-bold text-enp-blue-deep break-words">{title}</h3>
          {subtitle && <p className="text-xs text-enp-gray-medium mt-0.5 break-words">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="p-3 sm:p-5 flex-1 min-h-[220px] min-w-0 w-full overflow-hidden">
        {children}
      </div>

      {footer && (
        <div className="px-5 py-3 border-t border-enp-border bg-enp-bg/50 text-xs text-enp-gray-medium">
          {footer}
        </div>
      )}
    </div>
  );
}

