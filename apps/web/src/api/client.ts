import type {
  CorpsActivation,
  CorpsConnexion,
  Role,
  ErreurApi,
  JetonVote,
  Questionnaire,
  ReponseConnexion,
  ReponseLogin,
  ReponseSimple,
  ResultatUe,
  ResultatUeResume,
  Seance,
  SeanceEntree,
  UeAEvaluer,
  UeCahier,
  Avancement,
  Campagne,
  ParticipationUe,
  Synthese,
  SuitesDonnees,
  CampagneGestion,
  CampagneEntreeGestion,
  DepartementOption,
  ResultatCodes,
  CommentaireAModerer,
  TableauDeBordScolarite,
  RestitutionEntree,
  Restitution,
  RapportImport,
  ResultatImport,
  TypeImport,
  CompteAdministration,
  ReferentielsAdministration,
  ResultatImportUtilisateurs,
  PeriodeDirection,
  StatistiquesDirection,
  ControlesAcademiques,
  CoursDossier,
  CahierNotes,
  TypeEvaluationAcademique,
  EntreeEvaluation,
  EntreeNote,
  SeancePresence,
  DetailSeancePresence,
  EntreePresence,
  NoteEtudiant,
  PresencesEtudiant,
  DetailsDeliberationExamen,
  ExamenADeliberer,
  ArchiveAnnuelle,
  Notification,
  PieceJointe,
  VersionSeance,
  LigneAudit,
} from "./types";
import { ApiError } from "./error";

const BASE_URL = "/api/v1";

/* ------------------------------------------------------------------ */
/*  Gestion du jeton en mémoire (jamais en stockage persistant)        */
/* ------------------------------------------------------------------ */

let accessToken: string | null = null;
let tokenExpiration: number | null = null;

export function getAccessToken(): string | null {
  if (accessToken && tokenExpiration && Date.now() >= tokenExpiration) {
    accessToken = null;
    tokenExpiration = null;
    return null;
  }
  return accessToken;
}

export function setAccessToken(token: string, expiresIn: number): void {
  accessToken = token;
  // Marge de sécurité de 30 s avant l'expiration réelle.
  tokenExpiration = Date.now() + Math.max(0, expiresIn - 30) * 1000;
}

export function clearAccessToken(): void {
  accessToken = null;
  tokenExpiration = null;
}

/* ------------------------------------------------------------------ */
/*  Renouvellement mutualisé : une seule promesse à la fois            */
/* ------------------------------------------------------------------ */

let refreshPromise: Promise<ReponseConnexion> | null = null;

async function performRefresh(): Promise<ReponseConnexion> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw res;
  }
  const data = (await res.json()) as ReponseConnexion;
  setAccessToken(data.accessToken, data.expiresIn);
  return data;
}

function mutualiserRefresh(): Promise<ReponseConnexion> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/* ------------------------------------------------------------------ */
/*  fetch avec injection du jeton + rejeu unique sur 401               */
/* ------------------------------------------------------------------ */

type OptionsRequete = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  /** Contourne l'injection / le rejeu du jeton (utilisé par login). */
  sansAuth?: boolean;
};

async function requeteBinaire(
  chemin: string,
  options: { method?: string; body?: BodyInit },
): Promise<Blob> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const config: RequestInit = {
    method: options.method ?? "GET",
    headers,
    credentials: "same-origin",
    body: options.body,
  };
  let res = await fetch(`${BASE_URL}${chemin}`, config);
  if (res.status === 401) {
    try {
      await mutualiserRefresh();
    } catch {
      clearAccessToken();
      throw new ApiError({
        message: "Session expirée. Veuillez vous reconnecter.",
        statusCode: 401,
      });
    }
    const renewedToken = getAccessToken();
    if (renewedToken) headers.Authorization = `Bearer ${renewedToken}`;
    res = await fetch(`${BASE_URL}${chemin}`, { ...config, headers });
  }
  if (!res.ok) await traiterReponse<never>(res);
  return res.blob();
}

