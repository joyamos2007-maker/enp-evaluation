import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { MockBanner } from '@/components/MockBanner';

export function AccesRefuse() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MockBanner />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="text-center max-w-md animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-enp-bordeaux-light mb-5">
            <ShieldAlert size={36} className="text-enp-bordeaux" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-enp-ink mb-2">Accès refusé</h1>
          <p className="text-sm text-enp-ink-soft mb-6">
            Vous n'avez pas le rôle requis pour accéder à cette page.
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
