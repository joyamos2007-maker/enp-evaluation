export type Role =
  | "etudiant"
  | "delegue"
  | "enseignant"
  | "chef_departement"
  | "scolarite"
  | "direction_etudes"
  | "admin";

export interface UtilisateurSession {
  id: number;
  nom: string;
  prenom: string;
  roles: Role[];
  activeRole: Role;
}

export interface ReponseConnexion {
  accessToken: string;
  expiresIn: number;
  utilisateur: UtilisateurSession;
}

export interface ChallengeMfa {
  mfaRequired: true;
  challengeId: string;
  methods: ("email" | "totp")[];
}

export type ReponseLogin = ReponseConnexion | ChallengeMfa;

export interface ErreurApi {
  message: string | string[];
  error?: string;
  statusCode: number;
}

export interface CorpsConnexion {
  identifiant: string;
  motDePasse: string;
}

export interface CorpsActivation {
  identifiant: string;
  codeActivation: string;
  motDePasse: string;
}

export interface ReponseSimple {
  ok: true;
}

/* ------------------------------------------------------------------ */
/*  Évaluation des enseignements                                       */
/* ------------------------------------------------------------------ */

export interface UeAEvaluer {
  ueId: number;
  code: string;
  intitule: string;
  etat: "a_faire" | "terminee";
  campagneId: number;
  finCampagne: string;
}

export interface Critere {
  id: number;
  code: string;
  libelle: string;
}

export interface SectionQuestionnaire {
  code: "A" | "B" | "C" | "D" | "E";
  titre: string;
  criteres: Critere[];
}

export interface Questionnaire {
  versionId: number;
  sections: SectionQuestionnaire[];
  commentaires: {
    type: "points_forts" | "points_a_ameliorer";
    libelle: string;
  }[];
}

export interface JetonVote {
  jeton: string;
  expireDans: number;
}

export type Note = 1 | 2 | 3 | 4 | 5 | null;

export interface BulletinEnvoye {
  jeton: string;
  reponses: { critereId: number; valeur: Note }[];
  pointsForts?: string;
  pointsAAmeliorer?: string;
}

/* ------------------------------------------------------------------ */
/*  Résultats (enseignant)                                             */
/* ------------------------------------------------------------------ */

export interface ResultatUeResume {
  ueId: number;
  code: string;
  intitule: string;
  campagneId: number;
  libelleCampagne: string;
  inscrits: number;
  repondants: number;
  detailDisponible: boolean;
}

export interface ResultatCritere {
  critereId: number;
  code: string;
  libelle: string;
  moyenne: number | null;
  distribution: [number, number, number, number, number];
  sansAvis: number;
}

export interface ResultatSection {
  code: "A" | "B" | "C" | "D" | "E";
  titre: string;
  moyenne: number | null;
  criteres: ResultatCritere[];
}

export interface ResultatUe {
  ueId: number;
  code: string;
  intitule: string;
  campagneId: number;
  inscrits: number;
  repondants: number;
  seuil: number;
  detailDisponible: boolean;
  sections: ResultatSection[];
  pointsForts: string[];
  pointsAAmeliorer: string[];
}

/* ------------------------------------------------------------------ */
/*  Cahier de texte & visa                                             */
/* ------------------------------------------------------------------ */

export type TypeSeance = "CM" | "TD" | "TP" | "AUTRE";
export type StatutSeance =
  "tenue" | "reportee" | "annulee" | "enseignant_absent" | "planifiee";
export type StatutVisa = "en_attente" | "vise" | "conteste";

export interface UeCahier {
  ueId: number;
  code: string;
  intitule: string;
  enseignants: string[];
}

export interface Seance {
  id: number;
  ueId: number;
  ueCode: string;
  ueIntitule: string;
  date: string;
  debut: string;
  fin: string;
  type: TypeSeance;
  groupe?: string;
  statut: StatutSeance;
  intitule?: string;
  contenu?: string;
  travailAFaire?: string;
  effectif?: number;
  observations?: string;
  visa: { statut: StatutVisa; commentaire?: string; date?: string };
  modifiable: boolean;
}

export interface SeanceEntree {
  ueId: number;
  date: string;
  debut: string;
  fin: string;
  type: TypeSeance;
  groupe?: string;
  statut: StatutSeance;
  intitule?: string;
  contenu?: string;
  travailAFaire?: string;
  effectif?: number;
  observations?: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  link?: string;
  creeLe: string;
  luLe?: string;
}

