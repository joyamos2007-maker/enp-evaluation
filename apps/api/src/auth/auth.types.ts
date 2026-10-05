export interface UtilisateurAuthentifie {
  id: number;
  roles: string[];
}

export interface RequeteAuthentifiee {
  headers: Record<string, string | string[] | undefined>;
  utilisateur?: UtilisateurAuthentifie;
}

export interface OptionsCookie {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  expires: Date;
}

export interface ReponseHttp {
  cookie(nom: string, valeur: string, options: OptionsCookie): unknown;
  clearCookie(nom: string, options: Omit<OptionsCookie, 'expires'>): unknown;
}