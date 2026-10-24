import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/api';
import type { ReponseConnexion, Role, UtilisateurSession } from '@/api/types';
import { effacerTousLesBrouillons } from '@/evaluation/brouillon';

type EtatAuth =
  | { statut: 'chargement' }
  | { statut: 'deconnecte' }
  | { statut: 'connecte'; utilisateur: UtilisateurSession };

interface ValeurAuth {
  etat: EtatAuth;
  utilisateur: UtilisateurSession | null;
  connecter: (rep: ReponseConnexion) => void;
  changerProfil: (role: Role) => Promise<void>;
  deconnecter: () => Promise<void>;
  aRole: (role: Role) => boolean;
}

const AuthContext = createContext<ValeurAuth | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatAuth>({ statut: 'chargement' });
  const rafraichissementEnCours = useRef(false);

  const restaurerSession = useCallback(async () => {
    if (rafraichissementEnCours.current) return;
    rafraichissementEnCours.current = true;
    try {
      const rep = await api.rafraichir();
      setEtat({ statut: 'connecte', utilisateur: rep.utilisateur });
    } catch {
      // 401 = pas de session ; toute autre erreur réseau → déconnecté aussi.
      setEtat({ statut: 'deconnecte' });
    } finally {
      rafraichissementEnCours.current = false;
    }
  }, []);

  useEffect(() => {
    void restaurerSession();
  }, [restaurerSession]);

  const connecter = useCallback((rep: ReponseConnexion) => {
    setEtat({ statut: 'connecte', utilisateur: rep.utilisateur });
  }, []);

  const changerProfil = useCallback(async (role: Role) => {
    const rep = await api.changerProfil(role);
    setEtat({ statut: 'connecte', utilisateur: rep.utilisateur });
  }, []);

  const deconnecter = useCallback(async () => {
    try {
      await api.deconnexion();
    } catch {
      // Même en cas d'erreur réseau, on vide l'état local.
    }
    effacerTousLesBrouillons();
    setEtat({ statut: 'deconnecte' });
  }, []);

  const aRole = useCallback(
    (role: Role) => {
      if (etat.statut !== 'connecte') return false;
      return etat.utilisateur.activeRole === role;
    },
    [etat],
  );

  const valeur = useMemo<ValeurAuth>(
    () => ({
      etat,
      utilisateur: etat.statut === 'connecte' ? etat.utilisateur : null,
      connecter,
      changerProfil,
      deconnecter,
      aRole,
    }),
    [etat, connecter, changerProfil, deconnecter, aRole],
  );

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

export function useAuth(): ValeurAuth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
