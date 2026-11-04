import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '@/api';
import { useAuth } from '@/auth/AuthContext';

export function SecuriteCompte() {
  const { deconnecter } = useAuth();
  const navigate = useNavigate();
  const [totpActive, setTotpActive] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [motDePasseActuel, setMotDePasseActuel] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');
  const [nouvelleAdresse, setNouvelleAdresse] = useState('');
  const [motDePasseEmail, setMotDePasseEmail] = useState('');
  const [codeChangementEmail, setCodeChangementEmail] = useState('');
  const [verificationEmailEnCours, setVerificationEmailEnCours] = useState(false);
  const [changementEmailEnCours, setChangementEmailEnCours] = useState(false);
  const [messageEmail, setMessageEmail] = useState<string | null>(null);
  const [erreurEmail, setErreurEmail] = useState<string | null>(null);

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

  async function changerMotDePasse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setMessage(null);
    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setErreur('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setEnCours(true);
    try {
      await api.changerMotDePasse({ motDePasseActuel, nouveauMotDePasse });
      await deconnecter();
      navigate('/connexion', { replace: true });
    } catch (cause) {
      setErreur(cause instanceof ApiError ? cause.messages.join(' ') : 'Impossible de modifier le mot de passe.');
      setEnCours(false);
    }
  }

  async function demanderChangementEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreurEmail(null);
    setMessageEmail(null);
    setChangementEmailEnCours(true);
    try {
      await api.demanderChangementEmail({
        nouvelleAdresse,
        motDePasseActuel: motDePasseEmail,
      });
      setVerificationEmailEnCours(true);
      setMessageEmail(`Un code de vérification a été envoyé à ${nouvelleAdresse}.`);
    } catch (cause) {
      setErreurEmail(
        cause instanceof ApiError
          ? cause.messages.join(' ')
          : 'Impossible d’envoyer le code de vérification.',
      );
    } finally {
      setChangementEmailEnCours(false);
    }
  }

  async function confirmerChangementEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreurEmail(null);
    setMessageEmail(null);
    setChangementEmailEnCours(true);
    try {
      await api.confirmerChangementEmail(codeChangementEmail.trim());
      await deconnecter();
      navigate('/connexion', {
        replace: true,
        state: { message: 'Adresse e-mail modifiée. Reconnectez-vous avec votre nouvelle adresse.' },
      });
    } catch (cause) {
      setErreurEmail(
        cause instanceof ApiError
          ? cause.messages.join(' ')
          : 'Impossible de vérifier le code.',
      );
    } finally {
      setChangementEmailEnCours(false);
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

      <section className="rounded-xl border border-enp-border bg-white p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-enp-ink">Changer d’adresse e-mail</h2>
          <p className="mt-1 text-sm text-enp-ink-soft">
            Un code sera envoyé à la nouvelle adresse. Elle ne sera enregistrée qu’après vérification.
            {import.meta.env.VITE_USE_MOCK === 'true' && ' En mode démo, utilisez le code 123456.'}
          </p>
        </div>
        {!verificationEmailEnCours ? (
          <form
            className="space-y-4"
            onSubmit={(event) => void demanderChangementEmail(event)}
          >
            <label className="block text-sm">
              Nouvelle adresse e-mail
              <input
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={nouvelleAdresse}
                onChange={(event) => setNouvelleAdresse(event.target.value)}
                className="mt-1 w-full rounded-lg border border-enp-border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Mot de passe actuel
              <input
                type="password"
                autoComplete="current-password"
                required
                value={motDePasseEmail}
                onChange={(event) => setMotDePasseEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-enp-border px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={changementEmailEnCours}
              className="rounded-lg bg-enp-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Envoyer le code de vérification
            </button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => void confirmerChangementEmail(event)}
          >
            <label className="block text-sm">
              Code reçu à {nouvelleAdresse}
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={codeChangementEmail}
                onChange={(event) => setCodeChangementEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-enp-border px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={changementEmailEnCours || codeChangementEmail.length !== 6}
              className="rounded-lg bg-enp-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Vérifier et changer l’adresse
            </button>
          </form>
        )}
        {messageEmail && <p className="text-sm text-enp-teal" role="status">{messageEmail}</p>}
        {erreurEmail && <p className="text-sm text-enp-bordeaux" role="alert">{erreurEmail}</p>}
      </section>

      <form
        className="rounded-xl border border-enp-border bg-white p-5 space-y-4"
        onSubmit={(event) => void changerMotDePasse(event)}
      >
        <h2 className="font-semibold text-enp-ink">Modifier le mot de passe</h2>
        <label className="block text-sm">
          Mot de passe actuel
          <input
            type="password"
            autoComplete="current-password"
            required
            value={motDePasseActuel}
            onChange={(event) => setMotDePasseActuel(event.target.value)}
            className="mt-1 w-full rounded-lg border border-enp-border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Nouveau mot de passe (12 caractères minimum)
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            value={nouveauMotDePasse}
            onChange={(event) => setNouveauMotDePasse(event.target.value)}
            className="mt-1 w-full rounded-lg border border-enp-border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Confirmer le nouveau mot de passe
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            value={confirmationMotDePasse}
            onChange={(event) => setConfirmationMotDePasse(event.target.value)}
            className="mt-1 w-full rounded-lg border border-enp-border px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={enCours}
          className="rounded-lg bg-enp-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          Modifier le mot de passe
        </button>
      </form>
    </section>
  );
}
