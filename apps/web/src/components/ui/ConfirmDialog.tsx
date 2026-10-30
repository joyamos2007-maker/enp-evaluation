import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const content = message ?? description;
  const finalConfirmLabel = confirmText ?? confirmLabel ?? 'Confirmer';
  const finalCancelLabel = cancelText ?? cancelLabel ?? 'Annuler';

  const icons = {
    danger: <AlertCircle className="w-8 h-8 text-enp-red-error shrink-0" aria-hidden="true" />,
    warning: <AlertTriangle className="w-8 h-8 text-[#D97706] shrink-0" aria-hidden="true" />,
    primary: <Info className="w-8 h-8 text-enp-blue-primary shrink-0" aria-hidden="true" />,
  };

  const confirmVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading} className="w-full sm:w-auto">
            {finalCancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            className="w-full sm:w-auto"
          >
            {finalConfirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3 sm:gap-4 min-w-0">
        {icons[variant]}
        <div className="text-sm text-enp-black leading-relaxed break-words min-w-0 flex-1">
          {content}
        </div>
      </div>
    </Modal>
  );
}
