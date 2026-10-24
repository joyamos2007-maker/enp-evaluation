export const ROLES = [
  'etudiant',
  'delegue',
  'enseignant',
  'chef_departement',
  'scolarite',
  'direction_etudes',
  'admin',
] as const;

export type Role = (typeof ROLES)[number];