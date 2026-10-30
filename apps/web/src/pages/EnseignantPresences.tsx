import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  CalendarCheck,
  Save,
  Plus,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  BookOpen,
  Clock,
  XCircle,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type {
  CoursDossier,
  DetailSeancePresence,
  SeancePresence,
  StatutPresenceEtudiant,
} from '@/api/types';
import {
  PageHeader,
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
            err instanceof ApiError ? err.messages.join(' ') : 'Impossible de charger vos UE.'
          );
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
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
      setErreur(
        err instanceof ApiError ? err.messages.join(' ') : 'Impossible de charger les séances de présence.'
      );
    }
  }, [courseId]);

  useEffect(() => {
    void chargerSeances();
  }, [chargerSeances]);

  const chargerDetail = useCallback(async () => {
    if (seanceId === null) {
      setDetail(null);
      return;
    }
    try {
      const data = await api.dossierPresenceSeance(seanceId);
      setDetail(data);
      setStatuts(
        Object.fromEntries(data.etudiants.map((etudiant) => [etudiant.id, etudiant.statut ?? '']))
      );
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Impossible de charger la liste d’émargement des étudiants.'
      );
    }
  }, [seanceId]);

  useEffect(() => {
    void chargerDetail();
  }, [chargerDetail]);

  async function creerSeance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (courseId === null) return;
    setErreur(null);
    setMessage(null);
    try {
      const creee = await api.dossierCreerSeancePresence(courseId, {
        date,
        libelle: libelle.trim(),
      });
      setLibelle('');
      setMessage(`La séance d’émargement du ${new Date(date).toLocaleDateString('fr-FR')} a été créée.`);
      const liste = await api.dossierSeancesPresence(courseId);
      setSeances(liste);
      setSeanceId(creee.id);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.messages.join(' ') : 'Impossible de créer la séance de présence.'
      );
    }
  }

  async function enregistrer() {
    if (!detail) return;
    setEnregistrement(true);
    setErreur(null);
    setMessage(null);
    try {
      await api.dossierEnregistrerPresences(
        detail.seance.id,
        detail.etudiants.map((etudiant) => ({
          etudiantId: etudiant.id,
          statut: (statuts[etudiant.id] as StatutPresenceEtudiant) || 'present',
        }))
      );
      setMessage(`Les présences de la séance « ${detail.seance.libelle} » ont été enregistrées.`);
      if (courseId !== null) setSeances(await api.dossierSeancesPresence(courseId));
      await chargerDetail();
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Erreur lors de l’enregistrement de l’émargement.'
      );
    } finally {
      setEnregistrement(false);
    }
  }

  function marquerTous(statut: StatutPresenceEtudiant) {
    if (!detail) return;
    const maj = { ...statuts };
    detail.etudiants.forEach((e) => {
      maj[e.id] = statut;
    });
    setStatuts(maj);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registre d'assiduité et d'émargement"
        subtitle="Contrôle des présences, des absences et des retards étudiants pour chaque séance."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Espace Enseignant', href: '/resultats' },
          { label: 'Feuille d’émargement' },
        ]}
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {message && (
        <Alert variant="success" title="Opération réussie" onClose={() => setMessage(null)}>
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
          <p className="text-xs mt-1">Contactez la Scolarité centrale pour votre affectation de cours.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sélection de l'UE */}
          <div className="bg-white border border-enp-border p-4 shadow-sm">
            <label htmlFor="select-ue-pres" className="block text-xs font-semibold text-enp-black uppercase tracking-wider mb-2">
              Unité d'enseignement à émarger ({cours.length} cours)
            </label>
            <select
              id="select-ue-pres"
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

          {/* Formulaire de création de séance */}
          <div className="bg-white border border-enp-border p-5 shadow-sm">
            <h3 className="text-sm font-bold text-enp-blue-deep font-serif uppercase tracking-wider mb-3">
              Nouvelle séance d'émargement
            </h3>
            <form onSubmit={(e) => void creerSeance(e)} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label htmlFor="pres-date" className="block text-xs font-semibold text-enp-black uppercase tracking-wider mb-1">
                  Date de la séance *
                </label>
                <input
                  id="pres-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-enp-border bg-white px-3 py-2 text-sm text-enp-black focus:outline-none focus:border-enp-blue-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Intitulé de la séance *"
                  required
                  maxLength={120}
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                  placeholder="Ex: CM 04 : Thermodynamique, TD 02 : Groupe B..."
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="w-full"
                >
                  Créer la séance
                </Button>
              </div>
            </form>
          </div>

          {/* Séances créées */}
          {seances.length > 0 && (
            <div className="bg-white border border-enp-border p-4 shadow-sm">
              <label htmlFor="select-seance-reg" className="block text-xs font-semibold text-enp-black uppercase tracking-wider mb-2">
                Séance à renseigner ({seances.length} séance{seances.length > 1 ? 's' : ''} au registre)
              </label>
              <select
                id="select-seance-reg"
                value={seanceId ?? ''}
                onChange={(e) => setSeanceId(Number(e.target.value))}
                className="w-full border border-enp-border bg-white px-3 py-2.5 text-sm text-enp-black font-semibold focus:outline-none focus:border-enp-blue-primary"
              >
                {seances.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.date).toLocaleDateString('fr-FR')} : {s.libelle} ({s.marques}/{s.effectif} émargés)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Feuille de pointage */}
          {detail && (
            <div className="bg-white border border-enp-border shadow-sm overflow-hidden">
              <div className="bg-enp-bg p-4 border-b border-enp-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CalendarCheck className="w-6 h-6 text-enp-blue-primary shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-enp-blue-deep font-serif">
                      {detail.seance.libelle}
                    </h3>
                    <p className="text-xs text-enp-gray-medium">
                      Date : {new Date(detail.seance.date).toLocaleDateString('fr-FR')} · Effectif : {detail.etudiants.length} étudiant{detail.etudiants.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-enp-gray-medium mr-1 font-semibold">Marquer tous :</span>
                  <Button variant="outline" size="xs" onClick={() => marquerTous('present')}>
                    Tous présents
                  </Button>
                  <Button variant="outline" size="xs" onClick={() => marquerTous('absent')}>
                    Tous absents
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                    onClick={() => void enregistrer()}
                    isLoading={enregistrement}
                  >
                    Enregistrer l'émargement
                  </Button>
                </div>
              </div>

              {detail.etudiants.length === 0 ? (
                <div className="p-8 text-center text-enp-gray-medium text-xs">
                  Aucun étudiant inscrit dans cette unité d'enseignement.
                </div>
              ) : (
                <>
                  {/* VUE MOBILE TACTILE : Cartes individuelles avec boutons d'émargement rapides */}
                  <div className="block lg:hidden divide-y divide-enp-border">
                    {detail.etudiants.map((etudiant) => {
                      const statutActuel = statuts[etudiant.id];
                      const taux = etudiant.statistiques?.tauxPresence;

                      return (
                        <div key={etudiant.id} className="p-3.5 space-y-2.5 bg-white">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-sm text-enp-black">
                                {etudiant.prenom} {etudiant.nom}
                              </p>
                              <span className="font-mono text-xs font-semibold text-enp-blue-deep bg-enp-blue-light px-1.5 py-0.2 border border-enp-blue-primary/20 inline-block mt-0.5">
                                {etudiant.identifiant ?? '-'}
                              </span>
                            </div>
                            <div className="text-right">
                              {taux !== null && taux !== undefined ? (
                                <Badge variant={taux >= 80 ? 'success' : taux >= 65 ? 'warning' : 'danger'}>
                                  Assiduité : {taux}%
                                </Badge>
                              ) : (
                                <span className="text-xs text-enp-gray-medium font-mono">-</span>
                              )}
                              <p className="text-[10px] text-enp-gray-medium mt-0.5">
                                P: {etudiant.statistiques?.presents ?? 0} · A: {etudiant.statistiques?.absents ?? 0} · R: {etudiant.statistiques?.retards ?? 0}
                              </p>
                            </div>
                          </div>

                          {/* 3 boutons tactiles larges pour mobile */}
                          <div className="grid grid-cols-3 gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setStatuts((curr) => ({
                                  ...curr,
                                  [etudiant.id]: statutActuel === 'present' ? ('' as StatutPresenceEtudiant) : 'present',
                                }))
                              }
                              className={`py-2 px-1 text-xs font-bold text-center border transition-all min-h-[40px] flex items-center justify-center select-none ${
                                statutActuel === 'present'
                                  ? 'bg-enp-green-valid text-white border-enp-green-valid shadow-subtle'
                                  : 'bg-white text-enp-black border-enp-border hover:bg-enp-green-light'
                              }`}
                            >
                              ✓ Présent
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setStatuts((curr) => ({
                                  ...curr,
                                  [etudiant.id]: statutActuel === 'absent' ? ('' as StatutPresenceEtudiant) : 'absent',
                                }))
                              }
                              className={`py-2 px-1 text-xs font-bold text-center border transition-all min-h-[40px] flex items-center justify-center select-none ${
                                statutActuel === 'absent'
                                  ? 'bg-enp-red-dark text-white border-enp-red-dark shadow-subtle'
                                  : 'bg-white text-enp-black border-enp-border hover:bg-enp-red-light'
                              }`}
                            >
                              ✕ Absent
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setStatuts((curr) => ({
                                  ...curr,
                                  [etudiant.id]: statutActuel === 'retard' ? ('' as StatutPresenceEtudiant) : 'retard',
                                }))
                              }
                              className={`py-2 px-1 text-xs font-bold text-center border transition-all min-h-[40px] flex items-center justify-center select-none ${
                                statutActuel === 'retard'
                                  ? 'bg-enp-gold text-white border-enp-gold shadow-subtle'
                                  : 'bg-white text-enp-black border-enp-border hover:bg-enp-gold-light'
                              }`}
                            >
                              ⏱ Retard
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* VUE DESKTOP : Grand tableau exhaustif */}
                  <div className="hidden lg:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N° Matricule</TableHead>
                          <TableHead>Nom & Prénom</TableHead>
                          <TableHead className="text-center">Présences cumulées</TableHead>
                          <TableHead className="text-center">Absences cumulées</TableHead>
                          <TableHead className="text-center">Retards</TableHead>
                          <TableHead className="text-center">Taux d'assiduité</TableHead>
                          <TableHead className="w-56 text-right">Statut de la séance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.etudiants.map((etudiant) => {
                          const taux = etudiant.statistiques?.tauxPresence;
                          return (
                            <TableRow key={etudiant.id}>
                              <TableCell className="font-mono text-xs font-bold text-enp-blue-deep">
                                {etudiant.identifiant ?? '-'}
                              </TableCell>
                              <TableCell className="font-semibold text-enp-black text-sm">
                                {etudiant.prenom} {etudiant.nom}
                              </TableCell>
                              <TableCell className="text-center font-mono text-enp-green-valid font-bold">
                                {etudiant.statistiques?.presents ?? '-'}
                              </TableCell>
                              <TableCell className="text-center font-mono text-enp-red-dark font-bold">
                                {etudiant.statistiques?.absents ?? '-'}
                              </TableCell>
                              <TableCell className="text-center font-mono text-enp-gold font-bold">
                                {etudiant.statistiques?.retards ?? '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {taux !== null && taux !== undefined ? (
                                  <Badge variant={taux >= 80 ? 'success' : taux >= 65 ? 'warning' : 'danger'}>
                                    {taux}%
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-enp-gray-medium font-mono">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <select
                                  aria-label={`Statut de présence de ${etudiant.prenom} ${etudiant.nom}`}
                                  value={statuts[etudiant.id] ?? ''}
                                  onChange={(e) =>
                                    setStatuts((curr) => ({
                                      ...curr,
                                      [etudiant.id]: e.target.value as StatutPresenceEtudiant | '',
                                    }))
                                  }
                                  className={`w-36 border px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-enp-blue-primary ${
                                    statuts[etudiant.id] === 'present'
                                      ? 'bg-enp-green-light/40 border-enp-green-valid text-enp-green-valid'
                                      : statuts[etudiant.id] === 'absent'
                                      ? 'bg-enp-red-light/40 border-enp-red-dark text-enp-red-dark'
                                      : statuts[etudiant.id] === 'retard'
                                      ? 'bg-amber-50 border-enp-gold text-enp-gold'
                                      : 'border-enp-border bg-white text-enp-black'
                                  }`}
                                >
                                  <option value="">Non émargé</option>
                                  <option value="present">Présent</option>
                                  <option value="absent">Absent</option>
                                  <option value="retard">En retard</option>
                                </select>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
