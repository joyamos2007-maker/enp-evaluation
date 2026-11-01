import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CompteAdministration } from '@/api/types';
import { LIBELLES_ROLES } from '@/components/menuConfig';

export function ScolariteComptes() {
  const [comptes, setComptes] = useState<CompteAdministration[]>([]);
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

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

  useEffect(() => { void charger(); }, [charger]);

  const comptesFiltres = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLocaleLowerCase();
    if (!rechercheNormalisee) return comptes;
    return comptes.filter((compte) =>
      [compte.matricule, compte.email, compte.nom, compte.prenom, ...compte.roles]
        .some((valeur) => valeur?.toLocaleLowerCase().includes(rechercheNormalisee)),
    );
  }, [comptes, recherche]);

  return (
    <div className="space-y-6">
<<<<<<< Updated upstream
      <div>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Comptes</h1>
        <p className="mt-1 text-sm text-enp-ink-soft">
          Consultez les comptes, leurs rôles et leur état d’activation.
        </p>
=======
      <PageHeader
        title="Gestion des comptes et identités"
        subtitle="Répertoire officiel des étudiants, enseignants, délégués et personnels de l'ENP."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Scolarité', href: '/scolarite' },
          { label: 'Comptes & Identités' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${chargement ? 'animate-spin' : ''}`} />}
              onClick={() => void charger()}
              disabled={chargement}
            >
              Actualiser
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={exporterCsv}
              disabled={chargement || comptesFiltres.length === 0}
            >
              Exporter CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<KeyRound className="w-3.5 h-3.5" />}
              onClick={() => void genererCodesTousSansMdp()}
              disabled={generationEnCours || nbSansMdp === 0}
            >
              Générer codes ({nbSansMdp})
            </Button>
          </div>
        }
      />

      {erreur && (
        <Alert variant="danger" title="Erreur">
          {erreur}
        </Alert>
      )}

      {nbSansMdp > 0 && (
        <div className="bg-enp-bg border-l-4 border-enp-violet border-r border-t border-b border-enp-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div>
            <p className="font-bold text-enp-blue-deep">
              {nbSansMdp} compte(s) en attente d'initialisation de mot de passe
            </p>
            <p className="text-xs text-enp-gray-medium mt-0.5">
              Ces comptes n'ont pas encore configuré leur mot de passe. Générez les fiches d'activation pour leur délivrer leur code provisoire.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<KeyRound className="w-3.5 h-3.5" />}
            onClick={() => void genererCodesTousSansMdp()}
            isLoading={generationEnCours}
          >
            Générer les codes
          </Button>
        </div>
      )}

      {/* Barre de filtres et recherche */}
      <div className="bg-white border border-enp-border p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Matricule, nom, prénom, email ou rôle..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            startIcon={<Search className="w-4 h-4 text-enp-gray-medium" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={roleFiltre}
            onChange={(e) => setRoleFiltre(e.target.value)}
            options={[
              { value: 'all', label: 'Tous les rôles' },
              { value: 'etudiant', label: 'Étudiants' },
              { value: 'delegue', label: 'Délégués' },
              { value: 'enseignant', label: 'Enseignants' },
              { value: 'chef_departement', label: 'Chefs de Département' },
              { value: 'scolarite', label: 'Scolarité centrale' },
              { value: 'direction_etudes', label: 'Direction des Études' },
              { value: 'admin', label: 'Administrateurs' },
            ]}
          />

          <Select
            value={etatFiltre}
            onChange={(e) => setEtatFiltre(e.target.value)}
            options={[
              { value: 'all', label: 'Tous les états' },
              { value: 'sans_mdp', label: 'À activer (sans mdp)' },
              { value: 'avec_mdp', label: 'Mot de passe configuré' },
              { value: 'actif', label: 'Comptes actifs' },
              { value: 'inactif', label: 'Comptes désactivés' },
            ]}
          />
        </div>
>>>>>>> Stashed changes
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Rechercher un compte</span>
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-enp-ink-soft" aria-hidden="true" />
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Matricule, nom, email ou rôle"
            className="w-full rounded-lg border border-enp-border bg-white py-2.5 pl-10 pr-3 text-sm text-enp-ink outline-none focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20"
          />
        </label>
        {!chargement && <span className="text-sm text-enp-ink-soft">{comptesFiltres.length} compte(s)</span>}
      </div>

      {erreur && (
        <div className="flex items-start gap-2 rounded-lg border border-enp-bordeaux/15 bg-enp-bordeaux-light p-4 text-enp-bordeaux" role="alert">
          <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p>{erreur}</p>
            <button type="button" onClick={() => void charger()} className="mt-2 font-semibold underline">
              Réessayer
            </button>
          </div>
        </div>
      )}

      {chargement && !erreur && (
        <p className="text-sm text-enp-ink-soft" role="status">Chargement des comptes…</p>
      )}

      {!chargement && !erreur && (
        <div className="overflow-x-auto rounded-xl border border-enp-border bg-white shadow-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-enp-teal-dark text-white">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Identifiant</th>
                <th scope="col" className="px-4 py-3 font-semibold">Nom</th>
                <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                <th scope="col" className="px-4 py-3 font-semibold">Rôles</th>
                <th scope="col" className="px-4 py-3 font-semibold">État</th>
              </tr>
            </thead>
            <tbody>
              {comptesFiltres.map((compte, index) => (
                <tr key={compte.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-enp-ink">{compte.matricule ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-enp-ink">{compte.prenom} {compte.nom}</td>
                  <td className="px-4 py-3 text-enp-ink-soft">{compte.email ?? '—'}</td>
                  <td className="px-4 py-3 text-enp-ink-soft">
                    {compte.roles.length > 0
                      ? compte.roles.map((role) => LIBELLES_ROLES[role] ?? role).join(', ')
                      : 'Aucun rôle'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={compte.actif ? 'text-enp-teal font-medium' : 'text-enp-bordeaux font-medium'}>
                      {compte.actif ? 'Actif' : 'Désactivé'}
                    </span>
<<<<<<< Updated upstream
                    <span className="mx-2 text-enp-border" aria-hidden="true">·</span>
                    <span className="text-enp-ink-soft">
                      {compte.motDePasseConfigure ? 'Mot de passe défini' : 'À activer'}
                    </span>
                  </td>
                </tr>
              ))}
              {comptesFiltres.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-enp-ink-soft">
                    Aucun compte correspondant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
=======
                  </div>
                  <Badge variant={c.actif ? 'success' : 'danger'}>
                    {c.actif ? 'Actif' : 'Désactivé'}
                  </Badge>
                </div>
                {c.email && (
                  <div className="text-xs font-mono text-enp-gray-medium break-all">
                    {c.email}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-enp-border min-w-0">
                  <div className="flex flex-wrap gap-1">
                    {c.roles.length > 0 ? (
                      c.roles.map((r) => <RoleBadge key={r} role={r} />)
                    ) : (
                      <span className="text-xs text-enp-gray-medium italic">Aucun rôle</span>
                    )}
                  </div>
                  <div>
                    {c.motDePasseConfigure ? (
                      <span className="inline-flex items-center gap-1 text-xs text-enp-green-valid font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Configuré
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-enp-violet font-semibold bg-enp-bg px-2 py-0.5 border border-enp-violet/30">
                        À activer
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {comptesFiltres.length === 0 && (
              <div className="text-center py-8 text-sm text-enp-gray-medium">
                Aucun compte ne correspond à votre recherche.
              </div>
            )}
          </div>

          {/* Tableau standard pour tablettes et ordinateurs (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matricule / Identifiant</TableHead>
                  <TableHead>Nom & Prénom</TableHead>
                  <TableHead>Courriel institutionnel</TableHead>
                  <TableHead>Rôle(s) attribué(s)</TableHead>
                  <TableHead className="text-center">Statut du compte</TableHead>
                  <TableHead className="text-center">Mot de passe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comptesFiltres.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs font-bold text-enp-blue-deep">
                      {c.matricule ?? '-'}
                    </TableCell>
                    <TableCell className="font-semibold text-enp-black">
                      {c.prenom} {c.nom}
                    </TableCell>
                    <TableCell className="text-enp-gray-medium text-xs font-mono">
                      {c.email ?? '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.roles.length > 0 ? (
                          c.roles.map((r) => <RoleBadge key={r} role={r} />)
                        ) : (
                          <span className="text-xs text-enp-gray-medium italic">Aucun rôle</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.actif ? 'success' : 'danger'}>
                        {c.actif ? 'Actif' : 'Désactivé'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {c.motDePasseConfigure ? (
                        <span className="inline-flex items-center gap-1 text-xs text-enp-green-valid font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Configuré
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-enp-violet font-semibold bg-enp-bg px-2 py-0.5 border border-enp-violet/30">
                          À activer
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {comptesFiltres.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-enp-gray-medium">
                      Aucun compte ne correspond à votre recherche.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
>>>>>>> Stashed changes
        </div>
      )}
    </div>
  );
}
