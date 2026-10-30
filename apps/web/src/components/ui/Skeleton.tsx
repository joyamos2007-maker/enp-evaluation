import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  variant = 'rect',
  width,
  height,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const base = 'animate-pulse bg-[#E2E8F0]';
  const variantClass = variant === 'circle' ? 'rounded-full' : '';

  return (
    <div
      className={`${base} ${variantClass} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="border border-enp-border bg-white p-5 space-y-3">
      <Skeleton height={20} width="40%" />
      <Skeleton height={14} width="80%" />
      <div className="pt-2 flex gap-2">
        <Skeleton height={32} width={90} />
        <Skeleton height={32} width={90} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="border border-enp-border bg-white p-4 space-y-3">
      <div className="flex gap-4 border-b border-enp-border pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={18} width="25%" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2 border-b border-enp-border/40 last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={16} width="25%" />
          ))}
        </div>
      ))}
    </div>
  );
}

