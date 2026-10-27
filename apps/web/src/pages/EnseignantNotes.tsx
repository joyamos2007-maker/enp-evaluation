import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, ClipboardList, Download, Save } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CahierNotes, CoursDossier, TypeEvaluationAcademique } from '@/api/types';

export function EnseignantNotes() {
  const [cours, setCours] = useState<CoursDossier[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [cahier, setCahier] = useState<CahierNotes | null>(null);
  const [libelle, setLibelle] = useState('');
  const [type, setType] = useState<TypeEvaluationAcademique>('devoir');
  const [bareme, setBareme] = useState('20');
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState<number | null>(null);
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

  const chargerCahier = useCallback(async () => {
    if (courseId === null) return;
    setErreur(null);
    try {
      setCahier(await api.dossierCahierNotes(courseId));
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Impossible de charger le tableau des notes.');
    }
  }, [courseId]);

  useEffect(() => {
    void chargerCahier();
  }, [chargerCahier]);

  async function creerEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (courseId === null) return;
    setErreur(null);
    setMessage(null);
    try {
      await api.dossierCreerEvaluation(courseId, { libelle: libelle.trim(), type, bareme: Number(bareme) });
      setLibelle('');
      setMessage('La colonne d’évaluation a été créée.');
      await chargerCahier();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Impossible de créer la colonne.');
    }
  }

  function modifierNote(evaluationId: number, etudiantId: number, valeur: string) {
    if (!cahier) return;
    const note = valeur === '' ? null : Number(valeur);
    setCahier({
      ...cahier,
      evaluations: cahier.evaluations.map((evaluation) => evaluation.id !== evaluationId
        ? evaluation
        : { ...evaluation, notes: { ...evaluation.notes, [etudiantId]: note } }),
    });
  }

  async function enregistrerEvaluation(evaluationId: number) {
    if (!cahier) return;
    const evaluation = cahier.evaluations.find((ligne) => ligne.id === evaluationId);
    if (!evaluation) return;
    setEnregistrement(evaluationId);
    setErreur(null);
    setMessage(null);
    try {
      await api.dossierEnregistrerNotes(
        evaluationId,
        cahier.etudiants.map((etudiant) => ({
          etudiantId: etudiant.id,
          note: evaluation.notes[etudiant.id] ?? null,
        })),
      );
      setMessage(`Les notes de « ${evaluation.libelle} » ont été enregistrées.`);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Impossible d’enregistrer les notes.');
    } finally {
      setEnregistrement(null);
    }
  }

  async function exporterNotes(format: 'pdf' | 'xlsx' | 'docx') {
    if (courseId === null || !cahier) return;
    setErreur(null);
    try {
      const blob = await api.dossierExporterNotes(courseId, format);
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `notes-${cahier.cours.code}.${format}`;
      lien.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Impossible d’exporter les notes.');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Notes des étudiants</h1>
        <p className="text-sm text-enp-ink-soft mt-1">Créez autant de colonnes de devoirs et d’examens que nécessaire pour vos UE.</p>
      </header>

      {erreur && <Alerte texte={erreur} />}
      {message && <p className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800" role="status">{message}</p>}
      {chargement ? <p className="text-enp-ink-soft">Chargement…</p> : (
        <>
          {cours.length === 0 ? (
            <p className="rounded-lg bg-white border border-enp-border p-5 text-enp-ink-soft">Aucune UE ne vous est attribuée.</p>
          ) : (
            <>
              <label className="block max-w-xl text-sm font-medium text-enp-ink">
                UE
                <select
                  value={courseId ?? ''}
                  onChange={(event) => setCourseId(Number(event.target.value))}
                  className="mt-1 block w-full rounded-md border border-enp-border bg-white px-3 py-2"
                >
                  {cours.map((ue) => <option key={ue.id} value={ue.id}>{ue.code} — {ue.intitule}</option>)}
                </select>
              </label>

              <form onSubmit={(event) => void creerEvaluation(event)} className="grid gap-3 rounded-xl border border-enp-border bg-white p-4 sm:grid-cols-[1fr_140px_130px_auto] sm:items-end">
                <label className="text-sm font-medium text-enp-ink">
                  Intitulé de la colonne
                  <input required maxLength={120} value={libelle} onChange={(event) => setLibelle(event.target.value)} placeholder="Ex. Devoir 1" className="mt-1 block w-full rounded-md border border-enp-border px-3 py-2" />
                </label>
                <label className="text-sm font-medium text-enp-ink">
                  Type
                  <select value={type} onChange={(event) => setType(event.target.value as TypeEvaluationAcademique)} className="mt-1 block w-full rounded-md border border-enp-border bg-white px-3 py-2">
                    <option value="devoir">Devoir</option>
                    <option value="examen">Examen</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-enp-ink">
                  Barème
                  <input required type="number" min="0.01" max="100000" step="0.01" value={bareme} onChange={(event) => setBareme(event.target.value)} className="mt-1 block w-full rounded-md border border-enp-border px-3 py-2" />
                </label>
                <button type="submit" className="min-h-[42px] rounded-md bg-enp-primary px-4 py-2 text-sm font-semibold text-white hover:bg-enp-primary-dark">Créer la colonne</button>
              </form>

              {cahier && (
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={20} className="text-enp-primary" aria-hidden="true" />
                      <h2 className="text-lg font-semibold text-enp-ink">{cahier.cours.code} — {cahier.cours.intitule}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(['pdf', 'xlsx', 'docx'] as const).map((format) => (
                        <button key={format} type="button" onClick={() => void exporterNotes(format)} className="inline-flex min-h-[38px] items-center gap-2 rounded-md border border-enp-border bg-white px-3 py-2 text-sm font-medium text-enp-ink hover:bg-enp-sky">
                          <Download size={15} aria-hidden="true" /> {format.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  {cahier.evaluations.length === 0 ? (
                    <p className="rounded-lg bg-white border border-enp-border p-5 text-enp-ink-soft">Aucune colonne. Créez un devoir ou un examen ci-dessus.</p>
                  ) : cahier.evaluations.map((evaluation) => (
                    <article key={evaluation.id} className="overflow-hidden rounded-xl border border-enp-border bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-enp-border bg-enp-sky px-4 py-3">
                        <div>
                          <h3 className="font-semibold text-enp-ink">{evaluation.libelle}</h3>
                          <p className="text-xs text-enp-ink-soft">{evaluation.type === 'devoir' ? 'Devoir' : 'Examen'} · sur {evaluation.bareme}</p>
                        </div>
                        {evaluation.type === 'examen' && !evaluation.deliberee && (
                          <span className="text-xs font-medium text-amber-800">
                            Publication après délibération par la Scolarité.
                          </span>
                        )}
                        {evaluation.type === 'examen' && evaluation.deliberee && (
                          <span className="text-xs font-semibold text-emerald-800">
                            Délibéré · modification verrouillée
                          </span>
                        )}
                        {!(evaluation.type === 'examen' && evaluation.deliberee) && (
                          <button type="button" disabled={enregistrement === evaluation.id} onClick={() => void enregistrerEvaluation(evaluation.id)} className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-enp-primary px-3 py-2 text-sm font-medium text-white hover:bg-enp-primary-dark disabled:opacity-60">
                            <Save size={16} aria-hidden="true" /> {enregistrement === evaluation.id ? 'Enregistrement…' : 'Enregistrer les notes'}
                          </button>
                        )}
                      </div>
                      {cahier.etudiants.length === 0 ? <p className="p-4 text-sm text-enp-ink-soft">Aucun étudiant inscrit à cette UE.</p> : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="text-left text-enp-ink-soft"><th className="px-4 py-3">Matricule</th><th className="px-4 py-3">Étudiant</th><th className="w-40 px-4 py-3">Note / {evaluation.bareme}</th></tr></thead>
                            <tbody>{cahier.etudiants.map((etudiant) => (
                              <tr key={etudiant.id} className="border-t border-enp-border">
                                <td className="px-4 py-3">{etudiant.identifiant ?? '—'}</td>
                                <td className="px-4 py-3">{etudiant.prenom} {etudiant.nom}</td>
                                <td className="px-4 py-2"><input aria-label={`Note de ${etudiant.prenom} ${etudiant.nom}`} disabled={evaluation.type === 'examen' && evaluation.deliberee} type="number" min="0" max={evaluation.bareme} step="0.01" value={evaluation.notes[etudiant.id] ?? ''} onChange={(event) => modifierNote(evaluation.id, etudiant.id, event.target.value)} className="w-full rounded-md border border-enp-border px-3 py-2 disabled:bg-enp-sky disabled:text-enp-ink-soft" /></td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      )}
                    </article>
                  ))}
                </section>
              )}
            </>
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
