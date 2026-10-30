import React from 'react';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  badge,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-2 border-b border-enp-border/70 ${className}`}>
      <div className="flex items-center gap-2.5">
        <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-enp-blue-deep">
          {title}
        </h2>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {description && <p className="text-xs text-enp-gray-medium sm:hidden">{description}</p>}
    </div>
  );
}