async function requete<T>(
  chemin: string,
  options: OptionsRequete = {},
): Promise<T> {
  const { method = "GET", body, signal, sansAuth = false } = options;

  const multipart = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = multipart
    ? {}
    : { "Content-Type": "application/json" };
  if (!sansAuth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: "same-origin",
    signal,
  };
  if (body !== undefined) config.body = multipart ? body : JSON.stringify(body);

  let res = await fetch(`${BASE_URL}${chemin}`, config);

  // 401 → tenter UNE seule fois le renouvellement, puis rejouer.
  if (res.status === 401 && !sansAuth) {
    try {
      await mutualiserRefresh();
    } catch {
      // Le renouvellement échoue → on déconnecte (jeton périmé).
      clearAccessToken();
      throw new ApiError({
        message: "Session expirée. Veuillez vous reconnecter.",
        statusCode: 401,
      });
    }
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    res = await fetch(`${BASE_URL}${chemin}`, { ...config, headers });
  }

  return traiterReponse<T>(res);
}

async function traiterReponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  let payload: unknown = null;
  const texte = await res.text();
  if (texte) {
    try {
      payload = JSON.parse(texte);
    } catch {
      payload = texte;
    }
  }

  if (!res.ok) {
    const err = payload as Partial<ErreurApi> | undefined;
    const statusCode = res.status;
    let message: string | string[];
    if (
      err &&
      (typeof err.message === "string" || Array.isArray(err.message))
    ) {
      message = err.message;
    } else if (typeof payload === "string" && payload) {
      message = payload;
    } else {
      message = messageParDefaut(statusCode);
    }
    throw new ApiError({
      message,
      error: err?.error,
      statusCode,
    });
  }

  return payload as T;
}

function messageParDefaut(status: number): string {
  switch (status) {
    case 400:
      return "Certains champs sont invalides.";
    case 401:
      return "Identifiant ou mot de passe incorrect.";
    case 403:
      return "Vous n'avez pas accès à cette ressource.";
    case 404:
      return "Ressource introuvable.";
    case 429:
      return "Trop de tentatives. Réessayez plus tard.";
    case 500:
    case 502:
    case 503:
      return "Le serveur est momentanément indisponible.";
    default:
      return "Une erreur est survenue. Veuillez réessayer.";
  }
}

/* ------------------------------------------------------------------ */
/*  API publique : signatures identiques à src/api/mock.ts             */
/* ------------------------------------------------------------------ */

export async function connexion(corps: CorpsConnexion): Promise<ReponseLogin> {
  const data = await requete<ReponseLogin>("/auth/login", {
    method: "POST",
    body: corps,
    sansAuth: true,
  });
  if (!("mfaRequired" in data))
    setAccessToken(data.accessToken, data.expiresIn);
  return data;
}

export async function verifierMfa(corps: {
  challengeId: string;
  method: "email" | "totp";
  code: string;
}): Promise<ReponseConnexion> {
  const data = await requete<ReponseConnexion>("/auth/mfa/verify", {
    method: "POST",
    body: corps,
    sansAuth: true,
  });
  setAccessToken(data.accessToken, data.expiresIn);
  return data;
}

export async function demanderReinitialisation(
  identifiant: string,
): Promise<ReponseSimple> {
  return requete<ReponseSimple>("/auth/password-reset/request", {
    method: "POST",
    body: { identifiant },
    sansAuth: true,
  });
}

export async function confirmerReinitialisation(corps: {
  identifiant: string;
  code: string;
  motDePasse: string;
}): Promise<ReponseSimple> {
  return requete<ReponseSimple>("/auth/password-reset/confirm", {
    method: "POST",
    body: corps,
    sansAuth: true,
  });
}

export async function changerProfil(role: Role): Promise<ReponseConnexion> {
  const data = await requete<ReponseConnexion>("/auth/profil-actif", {
    method: "POST",
    body: { role },
  });
  setAccessToken(data.accessToken, data.expiresIn);
  return data;
}

export async function preparerMfaTotp(): Promise<{
  secret: string;
  otpauthUrl: string;
}> {
  return requete("/auth/mfa/totp/setup", { method: "POST" });
}

export async function statutMfa(): Promise<{ totpActive: boolean }> {
  return requete("/auth/mfa/status");
}

export async function verifierMfaTotp(code: string): Promise<ReponseSimple> {
  return requete("/auth/mfa/totp/verify", { method: "POST", body: { code } });
}

export async function desactiverMfaTotp(code: string): Promise<ReponseSimple> {
  return requete("/auth/mfa/totp/disable", { method: "POST", body: { code } });
}

