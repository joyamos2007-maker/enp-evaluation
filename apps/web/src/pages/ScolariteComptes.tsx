import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  KeyRound,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  FileSpreadsheet,
  Filter,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CompteAdministration, ResultatCodes } from '@/api/types';
import { LIBELLES_ROLES } from '@/components/menuConfig';
import {
  PageHeader,
  Button,
  Input,
  Select,
  Alert,
  RoleBadge,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Modal,
} from '@/components/ui';

export function ScolariteComptes() {
  const [comptes, setComptes] = useState<CompteAdministration[]>([]);
  const [recherche, setRecherche] = useState('');
  const [roleFiltre, setRoleFiltre] = useState<string>('all');
  const [etatFiltre, setEtatFiltre] = useState<string>('all');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Génération de codes d'activation
  const [codesGeneres, setCodesGeneres] = useState<ResultatCodes | null>(null);
  const [generationEnCours, setGenerationEnCours] = useState(false);
  const [generationErreur, setGenerationErreur] = useState<string | null>(null);
  const [copieIndex, setCopieIndex] = useState<number | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.scolariteComptes();
      setComptes(data);
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

  const comptesFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return comptes.filter((c) => {
      const matchQuery =
        !q ||
        [c.matricule, c.email, c.nom, c.prenom, ...c.roles].some((val) =>
          val?.toLowerCase().includes(q)
        );

      const matchRole = roleFiltre === 'all' || c.roles.includes(roleFiltre as any);

      const matchEtat =
        etatFiltre === 'all' ||
        (etatFiltre === 'actif' && c.actif) ||
        (etatFiltre === 'inactif' && !c.actif) ||
        (etatFiltre === 'sans_mdp' && !c.motDePasseConfigure) ||
        (etatFiltre === 'avec_mdp' && c.motDePasseConfigure);

      return matchQuery && matchRole && matchEtat;
    });
  }, [comptes, recherche, roleFiltre, etatFiltre]);

  const nbSansMdp = useMemo(() => comptes.filter((c) => !c.motDePasseConfigure).length, [comptes]);

  async function genererCodesTousSansMdp() {
    setGenerationEnCours(true);
    setGenerationErreur(null);
    try {
      const res = await api.scolariteGenererCodes({ tousSansMotDePasse: true });
      setCodesGeneres(res);
    } catch (err) {
      if (err instanceof ApiError) setGenerationErreur(err.messages.join(' '));
      else setGenerationErreur('Erreur lors de la génération des codes.');
    } finally {
      setGenerationEnCours(false);
    }
  }

  function exporterCsv() {
    const entetes = ['Matricule', 'Nom', 'Prenom', 'Email', 'Roles', 'Statut', 'MotDePasse'];
    const lignes = comptesFiltres.map((c) => [
      c.matricule ?? '',
      c.nom,
      c.prenom,
      c.email ?? '',
      c.roles.join(';'),
      c.actif ? 'Actif' : 'Désactivé',
      c.motDePasseConfigure ? 'Défini' : 'À activer',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [entetes.join(','), ...lignes.map((l) => l.map((item) => `"${item}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `enp-comptes-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function imprimerFiches() {
    window.print();
  }

  function copierCode(code: string, idx: number) {
    void navigator.clipboard.writeText(code);
    setCopieIndex(idx);
    setTimeout(() => setCopieIndex(null), 2000);
  }

  return (
    <div className="space-y-6">
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
        <div className="bg-enp-bg border-l-4 border-enp-gold border-r border-t border-b border-enp-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
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
      </div>

      {chargement && !erreur && (
        <div className="p-12 text-center bg-white border border-enp-border">
          <div className="inline-block w-8 h-8 border-2 border-enp-blue-ice border-t-enp-blue-primary animate-spin mb-2" />
          <p className="text-sm text-enp-gray-medium">Chargement des comptes institutionnels…</p>
        </div>
      )}

      {!chargement && !erreur && (
        <div className="bg-white border border-enp-border shadow-sm">
          <div className="p-4 border-b border-enp-border flex items-center justify-between">
            <h3 className="font-bold text-enp-blue-deep font-serif text-sm">
              Répertoire officiel ({comptesFiltres.length} compte{comptesFiltres.length > 1 ? 's' : ''})
            </h3>
            <span className="text-xs text-enp-gray-medium font-mono">
              Total général : {comptes.length} usagers
            </span>
          </div>

          {/* Cartes tactiles pour mobile (< 768px) */}
          <div className="block md:hidden divide-y divide-enp-border">
            {comptesFiltres.map((c) => (
              <div key={c.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-enp-black">
                      {c.prenom} {c.nom}
                    </h4>
                    <span className="font-mono text-xs font-semibold text-enp-blue-deep bg-enp-blue-light px-2 py-0.5 border border-enp-blue-primary/20">
                      {c.matricule ?? 'Sans matricule'}
                    </span>
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
                      <span className="inline-flex items-center gap-1 text-xs text-enp-gold font-semibold bg-enp-bg px-2 py-0.5 border border-enp-gold/30">
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
                        <span className="inline-flex items-center gap-1 text-xs text-enp-gold font-semibold bg-enp-bg px-2 py-0.5 border border-enp-gold/30">
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
        </div>
      )}

      {/* Modal des codes d'activation générés */}
      <Modal
        isOpen={codesGeneres !== null}
        onClose={() => setCodesGeneres(null)}
        title="Fiches d'activation des comptes"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-enp-blue-ice border border-enp-blue-primary/20 text-xs text-enp-blue-deep flex items-start gap-2">
            <KeyRound className="w-4 h-4 text-enp-blue-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Distribution sécurisée des codes</span>
              Ces codes à usage unique permettent aux titulaires de configurer leur mot de passe personnel
              sur la page <code className="font-mono bg-white px-1">/activation</code>. Ne les partagez qu'aux usagers vérifiés.
            </div>
          </div>

          {generationErreur && (
            <Alert variant="danger" title="Erreur">
              {generationErreur}
            </Alert>
          )}

          <div className="max-h-80 overflow-y-auto border border-enp-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Identité</TableHead>
                  <TableHead>Code d'activation</TableHead>
                  <TableHead>Validité</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codesGeneres?.codes.map((item, idx) => (
                  <TableRow key={item.identifiant}>
                    <TableCell className="font-mono font-bold text-xs">{item.identifiant}</TableCell>
                    <TableCell className="text-xs font-semibold">{item.prenom} {item.nom}</TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-sm bg-enp-bg px-2 py-1 border border-enp-border text-enp-blue-deep select-all">
                        {item.code}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-enp-gray-medium font-mono">
                      {new Date(item.expireLe).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Copy className="w-3 h-3" />}
                        onClick={() => copierCode(item.code, idx)}
                      >
                        {copieIndex === idx ? 'Copié !' : 'Copier'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="pt-3 border-t border-enp-border flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={imprimerFiches}
            >
              Imprimer les fiches
            </Button>
            <Button variant="primary" size="sm" onClick={() => setCodesGeneres(null)}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
