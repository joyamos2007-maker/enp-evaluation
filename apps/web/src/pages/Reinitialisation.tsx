import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound, Lock, Eye, EyeOff } from 'lucide-react';
import { api, ApiError } from '@/api';
import { MockBanner } from '@/components/MockBanner';
import { ENPLogo } from '@/components/ENPLogo';
import { Button, Input, Alert } from '@/components/ui';

export function Reinitialisation() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialIdentifiant = (location.state as { identifiant?: string } | null)?.identifiant ?? '';

  const [identifiant, setIdentifiant] = useState(initialIdentifiant);
  const [code, setCode] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!identifiant.trim() || !code.trim() || !motDePasse) {
      setErreur('Tous les champs sont obligatoires.');
      return;
    }
    if (motDePasse.length < 12) {
      setErreur('Le mot de passe doit comporter au moins 12 caractères.');
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur('La confirmation ne correspond pas au mot de passe.');
      return;
    }

    setEnCours(true);
    setErreur(null);

    try {
      await api.confirmerReinitialisation({
        identifiant: identifiant.trim(),
        code: code.trim(),
        motDePasse,
      });
      setSucces(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setErreur(err.messages.join(' '));
      } else {
        setErreur('Code de réinitialisation invalide ou expiré.');
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
              <h1 className="text-xl font-bold font-serif">Nouveau mot de passe</h1>
              <p className="text-xs text-slate-300 mt-1">
                Finalisation de la réinitialisation avec votre code sécurisé.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {succes ? (
              <div className="space-y-5 text-center py-4">
                <div className="w-14 h-14 bg-enp-green-light border border-enp-green-valid mx-auto flex items-center justify-center text-enp-green-valid">
                  <CheckCircle2 className="w-8 h-8 stroke-[2]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-enp-blue-deep">
                    Mot de passe mis à jour
                  </h2>
                  <p className="text-xs sm:text-sm text-enp-gray-medium max-w-md mx-auto leading-relaxed">
                    Votre nouveau mot de passe est enregistré. Vous pouvez dès à présent vous reconnecter
                    en toute sécurité.
                  </p>
                </div>
                <div className="pt-2">
                  <Link to="/connexion">
                    <Button variant="primary" size="md">
                      Accéder à la connexion
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

                <Input
                  label="Identifiant ou Matricule"
                  type="text"
                  required
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                  placeholder="Ex: 2026-001 ou prenom.nom@enp.tg"
                />

                <Input
                  label="Code de réinitialisation à 6 chiffres"
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: 582910"
                  startIcon={<KeyRound className="w-4 h-4" />}
                  helperText="Code reçu par e-mail officiel."
                />

                <Input
                  label="Nouveau mot de passe"
                  type={afficherMdp ? 'text' : 'password'}
                  required
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="12 caractères minimum"
                  startIcon={<Lock className="w-4 h-4" />}
                />

                <Input
                  label="Confirmer le mot de passe"
                  type={afficherMdp ? 'text' : 'password'}
                  required
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  startIcon={<Lock className="w-4 h-4" />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setAfficherMdp((v) => !v)}
                      className="text-enp-gray-medium hover:text-enp-black"
                    >
                      {afficherMdp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <Link
                    to="/connexion"
                    className="text-xs text-enp-blue-primary hover:text-enp-blue-deep flex items-center gap-1 font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Retour à la connexion
                  </Link>

                  <Button type="submit" variant="primary" isLoading={enCours}>
                    Mettre à jour
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

