import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ClipboardList,
  Download,
  Save,
  Plus,
  AlertCircle,
  CheckCircle2,
  Lock,
  BookOpen,
  FileSpreadsheet,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CahierNotes, CoursDossier, TypeEvaluationAcademique } from '@/api/types';
import {
  PageHeader,
  SectionHeader,
  Button,
  Input,
  Select,
  Alert,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui';

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
    api
      .dossierCoursEnseignant()
      .then((data) => {
        if (!actif) return;
        setCours(data);
        if (data[0]) setCourseId(data[0].id);
      })
      .catch((err: unknown) => {
        if (actif)
          setErreur(
            err instanceof ApiError ? err.messages.join(' ') : 'Impossible de charger vos UE attribuées.'
          );
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
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Impossible de charger le carnet de notes de cette UE.'
      );
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
      await api.dossierCreerEvaluation(courseId, {
        libelle: libelle.trim(),
        type,
        bareme: Number(bareme),
      });
      setLibelle('');
      setMessage(`La colonne d’évaluation « ${libelle.trim()} » a été ajoutée.`);
      await chargerCahier();
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.messages.join(' ') : 'Erreur lors de la création de la colonne.'
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
          : { ...evaluation, notes: { ...evaluation.notes, [etudiantId]: note } }
      ),
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
        }))
      );
      setMessage(`Les notes de « ${evaluation.libelle} » ont été enregistrées avec succès.`);
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Impossible d’enregistrer les notes saisies.'
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
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Erreur lors de l’exportation du carnet de notes.'
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carnet de notes des étudiants"
        subtitle="Saisie et gestion des devoirs continus, examens et bordereaux d'évaluation."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Espace Enseignant', href: '/resultats' },
          { label: 'Saisie des notes' },
        ]}
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {message && (
        <Alert variant="success" title="Enregistrement réussi" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      {chargement ? (
        <div className="p-12 text-center bg-white border border-enp-border">
          <div className="inline-block w-8 h-8 border-2 border-enp-blue-ice border-t-enp-blue-primary animate-spin mb-2" />
          <p className="text-sm text-enp-gray-medium">Chargement de vos unités d'enseignement…</p>
        </div>
      ) : cours.length === 0 ? (
        <div className="bg-white border border-enp-border p-8 text-center text-enp-gray-medium">
          <BookOpen className="w-10 h-10 text-enp-gray-medium mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-enp-black">Aucune unité d'enseignement attribuée</p>
          <p className="text-xs mt-1">Contactez votre Chef de Département ou la Scolarité pour vos affectations d'UE.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sélecteur d'UE */}
          <div className="bg-white border border-enp-border p-4 shadow-sm">
            <label htmlFor="select-ue-notes" className="block text-xs font-semibold text-enp-black uppercase tracking-wider mb-2">
              Unité d'enseignement à gérer ({cours.length} attribuée{cours.length > 1 ? 's' : ''})
            </label>
            <select
              id="select-ue-notes"
              value={courseId ?? ''}
              onChange={(e) => setCourseId(Number(e.target.value))}
              className="w-full border border-enp-border bg-white px-3 py-2.5 text-sm text-enp-black font-semibold focus:outline-none focus:border-enp-blue-primary"
            >
              {cours.map((ue) => (
                <option key={ue.id} value={ue.id}>
                  {ue.code} : {ue.intitule}
                </option>
              ))}
            </select>
          </div>

          {/* Formulaire de création d'une colonne d'évaluation */}
          <div className="bg-white border border-enp-border p-5 shadow-sm">
            <h3 className="text-sm font-bold text-enp-blue-deep font-serif uppercase tracking-wider mb-3">
              Ajouter une évaluation (Devoir ou Examen)
            </h3>
            <form onSubmit={(e) => void creerEvaluation(e)} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2">
                <Input
                  label="Intitulé de l'évaluation *"
                  required
                  maxLength={120}
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                  placeholder="Ex: Devoir surveillé N°1, TP Synthèse, Examen terminal..."
                />
              </div>

              <div>
                <label htmlFor="eval-type" className="block text-xs font-semibold text-enp-black uppercase tracking-wider mb-1">
                  Nature de l'épreuve *
                </label>
                <select
                  id="eval-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as TypeEvaluationAcademique)}
                  className="w-full border border-enp-border bg-white px-3 py-2 text-sm text-enp-black focus:outline-none focus:border-enp-blue-primary"
                >
                  <option value="devoir">Devoir continu (Publié direct)</option>
                  <option value="examen">Examen terminal (Soumis à délibération)</option>
                </select>
              </div>

              <div>
                <Input
                  label="Barème de notation *"
                  type="number"
                  min="1"
                  max="1000"
                  step="0.5"
                  required
                  value={bareme}
                  onChange={(e) => setBareme(e.target.value)}
                  placeholder="20"
                />
              </div>

              <div className="sm:col-span-4 flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Créer la colonne de notes
                </Button>
              </div>
            </form>
          </div>

          {/* Carnet de notes interactif */}
          {cahier && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-enp-border p-4 shadow-sm">
                <div>
                  <h3 className="text-base font-bold text-enp-blue-deep font-serif">
                    Carnet de notes : {cahier.cours.code} : {cahier.cours.intitule}
                  </h3>
                  <p className="text-xs text-enp-gray-medium mt-0.5">
                    Effectif inscrit : {cahier.etudiants.length} étudiant{cahier.etudiants.length > 1 ? 's' : ''} · {cahier.evaluations.length} colonne{cahier.evaluations.length > 1 ? 's' : ''} configurée{cahier.evaluations.length > 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-enp-gray-medium mr-1 font-semibold">Exporter :</span>
                  {(['pdf', 'xlsx', 'docx'] as const).map((fmt) => (
                    <Button
                      key={fmt}
                      variant="outline"
                      size="xs"
                      leftIcon={<Download className="w-3 h-3" />}
                      onClick={() => void exporterNotes(fmt)}
                    >
                      {fmt.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              {cahier.evaluations.length === 0 ? (
                <div className="bg-white border border-enp-border p-8 text-center text-enp-gray-medium">
                  <ClipboardList className="w-10 h-10 text-enp-gray-medium mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-enp-black">Aucune colonne d'évaluation créée</p>
                  <p className="text-xs mt-1">Utilisez le formulaire ci-dessus pour ajouter votre premier devoir ou examen.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {cahier.evaluations.map((evalCol) => {
                    const estExamenDelibere = evalCol.type === 'examen' && evalCol.deliberee;
                    const enAttenteJury = evalCol.type === 'examen' && !evalCol.deliberee;

                    return (
                      <div
                        key={evalCol.id}
                        className="bg-white border border-enp-border shadow-sm overflow-hidden"
                      >
                        <div className="bg-enp-bg p-4 border-b border-enp-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-enp-blue-deep font-serif">
                                {evalCol.libelle}
                              </span>
                              <Badge variant={evalCol.type === 'devoir' ? 'default' : 'institutional'}>
                                {evalCol.type === 'devoir' ? 'Devoir continu' : 'Examen terminal'}
                              </Badge>
                              <span className="text-xs font-mono font-bold text-enp-gray-medium">
                                (Barème : /{evalCol.bareme})
                              </span>
                            </div>
                            <p className="text-xs text-enp-gray-medium mt-1">
                              {enAttenteJury
                                ? '⚠️ Épreuve d’examen : Les notes saisies seront publiées aux étudiants après délibération de la Scolarité.'
                                : estExamenDelibere
                                ? '🔒 Examen délibéré par le jury académique. La modification des notes est verrouillée.'
                                : 'Les notes de devoirs sont consultables en continu par les étudiants.'}
                            </p>
                          </div>

                          {!estExamenDelibere && (
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<Save className="w-3.5 h-3.5" />}
                              onClick={() => void enregistrerEvaluation(evalCol.id)}
                              isLoading={enregistrement === evalCol.id}
                            >
                              Enregistrer cette colonne
                            </Button>
                          )}
                        </div>

                        {cahier.etudiants.length === 0 ? (
                          <div className="p-6 text-center text-enp-gray-medium text-xs">
                            Aucun étudiant inscrit à cette unité d'enseignement.
                          </div>
                        ) : (
                          <div>
                            {/* VUE MOBILE : Liste tactile compacte pour saisie rapide sur smartphone */}
                            <div className="block sm:hidden divide-y divide-enp-border">
                              {cahier.etudiants.map((etudiant) => (
                                <div key={etudiant.id} className="p-3 flex items-center justify-between gap-3 bg-white">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm text-enp-black truncate">
                                      {etudiant.prenom} {etudiant.nom}
                                    </p>
                                    <span className="font-mono text-xs text-enp-blue-deep bg-enp-blue-light px-1.5 py-0.2 border border-enp-blue-primary/20 inline-block mt-0.5">
                                      {etudiant.identifiant ?? '-'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      min="0"
                                      max={evalCol.bareme}
                                      step="0.25"
                                      disabled={estExamenDelibere}
                                      value={evalCol.notes[etudiant.id] ?? ''}
                                      onChange={(e) =>
                                        modifierNote(evalCol.id, etudiant.id, e.target.value)
                                      }
                                      placeholder="-"
                                      className="w-20 h-11 text-center font-mono font-bold text-base border border-enp-border px-2 focus:outline-none focus:border-enp-blue-primary disabled:bg-enp-bg disabled:text-enp-gray-medium bg-white"
                                    />
                                    <span className="text-xs text-enp-gray-medium font-semibold">
                                      /{evalCol.bareme}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* VUE TABLETTE / DESKTOP */}
                            <div className="hidden sm:block overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>N° Matricule</TableHead>
                                    <TableHead>Nom & Prénom de l'étudiant</TableHead>
                                    <TableHead className="w-48 text-right">Note / {evalCol.bareme}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {cahier.etudiants.map((etudiant) => (
                                    <TableRow key={etudiant.id}>
                                      <TableCell className="font-mono text-xs font-bold text-enp-blue-deep">
                                        {etudiant.identifiant ?? '-'}
                                      </TableCell>
                                      <TableCell className="font-semibold text-enp-black text-sm">
                                        {etudiant.prenom} {etudiant.nom}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <input
                                          type="number"
                                          inputMode="decimal"
                                          min="0"
                                          max={evalCol.bareme}
                                          step="0.25"
                                          disabled={estExamenDelibere}
                                          value={evalCol.notes[etudiant.id] ?? ''}
                                          onChange={(e) =>
                                            modifierNote(evalCol.id, etudiant.id, e.target.value)
                                          }
                                          placeholder="-"
                                          className="w-24 text-right font-mono font-bold text-sm border border-enp-border px-2 py-1.5 focus:outline-none focus:border-enp-blue-primary disabled:bg-enp-bg disabled:text-enp-gray-medium"
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
