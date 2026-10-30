import { Link } from 'react-router-dom';
import {
  Shield,
  KeyRound,
  Mail,
  Building,
  Calendar,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { LIBELLES_ROLES } from '@/components/menuConfig';
import {
  PageHeader,
  Button,
  RoleBadge,
  Badge,
} from '@/components/ui';

export function Profil() {
  const { utilisateur, changerProfil, deconnecter } = useAuth();

  if (!utilisateur) {
    return null;
  }

  const roleActif = utilisateur.activeRole;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil usager & Paramètres du compte"
        subtitle="Informations d'identité institutionnelle, gestion des rôles et sécurité de l'accès."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Mon profil' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<LogOut className="w-3.5 h-3.5 text-enp-red-dark" />}
            onClick={() => void deconnecter()}
          >
            Se déconnecter
          </Button>
        }
      />

      {/* Carte d'identité institutionnelle */}
      <div className="bg-white border border-enp-border shadow-sm overflow-hidden">
        <div className="bg-enp-blue-deep text-white p-6 border-b border-[#00172E]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 border-2 border-enp-gold/50 flex items-center justify-center font-serif text-2xl font-bold text-white">
                {utilisateur.prenom.charAt(0)}
                {utilisateur.nom.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold font-serif">
                  {utilisateur.prenom} {utilisateur.nom}
                </h2>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  Identifiant officiel : #{utilisateur.id}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="success">Compte Actif</Badge>
                  <span className="text-xs text-slate-300">
                    École Nationale Polytechnique (ENP)
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-300 block">Rôle actif en session :</span>
              <span className="text-sm font-bold text-white font-serif bg-white/10 px-3 py-1 mt-1 inline-block border border-white/20">
                {LIBELLES_ROLES[roleActif] ?? roleActif}
              </span>
            </div>
          </div>
        </div>

        {/* Détails du compte */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-enp-blue-deep uppercase tracking-wider font-serif pb-2 border-b border-enp-border">
              Coordonnées institutionnelles
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-enp-border/60">
                <span className="text-enp-gray-medium text-xs flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Domaine académique
                </span>
                <span className="font-mono text-xs font-semibold text-enp-black">
                  @{utilisateur.nom.toLowerCase()}.enp.tg
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-enp-border/60">
                <span className="text-enp-gray-medium text-xs flex items-center gap-2">
                  <Building className="w-4 h-4" /> Campus de rattachement
                </span>
                <span className="text-xs font-semibold text-enp-black">
                  Campus Principal, Lomé
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-enp-border/60">
                <span className="text-enp-gray-medium text-xs flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Année académique
                </span>
                <span className="font-mono text-xs font-semibold text-enp-black">
                  2025-2026
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-enp-blue-deep uppercase tracking-wider font-serif pb-2 border-b border-enp-border">
              Rôles et privilèges accordés
            </h3>

            <div className="space-y-2">
              <p className="text-xs text-enp-gray-medium">
                Votre profil possède les prérogatives suivantes au sein du système académique :
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {utilisateur.roles.map((r) => (
                  <div
                    key={r}
                    className={`p-2.5 border text-xs flex items-center justify-between gap-3 w-full sm:w-auto sm:flex-1 min-w-0 sm:min-w-[200px] ${
                      r === roleActif
                        ? 'border-enp-blue-primary bg-enp-blue-ice/50 font-bold text-enp-blue-deep'
                        : 'border-enp-border bg-white text-enp-black'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <RoleBadge role={r} />
                      <span>{LIBELLES_ROLES[r]}</span>
                    </div>
                    {r !== roleActif ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => void changerProfil(r)}
                      >
                        Basculer
                      </Button>
                    ) : (
                      <span className="text-[10px] text-enp-blue-primary font-bold uppercase tracking-wider">
                        Actif
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Espace Sécurité & Double Facteur */}
      <div className="bg-white border border-enp-border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-enp-blue-primary" />
            <h3 className="text-base font-bold text-enp-blue-deep font-serif">
              Sécurité du compte & Authentification à double facteur (MFA)
            </h3>
          </div>
          <p className="text-xs text-enp-gray-medium max-w-2xl leading-relaxed">
            Pour protéger vos délibérations, vos évaluations et vos notes, configurez l'application TOTP
            ou mettez à jour votre mot de passe de connexion.
          </p>
        </div>

        <Link to="/securite">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<KeyRound className="w-3.5 h-3.5" />}
            rightIcon={<ExternalLink className="w-3 h-3" />}
          >
            Paramètres de sécurité
          </Button>
        </Link>
      </div>
    </div>
  );
}
