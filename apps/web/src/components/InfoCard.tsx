import type { ReactNode } from 'react';
import { Info } from 'lucide-react';

interface InfoCardProps {
  titre?: string;
  children: ReactNode;
  icone?: boolean;
}

export function InfoCard({ titre, children, icone = true }: InfoCardProps) {
  return (
    <div
      className="bg-enp-violet-light/70 border border-enp-violet/15 rounded-xl p-4 sm:p-5 text-enp-ink"
      role="note"
    >
      {titre && (
        <p className="font-semibold mb-1 flex items-center gap-2 text-enp-ink">
          {icone && <Info size={18} className="text-enp-violet" aria-hidden="true" />}
          {titre}
        </p>
      )}
      <div className="text-sm leading-relaxed text-enp-ink-soft">{children}</div>
    </div>
  );
}
