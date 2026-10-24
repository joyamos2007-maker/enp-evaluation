import type { Role } from "@/api/types";

export interface EntreeMenu {
  chemin: string;
  libelle: string;
  icone: string;
  roles: Role[];
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
  },
  {
    chemin: "/evaluations",
    libelle: "Mes évaluations",
    icone: "ClipboardCheck",
    roles: ["etudiant", "delegue"],
  },
  {
    chemin: "/mes-notes",
    libelle: "Mes notes",
    icone: "GraduationCap",
    roles: ["etudiant", "delegue"],
  },
  {
    chemin: "/mes-presences",
    libelle: "Mes présences",
    icone: "CalendarCheck",
    roles: ["etudiant", "delegue"],
  },
  {
    chemin: "/restitution",
    libelle: "Restitution",
    icone: "FileText",
    roles: ["etudiant", "delegue"],
  },
  {
    chemin: "/cahier-texte",
    libelle: "Cahier de texte",
    icone: "BookOpen",
    roles: ["etudiant", "delegue", "enseignant"],
  },
  {
    chemin: "/resultats",
    libelle: "Mes résultats",
    icone: "BarChart3",
    roles: ["enseignant"],
  },
  {
    chemin: "/enseignant/notes",
    libelle: "Saisie des notes",
    icone: "ClipboardList",
    roles: ["enseignant"],
  },
  {
    chemin: "/enseignant/presences",
    libelle: "Gestion des présences",
    icone: "CalendarCheck",
    roles: ["enseignant"],
  },
  {
    chemin: "/visas",
    libelle: "Séances à viser",
    icone: "Stamp",
    roles: ["enseignant"],
  },
  {
    chemin: "/participation",
    libelle: "Participation",
    icone: "Users",
    roles: ["chef_departement"],
  },
  {
    chemin: "/synthese",
    libelle: "Synthèse",
    icone: "LineChart",
    roles: ["chef_departement"],
  },
  {
    chemin: "/scolarite",
    libelle: "Tableau de bord",
    icone: "LayoutDashboard",
    roles: ["scolarite", "admin"],
  },
  {
    chemin: "/scolarite/campagnes",
    libelle: "Campagnes",
    icone: "Megaphone",
    roles: ["scolarite", "admin"],
  },
  {
    chemin: "/scolarite/comptes",
    libelle: "Comptes",
    icone: "UserCog",
    roles: ["scolarite", "admin"],
  },
  {
    chemin: "/scolarite/imports",
    libelle: "Imports",
    icone: "Upload",
    roles: ["scolarite", "admin"],
  },
  {
    chemin: "/scolarite/moderation",
    libelle: "Modération",
    icone: "MessageSquare",
    roles: ["scolarite", "admin"],
  },
  {
    chemin: "/scolarite/deliberations",
    libelle: "Délibération des examens",
    icone: "ClipboardCheck",
    roles: ["scolarite", "admin"],
  },
  {
    chemin: "/scolarite/restitution",
    libelle: "Restitution",
    icone: "FileText",
    roles: ["scolarite", "admin"],
  },
  {
    chemin: "/direction/statistiques",
    libelle: "Statistiques globales",
    icone: "Globe2",
    roles: ["direction_etudes"],
  },
  {
    chemin: "/administration",
    libelle: "Administration",
    icone: "Settings",
    roles: ["admin", "direction_etudes"],
  },
  {
    chemin: "/archives-annuelles",
    libelle: "Archives annuelles",
    icone: "Archive",
    roles: ["admin"],
  },
  {
    chemin: "/journal-audit",
    libelle: "Journal d'audit",
    icone: "ScrollText",
    roles: ["admin"],
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
