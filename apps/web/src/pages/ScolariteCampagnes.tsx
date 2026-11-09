import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Lock, Unlock, Megaphone } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CampagneGestion, CampagneEntreeGestion, DepartementOption } from '@/api/types';
import { PageHeader, Button, Alert, Badge, Modal } from '@/components/ui';

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon',
  ouverte: 'Ouverte',
  close: 'Close',
  restituee: 'Restituée',
};

const STATUT_VARIANT: Record<string, 'outline' | 'success' | 'warning' | 'institutional'> = {
  brouillon: 'outline',
  ouverte: 'success',
  close: 'warning',
  restituee: 'institutional',
};

function anneeParDefaut(): string {
  const now = new Date();
  const annee = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${annee}-${annee + 1}`;
}

function toIsoUTC(local: string): string {
  const d = new Date(local);
  return d.toISOString();
}

export function ScolariteCampagnes() {
  const [campagnes, setCampagnes] = useState<CampagneGestion[]>([]);
  const [departements, setDepartements] = useState<DepartementOption[]>([]);
  const [filtreStatut, setFiltreStatut] = useState<string>('toutes');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CampagneEntreeGestion>({
    libelle: '',
    departmentId: 0,
    anneeUniversitaire: anneeParDefaut(),
    semestre: 1,
    debut: '',
    fin: '',
  });
  const [formErreur, setFormErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'ouvrir' | 'cloturer';
    id: number;
    libelle: string;
  } | null>(null);
  const [actionErreur, setActionErreur] = useState<string | null>(null);
  const [actionEnCours, setActionEnCours] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [cs, ds] = await Promise.all([
        api.scolariteCampagnes(),
        api.scolariteDepartements(),
      ]);
      setCampagnes(cs);
      setDepartements(ds);
      if (ds.length > 0 && form.departmentId === 0) {
        setForm((f) => ({ ...f, departmentId: ds[0].id }));
      }
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur réseau.');
    } finally {
      setChargement(false);
    }
  }, [form.departmentId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function creerCampagne() {
    setEnCours(true);
    setFormErreur(null);
    try {
      const corps: CampagneEntreeGestion = {
        ...form,
        debut: toIsoUTC(form.debut),
        fin: toIsoUTC(form.fin),
      };
      const c = await api.scolariteCreerCampagne(corps);
      setCampagnes((prev) => [...prev, c]);
      setShowForm(false);
      setForm({
        libelle: '',
        departmentId: departements[0]?.id ?? 0,
        anneeUniversitaire: anneeParDefaut(),
        semestre: 1,
        debut: '',
        fin: '',
      });
    } catch (err) {
      if (err instanceof ApiError) setFormErreur(err.messages.join(' '));
      else setFormErreur('Erreur réseau.');
    } finally {
      setEnCours(false);
    }
  }

  async function confirmerAction() {
    if (!confirmAction) return;
    setActionEnCours(true);
    setActionErreur(null);
    try {
      if (confirmAction.type === 'ouvrir') {
        const c = await api.scolariteOuvrirCampagne(confirmAction.id);
        setCampagnes((prev) => prev.map((x) => (x.id === c.id ? c : x)));
      } else {
        const c = await api.scolariteCloturerCampagne(confirmAction.id);
        setCampagnes((prev) => prev.map((x) => (x.id === c.id ? c : x)));
      }
      setConfirmAction(null);
    } catch (err) {
      if (err instanceof ApiError) setActionErreur(err.messages.join(' '));
      else setActionErreur('Erreur réseau.');
    } finally {
      setActionEnCours(false);
    }
  }

  const campagnesFiltrees = useMemo(() => {
    if (filtreStatut === 'toutes') return campagnes;
    return campagnes.filter((c) => c.statut === filtreStatut);
  }, [campagnes, filtreStatut]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in pb-6">
      <PageHeader
        title="Campagnes d'évaluation"
        description="Créez, ouvrez et clôturez les campagnes semestrielles d'évaluation par département."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Campagnes' },
        ]}
        actions={
          <Button
            type="button"
            variant={showForm ? 'outline' : 'primary'}
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Fermer le formulaire' : 'Nouvelle campagne'}
          </Button>
        }
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {showForm && !chargement && (
        <div className="bg-enp-blue-ice/40 border border-enp-blue-primary/30 p-5 space-y-4 animate-fade-in">
          <h2 className="text-sm font-bold uppercase tracking-wider text-enp-blue-deep">
            Créer une nouvelle campagne d'évaluation
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="libelle" className="block text-xs font-bold text-enp-black mb-1">
                Libellé officiel
              </label>
              <input
                id="libelle"
                type="text"
                maxLength={200}
                placeholder="Ex. Évaluation Harmattan 2026-2027 - Génie Civil"
                value={form.libelle}
                onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
                className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white focus:border-enp-blue-primary outline-none min-h-[40px]"
              />
            </div>
            <div>
              <label htmlFor="dept" className="block text-xs font-bold text-enp-black mb-1">
                Département
              </label>
              <select
                id="dept"
                value={form.departmentId}
                onChange={(e) => setForm((f) => ({ ...f, departmentId: Number(e.target.value) }))}
                className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white focus:border-enp-blue-primary outline-none min-h-[40px]"
              >
                {departements.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom} ({d.campus})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="annee" className="block text-xs font-bold text-enp-black mb-1">
                Année universitaire
              </label>
              <input
                id="annee"
                type="text"
                placeholder="AAAA-AAAA"
                value={form.anneeUniversitaire}
                onChange={(e) => setForm((f) => ({ ...f, anneeUniversitaire: e.target.value }))}
                className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white focus:border-enp-blue-primary outline-none min-h-[40px]"
              />
            </div>
            <div>
              <label htmlFor="semestre" className="block text-xs font-bold text-enp-black mb-1">
                Semestre (1 à 10)
              </label>
              <input
                id="semestre"
                type="number"
                min={1}
                max={10}
                value={form.semestre}
                onChange={(e) => setForm((f) => ({ ...f, semestre: Number(e.target.value) }))}
                className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white focus:border-enp-blue-primary outline-none min-h-[40px]"
              />
            </div>
            <div className="hidden lg:block" />
            <div>
              <label htmlFor="debut" className="block text-xs font-bold text-enp-black mb-1">
                Date et heure d'ouverture
              </label>
              <input
                id="debut"
                type="datetime-local"
                value={form.debut}
                onChange={(e) => setForm((f) => ({ ...f, debut: e.target.value }))}
                className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white focus:border-enp-blue-primary outline-none min-h-[40px]"
              />
            </div>
            <div>
              <label htmlFor="fin" className="block text-xs font-bold text-enp-black mb-1">
                Date et heure de clôture
              </label>
              <input
                id="fin"
                type="datetime-local"
                value={form.fin}
                onChange={(e) => setForm((f) => ({ ...f, fin: e.target.value }))}
                className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white focus:border-enp-blue-primary outline-none min-h-[40px]"
              />
            </div>
          </div>

          {formErreur && (
            <Alert variant="danger" title="Impossible de créer la campagne">
              {formErreur}
            </Alert>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={enCours}
              onClick={() => void creerCampagne()}
            >
              Créer la campagne
            </Button>
          </div>
        </div>
      )}

      {/* FILTRES RAPIDES PAR STATUT */}
      {!chargement && campagnes.length > 0 && (
        <div className="bg-white border border-enp-border p-3.5 flex flex-wrap items-center gap-1.5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep mr-2">
            Statut :
          </span>
          {(
            [
              { id: 'toutes', label: `Toutes (${campagnes.length})` },
              { id: 'ouverte', label: 'Ouvertes' },
              { id: 'brouillon', label: 'Brouillons' },
              { id: 'close', label: 'Closes' },
              { id: 'restituee', label: 'Restituées' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFiltreStatut(t.id)}
              className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
                filtreStatut === t.id
                  ? 'bg-enp-blue-deep text-white border-enp-blue-deep'
                  : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {chargement ? (
        <div className="bg-white border border-enp-border p-12 text-center text-sm text-enp-gray-medium">
          Chargement des campagnes d'évaluation…
        </div>
      ) : campagnesFiltrees.length === 0 ? (
        <div className="bg-white border border-enp-border p-10 text-center space-y-2 shadow-xs">
          <Megaphone className="w-10 h-10 text-enp-gray-medium mx-auto opacity-40" />
          <p className="text-sm font-bold text-enp-blue-deep">Aucune campagne dans cette vue</p>
        </div>
      ) : (
        <div className="bg-white border border-enp-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-enp-blue-deep text-white text-xs uppercase tracking-wider">
                  <th scope="col" className="text-left px-4 py-3 font-semibold">Libellé</th>
                  <th scope="col" className="text-left px-4 py-3 font-semibold">Département</th>
                  <th scope="col" className="text-center px-4 py-3 font-semibold">Année / Sem.</th>
                  <th scope="col" className="text-left px-4 py-3 font-semibold">Période</th>
                  <th scope="col" className="text-center px-4 py-3 font-semibold">Statut</th>
                  <th scope="col" className="text-right px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-enp-border">
                {campagnesFiltrees.map((c) => (
                  <tr key={c.id} className="hover:bg-enp-blue-ice/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-enp-black">{c.libelle}</td>
                    <td className="px-4 py-3 text-enp-gray-dark">{c.departement}</td>
                    <td className="px-4 py-3 text-center font-mono text-xs text-enp-blue-deep font-bold">
                      {c.anneeUniversitaire} • S{c.semestre}
                    </td>
                    <td className="px-4 py-3 text-xs text-enp-gray-medium whitespace-nowrap">
                      {c.debut.slice(0, 10)} au {c.fin.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={STATUT_VARIANT[c.statut] ?? 'outline'}>
                        {STATUT_LABEL[c.statut] ?? c.statut}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {c.statut === 'brouillon' && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          leftIcon={<Unlock className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setConfirmAction({ type: 'ouvrir', id: c.id, libelle: c.libelle });
                            setActionErreur(null);
                          }}
                        >
                          Ouvrir
                        </Button>
                      )}
                      {c.statut === 'ouverte' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          leftIcon={<Lock className="w-3.5 h-3.5 text-enp-red-error" />}
                          onClick={() => {
                            setConfirmAction({ type: 'cloturer', id: c.id, libelle: c.libelle });
                            setActionErreur(null);
                          }}
                        >
                          Clôturer
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        title={
          confirmAction?.type === 'ouvrir' ? 'Ouvrir la campagne' : 'Clôturer la campagne'
        }
        subtitle={confirmAction ? `« ${confirmAction.libelle} »` : undefined}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setConfirmAction(null)}>
              Annuler
            </Button>
            <Button
              variant={confirmAction?.type === 'cloturer' ? 'danger' : 'primary'}
              size="sm"
              isLoading={actionEnCours}
              onClick={() => void confirmerAction()}
            >
              Confirmer
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-enp-black">
          <p>
            {confirmAction?.type === 'ouvrir'
              ? "Les étudiants inscrits pourront soumettre leurs bulletins anonymes jusqu'à la date de clôture."
              : 'La clôture est définitive : les étudiants ne pourront plus voter et les résultats anonymisés seront consolidés.'}
          </p>
          {actionErreur && (
            <Alert variant="danger" title="Erreur">
              {actionErreur}
            </Alert>
          )}
        </div>
      </Modal>
    </div>
  );
}
