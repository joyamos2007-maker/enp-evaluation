import type { Role } from "@/api/types";

export interface EntreeMenu {
  chemin: string;
  libelle: string;
  icone: string;
  roles: Role[];
  section?: string | ((role: Role) => string);
}

export const ENTREES_MENU: EntreeMenu[] = [
  {
    chemin: "/notifications",
    libelle: "Notifications",
    icone: "Bell",
    roles: [
      "etudiant",
      "delegue",
      "enseignant",
      "chef_departement",
      "scolarite",
      "directeur_campus",
      "directeur_general",
      "admin",
    ],
    section: "Général",
  },
  // --- 1. ÉTUDIANT & DÉLÉGUÉ ---
  {
    chemin: "/evaluations",
    libelle: "Mes évaluations",
    icone: "ClipboardCheck",
    roles: ["etudiant", "delegue"],
    section: "Évaluation & Pédagogie",
  },
  {
    chemin: "/restitution",
    libelle: "Restitution des résultats",
    icone: "FileText",
    roles: ["etudiant", "delegue"],
    section: "Évaluation & Pédagogie",
  },
  {
    chemin: "/mes-notes",
    libelle: "Mes notes",
    icone: "GraduationCap",
    roles: ["etudiant", "delegue"],
    section: "Dossier Académique",
  },
  {
    chemin: "/mes-presences",
    libelle: "Mes présences",
    icone: "CalendarCheck",
    roles: ["etudiant", "delegue"],
    section: "Dossier Académique",
  },

  // --- 2. CAHIER DE TEXTE (Délégué, Enseignant, Chef, Scolarité) ---
  {
    chemin: "/cahier-texte",
    libelle: "Cahier de texte",
    icone: "BookOpen",
    roles: [
      "etudiant",
      "delegue",
      "enseignant",
      "chef_departement",
      "scolarite",
    ],
    section: (r: Role) => {
      if (r === "etudiant") return "Vie Pédagogique";
      if (r === "delegue") return "Cahier de Texte (Délégué)";
      if (r === "enseignant") return "Cahier de Texte";
      if (r === "chef_departement") return "Cahier de Texte";
      return "Supervision Académique";
    },
  },
  {
    chemin: "/cahier-texte/nouvelle",
    libelle: "Renseigner une séance",
    icone: "PlusCircle",
    roles: ["delegue"],
    section: "Cahier de Texte (Délégué)",
  },

  // --- 3. ENSEIGNANT ---
  {
    chemin: "/enseignant/notes",
    libelle: "Saisie des notes",
    icone: "ClipboardList",
    roles: ["enseignant"],
    section: "Dossier Académique",
  },
  {
    chemin: "/enseignant/presences",
    libelle: "Gestion des présences",
    icone: "CalendarCheck",
    roles: ["enseignant"],
    section: "Dossier Académique",
  },
  {
    chemin: "/resultats",
    libelle: "Résultats des UE",
    icone: "BarChart3",
    roles: [
      "enseignant",
      "chef_departement",
      "scolarite",
      "directeur_campus",
      "directeur_general",
    ],
    section: (r: Role) => {
      if (r === "enseignant") return "Évaluation Pédagogique";
      if (r === "chef_departement") return "Pilotage Départemental";
      if (r === "scolarite") return "Supervision Académique";
      return "Gouvernance & Études";
    },
  },

  // --- 4. CHEF DE DÉPARTEMENT ---
  {
    chemin: "/participation",
    libelle: "Participation",
    icone: "Users",
    roles: ["chef_departement"],
    section: "Pilotage Départemental",
  },
  {
    chemin: "/synthese",
    libelle: "Synthèse départementale",
    icone: "LineChart",
    roles: ["chef_departement"],
    section: "Pilotage Départemental",
  },

  // --- 5. GESTION SCOLARITÉ ---
  {
    chemin: "/scolarite/campagnes",
    libelle: "Campagnes d'évaluation",
    icone: "Megaphone",
    roles: ["scolarite"],
    section: "Campagnes & Évaluation",
  },
  {
    chemin: "/scolarite/moderation",
    libelle: "Modération des avis",
    icone: "MessageSquare",
    roles: ["scolarite"],
    section: "Campagnes & Évaluation",
  },
  {
    chemin: "/scolarite/restitution",
    libelle: "Restitution officielle",
    icone: "FileText",
    roles: ["scolarite"],
    section: "Campagnes & Évaluation",
  },
  {
    chemin: "/scolarite/comptes",
    libelle: "Gestion des comptes",
    icone: "UserCog",
    roles: ["scolarite", "admin"],
    section: (r: Role) => (r === "admin" ? "Administration Système" : "Gestion Scolarité"),
  },
  {
    chemin: "/scolarite/imports",
    libelle: "Imports de données",
    icone: "Upload",
    roles: ["scolarite", "admin"],
    section: (r: Role) => (r === "admin" ? "Administration Système" : "Gestion Scolarité"),
  },

  // --- 6. DIRECTION (CAMPUS & GÉNÉRALE) ---
  {
    chemin: "/direction/statistiques",
    libelle: "Statistiques du campus",
    icone: "Globe2",
    roles: ["directeur_campus"],
    section: "Gouvernance & Études",
  },
  {
    chemin: "/direction/statistiques",
    libelle: "Statistiques globales ENP",
    icone: "Globe2",
    roles: ["directeur_general"],
    section: "Gouvernance & Études",
  },
  {
    chemin: "/direction/controles",
    libelle: "Contrôles académiques",
    icone: "ShieldCheck",
    roles: ["directeur_campus", "directeur_general"],
    section: "Gouvernance & Études",
  },
  {
    chemin: "/direction/commentaires",
    libelle: "Commentaires (lecture)",
    icone: "MessageSquare",
    roles: ["directeur_campus", "directeur_general"],
    section: "Gouvernance & Études",
  },

  // --- 7. ADMINISTRATION SYSTÈME & TECHNIQUE ---
  {
    chemin: "/administration",
    libelle: "Référentiels & Campus",
    icone: "Settings",
    roles: ["admin"],
    section: "Administration Système",
  },
  {
    chemin: "/archives-annuelles",
    libelle: "Archives annuelles",
    icone: "Archive",
    roles: ["admin"],
    section: "Sécurité & Traçabilité",
  },
  {
    chemin: "/journal-audit",
    libelle: "Journal d'audit",
    icone: "ScrollText",
    roles: ["admin", "scolarite"],
    section: (r: Role) => (r === "admin" ? "Sécurité & Traçabilité" : "Supervision Académique"),
  },
];

export function entreesPourRoles(roles: Role[]): (EntreeMenu & { section: string })[] {
  const activeRole = roles[0];
  return ENTREES_MENU.filter((e) => e.roles.some((r) => roles.includes(r))).map((e) => ({
    ...e,
    section:
      typeof e.section === "function" && activeRole
        ? e.section(activeRole)
        : typeof e.section === "string"
          ? e.section
          : "Général",
  }));
}

export const LIBELLES_ROLES: Record<Role, string> = {
  etudiant: "Étudiant",
  delegue: "Délégué",
  enseignant: "Enseignant",
  chef_departement: "Chef de département",
  scolarite: "Scolarité",
  directeur_campus: "Directeur de campus",
  directeur_general: "Directeur général",
  admin: "Administrateur",
};
