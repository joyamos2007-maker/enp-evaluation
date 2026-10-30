import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1 && !totalItems) return null;

  const startItem = totalItems !== undefined && pageSize !== undefined
    ? (currentPage - 1) * pageSize + 1
    : null;
  const endItem = totalItems !== undefined && pageSize !== undefined
    ? Math.min(currentPage * pageSize, totalItems)
    : null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 py-3 border-t border-enp-border text-xs sm:text-sm text-enp-gray-medium ${className}`}>
      <div>
        {startItem !== null && endItem !== null && totalItems !== undefined ? (
          <span>
            Affichage de <strong className="text-enp-black font-semibold">{startItem}</strong> à{' '}
            <strong className="text-enp-black font-semibold">{endItem}</strong> sur{' '}
            <strong className="text-enp-black font-semibold">{totalItems}</strong> résultats
          </span>
        ) : (
          <span>
            Page <strong className="text-enp-black font-semibold">{currentPage}</strong> sur{' '}
            <strong className="text-enp-black font-semibold">{totalPages}</strong>
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Page précédente"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Précédent
        </Button>
        <span className="px-3 py-1 bg-white border border-enp-border text-xs font-semibold text-enp-blue-deep">
          {currentPage} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Page suivante"
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}

