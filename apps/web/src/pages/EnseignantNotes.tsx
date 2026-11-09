import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BookOpen,
  ClipboardList,
  Download,
  Lock,
  Plus,
  Save,
  Table as TableIcon,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CahierNotes, CoursDossier, TypeEvaluationAcademique } from '@/api/types';
import { PageHeader, Button, Alert, Badge } from '@/components/ui';

const PRESETS_EVAL: { libelle: string; type: TypeEvaluationAcademique }[] = [
  { libelle: 'Devoir 1', type: 'devoir' },
  { libelle: 'Devoir 2', type: 'devoir' },
  { libelle: 'Examen final', type: 'examen' },
];

export function EnseignantNotes() {
  const [cours, setCours] = useState<CoursDossier[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [cahier, setCahier] = useState<CahierNotes | null>(null);
  const [evalActiveId, setEvalActiveId] = useState<number | 'synthese' | null>(null);
  const [afficherCreation, setAfficherCreation] = useState(false);

  const [libelle, setLibelle] = useState('');
  const [type, setType] = useState<TypeEvaluationAcademique>('devoir');
  const [bareme, setBareme] = useState('20');

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    api
      .dossierCoursEnseignant()
      .then((data) => {
        if (!actif) return;
        setCours(data);
        if (data[0]) setCourseId(data[0].id);
      })
      .catch((err: unknown) => {
        if (actif) {
          setErreur(
            err instanceof ApiError ? err.messages.join(' ') : 'Impossible de charger vos UE.',
          );
        }
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, []);

  const chargerCahier = useCallback(async () => {
    if (courseId === null) return;
    setErreur(null);
    try {
      const data = await api.dossierCahierNotes(courseId);
      setCahier(data);
      setEvalActiveId((precedent) => {
        if (precedent === 'synthese' && data.evaluations.length > 1) return 'synthese';
        if (
          typeof precedent === 'number' &&
          data.evaluations.some((ev) => ev.id === precedent)
        ) {
          return precedent;
        }
        return data.evaluations[0]?.id ?? null;
      });
      if (data.evaluations.length === 0) setAfficherCreation(true);
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Impossible de charger le tableau des notes.',
      );
    }
  }, [courseId]);

  useEffect(() => {
    void chargerCahier();
  }, [chargerCahier]);

  async function creerEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (courseId === null || !libelle.trim()) return;
    setErreur(null);
    setMessage(null);
    try {
      const creee = await api.dossierCreerEvaluation(courseId, {
        libelle: libelle.trim(),
        type,
        bareme: Number(bareme),
      });
      setLibelle('');
      setAfficherCreation(false);
      setMessage(`L'évaluation « ${creee.libelle} » a été créée.`);
      const data = await api.dossierCahierNotes(courseId);
      setCahier(data);
      setEvalActiveId(creee.id);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.messages.join(' ') : 'Impossible de créer la colonne.',
      );
    }
  }

  function modifierNote(evaluationId: number, etudiantId: number, valeur: string) {
    if (!cahier) return;
    const note = valeur === '' ? null : Number(valeur);
    setCahier({
      ...cahier,
      evaluations: cahier.evaluations.map((evaluation) =>
        evaluation.id !== evaluationId
          ? evaluation
          : { ...evaluation, notes: { ...evaluation.notes, [etudiantId]: note } },
      ),
    });
    setMessage(null);
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
      setErreur(
        err instanceof ApiError ? err.messages.join(' ') : 'Impossible d’enregistrer les notes.',
      );
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
      setErreur(
        err instanceof ApiError ? err.messages.join(' ') : 'Impossible d’exporter les notes.',
      );
    }
  }

  const evaluationActive = useMemo(() => {
    if (!cahier || evalActiveId === null || evalActiveId === 'synthese') return null;
    return cahier.evaluations.find((ev) => ev.id === evalActiveId) ?? cahier.evaluations[0] ?? null;
  }, [cahier, evalActiveId]);

  const statsActive = useMemo(() => {
    if (!evaluationActive || !cahier) return null;
    const valeurs = cahier.etudiants
      .map((e) => evaluationActive.notes[e.id])
      .filter((v): v is number => v !== null && v !== undefined && !Number.isNaN(v));
    const moyenne =
      valeurs.length > 0
        ? (Math.round((valeurs.reduce((a, b) => a + b, 0) / valeurs.length) * 100) / 100).toFixed(2)
        : '-';
    return {
      saisies: valeurs.length,
      total: cahier.etudiants.length,
      moyenne,
    };
  }, [cahier, evaluationActive]);

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl mx-auto pb-6">
      <PageHeader
        title="Saisie des notes"
        description="Gérez les notes de devoirs et d'examens de vos promotions dans une grille unifiée."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Saisie des notes' },
        ]}
        actions={
          cours.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {cahier && cahier.evaluations.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {(['pdf', 'xlsx', 'docx'] as const).map((format) => (
                    <Button
                      key={format}
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                      onClick={() => void exporterNotes(format)}
                    >
                      {format.toUpperCase()}
                    </Button>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant={afficherCreation ? 'outline' : 'primary'}
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setAfficherCreation((v) => !v)}
              >
                {afficherCreation ? 'Fermer' : 'Nouvelle évaluation'}
              </Button>
            </div>
          ) : undefined
        }
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {message && (
        <Alert variant="success" title="Confirmation" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      {chargement ? (
        <div className="bg-white border border-enp-border p-10 text-center text-sm text-enp-gray-medium">
          Chargement de vos unités d’enseignement…
        </div>
      ) : cours.length === 0 ? (
        <div className="bg-white border border-enp-border p-10 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-enp-gray-medium mx-auto opacity-50" />
          <p className="text-sm font-bold text-enp-blue-deep">Aucune UE attribuée</p>
          <p className="text-xs text-enp-gray-medium">
            Aucune unité d’enseignement ne vous est rattachée pour le semestre en cours.
          </p>
        </div>
      ) : (
        <>
          {/* 1. SÉLECTION D'UE EN 1 CLIC */}
          <div className="bg-white border border-enp-border p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep block">
              1. Unité d'enseignement
            </span>
            <div className="flex flex-wrap gap-2">
              {cours.map((ue) => {
                const actif = ue.id === courseId;
                return (
                  <button
                    key={ue.id}
                    type="button"
                    onClick={() => {
                      setCourseId(ue.id);
                      setMessage(null);
                    }}
                    className={`px-3.5 py-2 text-xs sm:text-sm font-semibold border transition-colors text-left flex items-center gap-2 ${
                      actif
                        ? 'bg-enp-blue-deep text-white border-enp-blue-deep shadow-xs'
                        : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice/50'
                    }`}
                  >
                    <span
                      className={`font-mono text-xs px-1.5 py-0.5 font-bold ${
                        actif ? 'bg-white/20 text-white' : 'bg-enp-blue-light text-enp-blue-deep'
                      }`}
                    >
                      {ue.code}
                    </span>
                    <span className="truncate max-w-[240px]">{ue.intitule}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. CRÉATION RAPIDE D'UNE COLONNE D'ÉVALUATION */}
          {afficherCreation && (
            <form
              onSubmit={(event) => void creerEvaluation(event)}
              className="bg-enp-blue-ice/40 border border-enp-blue-primary/30 p-4 space-y-3 animate-fade-in"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep">
                  Ajouter une colonne d'évaluation
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-enp-gray-medium">Modèles rapides :</span>
                  {PRESETS_EVAL.map((preset) => (
                    <button
                      key={preset.libelle}
                      type="button"
                      onClick={() => {
                        setLibelle(preset.libelle);
                        setType(preset.type);
                      }}
                      className="text-[11px] font-semibold px-2 py-0.5 bg-white border border-enp-border text-enp-blue-deep hover:border-enp-blue-primary transition-colors"
                    >
                      {preset.libelle}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px_120px_auto] gap-3 items-end">
                <label className="block text-xs font-bold text-enp-black">
                  Intitulé
                  <input
                    required
                    maxLength={120}
                    value={libelle}
                    onChange={(event) => setLibelle(event.target.value)}
                    placeholder="Ex. Devoir 1 ou Examen final"
                    className="mt-1 block w-full border border-enp-border bg-white px-3 py-2 text-sm text-enp-black focus:border-enp-blue-primary outline-none min-h-[40px]"
                  />
                </label>
                <label className="block text-xs font-bold text-enp-black">
                  Nature
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value as TypeEvaluationAcademique)}
                    className="mt-1 block w-full border border-enp-border bg-white px-3 py-2 text-sm text-enp-black focus:border-enp-blue-primary outline-none min-h-[40px]"
                  >
                    <option value="devoir">Devoir continu</option>
                    <option value="examen">Examen terminal</option>
                  </select>
                </label>
                <label className="block text-xs font-bold text-enp-black">
                  Barème
                  <input
                    required
                    type="number"
                    min="0.01"
                    max="100000"
                    step="0.01"
                    value={bareme}
                    onChange={(event) => setBareme(event.target.value)}
                    className="mt-1 block w-full border border-enp-border bg-white px-3 py-2 text-sm text-enp-black focus:border-enp-blue-primary outline-none min-h-[40px]"
                  />
                </label>
                <Button type="submit" variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
                  Créer la colonne
                </Button>
              </div>
            </form>
          )}

          {/* 3. ONGLETS DES ÉVALUATIONS & GRILLE DE SAISIE */}
          {cahier && (
            <div className="space-y-4">
              {cahier.evaluations.length === 0 ? (
                <div className="bg-white border border-enp-border p-8 text-center text-sm text-enp-gray-medium">
                  Aucune évaluation créée pour cette UE. Utilisez le formulaire ci-dessus pour créer un devoir ou un examen.
                </div>
              ) : (
                <>
                  {/* Barre d'onglets des évaluations */}
                  <div className="bg-white border border-enp-border p-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep mr-2">
                      2. Évaluation :
                    </span>
                    {cahier.evaluations.map((ev) => {
                      const actif = evalActiveId === ev.id;
                      const nbNotes = Object.values(ev.notes).filter((v) => v !== null).length;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setEvalActiveId(ev.id)}
                          className={`px-3 py-2 text-xs font-semibold border transition-colors flex items-center gap-2 ${
                            actif
                              ? 'bg-enp-blue-primary text-white border-enp-blue-primary shadow-xs'
                              : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice/40'
                          }`}
                        >
                          <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                          <span>{ev.libelle}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 font-bold ${
                              actif
                                ? 'bg-white/20 text-white'
                                : ev.type === 'examen'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-enp-blue-light text-enp-blue-deep'
                            }`}
                          >
                            {nbNotes}/{cahier.etudiants.length}
                          </span>
                        </button>
                      );
                    })}

                    {cahier.evaluations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setEvalActiveId('synthese')}
                        className={`ml-auto px-3 py-2 text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                          evalActiveId === 'synthese'
                            ? 'bg-enp-blue-deep text-white border-enp-blue-deep shadow-xs'
                            : 'bg-enp-bg text-enp-blue-deep border-enp-border hover:bg-enp-blue-ice/40'
                        }`}
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                        <span>Vue synthèse ({cahier.evaluations.length} colonnes)</span>
                      </button>
                    )}
                  </div>

                  {/* VUE SYNTHÈSE (TOUTES LES COLONNES CÔTE À CÔTE) */}
                  {evalActiveId === 'synthese' ? (
                    <section className="bg-white border border-enp-border shadow-xs overflow-hidden">
                      <div className="p-4 border-b border-enp-border bg-enp-bg flex items-center justify-between">
                        <div>
                          <h2 className="text-sm font-bold text-enp-blue-deep">
                            Récapitulatif intégral • {cahier.cours.code} : {cahier.cours.intitule}
                          </h2>
                          <p className="text-xs text-enp-gray-medium">
                            Vue comparative de toutes les notes de la promotion ({cahier.etudiants.length} étudiants)
                          </p>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-enp-blue-deep text-white text-left text-xs uppercase tracking-wider">
                              <th className="px-4 py-3 font-semibold">Matricule</th>
                              <th className="px-4 py-3 font-semibold">Étudiant</th>
                              {cahier.evaluations.map((ev) => (
                                <th key={ev.id} className="px-4 py-3 text-right font-semibold">
                                  {ev.libelle} (/{ev.bareme})
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-enp-border">
                            {cahier.etudiants.map((etudiant) => (
                              <tr key={etudiant.id} className="hover:bg-enp-blue-ice/20">
                                <td className="px-4 py-2.5 font-mono text-xs font-bold text-enp-blue-deep">
                                  {etudiant.identifiant ?? '-'}
                                </td>
                                <td className="px-4 py-2.5 font-semibold text-enp-black">
                                  {etudiant.prenom} {etudiant.nom}
                                </td>
                                {cahier.evaluations.map((ev) => {
                                  const n = ev.notes[etudiant.id];
                                  return (
                                    <td
                                      key={ev.id}
                                      className="px-4 py-2.5 text-right font-mono font-bold"
                                    >
                                      {n === null || n === undefined ? (
                                        <span className="text-enp-gray-medium font-normal">-</span>
                                      ) : (
                                        <span
                                          className={
                                            n >= ev.bareme / 2
                                              ? 'text-enp-blue-deep'
                                              : 'text-enp-red-error'
                                          }
                                        >
                                          {n}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ) : (
                    /* VUE SAISIE D'UNE ÉVALUATION ACTIVE */
                    evaluationActive && (
                      <article className="bg-white border border-enp-border shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-enp-border bg-enp-bg flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-bold text-enp-blue-deep">
                                {evaluationActive.libelle}
                              </h2>
                              <Badge
                                variant={
                                  evaluationActive.type === 'devoir' ? 'default' : 'institutional'
                                }
                              >
                                {evaluationActive.type === 'devoir'
                                  ? 'Devoir continu'
                                  : 'Examen terminal'}
                              </Badge>
                              <Badge variant="outline">Barème /{evaluationActive.bareme}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-enp-gray-medium">
                              {statsActive && (
                                <>
                                  <span>
                                    Notes saisies :{' '}
                                    <strong className="text-enp-black">
                                      {statsActive.saisies}/{statsActive.total}
                                    </strong>
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Moyenne :{' '}
                                    <strong className="text-enp-blue-deep">
                                      {statsActive.moyenne} / {evaluationActive.bareme}
                                    </strong>
                                  </span>
                                </>
                              )}
                              {evaluationActive.type === 'examen' && !evaluationActive.deliberee && (
                                <span className="text-amber-800 font-medium">
                                  • Publication aux étudiants après délibération par la Scolarité
                                </span>
                              )}
                            </div>
                          </div>

                          {evaluationActive.type === 'examen' && evaluationActive.deliberee ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-enp-green-light text-enp-green-valid border border-enp-green-valid/30">
                              <Lock className="w-3.5 h-3.5" />
                              Délibéré • Modification verrouillée
                            </span>
                          ) : (
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              disabled={enregistrement === evaluationActive.id}
                              isLoading={enregistrement === evaluationActive.id}
                              leftIcon={<Save className="w-4 h-4" />}
                              onClick={() => void enregistrerEvaluation(evaluationActive.id)}
                            >
                              Enregistrer les notes
                            </Button>
                          )}
                        </div>

                        {cahier.etudiants.length === 0 ? (
                          <p className="p-8 text-center text-sm text-enp-gray-medium">
                            Aucun étudiant inscrit à cette UE.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="bg-enp-blue-deep text-white text-left text-xs uppercase tracking-wider">
                                  <th className="px-4 py-3 font-semibold">Matricule</th>
                                  <th className="px-4 py-3 font-semibold">Étudiant</th>
                                  <th className="w-48 px-4 py-3 text-right font-semibold">
                                    Note / {evaluationActive.bareme}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-enp-border">
                                {cahier.etudiants.map((etudiant) => {
                                  const valeurNote = evaluationActive.notes[etudiant.id] ?? '';
                                  return (
                                    <tr
                                      key={etudiant.id}
                                      className="hover:bg-enp-blue-ice/20 transition-colors"
                                    >
                                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-enp-blue-deep">
                                        {etudiant.identifiant ?? '-'}
                                      </td>
                                      <td className="px-4 py-2.5 font-semibold text-enp-black">
                                        {etudiant.prenom} {etudiant.nom}
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <input
                                          aria-label={`Note de ${etudiant.prenom} ${etudiant.nom}`}
                                          disabled={
                                            evaluationActive.type === 'examen' &&
                                            evaluationActive.deliberee
                                          }
                                          type="number"
                                          min="0"
                                          max={evaluationActive.bareme}
                                          step="0.25"
                                          placeholder="-"
                                          value={valeurNote}
                                          onChange={(event) =>
                                            modifierNote(
                                              evaluationActive.id,
                                              etudiant.id,
                                              event.target.value,
                                            )
                                          }
                                          className="w-32 ml-auto block text-right font-mono font-bold border border-enp-border bg-white px-3 py-1.5 text-sm text-enp-black focus:border-enp-blue-primary focus:ring-1 focus:ring-enp-blue-primary outline-none disabled:bg-enp-bg disabled:text-enp-gray-medium"
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </article>
                    )
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
