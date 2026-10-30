import { useEffect, useState, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LogOut,
  Menu,
  X,
  Bell,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import * as Lucide from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { entreesPourRoles, LIBELLES_ROLES, type EntreeMenu } from './menuConfig';
import { MockBanner } from './MockBanner';
import { ENPLogo } from './ENPLogo';
import { api } from '@/api';
import type { Notification, Role } from '@/api/types';

type IconeLucide = Lucide.LucideIcon;

function iconePour(nom: string): IconeLucide {
  const c = (Lucide as unknown as Record<string, IconeLucide>)[nom];
  return c ?? Lucide.Circle;
}

interface TabMobile {
  chemin: string;
  libelle: string;
  icone: IconeLucide;
  exact?: boolean;
}

function getTabsMobile(role: Role): TabMobile[] {
  switch (role) {
    case 'etudiant':
      return [
        { chemin: '/', libelle: 'Accueil', icone: Lucide.Home, exact: true },
        { chemin: '/evaluations', libelle: 'Évaluations', icone: Lucide.ClipboardCheck },
        { chemin: '/cahier-texte', libelle: 'Cahier', icone: Lucide.BookOpen },
        { chemin: '/mes-notes', libelle: 'Notes', icone: Lucide.GraduationCap },
      ];
    case 'delegue':
      return [
        { chemin: '/', libelle: 'Accueil', icone: Lucide.Home, exact: true },
        { chemin: '/cahier-texte', libelle: 'Cahier', icone: Lucide.BookOpen },
        { chemin: '/evaluations', libelle: 'Évaluations', icone: Lucide.ClipboardCheck },
        { chemin: '/participation', libelle: 'Participation', icone: Lucide.Users },
      ];
    case 'enseignant':
      return [
        { chemin: '/', libelle: 'Accueil', icone: Lucide.Home, exact: true },
        { chemin: '/visas', libelle: 'Visas', icone: Lucide.Stamp },
        { chemin: '/cahier-texte', libelle: 'Cahier', icone: Lucide.BookOpen },
        { chemin: '/resultats', libelle: 'Résultats', icone: Lucide.BarChart3 },
      ];
    case 'chef_departement':
      return [
        { chemin: '/', libelle: 'Accueil', icone: Lucide.Home, exact: true },
        { chemin: '/synthese', libelle: 'Synthèse', icone: Lucide.LineChart },
        { chemin: '/participation', libelle: 'Participation', icone: Lucide.Users },
        { chemin: '/resultats', libelle: 'Résultats', icone: Lucide.BarChart3 },
      ];
    case 'scolarite':
      return [
        { chemin: '/', libelle: 'Accueil', icone: Lucide.Home, exact: true },
        { chemin: '/scolarite/campagnes', libelle: 'Campagnes', icone: Lucide.Megaphone },
        { chemin: '/scolarite/comptes', libelle: 'Comptes', icone: Lucide.UserCog },
        { chemin: '/scolarite/moderation', libelle: 'Modération', icone: Lucide.ShieldCheck },
      ];
    case 'direction_etudes':
      return [
        { chemin: '/', libelle: 'Accueil', icone: Lucide.Home, exact: true },
        { chemin: '/direction/statistiques', libelle: 'Stats', icone: Lucide.Globe2 },
        { chemin: '/direction/controles', libelle: 'Contrôles', icone: Lucide.Sliders },
        { chemin: '/administration', libelle: 'Gestion', icone: Lucide.Building2 },
      ];
    case 'admin':
      return [
        { chemin: '/', libelle: 'Accueil', icone: Lucide.Home, exact: true },
        { chemin: '/administration', libelle: 'Gestion', icone: Lucide.Building2 },
        { chemin: '/journal-audit', libelle: 'Audit', icone: Lucide.ScrollText },
        { chemin: '/securite', libelle: 'Sécurité', icone: Lucide.ShieldCheck },
      ];
    default:
      return [
        { chemin: '/', libelle: 'Accueil', icone: Lucide.Home, exact: true },
        { chemin: '/notifications', libelle: 'Notifs', icone: Lucide.Bell },
        { chemin: '/securite', libelle: 'Sécurité', icone: Lucide.ShieldCheck },
      ];
  }
}

export function AppLayout() {
  const { utilisateur, deconnecter, changerProfil } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);
  const [erreurProfil, setErreurProfil] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [menuProfilOuvert, setMenuProfilOuvert] = useState(false);

  // Charger les notifications pour le badge compteur
  useEffect(() => {
    let actif = true;
    async function chargerNotifs() {
      if (!utilisateur) return;
      try {
        const notifs = await api.notifications();
        if (actif) setNotifications(notifs);
      } catch {
        // En cas d'erreur de notif, on ne bloque pas l'UI
      }
    }
    void chargerNotifs();
    return () => {
      actif = false;
    };
  }, [utilisateur, location.pathname]);

  const nonLuesCount = useMemo(() => {
    return notifications.filter((n) => !n.luLe).length;
  }, [notifications]);

  const tabsMobile = useMemo(() => {
    if (!utilisateur) return [];
    return getTabsMobile(utilisateur.activeRole);
  }, [utilisateur]);

  if (!utilisateur) return null;

  const entrees = entreesPourRoles([utilisateur.activeRole]);
  const roleActifLibelle = LIBELLES_ROLES[utilisateur.activeRole] ?? utilisateur.activeRole;

  // Regroupement par section métier
  const sectionsGroupes = useMemo(() => {
    const map = new Map<string, EntreeMenu[]>();
    for (const entree of entrees) {
      const section = entree.section || 'Général';
      if (!map.has(section)) {
        map.set(section, []);
      }
      map.get(section)!.push(entree);
    }
    return Array.from(map.entries());
  }, [entrees]);

  async function handleDeconnexion() {
    await deconnecter();
    navigate('/connexion', { replace: true });
  }

  async function handleChangementRole(role: Role) {
    if (role === utilisateur?.activeRole) return;
    setErreurProfil(null);
    setMenuProfilOuvert(false);
    setMenuMobileOuvert(false);
    try {
      await changerProfil(role);
      navigate('/', { replace: true });
    } catch {
      setErreurProfil('Le basculement de profil a échoué. Veuillez réessayer.');
    }
  }

  function fermerMenuMobile() {
    setMenuMobileOuvert(false);
  }

  const navigationContenu = (
    <div className="py-2 space-y-4">
      {/* Lien Accueil persistant */}
      <div className="px-3">
        <NavLink
          to="/"
          end
          onClick={fermerMenuMobile}
          className={({ isActive }) => classeLienNavigation(isActive)}
        >
          <Lucide.Home className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="font-medium">Tableau de bord</span>
        </NavLink>
      </div>

      {/* Groupes de menus par espace métier */}
      {sectionsGroupes.map(([titreSection, items]) => (
        <div key={titreSection} className="space-y-1">
          <div className="px-4 py-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-enp-gray-medium">
              {titreSection}
            </p>
          </div>
          <div className="px-3 space-y-0.5">
            {items.map((item) => {
              const Icone = iconePour(item.icone);
              return (
                <NavLink
                  key={item.chemin}
                  to={item.chemin}
                  end={item.chemin === '/cahier-texte' || item.chemin === '/scolarite'}
                  onClick={fermerMenuMobile}
                  className={({ isActive }) => classeLienNavigation(isActive)}
                >
                  <Icone className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.libelle}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}

      {/* Espace Compte & Sécurité */}
      <div className="space-y-1 pt-2 border-t border-enp-border">
        <div className="px-4 py-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-enp-gray-medium">
            Sécurité & Compte
          </p>
        </div>
        <div className="px-3 space-y-0.5">
          <NavLink
            to="/notifications"
            onClick={fermerMenuMobile}
            className={({ isActive }) => classeLienNavigation(isActive)}
          >
            <div className="relative">
              <Bell className="w-4 h-4 shrink-0" aria-hidden="true" />
              {nonLuesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-enp-red-error rounded-full" />
              )}
            </div>
            <span className="flex-1 truncate">Notifications</span>
            {nonLuesCount > 0 && (
              <span className="px-1.5 py-0.2 bg-enp-red-error text-white text-[10px] font-bold">
                {nonLuesCount}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/securite"
            onClick={fermerMenuMobile}
            className={({ isActive }) => classeLienNavigation(isActive)}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Sécurité & MFA</span>
          </NavLink>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-enp-bg text-enp-black font-sans antialiased w-full max-w-full overflow-x-hidden">
      {/* Bannière conditionnelle du mode de démonstration (VITE_USE_MOCK=true) */}
      <MockBanner />

      {/* ======================================================== */}
      {/* 1. BARRE SUPÉRIEURE OFFICIELLE INSTITUTIONNELLE            */}
      {/* ======================================================== */}
      <header className="bg-enp-blue-deep text-white sticky top-0 z-40 border-b border-[#00172E] shadow-subtle w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          {/* Côté gauche : Bascule mobile + Logo ENP */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 -ml-1 text-white hover:bg-white/10 border border-transparent focus:outline-none focus:border-white/40 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={menuMobileOuvert ? 'Fermer la navigation' : 'Ouvrir la navigation'}
              aria-expanded={menuMobileOuvert}
              aria-controls="navigation-mobile"
              onClick={() => setMenuMobileOuvert((prev) => !prev)}
            >
              {menuMobileOuvert ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <Link
              to="/"
              className="flex items-center gap-2 sm:gap-3 focus:outline-none focus:ring-1 focus:ring-white/40 py-1"
              title="Retour au tableau de bord institutionnel"
            >
              <ENPLogo variant="light" size="sm" showSubtitle={true} showArmoiries={false} />
            </Link>
          </div>

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
                  <span className="hidden md:inline text-enp-gold font-medium">Profil :</span>
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
            )}

            {/* Identité de l'agent / étudiant connecté */}
            <div className="hidden md:flex flex-col items-end text-right">
              <span className="text-xs font-bold leading-tight tracking-tight text-white">
                {utilisateur.prenom} {utilisateur.nom}
              </span>
              <span className="text-[11px] text-[#A6C4DE] leading-tight flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-enp-green-valid rounded-full inline-block" />
                {roleActifLibelle}
              </span>
            </div>

            {/* Bouton Déconnexion institutionnel */}
            <button
              type="button"
              onClick={handleDeconnexion}
              className="inline-flex items-center gap-1.5 bg-enp-red-error hover:bg-enp-red-inst text-white text-xs font-semibold px-2.5 sm:px-3 py-1.5 border border-transparent shadow-subtle transition-colors min-h-[38px]"
              aria-label="Se déconnecter de la plateforme"
              title="Déconnexion sécurisée"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden md:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Message d'erreur de changement de profil si incident */}
      {erreurProfil && (
        <div className="bg-enp-red-light border-b border-enp-red-error text-enp-red-inst px-4 py-2 text-xs font-medium" role="alert">
          {erreurProfil}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ZONE PRINCIPALE : SIDEBAR + CONTENU                   */}
      {/* ======================================================== */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full min-w-0">
        {/* Navigation latérale Desktop */}
        <aside
          aria-label="Menu institutionnel"
          className="hidden lg:block w-64 shrink-0 border-r border-enp-border bg-white min-h-[calc(100vh-4rem-120px)] scrollbar-thin overflow-y-auto"
        >
          <div className="p-4 border-b border-enp-border bg-enp-blue-ice/50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-enp-blue-deep">
              Portail Officiel ENP
            </p>
            <p className="text-xs text-enp-gray-medium mt-0.5">
              Année 2026-2027 • Semestre actif
            </p>
          </div>
          {navigationContenu}
        </aside>

        {/* Navigation Mobile escamotable (Drawer) */}
        {menuMobileOuvert && (
          <div
            id="navigation-mobile"
            className="lg:hidden fixed inset-0 z-50 flex"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop avec flou sobre */}
            <div
              className="fixed inset-0 bg-[#00172E]/75 backdrop-blur-xs transition-opacity animate-fade-in"
              aria-hidden="true"
              onClick={fermerMenuMobile}
            />
            <div className="relative w-80 max-w-[85vw] bg-white border-r border-enp-border shadow-elevated flex flex-col h-full overflow-hidden animate-slide-up">
              {/* En-tête tiroir mobile */}
              <div className="h-16 bg-enp-blue-deep text-white px-4 flex items-center justify-between shrink-0 border-b border-[#00172E]">
                <ENPLogo variant="light" size="sm" showSubtitle={false} />
                <button
                  type="button"
                  onClick={fermerMenuMobile}
                  className="p-2 hover:bg-white/10 text-white min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none"
                  aria-label="Fermer le menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

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
                    <p className="text-[11px] text-enp-gray-medium truncate">
                      {utilisateur.email ?? utilisateur.identifiant}
                    </p>
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
              </div>
            </div>
          </div>
        )}

        {/* Zone de contenu principale de l'application */}
        <main
          id="contenu-principal"
          tabIndex={-1}
          className="flex-1 min-w-0 max-w-full p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-x-hidden"
        >
          <Outlet />
        </main>
      </div>

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
                  <span className="font-bold text-[11px] tracking-wider text-enp-gold uppercase">
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
                © {new Date().getFullYear()} ENP. Tous droits réservés.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function classeLienNavigation(actif: boolean): string {
  const base =
    'flex items-center gap-3 px-3 py-2 text-xs sm:text-sm font-medium transition-colors border-l-4 select-none min-h-[38px]';
  return actif
    ? `${base} bg-enp-blue-light text-enp-blue-deep font-bold border-l-enp-blue-primary shadow-subtle`
    : `${base} text-enp-black hover:bg-enp-blue-ice hover:text-enp-blue-deep border-l-transparent`;
}
