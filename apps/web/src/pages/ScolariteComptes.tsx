import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Mail,
  RefreshCw,
  Search,
  Send,
  Users,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CompteAdministration, Role } from '@/api/types';
import { LIBELLES_ROLES } from '@/components/menuConfig';
import { PageHeader, Button, Alert, Badge, StatCard } from '@/components/ui';

type FiltreActivation = 'tous' | 'a_activer' | 'actives';

export function ScolariteComptes() {
  const [comptes, setComptes] = useState<CompteAdministration[]>([]);
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<FiltreActivation>('tous');
  const [filtreRole, setFiltreRole] = useState<string>('tous');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [envoiActivation, setEnvoiActivation] = useState<number | 'groupe' | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setComptes(await api.scolariteComptes());
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur réseau lors du chargement des comptes.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function envoyerActivation(compte: CompteAdministration) {
    const identifiant = compte.matricule ?? compte.email;
    if (!identifiant) {
      setErreur('Ce compte ne possède ni matricule ni adresse e-mail.');
      setConfirmation(null);
      return;
    }

    setEnvoiActivation(compte.id);
    setErreur(null);
    setConfirmation(null);
    try {
      const resultat = await api.scolariteGenererCodes({ identifiants: [identifiant] });
      if (resultat.courrielsEnfiles > 0) {
        setConfirmation(
          `Le courriel d’activation de ${compte.prenom} ${compte.nom} a été envoyé.`,
        );
      } else if (resultat.comptesSansEmail.length > 0) {
        setErreur(`Aucune adresse e-mail n’est enregistrée pour ${compte.prenom} ${compte.nom}.`);
      } else {
        setErreur(
          'Aucun code n’a été généré. Le compte est peut-être déjà activé ou hors de votre périmètre.',
        );
      }
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Erreur réseau lors de l’envoi du code d’activation.',
      );
    } finally {
      setEnvoiActivation(null);
    }
  }

  const comptesFiltres = useMemo(() => {
    const q = recherche.trim().toLocaleLowerCase();
    return comptes.filter((compte) => {
      if (filtreStatut === 'a_activer' && compte.motDePasseConfigure) return false;
      if (filtreStatut === 'actives' && !compte.motDePasseConfigure) return false;
      if (filtreRole !== 'tous' && !compte.roles.includes(filtreRole as Role)) return false;
      if (!q) return true;
      return [compte.matricule, compte.email, compte.nom, compte.prenom, ...compte.roles].some(
        (valeur) => valeur?.toLocaleLowerCase().includes(q),
      );
    });
  }, [comptes, recherche, filtreStatut, filtreRole]);

  const comptesAActiverFiltres = useMemo(
    () =>
      comptesFiltres.filter(
        (c) => !c.motDePasseConfigure && Boolean(c.email) && Boolean(c.matricule ?? c.email),
      ),
    [comptesFiltres],
  );

  async function envoyerActivationGroupee() {
    const identifiants = comptesAActiverFiltres
      .map((c) => c.matricule ?? c.email)
      .filter((id): id is string => Boolean(id));
    if (identifiants.length === 0) return;

    setEnvoiActivation('groupe');
    setErreur(null);
    setConfirmation(null);
    try {
      const resultat = await api.scolariteGenererCodes({ identifiants });
      setConfirmation(
        `${resultat.courrielsEnfiles} courriel(s) d'activation mis en file d'envoi.`,
      );
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.messages.join(' ')
          : "Erreur lors de l'envoi groupé des codes d'activation.",
      );
    } finally {
      setEnvoiActivation(null);
    }
  }

  const stats = useMemo(() => {
    const total = comptes.length;
    const actives = comptes.filter((c) => c.motDePasseConfigure).length;
    const aActiver = total - actives;
    return { total, actives, aActiver };
  }, [comptes]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in pb-6">
      <PageHeader
        title="Gestion des comptes utilisateurs"
        description="Consultez les comptes, filtrez par état d'activation et envoyez les codes d'accès par e-mail."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Gestion des comptes' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {comptesAActiverFiltres.length > 1 && (
              <Button
                variant="primary"
                size="sm"
                isLoading={envoiActivation === 'groupe'}
                leftIcon={<Send className="w-3.5 h-3.5" />}
                onClick={() => void envoyerActivationGroupee()}
              >
                Envoyer les codes ({comptesAActiverFiltres.length})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={chargement}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${chargement ? 'animate-spin' : ''}`} />}
              onClick={() => void charger()}
            >
              Actualiser
            </Button>
          </div>
        }
      />

      {confirmation && (
        <Alert variant="success" title="Envoi confirmé" onClose={() => setConfirmation(null)}>
          {confirmation}
        </Alert>
      )}

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {/* INDICATEURS SYNTHÉTIQUES */}
      {!chargement && comptes.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <StatCard
            title="Total comptes"
            value={stats.total}
            icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-enp-blue-primary" />}
            description="Périmètre autorisé"
            className="p-3 sm:p-4"
          />
          <StatCard
            title="Comptes activés"
            value={stats.actives}
            icon={<CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-enp-green-valid" />}
            description="Mot de passe défini"
            variant="success"
            className="p-3 sm:p-4"
          />
          <StatCard
            title="À activer"
            value={stats.aActiver}
            icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-enp-gold" />}
            description="En attente de code"
            variant={stats.aActiver > 0 ? 'warning' : 'default'}
            className="p-3 sm:p-4"
          />
        </div>
      )}

      {/* BARRE DE FILTRES EN 1 CLIC & RECHERCHE */}
      <div className="bg-white border border-enp-border p-4 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Onglets d'état en 1 clic */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'tous', label: `Tous (${stats.total})` },
                { id: 'a_activer', label: `À activer (${stats.aActiver})` },
                { id: 'actives', label: `Activés (${stats.actives})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFiltreStatut(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
                  filtreStatut === tab.id
                    ? 'bg-enp-blue-deep text-white border-enp-blue-deep'
                    : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrer par rôle"
              value={filtreRole}
              onChange={(e) => setFiltreRole(e.target.value)}
              className="border border-enp-border bg-white px-3 py-2 text-xs font-semibold text-enp-black focus:border-enp-blue-primary outline-none min-h-[38px]"
            >
              <option value="tous">Tous les rôles</option>
              {Object.entries(LIBELLES_ROLES).map(([cle, libelle]) => (
                <option key={cle} value={cle}>
                  {libelle}
                </option>
              ))}
            </select>

            <label className="relative block w-full sm:w-64">
              <span className="sr-only">Rechercher un compte</span>
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-enp-gray-medium"
                aria-hidden="true"
              />
              <input
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Matricule, nom, e-mail…"
                className="w-full border border-enp-border bg-white py-2 pl-9 pr-3 text-xs sm:text-sm text-enp-black outline-none focus:border-enp-blue-primary min-h-[38px]"
              />
            </label>
          </div>
        </div>
      </div>

      {chargement ? (
        <div className="bg-white border border-enp-border p-12 text-center text-sm text-enp-gray-medium">
          Chargement des comptes utilisateurs…
        </div>
      ) : (
        <div className="bg-white border border-enp-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-enp-blue-deep text-white text-xs uppercase tracking-wider">
                  <th scope="col" className="px-4 py-3 font-semibold">Identifiant</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Nom complet</th>
                  <th scope="col" className="px-4 py-3 font-semibold hidden md:table-cell">E-mail</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Rôles</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-center">Statut</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-enp-border">
                {comptesFiltres.map((compte) => (
                  <tr key={compte.id} className="hover:bg-enp-blue-ice/20 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-enp-blue-deep">
                      {compte.matricule ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-enp-black">
                      {compte.prenom} {compte.nom}
                      <span className="block md:hidden text-xs font-normal text-enp-gray-medium">
                        {compte.email ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-enp-gray-medium hidden md:table-cell">
                      {compte.email ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {compte.roles.length > 0 ? (
                          compte.roles.map((role) => (
                            <Badge key={role} variant="outline">
                              {LIBELLES_ROLES[role] ?? role}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-enp-gray-medium">Aucun rôle</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      {compte.motDePasseConfigure ? (
                        <Badge variant="success">Activé</Badge>
                      ) : (
                        <Badge variant="warning">À activer</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {!compte.motDePasseConfigure ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void envoyerActivation(compte)}
                          disabled={envoiActivation !== null || !compte.email}
                          isLoading={envoiActivation === compte.id}
                          leftIcon={<Mail className="w-3.5 h-3.5" />}
                          title={!compte.email ? 'Aucune adresse e-mail enregistrée' : undefined}
                        >
                          Envoyer le code
                        </Button>
                      ) : (
                        <span className="text-xs text-enp-gray-medium">Opérationnel</span>
                      )}
                    </td>
                  </tr>
                ))}
                {comptesFiltres.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-enp-gray-medium">
                      Aucun compte ne correspond aux critères sélectionnés.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
