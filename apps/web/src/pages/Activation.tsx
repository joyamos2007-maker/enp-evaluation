import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, UserPlus, ArrowLeft, KeyRound } from 'lucide-react';
import { api, ApiError } from '@/api';
import { MockBanner } from '@/components/MockBanner';
import { ENPLogo } from '@/components/ENPLogo';
import { Button, Input, Alert } from '@/components/ui';

interface EtatActivation {
  identifiant: string;
  codeActivation: string;
  motDePasse: string;
  confirmation: string;
}

const LONGUEUR_MIN = 12;

export function Activation() {
  const [form, setForm] = useState<EtatActivation>({
    identifiant: '',
    codeActivation: '',
    motDePasse: '',
    confirmation: '',
  });
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [succes, setSucces] = useState(false);
  const [enCours, setEnCours] = useState(false);

  function update(champ: keyof EtatActivation, valeur: string) {
    setForm((f) => ({ ...f, [champ]: valeur }));
    setErreurs([]);
  }

  function valider(): string[] {
    const errs: string[] = [];
    if (!form.identifiant.trim()) errs.push("L'identifiant est obligatoire.");
    if (!form.codeActivation.trim()) errs.push("Le code d'activation fourni par la Scolarité est obligatoire.");
    if (form.motDePasse.length < LONGUEUR_MIN) {
      errs.push(`Le mot de passe doit comporter au moins ${LONGUEUR_MIN} caractères.`);
    }
    if (form.confirmation !== form.motDePasse) {
      errs.push('La confirmation ne correspond pas au mot de passe saisi.');
    }
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = valider();
    if (errs.length > 0) {
      setErreurs(errs);
      return;
    }
    setEnCours(true);
    setErreurs([]);
    try {
      await api.activation({
        identifiant: form.identifiant.trim(),
        codeActivation: form.codeActivation.trim(),
        motDePasse: form.motDePasse,
      });
      setSucces(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setErreurs(err.messages);
      } else {
        setErreurs(['Le code d’activation est invalide ou a expiré. Contactez la Scolarité.']);
      }
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-enp-bg">
      <MockBanner />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-xl bg-white border border-enp-border shadow-elevated overflow-hidden">
          {/* Header institutionnel */}
          <div className="bg-enp-blue-deep text-white p-6 border-b border-[#00172E]">
            <ENPLogo variant="light" size="sm" showSubtitle={true} />
            <div className="mt-4 pt-3 border-t border-white/10">
              <h1 className="text-xl font-bold font-serif">Activation de votre compte officiel</h1>
              <p className="text-xs text-slate-300 mt-1">
                Première connexion pour les étudiants, enseignants et personnels de l'ENP.
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
                    Compte activé avec succès
                  </h2>
                  <p className="text-xs sm:text-sm text-enp-gray-medium max-w-md mx-auto leading-relaxed">
                    Votre mot de passe a été enregistré. Vous pouvez dès à présent accéder à la plateforme
                    avec votre matricule institutionnel.
                  </p>
                </div>
                <div className="pt-2">
                  <Link to="/connexion">
                    <Button variant="primary" size="md">
                      Accéder à la page de connexion
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {erreurs.length > 0 && (
                  <Alert variant="danger" title="Vérification requise">
                    <ul className="list-disc list-inside space-y-0.5">
                      {erreurs.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                <Input
                  label="Identifiant ou Matricule"
                  type="text"
                  required
                  value={form.identifiant}
                  onChange={(e) => update('identifiant', e.target.value)}
                  placeholder="Ex: 2026-001 ou nom.prenom@enp.tg"
                  helperText="Matricule officiel figurant sur votre carte d'étudiant ou contrat."
                />

                <Input
                  label="Code d'activation confidentiel"
                  type="text"
                  required
                  value={form.codeActivation}
                  onChange={(e) => update('codeActivation', e.target.value)}
                  placeholder="Code temporaire à 8 ou 12 caractères"
                  startIcon={<KeyRound className="w-4 h-4" />}
                  helperText="Remis par la Scolarité Centrale lors de votre inscription."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nouveau mot de passe"
                    type={afficherMdp ? 'text' : 'password'}
                    required
                    value={form.motDePasse}
                    onChange={(e) => update('motDePasse', e.target.value)}
                    placeholder="Min. 12 caractères"
                    helperText="12 caractères minimum."
                  />
                  <Input
                    label="Confirmer le mot de passe"
                    type={afficherMdp ? 'text' : 'password'}
                    required
                    value={form.confirmation}
                    onChange={(e) => update('confirmation', e.target.value)}
                    placeholder="Répétez le mot de passe"
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
                </div>

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
                    leftIcon={<UserPlus className="w-4 h-4" />}
                  >
                    Activer mon compte
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
