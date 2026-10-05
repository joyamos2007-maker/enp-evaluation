export interface UtilisateurAuthentifie {
  id: number;
  roles: string[];
}

export interface RequeteAuthentifiee {
  headers: Record<string, string | string[] | undefined>;
  utilisateur?: UtilisateurAuthentifie;
}