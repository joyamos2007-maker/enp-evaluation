import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react';
import { api, ApiError } from '@/api';
import { MockBanner } from '@/components/MockBanner';
import { InfoCard } from '@/components/InfoCard';

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
    if (!form.identifiant.trim()) errs.push("L'identifiant est requis.");
    if (!form.codeActivation.trim()) errs.push("Le code d'activation est requis.");
    if (form.motDePasse.length < LONGUEUR_MIN)
      errs.push(`Le mot de passe doit comporter au moins ${LONGUEUR_MIN} caractères.`);
    if (form.confirmation !== form.motDePasse)
      errs.push('La confirmation ne correspond pas au mot de passe.');
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
      } else if (err instanceof TypeError) {
        setErreurs(['Erreur réseau : impossible de joindre le serveur.']);
      } else {
        setErreurs(['Une erreur inattendue est survenue.']);
      }
    } finally {
      setEnCours(false);
    }
  }

  if (succes) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <MockBanner />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md animate-fade-in">
            <div className="bg-white rounded-2xl shadow-card border border-enp-border p-6 sm:p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-enp-teal-light mb-4">
                <CheckCircle2 size={36} className="text-enp-teal" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold text-enp-ink mb-2">
                Compte activé avec succès
              </h2>
              <p className="text-sm text-enp-ink-soft mb-6">
                Votre mot de passe a été défini. Vous pouvez maintenant vous
                connecter à la plateforme.
              </p>
              <Link
                to="/connexion"
                className="inline-flex items-center justify-center gap-2 bg-enp-primary text-white font-semibold px-4 py-3 rounded-lg hover:bg-enp-primary-dark transition-all min-h-[44px] shadow-sm hover:shadow-card-hover"
              >
                Aller à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const longueurMdp = form.motDePasse.length;
  const pct = Math.min(100, (longueurMdp / LONGUEUR_MIN) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MockBanner />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-enp-ink tracking-tight">
              Activation de compte
            </h1>
            <p className="text-sm text-enp-ink-soft mt-1.5">
              École Nationale Polytechnique
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-enp-border p-6 sm:p-8">
            {erreurs.length > 0 && (
              <div
                className="mb-4 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-3 text-enp-bordeaux text-sm"
                role="alert"
              >
                <div className="flex items-start gap-2 mb-1">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="font-medium">Veuillez corriger les erreurs suivantes :</span>
                </div>
                <ul className="list-disc list-inside pl-5 space-y-0.5">
                  {erreurs.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="identifiant" className="block text-sm font-medium text-enp-ink mb-1">
                  Matricule
                </label>
                <input
                  id="identifiant"
                  type="text"
                  required
                  value={form.identifiant}
                  onChange={(e) => update('identifiant', e.target.value)}
                  className="w-full rounded-lg border border-enp-border px-3.5 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none transition-all min-h-[44px]"
                  disabled={enCours}
                />
              </div>

              <div>
                <label htmlFor="codeActivation" className="block text-sm font-medium text-enp-ink mb-1">
                  Code d'activation
                </label>
                <input
                  id="codeActivation"
                  type="text"
                  required
                  value={form.codeActivation}
                  onChange={(e) => update('codeActivation', e.target.value)}
                  className="w-full rounded-lg border border-enp-border px-3.5 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none transition-all min-h-[44px]"
                  disabled={enCours}
                />
              </div>

              <div>
                <label htmlFor="motDePasse" className="block text-sm font-medium text-enp-ink mb-1">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    id="motDePasse"
                    type={afficherMdp ? 'text' : 'password'}
                    required
                    value={form.motDePasse}
                    onChange={(e) => update('motDePasse', e.target.value)}
                    className="w-full rounded-lg border border-enp-border px-3.5 py-2.5 pr-11 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none transition-all min-h-[44px]"
                    disabled={enCours}
                    aria-describedby="indicateur-mdp"
                  />
                  <button
                    type="button"
                    onClick={() => setAfficherMdp((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-enp-ink-soft hover:text-enp-ink hover:bg-enp-sky/60 transition-colors"
                    aria-label={afficherMdp ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    aria-pressed={afficherMdp}
                    tabIndex={-1}
                  >
                    {afficherMdp ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <div id="indicateur-mdp" className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-enp-sky overflow-hidden" aria-hidden="true">
                    <div
                      className="h-full bg-enp-primary transition-all duration-200"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-enp-ink-soft mt-1">
                    {longueurMdp}/{LONGUEUR_MIN} caractères minimum
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="confirmation" className="block text-sm font-medium text-enp-ink mb-1">
                  Confirmation
                </label>
                <input
                  id="confirmation"
                  type={afficherMdp ? 'text' : 'password'}
                  required
                  value={form.confirmation}
                  onChange={(e) => update('confirmation', e.target.value)}
                  className="w-full rounded-lg border border-enp-border px-3.5 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none transition-all min-h-[44px]"
                  disabled={enCours}
                />
              </div>

              <button
                type="submit"
                disabled={enCours}
                className="w-full inline-flex items-center justify-center gap-2 bg-enp-primary text-white font-semibold px-4 py-3 rounded-lg hover:bg-enp-primary-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] shadow-sm hover:shadow-card-hover"
              >
                <UserPlus size={20} aria-hidden="true" />
                {enCours ? 'Activation…' : 'Activer mon compte'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/connexion" className="text-sm text-enp-primary hover:underline">
                Retour à la connexion
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <InfoCard titre="Aide">
              <p>
                Le code d'activation vous a été communiqué par la Scolarité.
                Le mot de passe doit comporter au moins {LONGUEUR_MIN} caractères.
              </p>
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}
