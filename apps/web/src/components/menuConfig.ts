import type { Role } from "@/api/types";

export interface EntreeMenu {
  chemin: string;
  libelle: string;
  icone: string;
  roles: Role[];
  section?: string;
}

export const ENTREES_MENU: EntreeMenu[] = [
  // ÉTUDIANT & DÉLÉGUÉ
  {
    chemin: "/evaluations",
    libelle: "Évaluations des enseignements",
    icone: "ClipboardCheck",
    roles: ["etudiant", "delegue"],
    section: "Évaluation & Pédagogie",
  },
  {
    chemin: "/restitution",
    libelle: "Restitutions publiques",
    icone: "FileText",
    roles: ["etudiant", "delegue"],
    section: "Évaluation & Pédagogie",
  },
  {
    chemin: "/mes-notes",
    libelle: "Mon dossier & Notes",
    icone: "GraduationCap",
    roles: ["etudiant", "delegue"],
    section: "Dossier Académique",
  },
  {
    chemin: "/mes-presences",
    libelle: "Mes présences & Assiduité",
    icone: "CalendarCheck",
    roles: ["etudiant", "delegue"],
    section: "Dossier Académique",
  },
  {
    chemin: "/cahier-texte",
    libelle: "Cahier de texte officiel",
    icone: "BookOpen",
    roles: ["etudiant", "delegue", "enseignant", "chef_departement"],
    section: "Cahier de Texte",
  },
  {
    chemin: "/participation",
    libelle: "Suivi de la participation",
    icone: "Users",
    roles: ["delegue", "chef_departement"],
    section: "Pilotage & Participation",
  },

  // ENSEIGNANT
  {
    chemin: "/visas",
    libelle: "Visas des séances",
    icone: "Stamp",
    roles: ["enseignant"],
    section: "Cahier de Texte",
  },
  {
    chemin: "/resultats",
    libelle: "Résultats d'évaluation",
    icone: "BarChart3",
    roles: ["enseignant", "chef_departement"],
    section: "Évaluation & Pédagogie",
  },
  {
    chemin: "/enseignant/notes",
    libelle: "Saisie des notes & Devoirs",
    icone: "ClipboardList",
    roles: ["enseignant"],
    section: "Dossier Académique",
  },
  {
    chemin: "/enseignant/presences",
    libelle: "Pointage des présences",
    icone: "CheckSquare",
    roles: ["enseignant"],
    section: "Dossier Académique",
  },

  // CHEF DE DÉPARTEMENT
  {
    chemin: "/synthese",
    libelle: "Synthèse & Plan d'actions",
    icone: "LineChart",
    roles: ["chef_departement"],
    section: "Pilotage & Participation",
  },

  // SCOLARITÉ
  {
    chemin: "/scolarite",
    libelle: "Tableau de bord Scolarité",
    icone: "LayoutDashboard",
    roles: ["scolarite", "admin"],
    section: "Gestion Scolarité",
  },
  {
    chemin: "/scolarite/campagnes",
    libelle: "Campagnes d'évaluation",
    icone: "Megaphone",
    roles: ["scolarite", "admin"],
    section: "Gestion Scolarité",
  },
  {
    chemin: "/scolarite/comptes",
    libelle: "Comptes & Codes d'activation",
    icone: "UserCog",
    roles: ["scolarite", "admin"],
    section: "Gestion Scolarité",
  },
  {
    chemin: "/scolarite/imports",
    libelle: "Imports CSV référentiels",
    icone: "Upload",
    roles: ["scolarite", "admin"],
    section: "Gestion Scolarité",
  },
  {
    chemin: "/scolarite/moderation",
    libelle: "Modération des commentaires",
    icone: "ShieldCheck",
    roles: ["scolarite"],
    section: "Gestion Scolarité",
  },
  {
    chemin: "/scolarite/deliberations",
    libelle: "Délibérations des examens",
    icone: "Award",
    roles: ["scolarite", "admin"],
    section: "Gestion Scolarité",
  },
  {
    chemin: "/scolarite/restitution",
    libelle: "Publication des restitutions",
    icone: "FileCheck2",
    roles: ["scolarite", "admin"],
    section: "Gestion Scolarité",
  },

  // DIRECTION DES ÉTUDES
  {
    chemin: "/direction/statistiques",
    libelle: "Statistiques institutionnelles",
    icone: "Globe2",
    roles: ["direction_etudes"],
    section: "Gouvernance & Études",
  },
  {
    chemin: "/direction/controles",
    libelle: "Contrôles académiques",
    icone: "Sliders",
    roles: ["direction_etudes"],
    section: "Gouvernance & Études",
  },

  // ADMINISTRATION TECHNIQUE
  {
    chemin: "/administration",
    libelle: "Référentiels & Infrastructure",
    icone: "Building2",
    roles: ["admin", "direction_etudes"],
    section: "Supervision Technique",
  },
  {
    chemin: "/archives-annuelles",
    libelle: "Archives annuelles",
    icone: "Archive",
    roles: ["admin"],
    section: "Supervision Technique",
  },
  {
    chemin: "/journal-audit",
    libelle: "Journal d'audit sécurisé",
    icone: "ScrollText",
    roles: ["admin"],
    section: "Supervision Technique",
  },
];

export function entreesPourRoles(roles: Role[]): EntreeMenu[] {
  return ENTREES_MENU.filter((e) => e.roles.some((r) => roles.includes(r)));
}

export const LIBELLES_ROLES: Record<Role, string> = {
  etudiant: "Étudiant",
  delegue: "Délégué de promotion",
  enseignant: "Enseignant-Chercheur",
  chef_departement: "Chef de Département",
  scolarite: "Scolarité",
  direction_etudes: "Direction des Études",
  admin: "Administrateur Système",
};