export async function rafraichir(): Promise<ReponseConnexion> {
  const data = await requete<ReponseConnexion>("/auth/refresh", {
    method: "POST",
    sansAuth: true,
  });
  setAccessToken(data.accessToken, data.expiresIn);
  return data;
}

export async function deconnexion(): Promise<ReponseSimple> {
  try {
    return await requete<ReponseSimple>("/auth/logout", { method: "POST" });
  } finally {
    clearAccessToken();
  }
}

export async function activation(
  corps: CorpsActivation,
): Promise<ReponseSimple> {
  return requete<ReponseSimple>("/auth/activate", {
    method: "POST",
    body: corps,
    sansAuth: true,
  });
}

/* ------------------------------------------------------------------ */
/*  Évaluation des enseignements                                       */
/* ------------------------------------------------------------------ */

export async function listeEvaluations(): Promise<UeAEvaluer[]> {
  return requete<UeAEvaluer[]>("/evaluations/a-faire");
}

export async function questionnaire(
  campagneId: number,
): Promise<Questionnaire> {
  return requete<Questionnaire>(
    `/evaluations/questionnaire?campagneId=${encodeURIComponent(campagneId)}`,
  );
}

export async function obtenirJeton(
  ueId: number,
  campagneId: number,
): Promise<JetonVote> {
  return requete<JetonVote>(`/evaluations/${ueId}/jeton`, {
    method: "POST",
    body: { campagneId },
  });
}

/* ------------------------------------------------------------------ */
/*  Résultats (enseignant)                                             */
/* ------------------------------------------------------------------ */

export async function resultatsMesUes(): Promise<ResultatUeResume[]> {
  return requete<ResultatUeResume[]>("/resultats/mes-ues");
}

export async function resultatUe(
  ueId: number,
  campagneId: number,
): Promise<ResultatUe> {
  return requete<ResultatUe>(
    `/resultats/ues/${ueId}?campagneId=${encodeURIComponent(campagneId)}`,
  );
}

/* ------------------------------------------------------------------ */
/*  Cahier de texte & visa                                             */
/* ------------------------------------------------------------------ */

export async function cahierMesUes(): Promise<UeCahier[]> {
  return requete<UeCahier[]>("/cahier-texte/mes-ues");
}

export async function cahierSeances(
  ueId?: number,
  statutVisa?: string,
): Promise<Seance[]> {
  const params = new URLSearchParams();
  if (ueId !== undefined) params.set("ueId", String(ueId));
  if (statutVisa) params.set("statutVisa", statutVisa);
  const qs = params.toString();
  return requete<Seance[]>(`/cahier-texte/seances${qs ? `?${qs}` : ""}`);
}

export async function creerSeance(corps: SeanceEntree): Promise<Seance> {
  return requete<Seance>("/cahier-texte/seances", {
    method: "POST",
    body: corps,
  });
}

export async function modifierSeance(
  id: number,
  corps: SeanceEntree,
): Promise<Seance> {
  return requete<Seance>(`/cahier-texte/seances/${id}`, {
    method: "PATCH",
    body: corps,
  });
}

export async function visaSeance(
  id: number,
  corps: { decision: "vise" | "conteste"; commentaire?: string },
): Promise<Seance> {
  return requete<Seance>(`/cahier-texte/seances/${id}/visa`, {
    method: "POST",
    body: corps,
  });
}

export async function avancementUe(ueId: number): Promise<Avancement> {
  return requete<Avancement>(`/cahier-texte/ues/${ueId}/avancement`);
}

export async function exporterCahier(
  format: "pdf" | "xlsx" | "docx",
  ueId?: number,
): Promise<Blob> {
  const params = new URLSearchParams({ format });
  if (ueId !== undefined) params.set("ueId", String(ueId));
  return requeteBinaire(`/cahier-texte/export?${params.toString()}`, {
    method: "GET",
  });
}

export async function historiqueSeance(id: number): Promise<VersionSeance[]> {
  return requete<VersionSeance[]>(`/cahier-texte/seances/${id}/historique`);
}

export async function piecesSeance(id: number): Promise<PieceJointe[]> {
  return requete<PieceJointe[]>(`/cahier-texte/seances/${id}/pieces`);
}

