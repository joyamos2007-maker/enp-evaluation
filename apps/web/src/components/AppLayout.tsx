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

<<<<<<< Updated upstream
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {utilisateurActif.roles.length > 1 && (
              <label className="sr-only" htmlFor="profil-actif">Profil actif</label>
=======
          {/* Côté droit : Profil actif, notifications, sélecteur et déconnexion */}
          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
            {/* Centre de notifications */}
            <Link
              to="/notifications"
              className="relative p-2 text-white/90 hover:text-white hover:bg-white/10 transition-colors border border-transparent focus:outline-none focus:border-white/40 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={`Centre de notifications (${nonLuesCount} non lues)`}
              title="Centre de notifications"
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
              {nonLuesCount > 0 && (
                <span className="absolute top-2 right-2 px-1 min-w-[16px] h-4 bg-enp-red-error text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {nonLuesCount > 9 ? '9+' : nonLuesCount}
                </span>
              )}
            </Link>

            {/* Sélecteur de profil actif (Desktop & Tablette) */}
            {utilisateur.roles.length > 1 && (
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setMenuProfilOuvert((v) => !v)}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-[#00172E] hover:bg-[#073056] border border-white/20 text-xs text-white transition-colors"
                  aria-expanded={menuProfilOuvert}
                  aria-label="Changer de profil actif"
                >
                  <span className="hidden md:inline text-enp-violet font-medium">Profil :</span>
                  <span className="font-semibold truncate max-w-[120px]">
                    {roleActifLibelle}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                </button>

                {menuProfilOuvert && (
                  <div
                    className="absolute right-0 mt-1 w-52 bg-white text-enp-black border border-enp-border shadow-modal z-50 py-1"
                    role="menu"
                  >
                    <div className="px-3 py-1.5 border-b border-enp-border bg-enp-blue-ice">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-enp-blue-deep">
                        Basculer vers un profil
                      </p>
                    </div>
                    {utilisateur.roles.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="menuitem"
                        onClick={() => void handleChangementRole(r)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-enp-blue-light transition-colors ${
                          utilisateur.activeRole === r
                            ? 'bg-enp-blue-ice font-bold text-enp-blue-primary'
                            : 'text-enp-black'
                        }`}
                      >
                        <span>{LIBELLES_ROLES[r]}</span>
                        {utilisateur.activeRole === r && (
                          <span className="w-1.5 h-1.5 bg-enp-blue-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
              <div className="px-4 py-3 border-b border-enp-border">
                <p className="text-sm font-semibold text-enp-ink">
                  {utilisateurActif.prenom} {utilisateurActif.nom}
                </p>
                <p className="text-xs text-enp-ink-soft">{rolesTexte}</p>
=======

              {/* Fiche Profil Utilisateur dans le tiroir mobile */}
              <div className="p-4 bg-enp-blue-ice border-b border-enp-border shrink-0 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-enp-blue-deep text-white font-bold text-sm flex items-center justify-center shrink-0 border border-[#00172E]">
                    {utilisateur.prenom?.[0] ?? ''}{utilisateur.nom?.[0] ?? ''}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-enp-blue-deep truncate">
                      {utilisateur.prenom} {utilisateur.nom}
                    </p>
                    {(utilisateur.email || utilisateur.identifiant) && (
                      <p className="text-[11px] text-enp-gray-medium truncate">
                        {utilisateur.email ?? utilisateur.identifiant}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-enp-border/70 text-xs">
                  <span className="text-enp-gray-medium font-medium">Rôle actif :</span>
                  <span className="font-bold text-enp-blue-deep px-2 py-0.5 bg-white border border-enp-border">
                    {roleActifLibelle}
                  </span>
                </div>

                {/* Sélecteur de profil tactile pour comptes multi-rôles */}
                {utilisateur.roles.length > 1 && (
                  <div className="pt-2 border-t border-enp-border/70 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-enp-gray-medium">
                      Basculer de profil actif
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {utilisateur.roles.map((r) => {
                        const estActif = utilisateur.activeRole === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => void handleChangementRole(r)}
                            className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold flex items-center justify-between border transition-colors min-h-[36px] ${
                              estActif
                                ? 'bg-enp-blue-deep text-white border-enp-blue-deep'
                                : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-light'
                            }`}
                          >
                            <span>{LIBELLES_ROLES[r]}</span>
                            {estActif ? (
                              <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.2 text-white">
                                Actif
                              </span>
                            ) : (
                              <span className="text-[10px] text-enp-gray-medium">Sélectionner</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation des espaces métiers */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {navigationContenu}
              </div>

              {/* Pied du tiroir mobile : Déconnexion rapide */}
              <div className="p-3 bg-enp-bg border-t border-enp-border shrink-0">
                <button
                  type="button"
                  onClick={handleDeconnexion}
                  className="w-full py-2.5 px-3 bg-enp-red-error hover:bg-enp-red-inst text-white text-xs font-bold flex items-center justify-center gap-2 border border-transparent shadow-subtle min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Déconnexion sécurisée</span>
                </button>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======

      {/* ======================================================== */}
      {/* 3. DOCK / BARRE DE NAVIGATION MOBILE FIXE EN BAS         */}
      {/* ======================================================== */}
      <nav
        aria-label="Navigation mobile principale"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-enp-border shadow-elevated flex items-stretch justify-around h-15 w-full max-w-full overflow-hidden"
      >
        {tabsMobile.map((tab) => (
          <NavLink
            key={tab.chemin}
            to={tab.chemin}
            end={tab.exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1.5 px-1 text-center transition-colors select-none min-h-[56px] ${
                isActive
                  ? 'text-enp-blue-deep font-bold border-t-2 border-enp-blue-primary bg-enp-blue-light/50'
                  : 'text-enp-gray-medium hover:text-enp-black border-t-2 border-transparent'
              }`
            }
          >
            <tab.icone className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="text-[10px] tracking-tight truncate max-w-[64px] mt-0.5">
              {tab.libelle}
            </span>
          </NavLink>
        ))}

        {/* Onglet Menu pour déplier le tiroir complet */}
        <button
          type="button"
          onClick={() => setMenuMobileOuvert(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 text-center transition-colors select-none min-h-[56px] relative ${
            menuMobileOuvert
              ? 'text-enp-blue-deep font-bold border-t-2 border-enp-blue-primary bg-enp-blue-light/50'
              : 'text-enp-gray-medium hover:text-enp-black border-t-2 border-transparent'
          }`}
          aria-label="Ouvrir le menu complet"
        >
          <div className="relative">
            <Menu className="w-5 h-5 shrink-0" aria-hidden="true" />
            {nonLuesCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-enp-red-error rounded-full" />
            )}
          </div>
          <span className="text-[10px] tracking-tight truncate max-w-[64px] mt-0.5">
            Menu
          </span>
        </button>
      </nav>

      {/* ======================================================== */}
      {/* 4. FOOTER INSTITUTIONNEL SOLEMNE ET ÉPURÉ                 */}
      {/* ======================================================== */}
      <footer className="bg-[#00172E] text-white border-t-2 border-enp-teal mt-auto mb-14 lg:mb-0 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Côté gauche : Armoiries officielles de la République Togolaise & Identité ENP */}
            <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
              <img
                src="/armoiries-togo.svg"
                alt="Armoiries de la République Togolaise"
                className="h-10 w-auto object-contain shrink-0"
              />
              <div className="border-l border-white/15 pl-3 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-bold text-[11px] tracking-wider text-enp-red-inst uppercase">
                    RÉPUBLIQUE TOGOLAISE
                  </span>
                  <span className="text-white/30 text-xs">•</span>
                  <span className="text-[10px] sm:text-[11px] text-slate-300 italic">Travail, Liberté, Patrie</span>
                </div>
                <p className="text-xs font-semibold text-white tracking-wide mt-0.5 truncate">
                  École Nationale Polytechnique (ENP)
                </p>
              </div>
            </div>

            {/* Côté droit : Liens essentiels & Copyright sobre */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-1.5 text-xs text-slate-300 w-full md:w-auto">
              <Link to="/securite" className="hover:text-white transition-colors">
                Sécurité & MFA
              </Link>
              <span className="text-white/20">|</span>
              <Link to="/notifications" className="hover:text-white transition-colors">
                Notifications
              </Link>
              <span className="text-white/20">|</span>
              <span className="text-[11px] text-slate-400">
                © {new Date().getFullYear()} Pr Adekunle Akim SALAMI, Joy Amos KOUDASSE et Bienvenu OHONSSOU.
              </span>
            </div>
          </div>
        </div>
      </footer>
>>>>>>> Stashed changes
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
