import type { Role } from "@/api/types";

export interface EntreeMenu {
  chemin: string;
  libelle: string;
  icone: string;
  roles: Role[];
  section?: string;
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
      "direction_etudes",
      "admin",
    ],
    section: "Général",
  },
  {
    chemin: "/evaluations",
    libelle: "Mes évaluations",
    icone: "ClipboardCheck",
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
  {
    chemin: "/restitution",
    libelle: "Restitution",
    icone: "FileText",
    roles: ["etudiant", "delegue"],
    section: "Évaluation & Pédagogie",
  },
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
    section: "Cahier de Texte",
  },
  {
    chemin: "/resultats",
    libelle: "Résultats des UE",
    icone: "BarChart3",
    roles: ["enseignant", "chef_departement", "scolarite", "direction_etudes"],
    section: "Évaluation & Pédagogie",
  },
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
    chemin: "/visas",
    libelle: "Séances à viser",
    icone: "Stamp",
    roles: ["enseignant"],
    section: "Cahier de Texte",
  },
  {
    chemin: "/participation",
    libelle: "Participation",
    icone: "Users",
    roles: ["chef_departement"],
    section: "Pilotage & Participation",
  },
  {
    chemin: "/synthese",
    libelle: "Synthèse",
    icone: "LineChart",
    roles: ["chef_departement"],
    section: "Pilotage & Participation",
  },
  {
    chemin: "/scolarite",
    libelle: "Tableau de bord",
    icone: "LayoutDashboard",
    roles: ["scolarite"],
    section: "Gestion Scolarité",
  },
  {
    chemin: "/scolarite/campagnes",
    libelle: "Campagnes",
    icone: "Megaphone",
    roles: ["scolarite"],
    section: "Gestion Scolarité",
  },
  {
    chemin: "/scolarite/comptes",
    libelle: "Comptes",
    icone: "UserCog",
    roles: ["scolarite", "admin"],
    section: "Gestion Scolarité",
  },
  {
    chemin: "/scolarite/imports",
    libelle: "Imports",
    icone: "Upload",
    roles: ["scolarite", "admin"],
    section: "Gestion Scolarité",
  },
  {
    chemin: "/scolarite/moderation",
    libelle: "Modération",
    icone: "MessageSquare",
    roles: ["scolarite"],
    section: "Gestion Scolarité",
  },
  {
    chemin: "/scolarite/deliberations",
    libelle: "Délibération des examens",
    icone: "ClipboardCheck",
    roles: ["scolarite"],
    section: "Gestion Scolarité",
  },
  {
    chemin: "/scolarite/restitution",
    libelle: "Restitution",
    icone: "FileText",
    roles: ["scolarite"],
    section: "Gestion Scolarité",
  },
  {
    chemin: "/direction/statistiques",
    libelle: "Statistiques globales",
    icone: "Globe2",
    roles: ["direction_etudes"],
    section: "Gouvernance & Études",
  },
  {
    chemin: "/direction/commentaires",
    libelle: "Commentaires (lecture)",
    icone: "MessageSquare",
    roles: ["direction_etudes"],
    section: "Gouvernance & Études",
  },
  {
    chemin: "/administration",
    libelle: "Administration",
    icone: "Settings",
    roles: ["admin"],
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
    libelle: "Journal d'audit",
    icone: "ScrollText",
    roles: ["admin", "scolarite"],
    section: "Administration & Audit",
  },
];

export function entreesPourRoles(roles: Role[]): EntreeMenu[] {
  return ENTREES_MENU.filter((e) => e.roles.some((r) => roles.includes(r)));
}

export const LIBELLES_ROLES: Record<Role, string> = {
  etudiant: "Étudiant",
  delegue: "Délégué",
  enseignant: "Enseignant",
  chef_departement: "Chef de département",
  scolarite: "Scolarité",
  direction_etudes: "Direction des Études",
  admin: "Administrateur",
};
