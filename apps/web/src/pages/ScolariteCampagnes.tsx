import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Plus, Lock, Unlock } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CampagneGestion, CampagneEntreeGestion, DepartementOption } from '@/api/types';

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon',
  ouverte: 'Ouverte',
  close: 'Close',
  restituee: 'Restituée',
};

const STATUT_CLASS: Record<string, string> = {
  brouillon: 'bg-enp-sky text-enp-ink',
  ouverte: 'bg-enp-primary text-white',
  close: 'bg-enp-violet text-white',
  restituee: 'bg-enp-teal-light text-enp-teal',
};

function anneeParDefaut(): string {
  const now = new Date();
  const annee = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${annee}-${annee + 1}`;
}

function toLocalInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoUTC(local: string): string {
  const d = new Date(local);
  return d.toISOString();
}

export function ScolariteCampagnes() {
  const [campagnes, setCampagnes] = useState<CampagneGestion[]>([]);
  const [departements, setDepartements] = useState<DepartementOption[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CampagneEntreeGestion>({
    libelle: '', departmentId: 0, anneeUniversitaire: anneeParDefaut(),
    semestre: 1, debut: '', fin: '',
  });
  const [formErreur, setFormErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{ type: 'ouvrir' | 'cloturer'; id: number; libelle: string } | null>(null);
  const [actionErreur, setActionErreur] = useState<string | null>(null);
  const [actionEnCours, setActionEnCours] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [cs, ds] = await Promise.all([api.scolariteCampagnes(), api.scolariteDepartements()]);
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

  useEffect(() => { void charger(); }, [charger]);

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
      setForm({ libelle: '', departmentId: departements[0]?.id ?? 0, anneeUniversitaire: anneeParDefaut(), semestre: 1, debut: '', fin: '' });
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
        setCampagnes((prev) => prev.map((x) => x.id === c.id ? c : x));
      } else {
        const c = await api.scolariteCloturerCampagne(confirmAction.id);
        setCampagnes((prev) => prev.map((x) => x.id === c.id ? c : x));
      }
      setConfirmAction(null);
    } catch (err) {
      if (err instanceof ApiError) setActionErreur(err.messages.join(' '));
      else setActionErreur('Erreur réseau.');
    } finally {
      setActionEnCours(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Campagnes</h1>
          <p className="text-sm text-enp-ink-soft mt-1">Créez et pilotez les campagnes d'évaluation.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 bg-enp-primary text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-enp-primary-dark transition-all text-sm min-h-[44px] shadow-sm hover:shadow-card-hover"
        >
          <Plus size={18} aria-hidden="true" /> Nouvelle campagne
        </button>
      </div>

      {erreur && (
        <div className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux" role="alert">
          <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{erreur}</span>
        </div>
      )}

      {chargement && !erreur && (
        <div className="flex items-center gap-3 text-enp-ink-soft">
          <div className="h-6 w-6 rounded-full border-2 border-enp-sky border-t-enp-primary animate-spin" aria-hidden="true" />
          <span>Chargement…</span>
        </div>
      )}

      {showForm && !chargement && (
        <div className="bg-white border border-enp-border rounded-xl p-5 space-y-4 shadow-card">
          <h2 className="text-lg font-semibold text-enp-ink">Nouvelle campagne</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="libelle" className="block text-sm font-medium text-enp-ink mb-1">Libellé</label>
              <input id="libelle" type="text" maxLength={200}
                value={form.libelle}
                onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
                className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="dept" className="block text-sm font-medium text-enp-ink mb-1">Département</label>
              <select id="dept"
                value={form.departmentId}
                onChange={(e) => setForm((f) => ({ ...f, departmentId: Number(e.target.value) }))}
                className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
              >
                {departements.map((d) => <option key={d.id} value={d.id}>{d.nom} ({d.campus})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="annee" className="block text-sm font-medium text-enp-ink mb-1">Année universitaire</label>
              <input id="annee" type="text" placeholder="AAAA-AAAA"
                value={form.anneeUniversitaire}
                onChange={(e) => setForm((f) => ({ ...f, anneeUniversitaire: e.target.value }))}
                className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="semestre" className="block text-sm font-medium text-enp-ink mb-1">Semestre (1 à 10)</label>
              <input id="semestre" type="number" min={1} max={10}
                value={form.semestre}
                onChange={(e) => setForm((f) => ({ ...f, semestre: Number(e.target.value) }))}
                className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
              />
            </div>
            <div />
            <div>
              <label htmlFor="debut" className="block text-sm font-medium text-enp-ink mb-1">Début</label>
              <input id="debut" type="datetime-local"
                value={form.debut}
                onChange={(e) => setForm((f) => ({ ...f, debut: e.target.value }))}
                className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="fin" className="block text-sm font-medium text-enp-ink mb-1">Fin</label>
              <input id="fin" type="datetime-local"
                value={form.fin}
                onChange={(e) => setForm((f) => ({ ...f, fin: e.target.value }))}
                className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
              />
            </div>
          </div>
          {formErreur && (
            <div className="rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-3 text-enp-bordeaux text-sm" role="alert">
              {formErreur}
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => void creerCampagne()} disabled={enCours}
              className="inline-flex items-center gap-2 bg-enp-primary text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-enp-primary-dark transition-all text-sm min-h-[44px] disabled:opacity-60">
              {enCours ? 'Création…' : 'Créer la campagne'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="inline-flex items-center gap-2 bg-white border border-enp-border text-enp-ink font-medium px-4 py-2.5 rounded-lg hover:bg-enp-sky transition-colors text-sm min-h-[44px]">
              Annuler
            </button>
          </div>
        </div>
      )}

      {!chargement && !erreur && (
        <div className="bg-white border border-enp-border rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-enp-teal-dark text-white">
                <th scope="col" className="text-left px-3 py-2.5 font-semibold rounded-tl-xl">Libellé</th>
                <th scope="col" className="text-left px-3 py-2.5 font-semibold">Département</th>
                <th scope="col" className="text-center px-3 py-2.5 font-semibold">Année</th>
                <th scope="col" className="text-center px-3 py-2.5 font-semibold">S.</th>
                <th scope="col" className="text-left px-3 py-2.5 font-semibold">Période</th>
                <th scope="col" className="text-center px-3 py-2.5 font-semibold">Statut</th>
                <th scope="col" className="text-center px-3 py-2.5 font-semibold rounded-tr-xl">Action</th>
              </tr>
            </thead>
            <tbody>
              {campagnes.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? 'bg-enp-sky/60' : 'bg-white'}>
                  <td className="px-3 py-2.5 text-enp-ink">{c.libelle}</td>
                  <td className="px-3 py-2.5 text-enp-ink-soft">{c.departement}</td>
                  <td className="px-3 py-2.5 text-center text-enp-ink-soft">{c.anneeUniversitaire}</td>
                  <td className="px-3 py-2.5 text-center text-enp-ink-soft">S{c.semestre}</td>
                  <td className="px-3 py-2.5 text-enp-ink-soft whitespace-nowrap">{c.debut.slice(0, 10)} → {c.fin.slice(0, 10)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${STATUT_CLASS[c.statut]}`}>{STATUT_LABEL[c.statut]}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {c.statut === 'brouillon' && (
                      <button type="button"
                        onClick={() => { setConfirmAction({ type: 'ouvrir', id: c.id, libelle: c.libelle }); setActionErreur(null); }}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-enp-ink hover:underline min-h-[44px]"
                      >
                        <Unlock size={16} aria-hidden="true" /> Ouvrir
                      </button>
                    )}
                    {c.statut === 'ouverte' && (
                      <button type="button"
                        onClick={() => { setConfirmAction({ type: 'cloturer', id: c.id, libelle: c.libelle }); setActionErreur(null); }}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-enp-ink hover:underline min-h-[44px]"
                      >
                        <Lock size={16} aria-hidden="true" /> Clôturer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Fenêtre de confirmation */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-enp-ink/50 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-elevated animate-slide-up">
            <h2 className="text-lg font-semibold text-enp-ink">
              {confirmAction.type === 'ouvrir' ? 'Ouvrir la campagne' : 'Clôturer la campagne'}
            </h2>
            <p className="text-sm text-enp-ink-soft">« {confirmAction.libelle} »</p>
            <p className="text-sm text-enp-ink">
              {confirmAction.type === 'ouvrir'
                ? "Les étudiants pourront répondre jusqu'à la date de fin."
                : "La clôture est définitive : les étudiants ne pourront plus répondre et les résultats seront calculés."}
            </p>
            {actionErreur && (
              <div className="rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-3 text-enp-bordeaux text-sm" role="alert">
                {actionErreur}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmAction(null)}
                className="inline-flex items-center bg-white border border-enp-border text-enp-ink font-medium px-4 py-2.5 rounded-md hover:bg-enp-sky transition-colors text-sm min-h-[44px]">
                Annuler
              </button>
              <button type="button" onClick={() => void confirmerAction()} disabled={actionEnCours}
                className="inline-flex items-center bg-enp-primary text-white font-semibold px-4 py-2.5 rounded-md hover:bg-enp-primary-dark transition-all text-sm min-h-[44px] disabled:opacity-60">
                {actionEnCours ? 'Traitement…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
