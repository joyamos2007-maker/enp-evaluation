import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`border border-dashed border-enp-border bg-white p-8 sm:p-12 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 bg-enp-blue-ice border border-enp-border flex items-center justify-center text-enp-blue-primary mb-3">
        {icon || <Inbox className="w-6 h-6 stroke-[1.5]" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-bold text-enp-blue-deep mb-1">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-enp-gray-medium max-w-md mx-auto mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

