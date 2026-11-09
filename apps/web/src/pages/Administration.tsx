import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Building2, Layers3, Plus, RefreshCw, Landmark } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { ReferentielsAdministration } from '@/api/types';
import { PageHeader, Button, Alert, Tabs, StatCard, Badge } from '@/components/ui';

export function Administration() {
  const [data, setData] = useState<ReferentielsAdministration | null>(null);
  const [onglet, setOnglet] = useState('campus');
  const [campusNom, setCampusNom] = useState('');
  const [departementNom, setDepartementNom] = useState('');
  const [campusId, setCampusId] = useState<number | ''>('');
  const [programmeNom, setProgrammeNom] = useState('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [chargement, setChargement] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const referentiels = await api.administrationReferentiels();
      setData(referentiels);
      setCampusId((precedent) =>
        referentiels.campus.some((campus) => campus.id === precedent)
          ? precedent
          : referentiels.campus[0]?.id ?? '',
      );
      setDepartmentId((precedent) =>
        referentiels.departements.some((departement) => departement.id === precedent)
          ? precedent
          : referentiels.departements[0]?.id ?? '',
      );
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.messages.join(' ') : 'Erreur réseau lors du chargement.',
      );
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
      setErreur(
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Erreur réseau pendant l’enregistrement.',
      );
    } finally {
      setAction(null);
    }
  }

  function soumettreCampus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nom = campusNom.trim();
    if (!nom) return;
    void executer('campus', () => api.administrationCreerCampus(nom), 'Campus ajouté avec succès.');
    setCampusNom('');
  }

  function soumettreDepartement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nom = departementNom.trim();
    if (!nom || campusId === '') return;
    void executer(
      'departement',
      () => api.administrationCreerDepartement(Number(campusId), nom),
      'Département ajouté avec succès.',
    );
    setDepartementNom('');
  }

  function soumettreProgramme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nom = programmeNom.trim();
    if (!nom || departmentId === '') return;
    void executer(
      'programme',
      () => api.administrationCreerProgramme(Number(departmentId), nom),
      'Programme ajouté avec succès.',
    );
    setProgrammeNom('');
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in pb-6">
      <PageHeader
        title="Référentiels & Structures"
        description="Configurez les campus, départements et programmes académiques de l'École Nationale Polytechnique."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Référentiels & Campus' },
        ]}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={chargement}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${chargement ? 'animate-spin' : ''}`} />}
            onClick={() => void charger()}
          >
            Actualiser
          </Button>
        }
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {confirmation && (
        <Alert variant="success" title="Confirmation" onClose={() => setConfirmation(null)}>
          {confirmation}
        </Alert>
      )}

      {chargement && !data ? (
        <div className="bg-white border border-enp-border p-12 text-center text-sm text-enp-gray-medium">
          Chargement des référentiels institutionnels…
        </div>
      ) : (
        data && (
          <>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              <StatCard
                title="Campus"
                value={data.campus.length}
                icon={<Landmark className="w-4 h-4 sm:w-5 sm:h-5 text-enp-blue-primary" />}
                description="Sites ENP"
                className="p-3 sm:p-4"
              />
              <StatCard
                title="Départements"
                value={data.departements.length}
                icon={<Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-enp-blue-deep" />}
                description="Unités pédagogiques"
                className="p-3 sm:p-4"
              />
              <StatCard
                title="Programmes"
                value={data.programmes.length}
                icon={<Layers3 className="w-4 h-4 sm:w-5 sm:h-5 text-enp-green-valid" />}
                description="Cursus et filières"
                className="p-3 sm:p-4"
              />
            </div>

            <Tabs
              tabs={[
                { id: 'campus', label: '1. Campus institutionnels', count: data.campus.length },
                { id: 'departements', label: '2. Départements', count: data.departements.length },
                { id: 'programmes', label: '3. Programmes & Cursus', count: data.programmes.length },
              ]}
              activeTab={onglet}
              onChange={(id) => {
                setOnglet(id);
                setConfirmation(null);
                setErreur(null);
              }}
            />

            {/* ONGLET 1 : CAMPUS */}
            {onglet === 'campus' && (
              <section className="bg-white border border-enp-border shadow-xs overflow-hidden space-y-0">
                <form
                  onSubmit={soumettreCampus}
                  className="p-4 bg-enp-blue-ice/40 border-b border-enp-border flex flex-col sm:flex-row sm:items-end gap-3"
                >
                  <label className="flex-1 block text-xs font-bold text-enp-blue-deep">
                    Nouveau campus institutionnel
                    <input
                      value={campusNom}
                      onChange={(event) => setCampusNom(event.target.value)}
                      maxLength={150}
                      required
                      placeholder="Ex. Campus de Lomé"
                      className="mt-1 block w-full border border-enp-border bg-white px-3 py-2 text-sm font-normal text-enp-black outline-none focus:border-enp-blue-primary min-h-[40px]"
                    />
                  </label>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={action === 'campus'}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Ajouter le campus
                  </Button>
                </form>

                {data.campus.length > 0 ? (
                  <ul className="divide-y divide-enp-border">
                    {data.campus.map((campus) => (
                      <li
                        key={campus.id}
                        className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-enp-blue-ice/20"
                      >
                        <span className="font-semibold text-enp-black">{campus.nom}</span>
                        <Badge variant="outline">ID #{campus.id}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-8 text-center text-sm text-enp-gray-medium">
                    Aucun campus enregistré.
                  </p>
                )}
              </section>
            )}

            {/* ONGLET 2 : DÉPARTEMENTS */}
            {onglet === 'departements' && (
              <section className="bg-white border border-enp-border shadow-xs overflow-hidden">
                <form
                  onSubmit={soumettreDepartement}
                  className="p-4 bg-enp-blue-ice/40 border-b border-enp-border grid grid-cols-1 sm:grid-cols-[240px_1fr_auto] gap-3 items-end"
                >
                  <label className="block text-xs font-bold text-enp-blue-deep">
                    Campus de rattachement
                    <select
                      value={campusId}
                      onChange={(event) =>
                        setCampusId(event.target.value ? Number(event.target.value) : '')
                      }
                      required
                      disabled={data.campus.length === 0}
                      className="mt-1 block w-full border border-enp-border bg-white px-3 py-2 text-sm font-normal text-enp-black outline-none focus:border-enp-blue-primary min-h-[40px]"
                    >
                      <option value="">Sélectionner un campus</option>
                      {data.campus.map((campus) => (
                        <option key={campus.id} value={campus.id}>
                          {campus.nom}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-bold text-enp-blue-deep">
                    Nom du département
                    <input
                      value={departementNom}
                      onChange={(event) => setDepartementNom(event.target.value)}
                      maxLength={150}
                      required
                      placeholder="Ex. Génie Électrique et Informatique"
                      className="mt-1 block w-full border border-enp-border bg-white px-3 py-2 text-sm font-normal text-enp-black outline-none focus:border-enp-blue-primary min-h-[40px]"
                    />
                  </label>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={data.campus.length === 0}
                    isLoading={action === 'departement'}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Ajouter le département
                  </Button>
                </form>

                {data.departements.length > 0 ? (
                  <ul className="divide-y divide-enp-border">
                    {data.departements.map((dept) => (
                      <li
                        key={dept.id}
                        className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-enp-blue-ice/20"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-enp-black">{dept.nom}</span>
                          <Badge variant="institutional">{dept.campus}</Badge>
                        </div>
                        <Badge variant="outline">ID #{dept.id}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-8 text-center text-sm text-enp-gray-medium">
                    Aucun département enregistré.
                  </p>
                )}
              </section>
            )}

            {/* ONGLET 3 : PROGRAMMES */}
            {onglet === 'programmes' && (
              <section className="bg-white border border-enp-border shadow-xs overflow-hidden">
                <form
                  onSubmit={soumettreProgramme}
                  className="p-4 bg-enp-blue-ice/40 border-b border-enp-border grid grid-cols-1 sm:grid-cols-[280px_1fr_auto] gap-3 items-end"
                >
                  <label className="block text-xs font-bold text-enp-blue-deep">
                    Département de rattachement
                    <select
                      value={departmentId}
                      onChange={(event) =>
                        setDepartmentId(event.target.value ? Number(event.target.value) : '')
                      }
                      required
                      disabled={data.departements.length === 0}
                      className="mt-1 block w-full border border-enp-border bg-white px-3 py-2 text-sm font-normal text-enp-black outline-none focus:border-enp-blue-primary min-h-[40px]"
                    >
                      <option value="">Sélectionner un département</option>
                      {data.departements.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.nom} ({dept.campus})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-bold text-enp-blue-deep">
                    Intitulé du programme / cursus
                    <input
                      value={programmeNom}
                      onChange={(event) => setProgrammeNom(event.target.value)}
                      maxLength={150}
                      required
                      placeholder="Ex. Cycle Ingénieur Génie Civil"
                      className="mt-1 block w-full border border-enp-border bg-white px-3 py-2 text-sm font-normal text-enp-black outline-none focus:border-enp-blue-primary min-h-[40px]"
                    />
                  </label>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={data.departements.length === 0}
                    isLoading={action === 'programme'}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Ajouter le programme
                  </Button>
                </form>

                {data.programmes.length > 0 ? (
                  <ul className="divide-y divide-enp-border">
                    {data.programmes.map((prog, index) => (
                      <li
                        key={`${prog.nom}-${index}`}
                        className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-enp-blue-ice/20"
                      >
                        <span className="font-semibold text-enp-black">{prog.nom}</span>
                        <Badge variant="institutional">{prog.departement}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-8 text-center text-sm text-enp-gray-medium">
                    Aucun programme enregistré.
                  </p>
                )}
              </section>
            )}
          </>
        )
      )}
    </div>
  );
}