export async function ajouterPieceSeance(
  id: number,
  fichier: File,
): Promise<PieceJointe> {
  const formulaire = new FormData();
  formulaire.append("fichier", fichier);
  return requete<PieceJointe>(`/cahier-texte/seances/${id}/pieces`, {
    method: "POST",
    body: formulaire,
  });
}

export async function telechargerPiece(id: number): Promise<Blob> {
  return requeteBinaire(`/cahier-texte/pieces/${id}`, { method: "GET" });
}

export async function notifications(): Promise<Notification[]> {
  return requete<Notification[]>("/notifications");
}

export async function marquerNotificationLue(id: number): Promise<void> {
  return requete<void>(`/notifications/${id}/lue`, { method: "POST" });
}

export async function journalAudit(): Promise<LigneAudit[]> {
  return requete<LigneAudit[]>("/audit?limite=200");
}

export async function dossierCoursEnseignant(): Promise<CoursDossier[]> {
  return requete<CoursDossier[]>("/dossier-academique/enseignant/ues");
}

export async function dossierCahierNotes(
  courseId: number,
): Promise<CahierNotes> {
  return requete<CahierNotes>(
    `/dossier-academique/enseignant/ues/${courseId}/notes`,
  );
}

export async function dossierExporterNotes(
  courseId: number,
  format: "pdf" | "xlsx" | "docx",
): Promise<Blob> {
  const params = new URLSearchParams({ format });
  return requeteBinaire(
    `/dossier-academique/enseignant/ues/${courseId}/notes/export?${params.toString()}`,
    { method: "GET" },
  );
}

export async function dossierCreerEvaluation(
  courseId: number,
  entree: EntreeEvaluation,
): Promise<{
  id: number;
  libelle: string;
  type: TypeEvaluationAcademique;
  bareme: number;
}> {
  return requete<{
    id: number;
    libelle: string;
    type: TypeEvaluationAcademique;
    bareme: number;
  }>(`/dossier-academique/enseignant/ues/${courseId}/evaluations`, {
    method: "POST",
    body: entree,
  });
}

export async function dossierEnregistrerNotes(
  evaluationId: number,
  etudiants: EntreeNote[],
): Promise<{ ok: true; nombreEnregistre: number }> {
  return requete<{ ok: true; nombreEnregistre: number }>(
    `/dossier-academique/enseignant/evaluations/${evaluationId}/notes`,
    {
      method: "PATCH",
      body: { etudiants },
    },
  );
}

export async function dossierSeancesPresence(
  courseId: number,
): Promise<SeancePresence[]> {
  return requete<SeancePresence[]>(
    `/dossier-academique/enseignant/ues/${courseId}/presences`,
  );
}

export async function dossierCreerSeancePresence(
  courseId: number,
  entree: { date: string; libelle: string },
): Promise<{ id: number; date: string; libelle: string }> {
  return requete<{ id: number; date: string; libelle: string }>(
    `/dossier-academique/enseignant/ues/${courseId}/presences`,
    {
      method: "POST",
      body: entree,
    },
  );
}

export async function dossierPresenceSeance(
  sessionId: number,
): Promise<DetailSeancePresence> {
  return requete<DetailSeancePresence>(
    `/dossier-academique/enseignant/presences/${sessionId}`,
  );
}

export async function dossierEnregistrerPresences(
  sessionId: number,
  etudiants: EntreePresence[],
): Promise<{ ok: true; nombreEnregistre: number }> {
  return requete<{ ok: true; nombreEnregistre: number }>(
    `/dossier-academique/enseignant/presences/${sessionId}`,
    {
      method: "PATCH",
      body: { etudiants },
    },
  );
}

export async function dossierMesNotes(): Promise<NoteEtudiant[]> {
  return requete<NoteEtudiant[]>("/dossier-academique/etudiant/mes-notes");
}

export async function dossierMesPresences(): Promise<PresencesEtudiant> {
  return requete<PresencesEtudiant>(
    "/dossier-academique/etudiant/mes-presences",
  );
}

/* ------------------------------------------------------------------ */
/*  Direction des Études                                               */
/* ------------------------------------------------------------------ */

export async function directionStatistiques(
  periode: PeriodeDirection,
): Promise<StatistiquesDirection> {
  const params = new URLSearchParams({
    anneeUniversitaire: periode.anneeUniversitaire,
    semestre: String(periode.semestre),
  });
  return requete<StatistiquesDirection>(`/direction/statistiques?${params}`);
}

