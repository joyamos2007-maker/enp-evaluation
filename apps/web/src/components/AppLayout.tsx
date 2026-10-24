import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, GraduationCap } from 'lucide-react';
import * as Lucide from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { entreesPourRoles, LIBELLES_ROLES } from './menuConfig';
import { MockBanner } from './MockBanner';

type IconeLucide = Lucide.LucideIcon;

function iconePour(nom: string): IconeLucide {
  const c = (Lucide as unknown as Record<string, IconeLucide>)[nom];
  return c ?? Lucide.Circle;
}

export function AppLayout() {
  const { utilisateur, deconnecter, changerProfil } = useAuth();
  const navigate = useNavigate();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [erreurProfil, setErreurProfil] = useState<string | null>(null);

  if (!utilisateur) return null;

  const utilisateurActif = utilisateur;
  const entrees = entreesPourRoles([utilisateurActif.activeRole]);
  const rolesTexte = LIBELLES_ROLES[utilisateurActif.activeRole];

  async function handleDeconnexion() {
    await deconnecter();
    navigate('/connexion', { replace: true });
  }

  async function handleProfilChange(role: string) {
    const profil = utilisateurActif.roles.find((roleConnu) => roleConnu === role);
    if (!profil) return;
    setErreurProfil(null);
    try {
      await changerProfil(profil);
      navigate('/', { replace: true });
    } catch {
      setErreurProfil('Impossible de changer de profil. Réessayez.');
    }
  }

  function closeMenu() {
    setMenuOuvert(false);
  }

  const contenuMenu = (
    <nav aria-label="Navigation principale" className="px-3 py-4 space-y-1">
      <NavLink
        to="/"
        end
        onClick={closeMenu}
        className={({ isActive }) => classeLien(isActive)}
      >
        <Lucide.Home size={20} aria-hidden="true" />
        <span>Accueil</span>
      </NavLink>
      {entrees.map((e) => {
        const Icone = iconePour(e.icone);
        return (
          <NavLink
            key={e.chemin}
            to={e.chemin}
            end
            onClick={closeMenu}
            className={({ isActive }) => classeLien(isActive)}
          >
            <Icone size={20} aria-hidden="true" />
            <span>{e.libelle}</span>
          </NavLink>
        );
      })}
      <NavLink
        to="/securite"
        end
        onClick={closeMenu}
        className={({ isActive }) => classeLien(isActive)}
      >
        <Lucide.ShieldCheck size={20} aria-hidden="true" />
        <span>Sécurité du compte</span>
      </NavLink>
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MockBanner />

      {/* En-tête premium */}
      <header className="bg-enp-teal-dark text-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 -ml-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOuvert}
              aria-controls="menu-mobile"
              onClick={() => setMenuOuvert((v) => !v)}
            >
              {menuOuvert ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-enp-primary flex items-center justify-center">
                <GraduationCap size={22} className="text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold leading-tight truncate tracking-tight">
                  ENP — Évaluation des enseignements
                </h1>
                <p className="text-xs text-slate-400 truncate hidden sm:block">
                  École Nationale Polytechnique
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {utilisateurActif.roles.length > 1 && (
              <label className="sr-only" htmlFor="profil-actif">Profil actif</label>
            )}
            {utilisateurActif.roles.length > 1 && (
              <select
                id="profil-actif"
                value={utilisateurActif.activeRole}
                onChange={(event) => void handleProfilChange(event.target.value)}
                className="max-w-36 rounded-lg bg-white/10 border border-white/20 px-2 py-2 text-xs text-white"
                aria-label="Choisir le profil actif"
              >
                {utilisateurActif.roles.map((role) => (
                  <option key={role} value={role} className="text-enp-ink">
                    {LIBELLES_ROLES[role]}
                  </option>
                ))}
              </select>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-tight">
                {utilisateurActif.prenom} {utilisateurActif.nom}
              </p>
              <p className="text-xs text-slate-400 leading-tight">
                {rolesTexte}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-enp-violet/20 border border-yellow-400 flex items-center justify-center text-sm font-bold text-enp-violet-light shrink-0">
              {utilisateurActif.prenom.charAt(0)}{utilisateurActif.nom.charAt(0)}
            </div>
            <button
              type="button"
              onClick={handleDeconnexion}
              className="inline-flex items-center gap-2 bg-enp-bordeaux hover:bg-enp-bordeaux/90 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors min-h-[44px]"
              aria-label="Se déconnecter"
            >
              <LogOut size={18} aria-hidden="true" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>
      {erreurProfil && (
        <div className="bg-red-50 text-red-800 px-4 py-2 text-sm" role="alert">
          {erreurProfil}
        </div>
      )}

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Barre latérale — ordinateur */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-enp-border bg-white scrollbar-thin">
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Navigation</p>
          </div>
          {contenuMenu}
          <div className="px-5 pt-2 pb-5 mt-2 border-t border-enp-border">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <GraduationCap size={16} aria-hidden="true" />
              <span>Plateforme ENP v2.0</span>
            </div>
          </div>
        </aside>

        {/* Menu mobile — panneau coulissant */}
        {menuOuvert && (
          <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-enp-ink/50 backdrop-blur-sm animate-fade-in"
              onClick={closeMenu}
              aria-hidden="true"
            />
            <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[80vw] bg-white shadow-elevated overflow-y-auto animate-slide-up">
              <div className="h-16 bg-enp-teal-dark text-white flex items-center px-4 gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-enp-primary flex items-center justify-center">
                  <GraduationCap size={20} className="text-white" aria-hidden="true" />
                </div>
                <span className="font-semibold text-sm">ENP — Menu</span>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="ml-auto p-2 -mr-2 rounded-lg hover:bg-white/10"
                  aria-label="Fermer le menu"
                >
                  <X size={22} />
                </button>
              </div>
              <div className="px-4 py-3 border-b border-enp-border">
                <p className="text-sm font-semibold text-enp-ink">
                  {utilisateurActif.prenom} {utilisateurActif.nom}
                </p>
                <p className="text-xs text-enp-ink-soft">{rolesTexte}</p>
              </div>
              {contenuMenu}
            </div>
          </div>
        )}

        {/* Zone de contenu */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 sm:py-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function classeLien(actif: boolean): string {
  const base =
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] group';
  return actif
    ? `${base} bg-enp-primary text-white shadow-sm`
    : `${base} text-enp-ink-soft hover:bg-enp-sky hover:text-enp-ink`;
}
