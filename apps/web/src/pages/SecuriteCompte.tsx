import { useEffect, useState } from 'react';
import { ShieldCheck, Smartphone, KeyRound, AlertCircle, CheckCircle2, Lock, Info } from 'lucide-react';
import { ApiError, api } from '@/api';
import { PageHeader, Button, Input, Alert, Badge } from '@/components/ui';

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
        await api.desactiverMfaTotp(code.trim());
        setTotpActive(false);
        setMessage('L’application d’authentification a été désactivée.');
      } else {
        await api.verifierMfaTotp(code.trim());
        setTotpActive(true);
        setMessage('L’application d’authentification est activée avec succès.');
      }
      setCode('');
      setSecret(null);
      setOtpauthUrl(null);
    } catch (cause) {
      setErreur(cause instanceof ApiError ? cause.messages.join(' ') : 'Le code TOTP saisi est invalide.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <PageHeader
        title="Sécurité du Compte & Authentification Renforcée"
        description="Gestion du second facteur d'authentification (MFA / TOTP) pour la protection de vos accès institutionnels"
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Sécurité & MFA' }]}
        badge={
          <Badge variant={totpActive ? 'success' : 'warning'}>
            {totpActive ? 'MFA TOTP Activé' : 'MFA TOTP Non activé'}
          </Badge>
        }
      />

      <Alert variant="institutional" title="Politique ministérielle de sécurité">
        L'authentification multifacteur (MFA) est obligatoire pour les personnels administratifs, enseignants,
        chefs de département et directeurs afin de préserver l'intégrité des délibérations et des scrutins anonymes.
      </Alert>

      {message && (
        <Alert variant="success" title="Succès">
          {message}
        </Alert>
      )}

      {erreur && (
        <Alert variant="danger" title="Alerte">
          {erreur}
        </Alert>
      )}

      <div className="bg-white border border-enp-border p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-enp-border">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-enp-blue-ice border border-enp-border text-enp-blue-primary">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-enp-blue-deep">
                Application d'authentification (TOTP)
              </h2>
              <p className="text-xs text-enp-gray-medium mt-0.5">
                Compatible avec Google Authenticator, Microsoft Authenticator, FreeOTP ou YubiKey.
              </p>
            </div>
          </div>
          <Badge variant={totpActive ? 'success' : 'neutral'}>
            {totpActive ? 'Opérationnel' : 'Inactif'}
          </Badge>
        </div>

        {totpActive ? (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-enp-gray-dark leading-relaxed">
              Une application d’authentification est actuellement liée à votre compte.
              Lors de vos connexions, un code à 6 chiffres vous sera demandé.
            </p>

            <div className="pt-2 max-w-sm space-y-3">
              <Input
                label="Confirmer le code actuel pour désactiver"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
              />
              <Button
                variant="danger"
                size="sm"
                disabled={code.length < 6}
                isLoading={enCours}
                onClick={() => void confirmer()}
              >
                Désactiver l’application TOTP
              </Button>
            </div>
          </div>
        ) : secret ? (
          <div className="space-y-4">
            <div className="p-4 bg-enp-blue-ice/50 border border-enp-border space-y-2">
              <p className="text-xs font-bold text-enp-blue-deep uppercase">
                1. Scannez le code ou saisissez la clé secrète dans votre application :
              </p>
              <p className="font-mono text-xs sm:text-sm font-bold bg-white p-2 border border-enp-border select-all inline-block break-all max-w-full">
                {secret}
              </p>
            </div>

            <div className="max-w-sm space-y-3">
              <Input
                label="2. Saisissez le code à 6 chiffres affiché par votre application"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: 489201"
                startIcon={<KeyRound className="w-4 h-4" />}
              />
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto justify-center"
                  onClick={() => {
                    setSecret(null);
                    setOtpauthUrl(null);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full sm:w-auto justify-center"
                  disabled={code.length < 6}
                  isLoading={enCours}
                  onClick={() => void confirmer()}
                >
                  Valider et activer le TOTP
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-enp-gray-dark leading-relaxed">
              Renforcez la sécurité de vos données académiques en configurant une clé d'authentification à usage unique.
            </p>
            <Button
              variant="primary"
              size="md"
              isLoading={enCours}
              onClick={() => void demarrerConfiguration()}
              leftIcon={<KeyRound className="w-4 h-4" />}
            >
              Configurer une application TOTP
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
