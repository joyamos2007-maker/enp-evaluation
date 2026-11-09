import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, LockKeyhole, RefreshCw, ClipboardCheck } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { DetailsDeliberationExamen, ExamenADeliberer } from '@/api/types';
import { PageHeader, Button, Alert, Badge } from '@/components/ui';

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
          : liste[0]?.id ?? null,
      );
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.messages.join(' ') : 'Impossible de charger les examens.',
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    let actif = true;
    if (selectionId === null) {
      setDetails(null);
      return () => {
        actif = false;
      };
    }
    setDetails(null);
    api
      .scolariteDetailsDeliberationExamen(selectionId)
      .then((resultat) => {
        if (actif) setDetails(resultat);
      })
      .catch((err: unknown) => {
        if (actif) {
          setErreur(
            err instanceof ApiError
              ? err.messages.join(' ')
              : 'Impossible de charger les notes de cet examen.',
          );
        }
      });
    return () => {
      actif = false;
    };
  }, [selectionId]);

  const examenSelectionne = examens.find((examen) => examen.id === selectionId) ?? null;

  const moyenneExamen = useMemo(() => {
    if (!details) return '-';
    const notesValides = details.etudiants
      .map((e) => e.note)
      .filter((n): n is number => n !== null && n !== undefined);
    if (notesValides.length === 0) return '-';
    return (
      Math.round((notesValides.reduce((a, b) => a + b, 0) / notesValides.length) * 100) / 100
    ).toFixed(2);
  }, [details]);

  async function deliberer() {
    if (!examenSelectionne || examenSelectionne.delibereeLe) return;
    setEnCours(true);
    setErreur(null);
    setMessage(null);
    try {
      await api.scolariteDelibererExamen(examenSelectionne.id);
      setMessage(
        `Les notes de « ${examenSelectionne.libelle} » ont été délibérées et sont désormais publiées aux étudiants.`,
      );
      await charger();
      const resultat = await api.scolariteDetailsDeliberationExamen(examenSelectionne.id);
      setDetails(resultat);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.messages.join(' ') : 'Impossible de délibérer cet examen.',
      );
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in pb-6">
      <PageHeader
        title="Délibération des examens"
        description="Vérifiez les bordereaux de notes d’examen et publiez les résultats aux étudiants après délibération du jury."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Délibération des examens' },
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

      {message && (
        <Alert variant="success" title="Délibération validée" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      {chargement ? (
        <div className="bg-white border border-enp-border p-12 text-center text-sm text-enp-gray-medium">
          Chargement des examens…
        </div>
      ) : examens.length === 0 ? (
        <div className="bg-white border border-enp-border p-10 text-center space-y-2 shadow-xs">
          <ClipboardCheck className="w-10 h-10 text-enp-gray-medium mx-auto opacity-40" />
          <p className="text-sm font-bold text-enp-blue-deep">Aucun examen en attente</p>
          <p className="text-xs text-enp-gray-medium">
            Aucun examen terminal n’a encore été saisi dans votre périmètre.
          </p>
        </div>
      ) : (
        <>
          {/* SÉLECTION D'EXAMEN EN 1 CLIC */}
          <div className="bg-white border border-enp-border p-4 space-y-2.5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep block">
              Sélectionner l'examen à vérifier
            </span>
            <div className="flex flex-wrap gap-2">
              {examens.map((examen) => {
                const actif = examen.id === selectionId;
                return (
                  <button
                    key={examen.id}
                    type="button"
                    onClick={() => {
                      setSelectionId(examen.id);
                      setMessage(null);
                    }}
                    className={`px-3.5 py-2 text-xs border transition-colors flex items-center gap-2 ${
                      actif
                        ? 'bg-enp-blue-deep text-white border-enp-blue-deep font-bold shadow-xs'
                        : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice/40'
                    }`}
                  >
                    <span
                      className={`font-mono px-1.5 py-0.5 font-bold ${
                        actif ? 'bg-white/20 text-white' : 'bg-enp-blue-light text-enp-blue-deep'
                      }`}
                    >
                      {examen.code}
                    </span>
                    <span>{examen.libelle}</span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold ${
                        actif
                          ? 'bg-white/20 text-white'
                          : examen.delibereeLe
                            ? 'bg-enp-green-light text-enp-green-valid'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {examen.delibereeLe
                        ? 'Délibéré'
                        : `${examen.notesSaisies}/${examen.effectif}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {examenSelectionne && (
            <section className="bg-white border border-enp-border shadow-xs overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-enp-border bg-enp-bg p-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-enp-blue-deep">
                      {examenSelectionne.code} : {examenSelectionne.intitule}
                    </h2>
                    <Badge variant="institutional">{examenSelectionne.libelle}</Badge>
                  </div>
                  <p className="text-xs text-enp-gray-medium">
                    Barème /{examenSelectionne.bareme} • Semestre {examenSelectionne.semestre} •{' '}
                    {examenSelectionne.anneeUniversitaire} • {examenSelectionne.campus} •{' '}
                    <strong className="text-enp-black">
                      {examenSelectionne.notesSaisies}/{examenSelectionne.effectif} notes saisies
                    </strong>{' '}
                    • Moyenne : <strong className="text-enp-blue-deep">{moyenneExamen}</strong>
                  </p>
                </div>

                {examenSelectionne.delibereeLe ? (
                  <span className="inline-flex items-center gap-1.5 bg-enp-green-light border border-enp-green-valid/30 px-3 py-1.5 text-xs font-bold text-enp-green-valid">
                    <CheckCircle2 className="w-4 h-4" /> Délibéré et publié
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => void deliberer()}
                    isLoading={enCours}
                    disabled={
                      enCours ||
                      chargement ||
                      examenSelectionne.effectif === 0 ||
                      examenSelectionne.notesSaisies !== examenSelectionne.effectif
                    }
                    leftIcon={<LockKeyhole className="w-4 h-4" />}
                  >
                    Confirmer la délibération
                  </Button>
                )}
              </div>

              {!examenSelectionne.delibereeLe &&
                examenSelectionne.notesSaisies !== examenSelectionne.effectif && (
                  <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900">
                    La délibération sera déverrouillée dès que l'enseignant aura saisi les notes de tous les étudiants inscrits.
                  </div>
                )}

              {!details ? (
                <p className="p-8 text-center text-sm text-enp-gray-medium">
                  Chargement du bordereau des notes…
                </p>
              ) : details.etudiants.length === 0 ? (
                <p className="p-8 text-center text-sm text-enp-gray-medium">
                  Aucun étudiant n’est inscrit à cette UE.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-enp-blue-deep text-white text-left text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 font-semibold">Matricule</th>
                        <th className="px-4 py-3 font-semibold">Étudiant</th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Note / {examenSelectionne.bareme}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-enp-border">
                      {details.etudiants.map((etudiant) => (
                        <tr key={etudiant.id} className="hover:bg-enp-blue-ice/20">
                          <td className="px-4 py-2.5 font-mono text-xs font-bold text-enp-blue-deep">
                            {etudiant.identifiant ?? '-'}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-enp-black">
                            {etudiant.prenom} {etudiant.nom}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold">
                            {etudiant.note === null ? (
                              <Badge variant="warning">Non saisie</Badge>
                            ) : (
                              <span
                                className={
                                  etudiant.note >= examenSelectionne.bareme / 2
                                    ? 'text-enp-blue-deep'
                                    : 'text-enp-red-error'
                                }
                              >
                                {etudiant.note}
                              </span>
                            )}
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
