import { Link } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { entreesPourRoles, LIBELLES_ROLES } from '@/components/menuConfig';
import type { LucideIcon } from 'lucide-react';

type IconeLucide = LucideIcon;

function iconePour(nom: string): IconeLucide {
  const c = (Lucide as unknown as Record<string, IconeLucide>)[nom];
  return c ?? Lucide.Circle;
}

export function Accueil() {
  const { utilisateur } = useAuth();
  if (!utilisateur) return null;

  const entrees = entreesPourRoles([utilisateur.activeRole]);
  const rolesTexte = LIBELLES_ROLES[utilisateur.activeRole];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="bg-gradient-to-br from-enp-teal-dark via-enp-teal-dark to-enp-primary rounded-none p-6 sm:p-8 text-center text-white shadow-card">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Bonjour, {utilisateur.prenom} {utilisateur.nom}
        </h1>
        <p className="text-sm text-slate-300 mt-2">
          {rolesTexte} — École Nationale Polytechnique
        </p>
      </div>

      {/* Accès rapide */}
      <div>
        <h2 className="text-lg font-semibold text-enp-ink mb-4">Accès rapide</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entrees.map((e) => {
            const Icone = iconePour(e.icone);
            return (
              <Link
                key={e.chemin}
                to={e.chemin}
                className="group flex items-center gap-4 bg-white border border-enp-border rounded-xl p-4 hover:shadow-card-hover hover:border-enp-primary/30 transition-all min-h-[72px] animate-slide-up"
              >
                <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg bg-enp-primary text-white group-hover:bg-enp-primary-dark transition-colors">
                  <Icone size={22} aria-hidden="true" />
                </span>
                <span className="text-enp-ink font-medium group-hover:text-enp-primary transition-colors">
                  {e.libelle}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
