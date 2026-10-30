import React from 'react';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';

export interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  subtitle?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  subtitle,
  breadcrumbs,
  actions,
  badge,
  className = '',
}: PageHeaderProps) {
  const desc = description ?? subtitle;

  return (
    <div className={`mb-6 pb-4 border-b border-enp-border ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-2">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-enp-blue-deep tracking-tight font-serif break-words">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {desc && (
            <p className="mt-1 text-xs sm:text-sm text-enp-gray-medium max-w-3xl leading-relaxed break-words">
              {desc}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