export async function directionControles(
  periode: PeriodeDirection,
): Promise<ControlesAcademiques> {
  const params = new URLSearchParams({
    anneeUniversitaire: periode.anneeUniversitaire,
    semestre: String(periode.semestre),
  });
  return requete<ControlesAcademiques>(
    `/direction/controles-academiques?${params}`,
  );
}

export async function directionPublierStatistiques(
  periode: PeriodeDirection,
): Promise<StatistiquesDirection> {
  return requete<StatistiquesDirection>(
    "/direction/statistiques/publications",
    {
      method: "POST",
      body: periode,
    },
  );
}

/* ------------------------------------------------------------------ */
/*  Pilotage (chef de département)                                     */
/* ------------------------------------------------------------------ */

export async function pilotageCampagnes(): Promise<Campagne[]> {
  return requete<Campagne[]>("/pilotage/campagnes");
}

export async function pilotageParticipation(
  campagneId: number,
): Promise<ParticipationUe[]> {
  return requete<ParticipationUe[]>(
    `/pilotage/campagnes/${campagneId}/participation`,
  );
}

export async function pilotageSynthese(campagneId: number): Promise<Synthese> {
  return requete<Synthese>(`/pilotage/campagnes/${campagneId}/synthese`);
}

export async function pilotageSuites(
  campagneId: number,
  corps: SuitesDonnees,
): Promise<SuitesDonnees> {
  return requete<SuitesDonnees>(`/pilotage/campagnes/${campagneId}/suites`, {
    method: "PUT",
    body: corps,
  });
}

export async function pilotageChargerSuites(
  campagneId: number,
): Promise<SuitesDonnees> {
  return requete<SuitesDonnees>(`/pilotage/campagnes/${campagneId}/suites`);
}

/* ------------------------------------------------------------------ */
/*  Scolarité                                                          */
/* ------------------------------------------------------------------ */

export async function scolariteTableauDeBord(): Promise<TableauDeBordScolarite> {
  return requete<TableauDeBordScolarite>("/scolarite/tableau-de-bord");
}

export async function scolariteCampagnes(): Promise<CampagneGestion[]> {
  return requete<CampagneGestion[]>("/campagnes");
}

export async function scolariteDeliberationsExamens(): Promise<
  ExamenADeliberer[]
> {
  return requete<ExamenADeliberer[]>("/scolarite/deliberations-examens");
}

export async function scolariteDetailsDeliberationExamen(
  assessmentId: number,
): Promise<DetailsDeliberationExamen> {
  return requete<DetailsDeliberationExamen>(
    `/scolarite/deliberations-examens/${assessmentId}`,
  );
}

export async function scolariteDelibererExamen(
  assessmentId: number,
): Promise<{ id: number; delibereeLe: string }> {
  return requete<{ id: number; delibereeLe: string }>(
    `/scolarite/deliberations-examens/${assessmentId}`,
    { method: "POST" },
  );
}

export async function scolariteCreerCampagne(
  corps: CampagneEntreeGestion,
): Promise<CampagneGestion> {
  return requete<CampagneGestion>("/campagnes", {
    method: "POST",
    body: corps,
  });
}

export async function scolariteOuvrirCampagne(
  id: number,
): Promise<CampagneGestion> {
  return requete<CampagneGestion>(`/campagnes/${id}/ouvrir`, {
    method: "POST",
  });
}

export async function scolariteCloturerCampagne(
  id: number,
): Promise<CampagneGestion> {
  return requete<CampagneGestion>(`/campagnes/${id}/cloturer`, {
    method: "POST",
  });
}

export async function scolariteDepartements(): Promise<DepartementOption[]> {
  return requete<DepartementOption[]>("/referentiels/departements");
}

export async function scolariteComptes(): Promise<CompteAdministration[]> {
  return requete<CompteAdministration[]>("/comptes");
}