export interface LigneAudit {
  id: number;
  creeLe: string;
  userId?: number;
  action: string;
  campaignId?: number;
  courseId?: number;
  objet?: string;
  detail?: string;
}

export interface PieceJointe {
  id: number;
  nom: string;
  mime: string;
  creeLe: string;
}

export interface VersionSeance {
  id: number;
  creeLe: string;
  seance: Record<string, unknown>;
}

export interface Avancement {
  ueId: number;
  heuresPrevues: { cm: number; td: number; tp: number };
  heuresEffectuees: { cm: number; td: number; tp: number };
}

/* ------------------------------------------------------------------ */
/*  Notes et présences                                                */
/* ------------------------------------------------------------------ */

export type TypeEvaluationAcademique = "devoir" | "examen";
export type StatutPresenceEtudiant = "present" | "absent" | "retard";

export interface CoursDossier {
  id: number;
  code: string;
  intitule: string;
}

export interface EtudiantDossier {
  id: number;
  nom: string;
  prenom: string;
  identifiant: string | null;
}

export interface EvaluationDossier {
  id: number;
  libelle: string;
  type: TypeEvaluationAcademique;
  bareme: number;
  deliberee: boolean;
  creeLe?: string;
  notes: Record<number, number | null>;
}

export interface EntreeEvaluation {
  libelle: string;
  type: TypeEvaluationAcademique;
  bareme: number;
}

export interface EntreeNote {
  etudiantId: number;
  note: number | null;
}

export interface EntreePresence {
  etudiantId: number;
  statut: StatutPresenceEtudiant;
}

export interface CahierNotes {
  cours: CoursDossier;
  etudiants: EtudiantDossier[];
  evaluations: EvaluationDossier[];
}

export interface SeancePresence {
  id: number;
  date: string;
  libelle: string;
  effectif: number;
  marques: number;
}

export interface PresenceEtudiant extends EtudiantDossier {
  statut: StatutPresenceEtudiant | null;
  statistiques: StatistiquesPresence;
}

export interface StatistiquesPresence {
  seancesTotal: number;
  seancesMarquees: number;
  presents: number;
  absents: number;
  retards: number;
  tauxPresence: number | null;
}

export interface DetailSeancePresence {
  seance: { id: number; course_id: number; date: string; libelle: string };
  etudiants: PresenceEtudiant[];
}

export interface NoteEtudiant {
  evaluationId: number;
  coursId: number;
  code: string;
  intitule: string;
  libelle: string;
  type: TypeEvaluationAcademique;
  bareme: number;
  note: number | null;
  deliberee: boolean;
}

export interface ExamenADeliberer {
  id: number;
  coursId: number;
  code: string;
  intitule: string;
  libelle: string;
  bareme: number;
  anneeUniversitaire: string;
  semestre: number;
  campus: string;
  effectif: number;
  notesSaisies: number;
  delibereeLe: string | null;
}

export interface DetailsDeliberationExamen {
  examen: ExamenADeliberer;
  etudiants: (EtudiantDossier & { note: number | null })[];
}

export interface PresenceEtudiantLigne {
  seanceId: number;
  coursId: number;
  code: string;
  intitule: string;
  date: string;
  libelle: string;
  statut: StatutPresenceEtudiant;
}

export interface PresencesEtudiant {
  statistiques: StatistiquesPresence;
  presences: PresenceEtudiantLigne[];
}

/* ------------------------------------------------------------------ */
/*  Pilotage (chef de département)                                     */
/* ------------------------------------------------------------------ */

export interface Campagne {
  id: number;
  libelle: string;
  semestre: string;
  anneeUniversitaire: string;
  debut: string;
  fin: string;
  statut: "ouverte" | "close" | "restituee";
}

export interface ParticipationUe {
  ueId: number;
  code: string;
  intitule: string;
  inscrits: number;
  repondants: number;
}

export interface LigneSynthese {
  ueId: number;
  code: string;
  intitule: string;
  enseignant: string;
  nbReponses: number;
  moyA: number | null;
  moyB: number | null;
  moyC: number | null;
  moyD: number | null;
  satisfactionE: number | null;
  detailDisponible: boolean;
}

export interface Synthese {
  campagne: Campagne;
  campus: string;
  departement: string;
  totalRepondants: number;
  lignes: LigneSynthese[];
}

