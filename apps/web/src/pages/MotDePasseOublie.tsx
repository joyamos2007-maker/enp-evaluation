import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Send, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/api';
import { MockBanner } from '@/components/MockBanner';
import { ENPLogo } from '@/components/ENPLogo';
import { Button, Input, Alert } from '@/components/ui';

export function MotDePasseOublie() {
  const navigate = useNavigate();
  const [identifiant, setIdentifiant] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!identifiant.trim()) {
      setErreur('Veuillez renseigner votre matricule ou adresse e-mail institutionnelle.');
      return;
    }
    setEnCours(true);
    setErreur(null);

    try {
      await api.demanderReinitialisation(identifiant.trim());
      setDemandeEnvoyee(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setErreur(err.messages.join(' '));
      } else {
        // En sécurité, on ne doit pas laisser fuiter l'existence ou non d'un compte
        setDemandeEnvoyee(true);
      }
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-enp-bg">
      <MockBanner />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-lg bg-white border border-enp-border shadow-elevated overflow-hidden">
          {/* Header institutionnel */}
          <div className="bg-enp-blue-deep text-white p-6 border-b border-[#00172E]">
            <ENPLogo variant="light" size="sm" showSubtitle={true} />
            <div className="mt-4 pt-3 border-t border-white/10">
              <h1 className="text-xl font-bold font-serif">Récupération de mot de passe</h1>
              <p className="text-xs text-slate-300 mt-1">
                Protocole de réinitialisation sécurisé pour les usagers de l'ENP.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {demandeEnvoyee ? (
              <div className="space-y-5 text-center py-4">
                <div className="w-14 h-14 bg-enp-blue-ice border border-enp-blue-primary mx-auto flex items-center justify-center text-enp-blue-primary">
                  <CheckCircle2 className="w-8 h-8 stroke-[2]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-enp-blue-deep">
                    Instructions transmises
                  </h2>
                  <p className="text-xs sm:text-sm text-enp-gray-medium max-w-md mx-auto leading-relaxed">
                    Si un compte actif correspond à cet identifiant, un code temporaire de réinitialisation
                    vous a été transmis par courrier électronique institutionnel.
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => navigate('/reinitialisation', { state: { identifiant } })}
                  >
                    Saisir le code reçu
                  </Button>
                  <Link to="/connexion">
                    <Button variant="outline" size="md">
                      Retour à la connexion
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {erreur && (
                  <Alert variant="danger" title="Erreur">
                    {erreur}
                  </Alert>
                )}

                <p className="text-xs sm:text-sm text-enp-gray-medium leading-relaxed">
                  Indiquez votre matricule officiel ou votre adresse e-mail institutionnelle.
                  Un code de réinitialisation à usage unique valable 15 minutes vous sera délivré.
                </p>

                <Input
                  label="Identifiant ou E-mail institutionnel"
                  type="text"
                  required
                  value={identifiant}
                  onChange={(e) => {
                    setIdentifiant(e.target.value);
                    setErreur(null);
                  }}
                  placeholder="Ex: 2026-001 ou prenom.nom@enp.tg"
                  startIcon={<Mail className="w-4 h-4" />}
                  disabled={enCours}
                />

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <Link
                    to="/connexion"
                    className="text-xs text-enp-blue-primary hover:text-enp-blue-deep flex items-center gap-1 font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Retour à la connexion
                  </Link>

                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={enCours}
                    leftIcon={<Send className="w-4 h-4" />}
                  >
                    Demander le code
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

