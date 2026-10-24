import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { ReactNode } from 'react';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { etat } = useAuth();
  const localisation = useLocation();

  if (etat.statut === 'chargement') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div
          className="h-10 w-10 rounded-full border-4 border-enp-sky border-t-enp-primary animate-spin"
          aria-hidden="true"
        />
        <p className="mt-4 text-enp-ink-soft" role="status">
          Chargement de la session…
        </p>
      </div>
    );
  }

  if (etat.statut === 'deconnecte') {
    return <Navigate to="/connexion" replace state={{ from: localisation }} />;
  }

  return <>{children}</>;
}
