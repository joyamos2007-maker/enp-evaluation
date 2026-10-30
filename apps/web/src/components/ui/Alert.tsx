import React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, ShieldAlert, X } from 'lucide-react';

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'institutional';
  title?: React.ReactNode;
  icon?: React.ReactNode;
  onClose?: () => void;
}

export function Alert({
  variant = 'info',
  title,
  icon,
  onClose,
  children,
  className = '',
  ...props
}: AlertProps) {
  const configs = {
    info: {
      container: 'bg-enp-blue-ice border-l-4 border-enp-blue-primary text-enp-blue-deep',
      icon: <Info className="w-5 h-5 text-enp-blue-primary shrink-0 mt-0.5" aria-hidden="true" />,
      titleColor: 'text-enp-blue-deep font-semibold',
    },
    success: {
      container: 'bg-enp-green-light border-l-4 border-enp-green-valid text-[#0F5132]',
      icon: <CheckCircle2 className="w-5 h-5 text-enp-green-valid shrink-0 mt-0.5" aria-hidden="true" />,
      titleColor: 'text-[#0F5132] font-semibold',
    },
    warning: {
      container: 'bg-[#FFFBEB] border-l-4 border-[#D97706] text-[#92400E]',
      icon: <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" aria-hidden="true" />,
      titleColor: 'text-[#92400E] font-semibold',
    },
    danger: {
      container: 'bg-enp-red-light border-l-4 border-enp-red-error text-[#7F1D1D]',
      icon: <AlertCircle className="w-5 h-5 text-enp-red-error shrink-0 mt-0.5" aria-hidden="true" />,
      titleColor: 'text-[#7F1D1D] font-semibold',
    },
    institutional: {
      container: 'bg-enp-gold-light border-l-4 border-enp-gold text-enp-black',
      icon: <ShieldAlert className="w-5 h-5 text-enp-gold shrink-0 mt-0.5" aria-hidden="true" />,
      titleColor: 'text-enp-black font-semibold',
    },
  };

  const current = configs[variant];

  return (
    <div
      role="alert"
      className={`p-4 border border-t-0 border-r-0 border-b-0 text-sm ${current.container} ${className}`}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {icon !== undefined ? icon : current.icon}
          <div className="flex-1 min-w-0">
            {title && <div className={`text-sm mb-1 break-words ${current.titleColor}`}>{title}</div>}
            <div className="text-xs sm:text-sm leading-relaxed break-words">{children}</div>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-enp-gray-medium hover:text-enp-black p-0.5 -mr-1"
            aria-label="Fermer cette alerte"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
