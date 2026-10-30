import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Lock,
  User,
  HelpCircle,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { MockBanner } from '@/components/MockBanner';
import { ENPLogo } from '@/components/ENPLogo';
import { Button, Input, Alert } from '@/components/ui';
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

  // Étape MFA conditionnelle renvoyée par le backend (roles admin, scolarite, chef dept, etc.)
  const [challengeMfa, setChallengeMfa] = useState<ChallengeMfa | null>(null);
  const [methodeMfa, setMethodeMfa] = useState<'email' | 'totp'>('email');
  const [codeMfa, setCodeMfa] = useState('');

  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

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
      if (challengeMfa) {
        const rep = await api.verifierMfa({
          challengeId: challengeMfa.challengeId,
          method: methodeMfa,
          code: codeMfa.trim(),
        });
        connecter(rep);
        navigate(from, { replace: true });
      } else {
        const rep = await api.connexion({
          identifiant: form.identifiant.trim(),
          motDePasse: form.motDePasse,
        });

        if ('mfaRequired' in rep) {
          setChallengeMfa(rep);
          setMethodeMfa(rep.methods[0] ?? 'email');
          return;
        }

        connecter(rep);
        navigate(from, { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErreur(err.messages.join(' '));
      } else if (err instanceof TypeError) {
        setErreur('Erreur de communication : impossible de joindre le serveur API.');
      } else {
        setErreur('Identifiant ou mot de passe incorrect.');
      }
    } finally {
      setEnCours(false);
    }
  }

  // Raccourcis de connexion pour tester rapidement différents profils en mode maquette
  function preRemplir(identifiant: string, mdp: string) {
    setForm({ identifiant, motDePasse: mdp });
    setErreur(null);
    setChallengeMfa(null);
  }

  return (
    <div className="min-h-screen flex flex-col bg-enp-bg w-full max-w-full overflow-x-hidden">
      <MockBanner />

      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 lg:p-12 w-full max-w-full">
        <div className="w-full max-w-5xl bg-white border border-enp-border shadow-elevated grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* ====================================================== */}
          {/* PANNEAU INSTITUTIONNEL GAUCHE (Desktop)                 */}
          {/* ====================================================== */}
          <div className="lg:col-span-5 bg-enp-blue-deep text-white p-4 sm:p-10 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#00172E]">
            {/* Arrière-plan décoratif géométrique sobre inspiré de l'ingénierie */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#FFFFFF" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <circle cx="80%" cy="20%" r="120" fill="none" stroke="#B08D35" strokeWidth="1.5" />
                <circle cx="80%" cy="20%" r="80" fill="none" stroke="#B08D35" strokeWidth="0.8" />
                <line x1="0" y1="0" x2="100%" y2="100%" stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="4,4" />
              </svg>
            </div>

            <div className="relative z-10 space-y-4 lg:space-y-6">
              {/* En haut : Logo officiel de l'ENP */}
              <div className="pb-2 border-b border-white/10 flex items-center justify-between">
                <img
                  src="/logo-enp-white.png"
                  alt="Logo officiel École Nationale Polytechnique"
                  className="h-10 sm:h-14 w-auto object-contain"
                />
                <img
                  src="/armoiries-togo.svg"
                  alt="Armoiries de la République Togolaise"
                  className="h-9 w-auto object-contain lg:hidden"
                />
              </div>

              <div className="space-y-1 sm:space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-enp-gold text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                  <span>RÉPUBLIQUE TOGOLAISE</span>
                  <span>•</span>
                  <span>Travail, Liberté, Patrie</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-bold font-serif text-white tracking-tight leading-snug">
                  École Nationale Polytechnique
                </h2>
                <div className="w-12 h-1 bg-enp-gold" />
              </div>

              <div className="hidden lg:block space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-[#D8DEE5] uppercase tracking-wider">
                  Système Pédagogique Intégré
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Portail académique sécurisé de l'ENP garantissant l'évaluation anonyme et objective
                  des unités d'enseignement, la tenue rigoureuse du cahier de texte et le pilotage de la formation polytechnique.
                </p>
              </div>

              {/* 3 engagements institutionnels (Desktop) */}
              <div className="hidden lg:block space-y-3 pt-4 border-t border-white/10 text-xs">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-enp-gold shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Anonymat garanti & strict :</span>
                    <p className="text-slate-300">
                      Les résultats ne sont déverrouillés qu’à partir d’un seuil réglementaire de 5 répondants.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-enp-green-valid shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Cahier de texte certifié :</span>
                    <p className="text-slate-300">
                      Horodatage et traçabilité intégrale des séances et visas d’enseignements.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pied du panneau institutionnel : Armoiries de la République Togolaise en bas (Desktop) */}
            <div className="hidden lg:flex relative z-10 pt-6 mt-6 border-t border-white/10 items-center gap-3">
              <img
                src="/armoiries-togo.svg"
                alt="Armoiries de la République Togolaise"
                className="w-10 h-12 object-contain shrink-0"
              />
              <div className="text-[11px] text-slate-300">
                <p className="font-semibold text-white tracking-wide uppercase">RÉPUBLIQUE TOGOLAISE</p>
                <p className="text-slate-400">Direction des Systèmes d'Information & Scolarité Centrale</p>
              </div>
            </div>
          </div>

          {/* ====================================================== */}
          {/* FORMULAIRE DE CONNEXION DROITE                          */}
          {/* ====================================================== */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-white">
            <div>
              <div className="mb-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-enp-blue-primary block mb-1">
                  Accès Institutionnel Sécurisé
                </span>
                <h1 className="text-2xl font-bold text-enp-black tracking-tight">
                  {challengeMfa ? 'Vérification en deux étapes (MFA)' : 'Connexion à votre espace'}
                </h1>
                <p className="text-xs sm:text-sm text-enp-gray-medium mt-1">
                  {challengeMfa
                    ? 'Un code de confirmation temporaire vous a été transmis.'
                    : 'Saisissez votre matricule ou votre e-mail officiel pour vous authentifier.'}
                </p>
              </div>

              {erreur && (
                <div className="mb-5">
                  <Alert variant="danger" title="Échec de l'authentification">
                    {erreur}
                  </Alert>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {challengeMfa ? (
                  // ÉTAPE MFA
                  <div className="space-y-4">
                    {challengeMfa.methods.length > 1 && (
                      <div>
                        <label
                          htmlFor="methode-mfa"
                          className="block text-xs font-semibold uppercase tracking-wider text-enp-gray-dark mb-1.5"
                        >
                          Méthode de vérification
                        </label>
                        <select
                          id="methode-mfa"
                          value={methodeMfa}
                          onChange={(e) => setMethodeMfa(e.target.value as 'email' | 'totp')}
                          className="w-full bg-white text-enp-black text-sm border border-enp-border p-2.5 min-h-[40px] focus:outline-none focus:border-enp-blue-primary"
                        >
                          <option value="email">Code de sécurité par e-mail</option>
                          <option value="totp">Application Authenticator (TOTP)</option>
                        </select>
                      </div>
                    )}

                    <Input
                      label="Code de sécurité à 6 chiffres"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      value={codeMfa}
                      onChange={(e) => setCodeMfa(e.target.value)}
                      placeholder="Ex: 849201"
                      startIcon={<KeyRound className="w-4 h-4" />}
                      helperText="Saisissez le code à usage unique généré pour cette session."
                    />

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setChallengeMfa(null);
                          setCodeMfa('');
                        }}
                      >
                        Retour
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={enCours}
                        className="flex-1"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                      >
                        Valider l'accès
                      </Button>
                    </div>
                  </div>
                ) : (
                  // FORMULAIRE STANDARD IDENTIFIANT / MOT DE PASSE
                  <div className="space-y-4">
                    <Input
                      label="Identifiant institutionnel"
                      type="text"
                      required
                      autoComplete="username"
                      value={form.identifiant}
                      onChange={(e) => update('identifiant', e.target.value)}
                      placeholder="Matricule (ex: 2026-001) ou e-mail ENP"
                      startIcon={<User className="w-4 h-4" />}
                      disabled={enCours}
                    />

                    <div>
                      <Input
                        label="Mot de passe"
                        type={afficherMdp ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={form.motDePasse}
                        onChange={(e) => update('motDePasse', e.target.value)}
                        placeholder="••••••••••••"
                        startIcon={<Lock className="w-4 h-4" />}
                        disabled={enCours}
                        endIcon={
                          <button
                            type="button"
                            onClick={() => setAfficherMdp((v) => !v)}
                            className="p-1 text-enp-gray-medium hover:text-enp-black transition-colors"
                            aria-label={afficherMdp ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                          >
                            {afficherMdp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        }
                      />
                      <div className="flex justify-end mt-1.5">
                        <Link
                          to="/mot-de-passe-oublie"
                          className="text-xs text-enp-blue-primary hover:text-enp-blue-deep font-medium underline underline-offset-2"
                        >
                          Mot de passe oublié ?
                        </Link>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={enCours}
                      className="w-full"
                      leftIcon={<LogIn className="w-4 h-4" />}
                    >
                      Se connecter
                    </Button>
                  </div>
                )}
              </form>

              {/* Liens d'assistance & premier accès */}
              <div className="mt-6 pt-5 border-t border-enp-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-enp-gray-medium">Première connexion ? </span>
                  <Link
                    to="/activation"
                    className="font-bold text-enp-blue-primary hover:text-enp-blue-deep underline underline-offset-2"
                  >
                    Activer mon compte
                  </Link>
                </div>
                <Link
                  to="/securite"
                  className="text-enp-gray-medium hover:text-enp-black flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Assistance technique
                </Link>
              </div>
            </div>

            {/* Sélecteur de test rapide en mode maquette (pour faciliter les revues institutionnelles) */}
            {isMock && (
              <div className="mt-8 pt-4 border-t border-dashed border-enp-border bg-enp-blue-ice/60 p-3">
                <p className="text-[11px] font-bold text-enp-blue-deep uppercase tracking-wider mb-2">
                  Démonstration : Sélection d’un profil type :
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => preRemplir('student1@enp.tg', 'Enp2026!Etudiant')}
                    className="text-[11px] px-2 py-1 bg-white border border-enp-border text-enp-black hover:border-enp-blue-primary hover:bg-enp-blue-light font-medium"
                  >
                    Étudiant
                  </button>
                  <button
                    type="button"
                    onClick={() => preRemplir('delegue1@enp.tg', 'Enp2026!Delegue')}
                    className="text-[11px] px-2 py-1 bg-white border border-enp-border text-enp-black hover:border-enp-blue-primary hover:bg-enp-blue-light font-medium"
                  >
                    Délégué
                  </button>
                  <button
                    type="button"
                    onClick={() => preRemplir('prof.dupont@enp.tg', 'Enp2026!Prof')}
                    className="text-[11px] px-2 py-1 bg-white border border-enp-border text-enp-black hover:border-enp-blue-primary hover:bg-enp-blue-light font-medium"
                  >
                    Enseignant
                  </button>
                  <button
                    type="button"
                    onClick={() => preRemplir('chef.gc@enp.tg', 'Enp2026!Chef')}
                    className="text-[11px] px-2 py-1 bg-white border border-enp-border text-enp-black hover:border-enp-blue-primary hover:bg-enp-blue-light font-medium"
                  >
                    Chef de Dept
                  </button>
                  <button
                    type="button"
                    onClick={() => preRemplir('scolarite@enp.tg', 'Enp2026!Scolarite')}
                    className="text-[11px] px-2 py-1 bg-white border border-enp-border text-enp-black hover:border-enp-blue-primary hover:bg-enp-blue-light font-medium"
                  >
                    Scolarité
                  </button>
                  <button
                    type="button"
                    onClick={() => preRemplir('direction@enp.tg', 'Enp2026!Direction')}
                    className="text-[11px] px-2 py-1 bg-white border border-enp-border text-enp-black hover:border-enp-blue-primary hover:bg-enp-blue-light font-medium"
                  >
                    Direction Études
                  </button>
                  <button
                    type="button"
                    onClick={() => preRemplir('admin@enp.tg', 'Enp2026!Admin')}
                    className="text-[11px] px-2 py-1 bg-white border border-enp-border text-enp-black hover:border-enp-blue-primary hover:bg-enp-blue-light font-medium"
                  >
                    Admin
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
