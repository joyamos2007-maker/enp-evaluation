import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { MockBanner } from '@/components/MockBanner';

export function PageIntrouvable() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MockBanner />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="text-center max-w-md animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-enp-sky mb-5">
            <FileQuestion size={36} className="text-enp-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-enp-ink mb-2">Page introuvable</h1>
          <p className="text-sm text-enp-ink-soft mb-6">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-enp-primary text-white font-semibold px-4 py-3 rounded-lg hover:bg-enp-primary-dark transition-all min-h-[44px] shadow-sm hover:shadow-card-hover"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
