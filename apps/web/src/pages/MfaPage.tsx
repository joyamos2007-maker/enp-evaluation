import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Smartphone, Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { MockBanner } from '@/components/MockBanner';
import { ENPLogo } from '@/components/ENPLogo';
import { Button, Input, Alert } from '@/components/ui';

export function MfaPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-enp-bg">
      <MockBanner />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-md bg-white border border-enp-border shadow-elevated overflow-hidden">
          <div className="bg-enp-blue-deep text-white p-6 border-b border-[#00172E]">
            <ENPLogo variant="light" size="sm" showSubtitle={true} />
            <div className="mt-4 pt-3 border-t border-white/10">
              <h1 className="text-xl font-bold font-serif">Authentification renforcée (MFA)</h1>
              <p className="text-xs text-slate-300 mt-1">
                Protection des comptes à privilèges administratifs et pédagogiques.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-4">
            <p className="text-xs sm:text-sm text-enp-gray-medium leading-relaxed">
              Pour des raisons de conformité et de sécurité nationale, l'accès aux espaces de direction,
              scolarité et administration requiert une validation à double facteur.
            </p>

            <Alert variant="institutional" title="Sécurité renforcée">
              La vérification s’effectue automatiquement lors de votre connexion avec un code à 6 chiffres
              envoyé par e-mail ou généré via votre application TOTP.
            </Alert>

            <div className="pt-2">
              <Link to="/connexion">
                <Button variant="primary" size="md" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Retourner au formulaire de connexion
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

