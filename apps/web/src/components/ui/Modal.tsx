import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
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

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="flex min-h-screen items-center justify-center p-2.5 sm:p-4 text-center">
        {/* Backdrop sombre et sobre */}
        <div
          className="fixed inset-0 bg-[#00172E]/75 backdrop-blur-xs transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Panneau modal avec bordures rectilignes (radius max 4px conformément au cahier des charges) */}
        <div
          ref={modalRef}
          className={`relative transform overflow-hidden bg-white text-left shadow-modal transition-all my-3 sm:my-8 w-full border border-enp-border ${sizeClasses[size]}`}
        >
          {/* Header officiel */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-enp-blue-ice border-b border-enp-border">
            <div className="min-w-0 pr-4">
              {title && (
                <h3 id="modal-title" className="text-base sm:text-lg font-bold text-enp-blue-deep truncate">
                  {title}
                </h3>
              )}
              {subtitle && <p className="text-xs text-enp-gray-medium mt-0.5">{subtitle}</p>}
            </div>
            <IconButton
              aria-label="Fermer la boîte de dialogue"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </IconButton>
          </div>

          {/* Corps de la modale */}
          <div className="p-4 sm:p-6 max-h-[calc(85vh-120px)] overflow-y-auto scrollbar-thin">
            {children}
          </div>

          {/* Pied de page avec actions explicites */}
          {footer && (
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-3.5 bg-enp-bg border-t border-enp-border">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

