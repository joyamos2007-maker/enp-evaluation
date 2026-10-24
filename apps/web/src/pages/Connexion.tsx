import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle, GraduationCap } from 'lucide-react';
import { api, ApiError } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { MockBanner } from '@/components/MockBanner';
import type { ChallengeMfa } from '@/api/types';

interface EtatConnexion {
  identifiant: string;
  motDePasse: string;
}

export function Connexion() {
  const { connecter } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState<EtatConnexion>({ identifiant: '', motDePasse: '' });
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [challengeMfa, setChallengeMfa] = useState<ChallengeMfa | null>(null);
  const [methodeMfa, setMethodeMfa] = useState<'email' | 'totp'>('email');
  const [codeMfa, setCodeMfa] = useState('');
  const [reinitialisation, setReinitialisation] = useState(false);
  const [codeEnvoye, setCodeEnvoye] = useState(false);
  const [identifiantReset, setIdentifiantReset] = useState('');
  const [codeReset, setCodeReset] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [messageReset, setMessageReset] = useState<string | null>(null);

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  function update(champ: keyof EtatConnexion, valeur: string) {
    setForm((f) => ({ ...f, [champ]: valeur }));
    setErreur(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      const rep = challengeMfa
        ? await api.verifierMfa({
            challengeId: challengeMfa.challengeId,
            method: methodeMfa,
            code: codeMfa,
          })
        : await api.connexion({
            identifiant: form.identifiant.trim(),
            motDePasse: form.motDePasse,
          });
      if ('mfaRequired' in rep) {
        setChallengeMfa(rep);
        setMethodeMfa(rep.methods[0]);
        return;
      }
      connecter(rep);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErreur(err.messages.join(' '));
      } else if (err instanceof TypeError) {
        setErreur('Erreur réseau : impossible de joindre le serveur.');
      } else {
        setErreur('Une erreur inattendue est survenue.');
      }
    } finally {
      setEnCours(false);
    }
  }

  async function envoyerCodeReset() {
    setEnCours(true);
    setErreur(null);
    try {
      await api.demanderReinitialisation(identifiantReset.trim());
      setCodeEnvoye(true);
      setMessageReset('Si le compte est associé à cet identifiant, un code a été envoyé.');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Envoi du code impossible.');
    } finally {
      setEnCours(false);
    }
  }

  async function confirmerReset() {
    setEnCours(true);
    setErreur(null);
    try {
      await api.confirmerReinitialisation({
        identifiant: identifiantReset.trim(),
        code: codeReset.trim(),
        motDePasse: nouveauMotDePasse,
      });
      setReinitialisation(false);
      setCodeEnvoye(false);
      setMessageReset('Mot de passe modifié. Vous pouvez vous connecter.');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Réinitialisation impossible.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MockBanner />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-enp-primary shadow-card mb-4">
              <GraduationCap size={36} className="text-white" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-enp-ink tracking-tight">
              ENP — Évaluation des enseignements
            </h1>
            <p className="text-sm text-enp-ink-soft mt-1.5">
              École Nationale Polytechnique
            </p>
          </div>

          {/* Carte de connexion */}
          <div className="bg-white rounded-2xl shadow-card border border-enp-border p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-enp-ink mb-1">
              Connexion
            </h2>
            <p className="text-sm text-enp-ink-soft mb-5">
              Accédez à votre espace avec vos identifiants institutionnels.
            </p>

            {erreur && (
              <div
                className="mb-4 flex items-start gap-2.5 rounded-xl bg-enp-bordeaux-light border border-enp-bordeaux/15 p-3.5 text-enp-bordeaux text-sm"
                role="alert"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
                <span>{erreur}</span>
              </div>
            )}

            <form onSubmit={(event) => {
              if (reinitialisation) {
                event.preventDefault();
                if (codeEnvoye) void confirmerReset();
                else void envoyerCodeReset();
                return;
              }
              void handleSubmit(event);
            }} className="space-y-5" noValidate>
              {challengeMfa ? (
                <>
                  <p className="text-sm text-enp-ink-soft">
                    Un code de sécurité a été envoyé à votre adresse institutionnelle.
                  </p>
                  {challengeMfa.methods.length > 1 && (
                    <div>
                      <label htmlFor="methodeMfa" className="block text-sm font-medium text-enp-ink mb-1.5">
                        Méthode MFA
                      </label>
                      <select
                        id="methodeMfa"
                        value={methodeMfa}
                        onChange={(event) => setMethodeMfa(event.target.value as 'email' | 'totp')}
                        className="w-full rounded-lg border border-enp-border px-3.5 py-2.5 min-h-[44px]"
                      >
                        <option value="email">Code par e-mail</option>
                        <option value="totp">Application d’authentification</option>
                      </select>
                    </div>
                  )}
                  <label htmlFor="codeMfa" className="block text-sm font-medium text-enp-ink mb-1.5">
                    Code à 6 chiffres
                  </label>
                  <input
                    id="codeMfa"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    value={codeMfa}
                    onChange={(event) => setCodeMfa(event.target.value)}
                    className="w-full rounded-lg border border-enp-border px-3.5 py-2.5 min-h-[44px]"
                  />
                </>
              ) : reinitialisation ? (
                <>
                  <label htmlFor="identifiantReset" className="block text-sm font-medium text-enp-ink mb-1.5">
                    Matricule ou e-mail
                  </label>
                  <input
                    id="identifiantReset"
                    required
                    value={identifiantReset}
                    onChange={(event) => setIdentifiantReset(event.target.value)}
                    className="w-full rounded-lg border border-enp-border px-3.5 py-2.5 min-h-[44px]"
                  />
                  {codeEnvoye && (
                    <>
                      <label htmlFor="codeReset" className="block text-sm font-medium text-enp-ink mb-1.5">
                        Code reçu par e-mail
                      </label>
                      <input
                        id="codeReset"
                        inputMode="numeric"
                        required
                        value={codeReset}
                        onChange={(event) => setCodeReset(event.target.value)}
                        className="w-full rounded-lg border border-enp-border px-3.5 py-2.5 min-h-[44px]"
                      />
                      <label htmlFor="nouveauMotDePasse" className="block text-sm font-medium text-enp-ink mb-1.5">
                        Nouveau mot de passe
                      </label>
                      <input
                        id="nouveauMotDePasse"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={12}
                        value={nouveauMotDePasse}
                        onChange={(event) => setNouveauMotDePasse(event.target.value)}
                        className="w-full rounded-lg border border-enp-border px-3.5 py-2.5 min-h-[44px]"
                      />
                    </>
                  )}
                  {messageReset && <p className="text-sm text-enp-teal" role="status">{messageReset}</p>}
                </>
              ) : (
                <>
              <div>
                <label htmlFor="identifiant" className="block text-sm font-medium text-enp-ink mb-1.5">
                  Matricule ou e-mail
                </label>
                <input
                  id="identifiant"
                  type="text"
                  autoComplete="username"
                  required
                  value={form.identifiant}
                  onChange={(e) => update('identifiant', e.target.value)}
                  className="w-full rounded-lg border border-enp-border px-3.5 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none transition-all min-h-[44px]"
                  disabled={enCours}
                />
              </div>

              <div>
                <label htmlFor="motDePasse" className="block text-sm font-medium text-enp-ink mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="motDePasse"
                    type={afficherMdp ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={form.motDePasse}
                    onChange={(e) => update('motDePasse', e.target.value)}
                    className="w-full rounded-lg border border-enp-border px-3.5 py-2.5 pr-11 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none transition-all min-h-[44px]"
                    disabled={enCours}
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
              </div>
                </>
              )}

              <button
                type="submit"
                disabled={enCours}
                className="w-full inline-flex items-center justify-center gap-2 bg-enp-primary text-white font-semibold px-4 py-3 rounded-lg hover:bg-enp-primary-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] shadow-sm hover:shadow-card-hover"
              >
                <LogIn size={20} aria-hidden="true" />
                {enCours ? 'Traitement…' : challengeMfa ? 'Vérifier le code' : reinitialisation ? (codeEnvoye ? 'Réinitialiser' : 'Envoyer le code') : 'Se connecter'}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-enp-border">
              <div className="flex items-center justify-center gap-4 text-center">
                <Link
                  to="/activation"
                  className="text-sm text-enp-primary font-medium hover:underline"
                >
                  Activer mon compte
                </Link>
                {!challengeMfa && (
                  <button
                    type="button"
                    className="text-sm text-enp-primary font-medium hover:underline"
                    onClick={() => {
                      setReinitialisation((value) => !value);
                      setCodeEnvoye(false);
                      setMessageReset(null);
                      setErreur(null);
                    }}
                  >
                    {reinitialisation ? 'Retour à la connexion' : 'Mot de passe oublié ?'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-enp-ink-soft">
            Plateforme officielle — École Nationale Polytechnique
          </p>
        </div>
      </div>
    </div>
  );
}
