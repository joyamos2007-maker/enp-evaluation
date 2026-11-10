import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarCheck,
  Check,
  CheckCheck,
  Clock,
  Plus,
  Save,
  UserX,
  BookOpen,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type {
  CoursDossier,
  DetailSeancePresence,
  SeancePresence,
  StatutPresenceEtudiant,
} from '@/api/types';
import { PageHeader, Button, Alert, Badge } from '@/components/ui';

const PRESETS_SEANCE = ['CM : Cours magistral', 'TD : Travaux dirigés', 'TP : Travaux pratiques'];

export function EnseignantPresences() {
  const [cours, setCours] = useState<CoursDossier[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [seances, setSeances] = useState<SeancePresence[]>([]);
  const [seanceId, setSeanceId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DetailSeancePresence | null>(null);
  const [statuts, setStatuts] = useState<Record<number, StatutPresenceEtudiant | ''>>({});
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [libelle, setLibelle] = useState('');
  const [afficherCreation, setAfficherCreation] = useState(false);
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

  const chargerSeances = useCallback(async () => {
    if (courseId === null) return;
    setErreur(null);
    setDetail(null);
    try {
      const liste = await api.dossierSeancesPresence(courseId);
      setSeances(liste);
      setSeanceId(liste[0]?.id ?? null);
      if (liste.length === 0) setAfficherCreation(true);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.messages.join(' ') : 'Impossible de charger les séances.',
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
        Object.fromEntries(
          data.etudiants.map((etudiant) => [etudiant.id, etudiant.statut ?? '']),
        ),
      );
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Impossible de charger la liste des étudiants.',
      );
    }
  }, [seanceId]);

  useEffect(() => {
    void chargerDetail();
  }, [chargerDetail]);

  async function creerSeance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (courseId === null || !libelle.trim()) return;
    setErreur(null);
    setMessage(null);
    try {
      const creee = await api.dossierCreerSeancePresence(courseId, {
        date,
        libelle: libelle.trim(),
      });
      setLibelle('');
      setAfficherCreation(false);
      setMessage('Nouvelle séance créée. Vous pouvez pointer les étudiants en 1 clic.');
      const liste = await api.dossierSeancesPresence(courseId);
      setSeances(liste);
      setSeanceId(creee.id);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.messages.join(' ') : 'Impossible de créer la séance.',
      );
    }
  }

  function marquerTousPresent() {
    if (!detail) return;
    const nouveau: Record<number, StatutPresenceEtudiant> = {};
    for (const etudiant of detail.etudiants) {
      nouveau[etudiant.id] = 'present';
    }
    setStatuts(nouveau);
    setMessage(null);
  }

  function definirStatut(etudiantId: number, statut: StatutPresenceEtudiant) {
    setStatuts((courant) => ({ ...courant, [etudiantId]: statut }));
    setMessage(null);
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
      setMessage('Les présences ont été enregistrées avec succès.');
      if (courseId !== null) {
        setSeances(await api.dossierSeancesPresence(courseId));
      }
      await chargerDetail();
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Impossible d’enregistrer les présences.',
      );
    } finally {
      setEnregistrement(false);
    }
  }

  const decompte = useMemo(() => {
    if (!detail) return { presents: 0, retards: 0, absents: 0, justifiees: 0, nonMarques: 0 };
    let presents = 0;
    let retards = 0;
    let absents = 0;
    let justifiees = 0;
    let nonMarques = 0;
    for (const etu of detail.etudiants) {
      const s = statuts[etu.id];
      if (s === 'present') presents++;
      else if (s === 'retard') retards++;
      else if (s === 'absent') absents++;
      else if (s === 'justifie') justifiees++;
      else nonMarques++;
    }
    return { presents, retards, absents, justifiees, nonMarques };
  }, [detail, statuts]);

  const pretAEnregistrer = Boolean(
    detail && detail.etudiants.length > 0 && decompte.nonMarques === 0,
  );

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl mx-auto pb-6">
      <PageHeader
        title="Gestion des présences"
        description="Pointez l'assiduité de votre promotion en 1 clic."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Gestion des présences' },
        ]}
        actions={
          cours.length > 0 ? (
            <Button
              variant={afficherCreation ? 'outline' : 'primary'}
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setAfficherCreation((v) => !v)}
            >
              {afficherCreation ? 'Fermer la création' : 'Nouvelle séance d’appel'}
            </Button>
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
          {/* 1. SÉLECTION D'UE PAR ONGLETS RAPIDES */}
          <div className="bg-white border border-enp-border p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep">
                1. Unité d'enseignement
              </span>
              <span className="text-xs text-enp-gray-medium">
                {seances.length} séance(s) enregistrée(s)
              </span>
            </div>
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
                    <span className="truncate max-w-[220px]">{ue.intitule}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. BARRE DE CRÉATION RAPIDE DE SÉANCE (CONDITIONNELLE) */}
          {afficherCreation && (
            <form
              onSubmit={(event) => void creerSeance(event)}
              className="bg-enp-blue-ice/40 border border-enp-blue-primary/30 p-4 space-y-3 animate-fade-in"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep">
                  Créer une nouvelle feuille d'appel
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-enp-gray-medium">Intitulés rapides :</span>
                  {PRESETS_SEANCE.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLibelle(preset)}
                      className="text-[11px] font-semibold px-2 py-0.5 bg-white border border-enp-border text-enp-blue-deep hover:border-enp-blue-primary transition-colors"
                    >
                      {preset.split(' : ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr_auto] gap-3 items-end">
                <label className="block text-xs font-bold text-enp-black">
                  Date de la séance
                  <input
                    required
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="mt-1 block w-full border border-enp-border bg-white px-3 py-2 text-sm text-enp-black focus:border-enp-blue-primary outline-none min-h-[40px]"
                  />
                </label>
                <label className="block text-xs font-bold text-enp-black">
                  Libellé de la séance
                  <input
                    required
                    maxLength={120}
                    value={libelle}
                    onChange={(event) => setLibelle(event.target.value)}
                    placeholder="Ex. CM : Chapitre 2 ou TD Groupe 1"
                    className="mt-1 block w-full border border-enp-border bg-white px-3 py-2 text-sm text-enp-black focus:border-enp-blue-primary outline-none min-h-[40px]"
                  />
                </label>
                <Button type="submit" variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
                  Créer la feuille
                </Button>
              </div>
            </form>
          )}

          {/* 3. SÉLECTEUR DE SÉANCE EN 1 CLIC */}
          {seances.length > 0 && (
            <div className="bg-white border border-enp-border p-4 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep block">
                2. Séance à pointer
              </span>
              <div className="flex flex-wrap gap-2">
                {seances.map((seance) => {
                  const active = seance.id === seanceId;
                  const complet = seance.effectif > 0 && seance.marques === seance.effectif;
                  return (
                    <button
                      key={seance.id}
                      type="button"
                      onClick={() => {
                        setSeanceId(seance.id);
                        setMessage(null);
                      }}
                      className={`px-3 py-2 text-xs border transition-colors flex items-center gap-2 ${
                        active
                          ? 'bg-enp-blue-primary text-white border-enp-blue-primary font-bold shadow-xs'
                          : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice/40'
                      }`}
                    >
                      <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {seance.date} • {seance.libelle}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                          active
                            ? 'bg-white/20 text-white'
                            : complet
                              ? 'bg-enp-green-light text-enp-green-valid'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {seance.marques}/{seance.effectif}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. FEUILLE D'APPEL RAPIDE EN 1 CLIC */}
          {detail && (
            <section className="bg-white border border-enp-border shadow-xs overflow-hidden">
              {/* Barre d'actions supérieure de la feuille d'appel */}
              <div className="p-4 border-b border-enp-border bg-enp-bg flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-enp-blue-deep">
                      {detail.seance.libelle}
                    </h2>
                    <Badge variant="institutional">{detail.seance.date}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-enp-green-valid font-semibold">
                      Présents : {decompte.presents}
                    </span>
                    <span className="text-amber-700 font-semibold">
                      Retards : {decompte.retards}
                    </span>
                    <span className="text-enp-red-error font-semibold">
                      Absents : {decompte.absents}
                    </span>
                    <span className="text-violet-700 font-semibold">
                      Justifiées : {decompte.justifiees}
                    </span>
                    {decompte.nonMarques > 0 && (
                      <span className="text-enp-gray-medium">
                        Reste à pointer : {decompte.nonMarques}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {detail.etudiants.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<CheckCheck className="w-4 h-4 text-enp-green-valid" />}
                      onClick={marquerTousPresent}
                    >
                      Tout marquer Présent
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={enregistrement || !pretAEnregistrer}
                    isLoading={enregistrement}
                    leftIcon={<Save className="w-4 h-4" />}
                    onClick={() => void enregistrer()}
                  >
                    Enregistrer l'appel
                  </Button>
                </div>
              </div>

              {detail.etudiants.length === 0 ? (
                <p className="p-8 text-center text-sm text-enp-gray-medium">
                  Aucun étudiant n'est inscrit à cette UE.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-enp-blue-deep text-white text-left text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 font-semibold">Matricule</th>
                        <th className="px-4 py-3 font-semibold">Étudiant</th>
                        <th className="px-4 py-3 text-center font-semibold hidden md:table-cell">
                          Assiduité globale
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Pointage 1-clic
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-enp-border">
                      {detail.etudiants.map((etudiant) => {
                        const statutActuel = statuts[etudiant.id] ?? '';
                        const taux = etudiant.statistiques?.tauxPresence;
                        return (
                          <tr
                            key={etudiant.id}
                            className="hover:bg-enp-blue-ice/20 transition-colors"
                          >
                            <td className="px-4 py-3 font-mono text-xs font-bold text-enp-blue-deep whitespace-nowrap">
                              {etudiant.identifiant ?? '-'}
                            </td>
                            <td className="px-4 py-3 font-semibold text-enp-black">
                              {etudiant.prenom} {etudiant.nom}
                              <span className="block md:hidden text-[11px] font-normal text-enp-gray-medium">
                                Assiduité : {taux == null ? '-' : `${taux}%`}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center hidden md:table-cell">
                              {etudiant.statistiques ? (
                                <div className="inline-flex items-center gap-2 text-xs">
                                  <span
                                    className={`font-bold px-2 py-0.5 border ${
                                      (taux ?? 100) < 75
                                        ? 'bg-rose-50 text-enp-red-error border-rose-200'
                                        : 'bg-enp-green-light text-enp-green-valid border-enp-green-valid/30'
                                    }`}
                                  >
                                    {taux == null ? '-' : `${taux}%`}
                                  </span>
                                  <span className="text-enp-gray-medium">
                                    ({etudiant.statistiques.presents}P · {etudiant.statistiques.retards}R ·{' '}
                                    {etudiant.statistiques.absents}A · {etudiant.statistiques.justifiees}J)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-enp-gray-medium">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div
                                className="inline-flex items-center gap-1.5"
                                role="group"
                                aria-label={`Présence de ${etudiant.prenom} ${etudiant.nom}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => definirStatut(etudiant.id, 'present')}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold border transition-all min-h-[36px] ${
                                    statutActuel === 'present'
                                      ? 'bg-enp-green-valid text-white border-enp-green-valid shadow-xs'
                                      : 'bg-white text-enp-black border-enp-border hover:border-enp-green-valid hover:text-enp-green-valid'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Présent</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => definirStatut(etudiant.id, 'retard')}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold border transition-all min-h-[36px] ${
                                    statutActuel === 'retard'
                                      ? 'bg-[#D97706] text-white border-[#D97706] shadow-xs'
                                      : 'bg-white text-enp-black border-enp-border hover:border-[#D97706] hover:text-[#D97706]'
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Retard</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => definirStatut(etudiant.id, 'absent')}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold border transition-all min-h-[36px] ${
                                    statutActuel === 'absent'
                                      ? 'bg-enp-red-error text-white border-enp-red-error shadow-xs'
                                      : 'bg-white text-enp-black border-enp-border hover:border-enp-red-error hover:text-enp-red-error'
                                  }`}
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Absent</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => definirStatut(etudiant.id, 'justifie')}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold border transition-all min-h-[36px] ${
                                    statutActuel === 'justifie'
                                      ? 'bg-violet-700 text-white border-violet-700 shadow-xs'
                                      : 'bg-white text-enp-black border-enp-border hover:border-violet-700 hover:text-violet-700'
                                  }`}
                                >
                                  <CalendarCheck className="w-3.5 h-3.5" />
                                  <span>Justifié</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
