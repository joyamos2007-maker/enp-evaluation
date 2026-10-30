import React from 'react';

export interface ENPLogoProps {
  variant?: 'light' | 'dark' | 'monochrome';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  showArmoiries?: boolean;
  className?: string;
}

export function ENPLogo({
  variant = 'light',
  size = 'md',
  showSubtitle = true,
  showArmoiries = false,
  className = '',
}: ENPLogoProps) {
  const isLight = variant === 'light';

  const logoHeights = {
    sm: 'h-10 sm:h-11',
    md: 'h-12 sm:h-14',
    lg: 'h-16 sm:h-20',
  };

  const armoiriesHeights = {
    sm: 'h-9 sm:h-10',
    md: 'h-12 sm:h-14',
    lg: 'h-16 sm:h-20',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Armoiries officielles du Togo (si demandées ou en mode large) */}
      {showArmoiries && (
        <img
          src="/armoiries-togo.svg"
          alt="Armoiries officielles de la République Togolaise"
          className={`${armoiriesHeights[size]} w-auto object-contain shrink-0`}
        />
      )}

      {/* Logo officiel de l'École Nationale Polytechnique */}
      <img
        src={isLight ? '/logo-enp-white.png' : '/logo-enp-transparent.png'}
        alt="École Nationale Polytechnique (ENP)"
        className={`${logoHeights[size]} w-auto object-contain shrink-0`}
      />

      {showSubtitle && (
        <div className="hidden sm:block border-l border-white/20 pl-3">
          <span className="text-[10px] tracking-wider font-semibold text-enp-gold uppercase block">
            République Togolaise
          </span>
          <span className={`text-[10px] tracking-tight block ${isLight ? 'text-slate-300' : 'text-enp-gray-medium'}`}>
            Travail, Liberté, Patrie
          </span>
        </div>
      )}
    </div>
  );
}
