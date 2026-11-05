export const ROLES = [
  'etudiant',
  'delegue',
  'enseignant',
  'chef_departement',
  'scolarite',
  'directeur_campus',
  'directeur_general',
  'admin',
] as const;

export type Role = (typeof ROLES)[number];