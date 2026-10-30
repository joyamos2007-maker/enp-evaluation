import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';

export interface DataFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

export function DataFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Rechercher par code, intitulé...',
  children,
  onReset,
  hasActiveFilters = false,
  className = '',
}: DataFiltersProps) {
  return (
    <div className={`bg-white border border-enp-border p-3.5 mb-5 ${className}`}>
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Champ de recherche rapide avec icône */}
        <div className="w-full lg:max-w-md">
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            startIcon={<Search className="w-4 h-4" />}
            endIcon={
              searchValue ? (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="p-1 hover:text-enp-black transition-colors"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Filtres contextuels (sélecteurs, dates, statuts) */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:justify-end">
          {children}
          {hasActiveFilters && onReset && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              leftIcon={<X className="w-3.5 h-3.5" />}
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

