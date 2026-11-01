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
      className="bg-enp-blue-ice border border-enp-border p-4 sm:p-5 text-enp-black"
      role="note"
    >
      {titre && (
        <p className="font-semibold mb-1 flex items-center gap-2 text-enp-blue-deep">
          {icone && <Info size={18} className="text-enp-blue-primary" aria-hidden="true" />}
          {titre}
        </p>
      )}
      <div className="text-sm leading-relaxed text-enp-gray-dark">{children}</div>
    </div>
  );
}
