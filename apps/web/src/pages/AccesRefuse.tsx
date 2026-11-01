import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { MockBanner } from '@/components/MockBanner';
import { Button } from '@/components/ui';

export function AccesRefuse() {
  return (
    <div className="min-h-screen flex flex-col bg-enp-bg">
      <MockBanner />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full bg-white border border-enp-border p-8 shadow-subtle animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-enp-red-light border border-enp-red-error/30 mb-5">
            <ShieldAlert className="w-7 h-7 text-enp-red-error" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold font-serif text-enp-blue-deep mb-2">Accès refusé</h1>
          <p className="text-xs sm:text-sm text-enp-gray-medium mb-6 leading-relaxed">
            Vous ne disposez pas des habilitations nécessaires pour accéder à cet espace officiel de l'École Nationale Polytechnique.
          </p>
          <Link to="/">
            <Button variant="primary" size="md" className="w-full justify-center" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Retour au tableau de bord
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
