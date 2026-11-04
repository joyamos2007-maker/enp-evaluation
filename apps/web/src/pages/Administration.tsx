import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AlertCircle, Building2, Layers3, Plus, RefreshCw } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { ReferentielsAdministration } from '@/api/types';
import { Tabs } from '@/components/ui';

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
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Erreur réseau lors du chargement.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  async function executer(cle: string, operation: () => Promise<unknown>, succes: string) {
    setAction(cle);
    setErreur(null);
    setConfirmation(null);
    try {
      await operation();
      setConfirmation(succes);
      await charger();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Erreur réseau pendant l’enregistrement.');
    } finally {
      setAction(null);
    }
  }

  function soumettreCampus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nom = campusNom.trim();
    if (!nom) return;
    void executer('campus', () => api.administrationCreerCampus(nom), 'Campus ajouté.');
    setCampusNom('');
  }

  function soumettreDepartement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nom = departementNom.trim();
    if (!nom || campusId === '') return;
    void executer(
      'departement',
      () => api.administrationCreerDepartement(Number(campusId), nom),
      'Département ajouté.',
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
      'Programme ajouté.',
    );
    setProgrammeNom('');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-enp-ink">
            Administration
          </h1>
          <p className="mt-1 text-sm text-enp-ink-soft">
            Configurez les campus, départements et programmes utilisés par les campagnes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void charger()}
          disabled={chargement}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-enp-border bg-white px-3 py-2 text-sm font-medium text-enp-ink hover:bg-enp-sky disabled:opacity-60"
        >
          <RefreshCw size={16} className={chargement ? 'animate-spin' : ''} aria-hidden="true" />
          Actualiser
        </button>
      </div>

      {erreur && (
        <div className="flex items-start gap-2 rounded-lg border border-enp-bordeaux/15 bg-enp-bordeaux-light p-4 text-enp-bordeaux" role="alert">
          <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{erreur}</span>
        </div>
      )}
      {confirmation && <p className="rounded-lg bg-enp-teal-light p-3 text-sm font-medium text-enp-teal" role="status">{confirmation}</p>}
      {chargement && !data && <p className="text-sm text-enp-ink-soft" role="status">Chargement des référentiels…</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Statistique titre="Campus" valeur={data.campus.length} />
            <Statistique titre="Départements" valeur={data.departements.length} />
            <Statistique titre="Programmes" valeur={data.programmes.length} />
          </div>

          <section
            className="grid grid-cols-1 gap-4 xl:grid-cols-3"
            aria-label="Créer des référentiels"
          >
            <Formulaire titre="Ajouter un campus" enCours={action === 'campus'} onSubmit={soumettreCampus}>
              <ChampNom valeur={campusNom} changer={setCampusNom} libelle="Nom du campus" />
            </Formulaire>

            <Formulaire
              titre="Ajouter un département"
              enCours={action === 'departement'}
              desactive={data.campus.length === 0}
              onSubmit={soumettreDepartement}
            >
              <label className="block space-y-1 text-sm font-medium text-enp-ink">
                <span>Campus</span>
                <select
                  value={campusId}
                  onChange={(event) => setCampusId(event.target.value ? Number(event.target.value) : '')}
                  required
                  disabled={data.campus.length === 0}
                  className="min-h-[44px] w-full rounded-lg border border-enp-border bg-white px-3 py-2 text-enp-ink"
                >
                  <option value="">Sélectionner un campus</option>
                  {data.campus.map((campus) => <option key={campus.id} value={campus.id}>{campus.nom}</option>)}
                </select>
              </label>
              <ChampNom valeur={departementNom} changer={setDepartementNom} libelle="Nom du département" />
            </Formulaire>

            <Formulaire
              titre="Ajouter un programme"
              enCours={action === 'programme'}
              desactive={data.departements.length === 0}
              onSubmit={soumettreProgramme}
            >
              <label className="block space-y-1 text-sm font-medium text-enp-ink">
                <span>Département</span>
                <select
                  value={departmentId}
                  onChange={(event) => setDepartmentId(event.target.value ? Number(event.target.value) : '')}
                  required
                  disabled={data.departements.length === 0}
                  className="min-h-[44px] w-full rounded-lg border border-enp-border bg-white px-3 py-2 text-enp-ink"
                >
                  <option value="">Sélectionner un département</option>
                  {data.departements.map((departement) => (
                    <option key={departement.id} value={departement.id}>
                      {departement.nom} — {departement.campus}
                    </option>
                  ))}
                </select>
              </label>
              <ChampNom valeur={programmeNom} changer={setProgrammeNom} libelle="Nom du programme" />
            </Formulaire>
          </section>

          <Tabs
            tabs={[
              { id: 'campus', label: 'Campus institutionnels', count: data.campus.length },
              { id: 'departements', label: 'Départements', count: data.departements.length },
              { id: 'programmes', label: 'Programmes', count: data.programmes.length },
            ]}
            activeTab={onglet}
            onChange={setOnglet}
          />

          {onglet === 'campus' ? (
            <section className="overflow-hidden rounded-xl border border-enp-border bg-white shadow-card">
              <h2 className="flex items-center gap-2 bg-enp-teal-dark px-4 py-3 font-semibold text-white">
                <Building2 size={18} aria-hidden="true" />
                Campus institutionnels
                <span className="ml-auto text-xs font-normal">{data.campus.length}</span>
              </h2>
              {data.campus.length > 0 ? (
                <ul className="divide-y divide-enp-border">
                  {data.campus.map((campus) => (
                    <li key={campus.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                      <span className="text-enp-ink">{campus.nom}</span>
                      <span className="shrink-0 font-mono text-enp-ink-soft">ID : {campus.id}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-5 text-sm text-enp-ink-soft">Aucun campus enregistré.</p>
              )}
            </section>
          ) : onglet === 'departements' ? (
            <ListeReferentiel
              titre="Départements"
              icone={<Building2 size={18} aria-hidden="true" />}
              elements={data.departements.map((departement) => `${departement.nom} — ${departement.campus}`)}
            />
          ) : (
            <ListeReferentiel
              titre="Programmes"
              icone={<Layers3 size={18} aria-hidden="true" />}
              elements={data.programmes.map((programme) => `${programme.nom} — ${programme.departement}`)}
            />
          )}
        </>
      )}
    </div>
  );
}

function Statistique({ titre, valeur }: { titre: string; valeur: number }) {
  return (
    <div className="rounded-xl border border-enp-border bg-white p-4 shadow-card">
      <p className="text-2xl font-bold text-enp-ink">{valeur}</p>
      <p className="text-sm text-enp-ink-soft">{titre}</p>
    </div>
  );
}

function Formulaire({
  titre,
  enCours,
  desactive = false,
  onSubmit,
  children,
}: {
  titre: string;
  enCours: boolean;
  desactive?: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-xl border border-enp-border bg-white p-4 shadow-card">
      <h2 className="font-semibold text-enp-ink">{titre}</h2>
      {children}
      <button
        type="submit"
        disabled={enCours || desactive}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-enp-primary px-4 py-2 font-semibold text-white hover:bg-enp-primary-dark disabled:opacity-60"
      >
        <Plus size={17} aria-hidden="true" /> {enCours ? 'Enregistrement…' : 'Ajouter'}
      </button>
    </form>
  );
}

function ChampNom({
  valeur,
  changer,
  libelle,
}: {
  valeur: string;
  changer: (value: string) => void;
  libelle: string;
}) {
  return (
    <label className="block space-y-1 text-sm font-medium text-enp-ink">
      <span>{libelle}</span>
      <input
        value={valeur}
        onChange={(event) => changer(event.target.value)}
        maxLength={150}
        required
        className="min-h-[44px] w-full rounded-lg border border-enp-border bg-white px-3 py-2 text-enp-ink outline-none focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20"
      />
    </label>
  );
}

function ListeReferentiel({
  titre,
  icone,
  elements,
}: {
  titre: string;
  icone: ReactNode;
  elements: string[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-enp-border bg-white shadow-card">
      <h2 className="flex items-center gap-2 bg-enp-teal-dark px-4 py-3 font-semibold text-white">
        {icone} {titre} <span className="ml-auto text-xs font-normal">{elements.length}</span>
      </h2>
      {elements.length > 0 ? (
        <ul className="divide-y divide-enp-border">
          {elements.map((element, index) => (
            <li key={`${element}-${index}`} className="px-4 py-3 text-sm text-enp-ink">{element}</li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-5 text-sm text-enp-ink-soft">Aucune donnée.</p>
      )}
    </section>
  );
}
