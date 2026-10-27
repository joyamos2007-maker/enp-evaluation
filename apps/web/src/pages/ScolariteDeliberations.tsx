import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, LockKeyhole, RefreshCw } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { DetailsDeliberationExamen, ExamenADeliberer } from '@/api/types';

export function ScolariteDeliberations() {
  const [examens, setExamens] = useState<ExamenADeliberer[]>([]);
  const [selectionId, setSelectionId] = useState<number | null>(null);
  const [details, setDetails] = useState<DetailsDeliberationExamen | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const liste = await api.scolariteDeliberationsExamens();
      setExamens(liste);
      setSelectionId((current) =>
        current !== null && liste.some((examen) => examen.id === current)
          ? current
          : liste[0]?.id ?? null
      );
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Impossible de charger les examens.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  useEffect(() => {
    let actif = true;
    if (selectionId === null) {
      setDetails(null);
      return () => { actif = false; };
    }
    setDetails(null);
    api.scolariteDetailsDeliberationExamen(selectionId)
      .then((resultat) => { if (actif) setDetails(resultat); })
      .catch((err: unknown) => {
        if (actif) setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Impossible de charger les notes de cet examen.');
      });
    return () => { actif = false; };
  }, [selectionId]);

  const examenSelectionne = examens.find((examen) => examen.id === selectionId) ?? null;

  async function deliberer() {
    if (!examenSelectionne || examenSelectionne.delibereeLe) return;
    setEnCours(true);
    setErreur(null);
    setMessage(null);
    try {
      await api.scolariteDelibererExamen(examenSelectionne.id);
      setMessage(`Les notes de « ${examenSelectionne.libelle} » ont été délibérées et sont désormais visibles par les étudiants.`);
      await charger();
      const resultat = await api.scolariteDetailsDeliberationExamen(examenSelectionne.id);
      setDetails(resultat);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Impossible de délibérer cet examen.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-enp-ink">Délibération des examens</h1>
          <p className="mt-1 text-sm text-enp-ink-soft">
            Vérifiez les notes d’examen avant leur publication aux étudiants. Les devoirs restent visibles immédiatement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void charger()}
          disabled={chargement}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-enp-border bg-white px-3 py-2 text-sm font-medium text-enp-ink hover:bg-enp-sky disabled:opacity-60"
        >
          <RefreshCw size={16} aria-hidden="true" /> Actualiser
        </button>
      </header>

      {erreur && <Alerte texte={erreur} />}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
          {message}
        </p>
      )}

      {chargement ? <p className="text-sm text-enp-ink-soft" role="status">Chargement des examens…</p> : examens.length === 0 ? (
        <div className="rounded-xl border border-enp-border bg-white p-8 text-center text-enp-ink-soft">
          Aucun examen n’a encore été saisi dans votre périmètre.
        </div>
      ) : (
        <>
          <label className="block max-w-2xl text-sm font-medium text-enp-ink">
            Évaluation d’examen
            <select
              value={selectionId ?? ''}
              onChange={(event) => setSelectionId(Number(event.target.value))}
              className="mt-1 block w-full rounded-md border border-enp-border bg-white px-3 py-2"
            >
              {examens.map((examen) => (
                <option key={examen.id} value={examen.id}>
                  {examen.code} — {examen.libelle} ({examen.delibereeLe ? 'délibéré' : `${examen.notesSaisies}/${examen.effectif} notes`})
                </option>
              ))}
            </select>
          </label>

          {examenSelectionne && (
            <section className="overflow-hidden rounded-xl border border-enp-border bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-enp-border bg-enp-sky px-4 py-4">
                <div>
                  <h2 className="font-semibold text-enp-ink">{examenSelectionne.code} — {examenSelectionne.intitule}</h2>
                  <p className="mt-1 text-sm text-enp-ink-soft">
                    {examenSelectionne.libelle} · barème {examenSelectionne.bareme} · S{examenSelectionne.semestre} · {examenSelectionne.anneeUniversitaire} · {examenSelectionne.campus}
                  </p>
                  <p className="mt-1 text-xs text-enp-ink-soft">
                    {examenSelectionne.notesSaisies}/{examenSelectionne.effectif} notes saisies
                  </p>
                </div>
                {examenSelectionne.delibereeLe ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={16} aria-hidden="true" /> Délibéré
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void deliberer()}
                    disabled={enCours || chargement || examenSelectionne.effectif === 0 || examenSelectionne.notesSaisies !== examenSelectionne.effectif}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-enp-primary px-4 py-2 text-sm font-semibold text-white hover:bg-enp-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LockKeyhole size={16} aria-hidden="true" />
                    {enCours ? 'Délibération…' : 'Confirmer la délibération'}
                  </button>
                )}
              </div>

              {!examenSelectionne.delibereeLe && examenSelectionne.notesSaisies !== examenSelectionne.effectif && (
                <p className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  La délibération sera possible lorsque toutes les notes seront saisies.
                </p>
              )}

              {!details ? (
                <p className="p-4 text-sm text-enp-ink-soft">Chargement des notes…</p>
              ) : details.etudiants.length === 0 ? (
                <p className="p-4 text-sm text-enp-ink-soft">Aucun étudiant n’est inscrit à cette UE.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-enp-ink-soft">
                        <th className="px-4 py-3">Matricule</th>
                        <th className="px-4 py-3">Étudiant</th>
                        <th className="px-4 py-3 text-right">Note / {examenSelectionne.bareme}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.etudiants.map((etudiant) => (
                        <tr key={etudiant.id} className="border-t border-enp-border">
                          <td className="px-4 py-3">{etudiant.identifiant ?? '—'}</td>
                          <td className="px-4 py-3">{etudiant.prenom} {etudiant.nom}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {etudiant.note === null ? <span className="font-normal text-amber-800">Non saisie</span> : etudiant.note}
                          </td>
                        </tr>
                      ))}
                    </tbody>
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