export interface SuitesDonnees {
  meilleuresUe: string;
  ueAttention: string;
  actions: string;
  etabliPar: string;
  date: string;
  visaChef: boolean;
}

export interface PeriodeDirection {
  anneeUniversitaire: string;
  semestre: number;
}

export interface StatistiquesCampusDirection {
  campusId: number;
  campus: string;
  campagnes: number;
  campagnesCloses: number;
  inscriptions: number;
  participations: number;
  bulletins: number;
  tauxParticipation: number | null;
  moyenneEvaluations: number | null;
  coursSynthesables: number;
}

export interface StatistiquesDirection {
  periode: PeriodeDirection;
  seuilAnonymat: number;
  global: Omit<StatistiquesCampusDirection, "campusId" | "campus"> & {
    campus: number;
  };
  campus: StatistiquesCampusDirection[];
}

export interface AnomalieAcademique {
  code: string;
  campus: string;
  departement: string;
  campagneId: number;
  libelle: string;
  anneeUniversitaire: string;
  semestre: number;
}

export interface ControlesAcademiques {
  reglesVerifiees: { code: string; description: string }[];
  nombreAnomalies: number;
  anomalies: AnomalieAcademique[];
}

/* ------------------------------------------------------------------ */
/*  Scolarité                                                          */
/* ------------------------------------------------------------------ */

export type StatutCampagne = "brouillon" | "ouverte" | "close" | "restituee";

export interface CampagneGestion {
  id: number;
  libelle: string;
  departmentId: number;
  departement: string;
  anneeUniversitaire: string;
  semestre: number;
  versionId: number;
  debut: string;
  fin: string;
  statut: StatutCampagne;
}

export interface CampagneEntreeGestion {
  libelle: string;
  departmentId: number;
  anneeUniversitaire: string;
  semestre: number;
  debut: string;
  fin: string;
}

export interface DepartementOption {
  id: number;
  nom: string;
  campus: string;
}

export interface CodeActivationGenere {
  identifiant: string;
  nom: string;
  prenom: string;
  code: string;
  expireLe: string;
}

export interface ResultatCodes {
  codes: CodeActivationGenere[];
  ignores: { identifiant: string; raison: string }[];
  restants: number;
}

export type TypeImport =
  | "etudiants"
  | "enseignants"
  | "ue"
  | "offres"
  | "affectations"
  | "inscriptions"
  | "delegues";

export interface ErreurImport {
  ligne: number;
  colonne?: string;
  message: string;
}

export interface RapportImport {
  importId: string;
  lignesTotal: number;
  lignesValides: number;
  erreurs: ErreurImport[];
}

export interface ResultatImport {
  crees: number;
  misAJour: number;
}

export interface ArchiveAnnuelle {
  anneeUniversitaire: string;
  archiveLe: string;
  archiveParNom?: string;
  archiveParPrenom?: string;
  snapshot?: Record<string, unknown>;
  archivePar?: number;
}

export interface CommentaireAModerer {
  id: string | number;
  ueCode: string;
  ueIntitule: string;
  type: "points_forts" | "points_a_ameliorer";
  texte: string;
  statut: "a_moderer" | "valide" | "masque";
}

export interface TableauDeBordScolarite {
  campagnesOuvertes: number;
  comptesSansMotDePasse: number;
  commentairesAModerer: number;
  participation: {
    inscriptions: number;
    participations: number;
    bulletins: number;
  };
  campagnes: CampagneGestion[];
}

export interface RestitutionEntree {
  resultats: string;
  suites: string;
}

export interface Restitution {
  campagneId: number;
  libelle: string;
  departement: string;
  anneeUniversitaire: string;
  semestre: number;
  resultats: string;
  suites: string;
  publieLe: string;
}

export interface CompteAdministration {
  id: number;
  matricule: string | null;
  email: string | null;
  nom: string;
  prenom: string;
  actif: boolean;
  motDePasseConfigure: boolean;
  roles: Role[];
}

export interface CampusAdministration {
  id: number;
  nom: string;
}

export interface DepartementAdministration {
  id: number;
  nom: string;
  campusId: number;
  campus: string;
}

export interface ProgrammeAdministration {
  id: number;
  nom: string;
  departmentId: number;
  departement: string;
}

export interface ReferentielsAdministration {
  campus: CampusAdministration[];
  departements: DepartementAdministration[];
  programmes: ProgrammeAdministration[];
}

export interface ResultatImportUtilisateurs {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: { ligne: number; erreur: string }[];
}
