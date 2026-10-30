import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, Layers3, Plus, RefreshCw, GraduationCap, MapPin } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { ReferentielsAdministration } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import {
  PageHeader,
  Button,
  Input,
  Select,
  Table,
  Badge,
  Alert,
  Tabs,
} from '@/components/ui';

export function Administration() {
  const { aRole } = useAuth();
  const directionSeule = aRole('direction_etudes') && !aRole('admin');
  const [data, setData] = useState<ReferentielsAdministration | null>(null);

  const [campusNom, setCampusNom] = useState('');
  const [departementNom, setDepartementNom] = useState('');
  const [campusId, setCampusId] = useState<number | ''>('');
  const [programmeNom, setProgrammeNom] = useState('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');

  const [chargement, setChargement] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [onglet, setOnglet] = useState('programmes');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const referentiels = await api.administrationReferentiels();
      setData(referentiels);
      setCampusId((precedent) =>
        referentiels.campus.some((c) => c.id === precedent)
          ? precedent
          : referentiels.campus[0]?.id ?? '',
      );
      setDepartmentId((precedent) =>
        referentiels.departements.some((d) => d.id === precedent)
          ? precedent
          : referentiels.departements[0]?.id ?? '',
      );
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Erreur de chargement des référentiels.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function executer(cle: string, operation: () => Promise<unknown>, succes: string) {
    setAction(cle);
    setErreur(null);
    setConfirmation(null);
    try {
      await operation();
      setConfirmation(succes);
      await charger();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Erreur pendant l’enregistrement.');
    } finally {
      setAction(null);
    }
  }

  function handleNouveauCampus(e: FormEvent) {
    e.preventDefault();
    if (!campusNom.trim()) return;
    void executer(
      'campus',
      () => api.administrationCreerCampus(campusNom.trim()),
      `Campus « ${campusNom.trim()} » créé avec succès.`,
    ).then(() => setCampusNom(''));
  }

  function handleNouveauDepartement(e: FormEvent) {
    e.preventDefault();
    if (!departementNom.trim() || campusId === '') return;
    void executer(
      'departement',
      () => api.administrationCreerDepartement(Number(campusId), departementNom.trim()),
      `Département « ${departementNom.trim()} » créé avec succès.`,
    ).then(() => setDepartementNom(''));
  }

  function handleNouveauProgramme(e: FormEvent) {
    e.preventDefault();
    if (!programmeNom.trim() || departmentId === '') return;
    void executer(
      'programme',
      () => api.administrationCreerProgramme(Number(departmentId), programmeNom.trim()),
      `Programme « ${programmeNom.trim()} » créé avec succès.`,
    ).then(() => setProgrammeNom(''));
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Administration des Référentiels & Campus"
        description="Gestion structurelle des implantations géographiques, départements d'enseignement et filières polytechniques"
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Administration des référentiels' }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void charger()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Actualiser
          </Button>
        }
      />

      {confirmation && <Alert variant="success" title="Opération validée">{confirmation}</Alert>}
      {erreur && <Alert variant="danger" title="Alerte">{erreur}</Alert>}

      <Tabs
        tabs={[
          { id: 'programmes', label: 'Programmes & Filières', count: data?.programmes.length },
          { id: 'departements', label: 'Départements académiques', count: data?.departements.length },
          { id: 'campus', label: 'Campus institutionnels', count: data?.campus.length },
        ]}
        activeTab={onglet}
        onChange={setOnglet}
      />

      {chargement ? (
        <div className="py-12 text-center text-enp-gray-medium text-sm">
          Chargement des référentiels…
        </div>
      ) : onglet === 'programmes' ? (
        <div className="space-y-6">
          {!directionSeule && (
            <div className="bg-white border border-enp-border p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep mb-3">
                Créer un nouveau programme académique
              </h2>
              <form onSubmit={handleNouveauProgramme} className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="w-full sm:w-64">
                  <Select
                    label="Département d'attachement"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                  >
                    {(data?.departements ?? []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nom} ({d.campus})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex-1 w-full">
                  <Input
                    label="Intitulé du programme (Filière / Spécialité)"
                    value={programmeNom}
                    onChange={(e) => setProgrammeNom(e.target.value)}
                    placeholder="Ex : Ingénieur Génie Civil : Bâtiments & Travaux Publics"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full sm:w-auto justify-center"
                  isLoading={action === 'programme'}
                  disabled={!programmeNom.trim() || departmentId === ''}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Ajouter
                </Button>
              </form>
            </div>
          )}

          <Table
            columns={[
              { key: 'nom', header: 'Intitulé du programme' },
              { key: 'departement', header: 'Département' },
              {
                key: 'id',
                header: 'Identifiant',
                align: 'right',
                render: (p: any) => <span className="font-mono text-xs text-enp-gray-medium">#{p.id}</span>,
              },
            ]}
            data={data?.programmes ?? []}
            keyExtractor={(p: any) => p.id}
          />
        </div>
      ) : onglet === 'departements' ? (
        <div className="space-y-6">
          {!directionSeule && (
            <div className="bg-white border border-enp-border p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep mb-3">
                Créer un nouveau département académique
              </h2>
              <form onSubmit={handleNouveauDepartement} className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="w-full sm:w-64">
                  <Select
                    label="Campus de rattachement"
                    value={campusId}
                    onChange={(e) => setCampusId(e.target.value ? Number(e.target.value) : '')}
                  >
                    {(data?.campus ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex-1 w-full">
                  <Input
                    label="Nom du département"
                    value={departementNom}
                    onChange={(e) => setDepartementNom(e.target.value)}
                    placeholder="Ex : Département de Génie Électrique & Informatique Industrielle"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full sm:w-auto justify-center"
                  isLoading={action === 'departement'}
                  disabled={!departementNom.trim() || campusId === ''}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Ajouter
                </Button>
              </form>
            </div>
          )}

          <Table
            columns={[
              { key: 'nom', header: 'Nom du département' },
              { key: 'campus', header: 'Campus d’implantation' },
              {
                key: 'id',
                header: 'Identifiant',
                align: 'right',
                render: (d: any) => <span className="font-mono text-xs text-enp-gray-medium">#{d.id}</span>,
              },
            ]}
            data={data?.departements ?? []}
            keyExtractor={(d: any) => d.id}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-enp-border p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep mb-3">
              Créer un nouveau campus institutionnel
            </h2>
            <form onSubmit={handleNouveauCampus} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <Input
                  label="Dénomination officielle du campus"
                  value={campusNom}
                  onChange={(e) => setCampusNom(e.target.value)}
                  placeholder="Ex : Campus Principal de Lomé"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                className="w-full sm:w-auto justify-center"
                isLoading={action === 'campus'}
                disabled={!campusNom.trim()}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Créer le campus
              </Button>
            </form>
          </div>

          <Table
            columns={[
              { key: 'nom', header: 'Campus officiel' },
              {
                key: 'id',
                header: 'Identifiant',
                align: 'right',
                render: (c: any) => <span className="font-mono text-xs text-enp-gray-medium">#{c.id}</span>,
              },
            ]}
            data={data?.campus ?? []}
            keyExtractor={(c: any) => c.id}
          />
        </div>
      )}
    </div>
  );
}