export async function scolariteImporterUtilisateurs(
  fichier: File,
): Promise<ResultatImportUtilisateurs> {
  const formData = new FormData();
  formData.append("file", fichier);
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res = await fetch(`${BASE_URL}/imports/users`, {
    method: "POST",
    headers,
    credentials: "same-origin",
    body: formData,
  });
  if (res.status === 401) {
    try {
      await mutualiserRefresh();
    } catch {
      clearAccessToken();
      throw new ApiError({ message: "Session expirée.", statusCode: 401 });
    }
    const nouveauToken = getAccessToken();
    if (nouveauToken) headers.Authorization = `Bearer ${nouveauToken}`;
    res = await fetch(`${BASE_URL}/imports/users`, {
      method: "POST",
      headers,
      credentials: "same-origin",
      body: formData,
    });
  }
  return traiterReponse<ResultatImportUtilisateurs>(res);
}

export async function administrationReferentiels(): Promise<ReferentielsAdministration> {
  return requete<ReferentielsAdministration>("/administration/referentiels");
}

export async function administrationCreerCampus(nom: string) {
  return requete<{ id: number; nom: string }>("/administration/campus", {
    method: "POST",
    body: { nom },
  });
}

export async function administrationCreerDepartement(
  campusId: number,
  nom: string,
) {
  return requete("/administration/departements", {
    method: "POST",
    body: { campusId, nom },
  });
}

export async function administrationCreerProgramme(
  departmentId: number,
  nom: string,
) {
  return requete("/administration/programmes", {
    method: "POST",
    body: { departmentId, nom },
  });
}

export async function scolariteGenererCodes(corps: {
  identifiants?: string[];
  tousSansMotDePasse?: boolean;
}): Promise<ResultatCodes> {
  return requete<ResultatCodes>("/comptes/codes-activation", {
    method: "POST",
    body: corps,
  });
}

export async function scolariteVerifierImport(
  type: TypeImport,
  fichier: File,
): Promise<RapportImport> {
  const formData = new FormData();
  formData.append("fichier", fichier);
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res = await fetch(`${BASE_URL}/imports/${type}/verification`, {
    method: "POST",
    headers,
    credentials: "same-origin",
    body: formData,
  });
  if (res.status === 401) {
    try {
      await mutualiserRefresh();
    } catch {
      clearAccessToken();
      throw new ApiError({ message: "Session expirée.", statusCode: 401 });
    }
    const t = getAccessToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
    res = await fetch(`${BASE_URL}/imports/${type}/verification`, {
      method: "POST",
      headers,
      credentials: "same-origin",
      body: formData,
    });
  }
  return traiterReponse<RapportImport>(res);
}

export async function scolariteValiderImport(
  type: TypeImport,
  importId: string,
): Promise<ResultatImport> {
  return requete<ResultatImport>(`/imports/${type}/valider`, {
    method: "POST",
    body: { importId },
  });
}

export async function archivesAnnuelles(): Promise<ArchiveAnnuelle[]> {
  return requete<ArchiveAnnuelle[]>("/archives/annuelles");
}

export async function creerArchiveAnnuelle(
  anneeUniversitaire: string,
): Promise<{ anneeUniversitaire: string; archiveLe: string }> {
  return requete("/archives/annuelles", {
    method: "POST",
    body: { anneeUniversitaire },
  });
}

export async function lireArchiveAnnuelle(
  anneeUniversitaire: string,
): Promise<ArchiveAnnuelle> {
  return requete<ArchiveAnnuelle>(
    `/archives/annuelles/${encodeURIComponent(anneeUniversitaire)}`,
  );
}

export async function scolariteCommentaires(
  campagneId?: number,
  statut?: string,
): Promise<CommentaireAModerer[]> {
  const params = new URLSearchParams();
  if (campagneId !== undefined) params.set("campagneId", String(campagneId));
  if (statut) params.set("statut", statut);
  const qs = params.toString();
  return requete<CommentaireAModerer[]>(
    `/moderation/commentaires${qs ? `?${qs}` : ""}`,
  );
}

export async function scolariteModererCommentaire(
  id: string | number,
  corps: { statut: "valide" | "masque" },
): Promise<CommentaireAModerer> {
  return requete<CommentaireAModerer>(`/moderation/commentaires/${id}`, {
    method: "PATCH",
    body: corps,
  });
}

export async function scolariteRestitution(
  id: number,
  corps: RestitutionEntree,
): Promise<CampagneGestion> {
  return requete<CampagneGestion>(`/campagnes/${id}/restitution`, {
    method: "POST",
    body: corps,
  });
}

export async function restitutions(): Promise<Restitution[]> {
  return requete<Restitution[]>("/restitutions");
}
