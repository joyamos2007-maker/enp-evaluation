import { useEffect, useState } from 'react';
import { ApiError, api } from '@/api';

export function SecuriteCompte() {
  const [totpActive, setTotpActive] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);

  async function chargerStatut() {
    try {
      const statut = await api.statutMfa();
      setTotpActive(statut.totpActive);
    } catch (cause) {
      setErreur(cause instanceof ApiError ? cause.messages.join(' ') : 'Impossible de charger le statut MFA.');
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    void chargerStatut();
  }, []);

  async function demarrerConfiguration() {
    setEnCours(true);
    setErreur(null);
    setMessage(null);
    try {
      const resultat = await api.preparerMfaTotp();
      setSecret(resultat.secret);
      setOtpauthUrl(resultat.otpauthUrl);
    } catch (cause) {
      setErreur(cause instanceof ApiError ? cause.messages.join(' ') : 'Configuration TOTP impossible.');
    } finally {
      setEnCours(false);
    }
  }

  async function confirmer() {
    setEnCours(true);
    setErreur(null);
    try {
      if (totpActive) {
        await api.desactiverMfaTotp(code);
        setTotpActive(false);
        setMessage('L’application d’authentification a été désactivée.');
      } else {
        await api.verifierMfaTotp(code);
        setTotpActive(true);
        setMessage('L’application d’authentification est activée.');
      }
      setCode('');
      setSecret(null);
      setOtpauthUrl(null);
    } catch (cause) {
      setErreur(cause instanceof ApiError ? cause.messages.join(' ') : 'Vérification MFA impossible.');
    } finally {
      setEnCours(false);
    }
  }

  if (chargement) return <p role="status">Chargement des paramètres de sécurité…</p>;

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-enp-ink">Sécurité du compte</h1>
        <p className="mt-2 text-sm text-enp-ink-soft">
          Les profils à privilèges utilisent obligatoirement un code e-mail. Vous pouvez ajouter une application TOTP.
        </p>
      </header>
      <div className="rounded-xl border border-enp-border bg-white p-5 space-y-4">
        <h2 className="font-semibold text-enp-ink">Application d’authentification</h2>
        <p className="text-sm text-enp-ink-soft">
          Statut : {totpActive ? 'activée' : 'non configurée'}.
        </p>
        {!totpActive && !secret && (
          <button
            type="button"
            disabled={enCours}
            onClick={() => void demarrerConfiguration()}
            className="rounded-lg bg-enp-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Configurer TOTP
          </button>
        )}
        {secret && (
          <div className="space-y-3">
            <p className="text-sm">
              Saisissez cette clé dans votre application d’authentification :
              <code className="ml-2 select-all rounded bg-slate-100 px-2 py-1">{secret}</code>
            </p>
            {otpauthUrl && (
              <p className="break-all text-xs text-enp-ink-soft">URI : {otpauthUrl}</p>
            )}
          </div>
        )}
        {(secret || totpActive) && (
          <div className="flex flex-wrap gap-2">
            <label htmlFor="code-totp" className="sr-only">Code TOTP</label>
            <input
              id="code-totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Code à 6 chiffres"
              className="min-h-[44px] rounded-lg border border-enp-border px-3"
            />
            <button
              type="button"
              disabled={enCours || code.length !== 6}
              onClick={() => void confirmer()}
              className="rounded-lg bg-enp-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {totpActive ? 'Désactiver TOTP' : 'Vérifier et activer'}
            </button>
          </div>
        )}
        {message && <p className="text-sm text-enp-teal" role="status">{message}</p>}
        {erreur && <p className="text-sm text-enp-bordeaux" role="alert">{erreur}</p>}
      </div>
    </section>
  );
}
