import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
  RefreshCw,
  Award,
  BookOpen,
  Calendar,
  Users,
  TrendingUp,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { DetailsDeliberationExamen, ExamenADeliberer } from '@/api/types';
import {
  PageHeader,
  SectionHeader,
  Button,
  Select,
  Alert,
  StatusBadge,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  StatCard,
  ConfirmDialog,
} from '@/components/ui';

export function ScolariteDeliberations() {
  const [examens, setExamens] = useState<ExamenADeliberer[]>([]);
  const [selectionId, setSelectionId] = useState<number | null>(null);
  const [details, setDetails] = useState<DetailsDeliberationExamen | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDeliberer, setConfirmDeliberer] = useState(false);

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
      setErreur(
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Impossible de charger la liste des examens à délibérer.'
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
        if (actif)
          setErreur(
            err instanceof ApiError
              ? err.messages.join(' ')
              : 'Impossible de charger les notes de cet examen.'
          );
      });
    return () => {
      actif = false;
    };
  }, [selectionId]);

  const examenSelectionne = examens.find((examen) => examen.id === selectionId) ?? null;

  async function deliberer() {
    if (!examenSelectionne || examenSelectionne.delibereeLe) return;
    setEnCours(true);
    setErreur(null);
    setMessage(null);
    try {
      await api.scolariteDelibererExamen(examenSelectionne.id);
      setMessage(
        `L’examen « ${examenSelectionne.libelle} » (${examenSelectionne.code}) a été officiellement délibéré. Les notes sont désormais publiées sur l'espace étudiant.`
      );
      setConfirmDeliberer(false);
      await charger();
      const resultat = await api.scolariteDetailsDeliberationExamen(examenSelectionne.id);
      setDetails(resultat);
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Erreur lors de la délibération de cet examen.'
      );
    } finally {
      setEnCours(false);
    }
  }

  // Statistiques de la cohorte pour l'examen sélectionné
  const stats = useMemo(() => {
    if (!details || details.etudiants.length === 0) return null;
    const notes = details.etudiants
      .map((e) => e.note)
      .filter((n): n is number => n !== null);

    if (notes.length === 0) return null;
    const somme = notes.reduce((acc, curr) => acc + curr, 0);
    const moyenne = somme / notes.length;
    const min = Math.min(...notes);
    const max = Math.max(...notes);
    const bareme = examenSelectionne?.bareme ?? 20;
    const reussite = notes.filter((n) => n >= bareme / 2).length;
    const tauxReussite = Math.round((reussite / notes.length) * 100);

    return {
      moyenne: (Math.round(moyenne * 100) / 100).toFixed(2),
      min: min.toFixed(2),
      max: max.toFixed(2),
      notesSaisies: notes.length,
      tauxReussite,
    };
  }, [details, examenSelectionne]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Délibération des examens académiques"
        subtitle="Vérification des bordereaux de notes, clôture des jurys et publication officielle aux étudiants."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Scolarité', href: '/scolarite' },
          { label: 'Délibérations d’examen' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${chargement ? 'animate-spin' : ''}`} />}
            onClick={() => void charger()}
            disabled={chargement}
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
        <Alert variant="success" title="Délibération enregistrée" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      <div className="bg-enp-bg border-l-4 border-enp-blue-primary border-r border-t border-b border-enp-border p-4 text-xs text-enp-gray-medium leading-relaxed">
        <span className="font-bold text-enp-blue-deep block mb-0.5">
          Règle institutionnelle de publication des notes :
        </span>
        Les notes de contrôles continus et devoirs sont publiées au fil de l'eau par l'enseignant.
        En revanche, les notes d'examens terminaux demeurent confidentielles jusqu'à la tenue de la
        délibération officielle par la Scolarité centrale et le jury d'examen.
      </div>

      {chargement ? (
        <div className="p-12 text-center bg-white border border-enp-border">
          <div className="inline-block w-8 h-8 border-2 border-enp-blue-ice border-t-enp-blue-primary animate-spin mb-2" />
          <p className="text-sm text-enp-gray-medium">Chargement des bordereaux d'examen…</p>
        </div>
      ) : examens.length === 0 ? (
        <div className="bg-white border border-enp-border p-8 text-center text-enp-gray-medium">
          <Award className="w-10 h-10 text-enp-gray-medium mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-enp-black">Aucun examen n’a encore été saisi</p>
          <p className="text-xs mt-1">Les bordereaux apparaîtront ici dès que les enseignants auront créé une évaluation de type « Examen ».</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sélection de l'examen */}
          <div className="bg-white border border-enp-border p-4 shadow-sm">
            <label htmlFor="select-examen" className="block text-xs font-semibold text-enp-black uppercase tracking-wider mb-2">
              Sélectionnez l'examen à instruire ({examens.length} session{examens.length > 1 ? 's' : ''})
            </label>
            <select
              id="select-examen"
              value={selectionId ?? ''}
              onChange={(e) => setSelectionId(Number(e.target.value))}
              className="w-full border border-enp-border bg-white px-3 py-2.5 text-sm text-enp-black font-semibold focus:outline-none focus:border-enp-blue-primary"
            >
              {examens.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} : {e.intitule} | {e.libelle} (Barème: {e.bareme}) | {e.delibereeLe ? '✅ Délibéré' : `⏳ ${e.notesSaisies}/${e.effectif} notes saisies`}
                </option>
              ))}
            </select>
          </div>

          {examenSelectionne && (
            <div className="bg-white border border-enp-border shadow-sm space-y-6">
              {/* Entête de l'examen */}
              <div className="p-5 border-b border-enp-border bg-enp-bg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-enp-blue-deep text-white px-2 py-0.5">
                      {examenSelectionne.code}
                    </span>
                    <h2 className="text-lg font-bold text-enp-blue-deep font-serif">
                      {examenSelectionne.intitule}
                    </h2>
                  </div>
                  <p className="text-xs text-enp-gray-medium mt-1">
                    Évaluation : <span className="font-semibold text-enp-black">{examenSelectionne.libelle}</span> · Barème officiel : <span className="font-semibold text-enp-black">/{examenSelectionne.bareme}</span> · Semestre S{examenSelectionne.semestre} · Année {examenSelectionne.anneeUniversitaire} · {examenSelectionne.campus}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                  {examenSelectionne.delibereeLe ? (
                    <div className="bg-enp-green-light border border-enp-green-valid/30 text-enp-green-valid px-3 py-1.5 flex items-center justify-center gap-2 text-xs font-bold w-full sm:w-auto">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Délibéré le {new Date(examenSelectionne.delibereeLe).toLocaleDateString('fr-FR')}</span>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full sm:w-auto justify-center"
                      leftIcon={<LockKeyhole className="w-4 h-4" />}
                      onClick={() => setConfirmDeliberer(true)}
                      disabled={
                        enCours ||
                        examenSelectionne.effectif === 0 ||
                        examenSelectionne.notesSaisies !== examenSelectionne.effectif
                      }
                    >
                      Confirmer la délibération
                    </Button>
                  )}
                </div>
              </div>

              {!examenSelectionne.delibereeLe &&
                examenSelectionne.notesSaisies !== examenSelectionne.effectif && (
                  <div className="mx-5 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Saisie incomplète : {examenSelectionne.notesSaisies} sur {examenSelectionne.effectif} notes ont été renseignées par l'enseignant. La délibération sera possible dès que l'ensemble des copies sera noté.
                    </span>
                  </div>
                )}

              {/* Indicateurs de cohorte */}
              {stats && (
                <div className="px-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-enp-bg border border-enp-border">
                    <span className="text-xs text-enp-gray-medium block">Moyenne générale</span>
                    <span className="text-xl font-bold font-mono text-enp-blue-primary">
                      {stats.moyenne} <span className="text-xs font-normal">/{examenSelectionne.bareme}</span>
                    </span>
                  </div>
                  <div className="p-3 bg-enp-bg border border-enp-border">
                    <span className="text-xs text-enp-gray-medium block">Taux de réussite (≥ 10)</span>
                    <span className="text-xl font-bold font-mono text-enp-green-valid">
                      {stats.tauxReussite}%
                    </span>
                  </div>
                  <div className="p-3 bg-enp-bg border border-enp-border">
                    <span className="text-xs text-enp-gray-medium block">Note la plus basse</span>
                    <span className="text-xl font-bold font-mono text-enp-red-dark">
                      {stats.min} <span className="text-xs font-normal">/{examenSelectionne.bareme}</span>
                    </span>
                  </div>
                  <div className="p-3 bg-enp-bg border border-enp-border">
                    <span className="text-xs text-enp-gray-medium block">Note la plus élevée</span>
                    <span className="text-xl font-bold font-mono text-enp-gold">
                      {stats.max} <span className="text-xs font-normal">/{examenSelectionne.bareme}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Tableau officiel des notes individuelles */}
              <div className="p-5 pt-0">
                {!details ? (
                  <div className="p-8 text-center text-enp-gray-medium text-xs">
                    Chargement du relevé de notes…
                  </div>
                ) : details.etudiants.length === 0 ? (
                  <div className="p-8 text-center text-enp-gray-medium text-xs">
                    Aucun étudiant n'est inscrit dans cette unité d'enseignement.
                  </div>
                ) : (
                  <div className="border border-enp-border overflow-hidden">
                    <div className="p-3 bg-enp-bg border-b border-enp-border flex items-center justify-between text-xs">
                      <span className="font-bold text-enp-blue-deep font-serif">
                        Bordereau individuel de notes ({details.etudiants.length} étudiants)
                      </span>
                      <span className="font-mono text-enp-gray-medium">
                        Barème : /{examenSelectionne.bareme} points
                      </span>
                    </div>

                    {/* Vue en cartes tactiles pour mobiles (< 640px) */}
                    <div className="block sm:hidden divide-y divide-enp-border">
                      {details.etudiants.map((etudiant) => {
                        const bareme = examenSelectionne.bareme;
                        const note = etudiant.note;
                        const admis = note !== null && note >= bareme / 2;

                        return (
                          <div key={etudiant.id} className="p-3.5 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-semibold text-sm text-enp-black block">
                                  {etudiant.prenom} {etudiant.nom}
                                </span>
                                <span className="font-mono text-xs text-enp-blue-deep font-semibold">
                                  {etudiant.identifiant ?? '-'}
                                </span>
                              </div>
                              {note === null ? (
                                <Badge variant="warning">En attente</Badge>
                              ) : admis ? (
                                <Badge variant="success">Admis</Badge>
                              ) : (
                                <Badge variant="danger">Ajourné</Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-enp-border/60">
                              <span className="text-enp-gray-medium">Note obtenue :</span>
                              <span className={`font-mono font-bold text-sm ${note === null ? 'text-amber-800' : admis ? 'text-enp-blue-deep' : 'text-enp-red-dark'}`}>
                                {note === null ? 'Non saisie' : `${note} / ${bareme}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Tableau standard pour tablettes et ordinateurs (>= 640px) */}
                    <div className="hidden sm:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>N° Matricule</TableHead>
                            <TableHead>Nom & Prénom</TableHead>
                            <TableHead className="text-right">Note obtenue</TableHead>
                            <TableHead className="text-center">Décision provisoire</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {details.etudiants.map((etudiant) => {
                            const bareme = examenSelectionne.bareme;
                            const note = etudiant.note;
                            const admis = note !== null && note >= bareme / 2;

                            return (
                              <TableRow key={etudiant.id}>
                                <TableCell className="font-mono text-xs font-bold text-enp-blue-deep">
                                  {etudiant.identifiant ?? '-'}
                                </TableCell>
                                <TableCell className="font-semibold text-enp-black">
                                  {etudiant.prenom} {etudiant.nom}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold">
                                  {note === null ? (
                                    <span className="text-amber-800 font-normal italic text-xs">
                                      Non saisie
                                    </span>
                                  ) : (
                                    <span className={note >= bareme / 2 ? 'text-enp-blue-deep' : 'text-enp-red-dark'}>
                                      {note} / {bareme}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {note === null ? (
                                    <Badge variant="warning">En attente</Badge>
                                  ) : admis ? (
                                    <Badge variant="success">Admis</Badge>
                                  ) : (
                                    <Badge variant="danger">Ajourné</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Boîte de dialogue de confirmation de délibération */}
      <ConfirmDialog
        isOpen={confirmDeliberer}
        onClose={() => setConfirmDeliberer(false)}
        onConfirm={() => void deliberer()}
        title="Validation de la délibération officielle"
        description={`Confirmez-vous la clôture et la publication des notes de l'examen « ${examenSelectionne?.libelle} » (${examenSelectionne?.code}) ? Cette action verrouillera définitivement la saisie et rendra les résultats visibles par les étudiants.`}
        confirmText="Délibérer et publier"
        cancelText="Annuler"
        variant="primary"
        isLoading={enCours}
      />
    </div>
  );
}
