import React from 'react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataDrivenTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
  onRowClick?: (item: T) => void;
  caption?: string;
}

export interface CompositionalTableProps extends React.HTMLAttributes<HTMLTableElement> {
  children?: React.ReactNode;
  caption?: string;
  className?: string;
}

export type TableProps<T = unknown> = DataDrivenTableProps<T> | CompositionalTableProps;

function isDataDriven<T>(props: TableProps<T>): props is DataDrivenTableProps<T> {
  return 'columns' in props && 'data' in props;
}

export function Table<T = unknown>(props: TableProps<T>) {
  if (isDataDriven(props)) {
    const {
      columns,
      data,
      keyExtractor,
      emptyMessage = 'Aucune donnée disponible',
      isLoading = false,
      className = '',
      onRowClick,
      caption,
    } = props;

    return (
      <div className={`w-full overflow-x-auto scrollbar-thin border border-enp-border bg-white ${className}`}>
        {/* Indicateur visuel de défilement horizontal sur mobile */}
        {columns.length > 3 && (
          <div className="sm:hidden flex items-center justify-between px-3 py-1 bg-enp-blue-ice/50 border-b border-enp-border text-[10px] text-enp-gray-medium select-none">
            <span className="font-medium text-enp-blue-deep">Tableau de données</span>
            <span className="text-enp-teal font-medium flex items-center gap-1">
              ↔ Faire défiler
            </span>
          </div>
        )}
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-enp-blue-ice border-b border-enp-border">
            <tr>
              {columns.map((col) => {
                const alignClass =
                  col.align === 'center'
                    ? 'text-center'
                    : col.align === 'right'
                    ? 'text-right'
                    : 'text-left';
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3 font-semibold text-enp-blue-deep uppercase tracking-wider text-xs border-r border-enp-border/60 last:border-r-0 ${alignClass} ${col.headerClassName || ''}`}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-enp-border/70">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 bg-enp-border/60 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-enp-gray-medium text-xs sm:text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => {
                const key = keyExtractor(item, rowIndex);
                const isClickable = Boolean(onRowClick);

                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    className={`transition-colors border-b border-enp-border/50 last:border-b-0 ${
                      rowIndex % 2 === 1 ? 'bg-enp-bg/30' : 'bg-white'
                    } ${
                      isClickable
                        ? 'cursor-pointer hover:bg-enp-blue-ice/80'
                        : 'hover:bg-enp-blue-ice/40'
                    }`}
                  >
                    {columns.map((col) => {
                      const alignClass =
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right'
                          : 'text-left';
                      const content = col.render
                        ? col.render(item, rowIndex)
                        : (item as unknown as Record<string, React.ReactNode>)[col.key];

                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3 border-r border-enp-border/50 last:border-r-0 text-enp-black ${alignClass} ${col.className || ''}`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  }

  const { children, className = '', caption, ...rest } = props as CompositionalTableProps;

  return (
    <div className="w-full overflow-x-auto scrollbar-thin border border-enp-border bg-white">
      <div className="sm:hidden flex items-center justify-between px-3 py-1 bg-enp-blue-ice/50 border-b border-enp-border text-[10px] text-enp-gray-medium select-none">
        <span className="font-medium text-enp-blue-deep">Tableau de données</span>
        <span className="text-enp-teal font-medium flex items-center gap-1">
          ↔ Faire défiler
        </span>
      </div>
      <table className={`w-full text-left border-collapse text-xs sm:text-sm ${className}`} {...rest}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`bg-enp-blue-ice border-b border-enp-border ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-enp-border/70 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`transition-colors border-b border-enp-border/50 last:border-b-0 hover:bg-enp-blue-ice/40 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className = '',
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 font-semibold text-enp-blue-deep uppercase tracking-wider text-xs border-r border-enp-border/60 last:border-r-0 ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className = '',
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`px-4 py-3 border-r border-enp-border/50 last:border-r-0 text-enp-black ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}
