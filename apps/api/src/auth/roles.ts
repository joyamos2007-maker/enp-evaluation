export const ROLES = [
  'etudiant',
  'delegue',
  'enseignant',
  'chef_departement',
  'scolarite',
  'admin',
] as const;

export type Role = (typeof ROLES)[number];