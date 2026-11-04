import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, CalendarCheck, Save } from 'lucide-react';
import { api, ApiError } from '@/api';
import type {
  CoursDossier,
  DetailSeancePresence,
  SeancePresence,
  StatutPresenceEtudiant,
} from '@/api/types';

const LIBELLES_STATUT: Record<StatutPresenceEtudiant, string> = {
  present: 'Présent',
  absent: 'Absent',
  retard: 'En retard',
};

export function EnseignantPresences() {
  const [cours, setCours] = useState<CoursDossier[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [seances, setSeances] = useState<SeancePresence[]>([]);
  const [seanceId, setSeanceId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DetailSeancePresence | null>(null);
  const [statuts, setStatuts] = useState<Record<number, StatutPresenceEtudiant | ''>>({});
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [libelle, setLibelle] = useState('');
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    api.dossierCoursEnseignant()
      .then((data) => {
        if (!actif) return;
        setCours(data);
        if (data[0]) setCourseId(data[0].id);
      })
      .catch((err: unknown) => {
        if (actif) setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Impossible de charger vos UE.');
      })
      .finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
  }, []);

  const chargerSeances = useCallback(async () => {
    if (courseId === null) return;
    setErreur(null);
    setDetail(null);
    try {
      const liste = await api.dossierSeancesPresence(courseId);
      setSeances(liste);
      setSeanceId(liste[0]?.id ?? null);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Impossible de charger les séances.');
    }
  }, [courseId]);

  useEffect(() => { void chargerSeances(); }, [chargerSeances]);

  const chargerDetail = useCallback(async () => {
    if (seanceId === null) {
      setDetail(null);
      return;
    }
    try {
      const data = await api.dossierPresenceSeance(seanceId);
      setDetail(data);
      setStatuts(Object.fromEntries(data.etudiants.map((etudiant) => [etudiant.id, etudiant.statut ?? ''])));
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Impossible de charger la liste des étudiants.');
    }
  }, [seanceId]);

  useEffect(() => { void chargerDetail(); }, [chargerDetail]);

  async function creerSeance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (courseId === null) return;
    setErreur(null);
    setMessage(null);
    try {
      const creee = await api.dossierCreerSeancePresence(courseId, { date, libelle: libelle.trim() });
      setLibelle('');
      setMessage('La séance de présence a été créée.');
      const liste = await api.dossierSeancesPresence(courseId);
      setSeances(liste);
      setSeanceId(creee.id);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Impossible de créer la séance.');
    }
  }

  async function enregistrer() {
    if (!detail || detail.etudiants.some((etudiant) => !statuts[etudiant.id])) return;
    setEnregistrement(true);
    setErreur(null);
    setMessage(null);
    try {
      await api.dossierEnregistrerPresences(
        detail.seance.id,
        detail.etudiants.map((etudiant) => ({
          etudiantId: etudiant.id,
          statut: statuts[etudiant.id] as StatutPresenceEtudiant,
        })),
      );
      setMessage('Les présences ont été enregistrées.');
      if (courseId !== null) setSeances(await api.dossierSeancesPresence(courseId));
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Impossible d’enregistrer les présences.');
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Présences des étudiants</h1>
        <p className="text-sm text-enp-ink-soft mt-1">Créez une séance datée puis indiquez la présence de chaque étudiant inscrit à votre UE.</p>
      </header>
      {erreur && <Alerte texte={erreur} />}
      {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</p>}
      {chargement ? <p className="text-enp-ink-soft">Chargement…</p> : cours.length === 0 ? (
        <p className="rounded-lg border border-enp-border bg-white p-5 text-enp-ink-soft">Aucune UE ne vous est attribuée.</p>
      ) : (
        <>
          <label className="block max-w-xl text-sm font-medium text-enp-ink">
            UE
            <select value={courseId ?? ''} onChange={(event) => setCourseId(Number(event.target.value))} className="mt-1 block w-full rounded-md border border-enp-border bg-white px-3 py-2">
              {cours.map((ue) => <option key={ue.id} value={ue.id}>{ue.code} — {ue.intitule}</option>)}
            </select>
          </label>

          <form onSubmit={(event) => void creerSeance(event)} className="grid gap-3 rounded-xl border border-enp-border bg-white p-4 sm:grid-cols-[180px_1fr_auto] sm:items-end">
            <label className="text-sm font-medium text-enp-ink">
              Date
              <input required type="date" max={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block w-full rounded-md border border-enp-border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-enp-ink">
              Séance
              <input required maxLength={120} value={libelle} onChange={(event) => setLibelle(event.target.value)} placeholder="Ex. TD — groupe 1" className="mt-1 block w-full rounded-md border border-enp-border px-3 py-2" />
            </label>
            <button type="submit" className="min-h-[42px] rounded-md bg-enp-primary px-4 py-2 text-sm font-semibold text-white hover:bg-enp-primary-dark">Créer la séance</button>
          </form>

          {seances.length > 0 && (
            <label className="block max-w-xl text-sm font-medium text-enp-ink">
              Séance à renseigner
              <select value={seanceId ?? ''} onChange={(event) => setSeanceId(Number(event.target.value))} className="mt-1 block w-full rounded-md border border-enp-border bg-white px-3 py-2">
                {seances.map((seance) => <option key={seance.id} value={seance.id}>{seance.date} — {seance.libelle} ({seance.marques}/{seance.effectif})</option>)}
              </select>
            </label>
          )}

          {detail && (
            <section className="overflow-hidden rounded-xl border border-enp-border bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-enp-border bg-enp-sky px-4 py-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck size={20} className="text-enp-primary" aria-hidden="true" />
                  <div><h2 className="font-semibold text-enp-ink">{detail.seance.libelle}</h2><p className="text-xs text-enp-ink-soft">{detail.seance.date}</p></div>
                </div>
                <button type="button" disabled={enregistrement || detail.etudiants.some((etudiant) => !statuts[etudiant.id])} onClick={() => void enregistrer()} className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-enp-primary px-3 py-2 text-sm font-medium text-white hover:bg-enp-primary-dark disabled:opacity-50">
                  <Save size={16} aria-hidden="true" /> {enregistrement ? 'Enregistrement…' : 'Enregistrer les présences'}
                </button>
              </div>
              {detail.etudiants.length === 0 ? <p className="p-4 text-sm text-enp-ink-soft">Aucun étudiant inscrit à cette UE.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-enp-ink-soft"><th className="px-4 py-3">Matricule</th><th className="px-4 py-3">Étudiant</th><th className="px-4 py-3 text-center">Présences</th><th className="px-4 py-3 text-center">Absences</th><th className="px-4 py-3 text-center">Retards</th><th className="px-4 py-3 text-center">Taux de présence</th><th className="w-48 px-4 py-3">Statut de cette séance</th></tr></thead>
                    <tbody>{detail.etudiants.map((etudiant) => (
                      <tr key={etudiant.id} className="border-t border-enp-border">
                        <td className="px-4 py-3">{etudiant.identifiant ?? '—'}</td>
                        <td className="px-4 py-3">{etudiant.prenom} {etudiant.nom}</td>
                        <td className="px-4 py-3 text-center">{etudiant.statistiques?.presents ?? '—'}</td>
                        <td className="px-4 py-3 text-center">{etudiant.statistiques?.absents ?? '—'}</td>
                        <td className="px-4 py-3 text-center">{etudiant.statistiques?.retards ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold">
                            {etudiant.statistiques?.tauxPresence == null ? '—' : `${etudiant.statistiques.tauxPresence}%`}
                          </span>
                          <span className="block text-xs text-enp-ink-soft">
                            {etudiant.statistiques
                              ? `${etudiant.statistiques.seancesMarquees}/${etudiant.statistiques.seancesTotal} séances`
                              : 'Statistiques indisponibles'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <select aria-label={`Présence de ${etudiant.prenom} ${etudiant.nom}`} value={statuts[etudiant.id] ?? ''} onChange={(event) => setStatuts((current) => ({ ...current, [etudiant.id]: event.target.value as StatutPresenceEtudiant | '' }))} className="w-full rounded-md border border-enp-border bg-white px-3 py-2">
                            <option value="">Choisir…</option>
                            {Object.entries(LIBELLES_STATUT).map(([valeur, label]) => <option key={valeur} value={valeur}>{label}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Alerte({ texte }: { texte: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-enp-bordeaux/15 bg-enp-bordeaux-light p-4 text-enp-bordeaux" role="alert">
      <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{texte}</span>
    </div>
  );
}
