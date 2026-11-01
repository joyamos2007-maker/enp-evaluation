import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
<<<<<<< Updated upstream
import { Eye, EyeOff, LogIn, AlertCircle, GraduationCap } from 'lucide-react';
import { api, ApiError } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { MockBanner } from '@/components/MockBanner';
=======
import {
  Eye,
  EyeOff,
  LogIn,
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
import { Button, Input, Alert } from '@/components/ui';
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-enp-primary shadow-card mb-4">
              <GraduationCap size={36} className="text-white" aria-hidden="true" />
=======

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
                <circle cx="80%" cy="20%" r="120" fill="none" stroke="#6D28D9" strokeWidth="1.5" />
                <circle cx="80%" cy="20%" r="80" fill="none" stroke="#6D28D9" strokeWidth="0.8" />
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
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-yellow-300 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                  <span>RÉPUBLIQUE TOGOLAISE</span>
                  <span>•</span>
                  <span>Travail, Liberté, Patrie</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-bold font-serif text-white tracking-tight leading-snug">
                  École Nationale Polytechnique
                </h2>
                <div className="w-12 h-1 bg-enp-violet" />
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
                  <ShieldCheck className="w-4 h-4 text-enp-violet shrink-0 mt-0.5" />
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
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
            {erreur && (
              <div
                className="mb-4 flex items-start gap-2.5 rounded-xl bg-enp-bordeaux-light border border-enp-bordeaux/15 p-3.5 text-enp-bordeaux text-sm"
                role="alert"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
                <span>{erreur}</span>
=======
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
                    onClick={() => preRemplir('DEMO-ETU', 'demo-etudiant-2026')}
                    className="text-[11px] px-2 py-1 bg-white border border-enp-border text-enp-black hover:border-enp-blue-primary hover:bg-enp-blue-light font-medium"
                  >
                    Étudiant
                  </button>
                  <button
                    type="button"
                    onClick={() => preRemplir('DEMO-DEL', 'demo-delegue-2026')}
                    className="text-[11px] px-2 py-1 bg-white border border-enp-border text-enp-black hover:border-enp-blue-primary hover:bg-enp-blue-light font-medium"
                  >
                    Délégué
                  </button>
                  <button
                    type="button"
                    onClick={() => preRemplir('DEMO-ENS', 'demo-enseignant-2026')}
                    className="text-[11px] px-2 py-1 bg-white border border-enp-border text-enp-black hover:border-enp-blue-primary hover:bg-enp-blue-light font-medium"
                  >
                    Enseignant
                  </button>
                  <button
                    type="button"
                    onClick={() => preRemplir('DEMO-CHEF', 'demo-chef-2026')}
                    className="text-[11px] px-2 py-1 bg-white border border-enp-border text-enp-black hover:border-enp-blue-primary hover:bg-enp-blue-light font-medium"
                  >
                    Chef de Dept
                  </button>
                  <button
                    type="button"
                    onClick={() => preRemplir('DEMO-SCO', 'demo-scolarite-2026')}
                    className="text-[11px] px-2 py-1 bg-white border border-enp-border text-enp-black hover:border-enp-blue-primary hover:bg-enp-blue-light font-medium"
                  >
                    Scolarité
                  </button>
                  <button
                    type="button"
                    onClick={() => preRemplir('DEMO-DIR', 'demo-direction-2026')}
                    className="text-[11px] px-2 py-1 bg-white border border-enp-border text-enp-black hover:border-enp-blue-primary hover:bg-enp-blue-light font-medium"
                  >
                    Direction Études
                  </button>
                  <button
                    type="button"
                    onClick={() => preRemplir('DEMO-ADMIN', 'demo-admin-2026')}
                    className="text-[11px] px-2 py-1 bg-white border border-enp-border text-enp-black hover:border-enp-blue-primary hover:bg-enp-blue-light font-medium"
                  >
                    Admin
                  </button>
                </div>
>>>>>>> Stashed changes
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
