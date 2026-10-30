import React from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`border-b border-enp-border ${className}`} role="tablist">
      <nav className="-mb-px flex space-x-1 sm:space-x-4 overflow-x-auto scrollbar-thin" aria-label="Onglets">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`whitespace-nowrap py-3 px-3.5 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors focus:outline-none focus-visible:bg-enp-blue-ice ${
                isActive
                  ? 'border-enp-blue-primary text-enp-blue-deep font-semibold bg-white'
                  : 'border-transparent text-enp-gray-medium hover:text-enp-black hover:border-enp-border'
              } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`ml-1 text-[11px] px-1.5 py-0.2 border ${
                    isActive
                      ? 'bg-enp-blue-light text-enp-blue-deep border-enp-blue-primary/20'
                      : 'bg-enp-bg text-enp-gray-medium border-enp-border'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

