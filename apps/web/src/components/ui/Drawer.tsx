import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  position?: 'left' | 'right';
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  position = 'left',
}: DrawerProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionClass = position === 'left' ? 'left-0' : 'right-0';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-[#17212B]/60 transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className={`fixed inset-y-0 ${positionClass} max-w-full flex`}>
        <div className="w-screen max-w-sm sm:max-w-md bg-white border-r border-enp-border flex flex-col shadow-elevated">
          {/* Header */}
          <div className="px-5 py-4 bg-enp-blue-ice border-b border-enp-border flex items-center justify-between">
            <h2 className="text-base font-bold text-enp-blue-deep">{title}</h2>
            <IconButton
              aria-label="Fermer le panneau"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </IconButton>
          </div>

          {/* Corps */}
          <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-4 bg-enp-bg border-t border-enp-border flex justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

