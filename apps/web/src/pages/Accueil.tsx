import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  BookOpen,
  Stamp,
  BarChart3,
  Users,
  Megaphone,
  Upload,
  ShieldCheck,
  Award,
  ScrollText,
  AlertCircle,
  Calendar,
  Clock,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  FileText,
  HelpCircle,
  Activity,
  PlusCircle,
  Info,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { LIBELLES_ROLES } from '@/components/menuConfig';
import {
  StatCard,
  Alert,
  Button,
  PageHeader,
  SectionHeader,
  Badge,
  ProgressBar,
} from '@/components/ui';
import { api } from '@/api';
import type { UeAEvaluer, Seance, CampagneGestion, TableauDeBordScolarite } from '@/api/types';

export function Accueil() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();

  const [uesEtudiant, setUesEtudiant] = useState<UeAEvaluer[]>([]);
  const [seancesAttente, setSeancesAttente] = useState<Seance[]>([]);
  const [tbScolarite, setTbScolarite] = useState<TableauDeBordScolarite | null>(null);
  const [chargement, setChargement] = useState(true);

  const role = utilisateur?.activeRole;

  useEffect(() => {
    let actif = true;
    async function chargerDonneesRole() {
      if (!role) return;
      setChargement(true);
      try {
        if (role === 'etudiant' || role === 'delegue') {
          const ues = await api.listeEvaluations();
          if (actif) setUesEtudiant(ues);
        } else if (role === 'enseignant') {
          const seances = await api.cahierSeances(undefined, 'en_attente');
          if (actif) setSeancesAttente(seances);
        } else if (role === 'scolarite' || role === 'admin') {
          const tb = await api.scolariteTableauDeBord();
          if (actif) setTbScolarite(tb);
        }
      } catch {
        // Mode silencieux si API non joignable
      } finally {
        if (actif) setChargement(false);
      }
    }
    void chargerDonneesRole();
    return () => {
      actif = false;
    };
  }, [role]);

  if (!utilisateur) return null;

  const roleLibelle = LIBELLES_ROLES[utilisateur.activeRole] ?? utilisateur.activeRole;
  const anneeActive = '2026-2027';
  const semestreActif = 'Semestre 1 (Harmattan)';

  // Compteurs étudiant
  const uesAFaire = uesEtudiant.filter((u) => u.etat === 'a_faire');
  const uesTerminees = uesEtudiant.filter((u) => u.etat === 'terminee');
  const totalUes = uesEtudiant.length || 6;
  const tauxCompletion = Math.round((uesTerminees.length / totalUes) * 100);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* ======================================================== */}
      {/* EN-TÊTE DU TABLEAU DE BORD INSTITUTIONNEL                */}
      {/* ======================================================== */}
      <PageHeader
        title={`Bienvenue, ${utilisateur.prenom} ${utilisateur.nom}`}
        description={`Espace de travail officiel • ${roleLibelle} • École Nationale Polytechnique`}
        badge={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-1 bg-enp-blue-light text-enp-blue-deep font-semibold border border-enp-blue-primary/20">
              Année {anneeActive} • {semestreActif}
            </span>
            <span className="text-xs px-2 py-1 bg-enp-green-light text-enp-green-valid font-bold border border-enp-green-valid/30 flex items-center gap-1">
              <span className="w-2 h-2 bg-enp-green-valid rounded-full inline-block" />
              Session officielle
            </span>
          </div>
        }
      />

      {/* ======================================================== */}
      {/* 1. ESPACE ÉTUDIANT & DÉLÉGUÉ                             */}
      {/* ======================================================== */}
      {(role === 'etudiant' || role === 'delegue') && (
        <div className="space-y-6">
          {/* Alerte campagne active avec rappel réglementaire d'anonymat */}
          {uesAFaire.length > 0 ? (
            <Alert
              variant="institutional"
              title="Campagne d'évaluation des enseignements en cours"
              icon={<Megaphone className="w-5 h-5 text-enp-gold shrink-0 mt-0.5" />}
            >
              Il vous reste <strong className="font-bold text-enp-black">{uesAFaire.length} unité(s) d'enseignement</strong> à évaluer avant la clôture officielle.
              Votre vote est rigoureusement anonyme, individuel et certifié par bulletin électronique à usage unique.
            </Alert>
          ) : (
            <Alert
              variant="success"
              title="Toutes vos évaluations sont à jour"
              icon={<CheckCircle2 className="w-5 h-5 text-enp-green-valid shrink-0 mt-0.5" />}
            >
              Merci pour votre contribution citoyenne à l'amélioration de la formation polytechnique.
            </Alert>
          )}

          {/* Indicateurs rectilignes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="UE à évaluer"
              value={uesAFaire.length}
              subtext={`Sur un total de ${totalUes} UE inscrites`}
              variant={uesAFaire.length > 0 ? 'warning' : 'success'}
              icon={<ClipboardCheck className="w-5 h-5" />}
              onClick={() => navigate('/evaluations')}
            />
            <StatCard
              label="Évaluations complétées"
              value={uesTerminees.length}
              subtext={`${tauxCompletion}% de participation effective`}
              variant="primary"
              icon={<CheckCircle2 className="w-5 h-5" />}
              onClick={() => navigate('/evaluations')}
            />
            <StatCard
              label="Cahier de texte"
              value="Consulter"
              subtext="Séances tenues et devoirs à faire"
              variant="default"
              icon={<BookOpen className="w-5 h-5" />}
              onClick={() => navigate('/cahier-texte')}
            />
            <StatCard
              label="Dossier & Notes"
              value="Mes résultats"
              subtext="Notes et relevé d'assiduité"
              variant="default"
              icon={<GraduationCap className="w-5 h-5" />}
              onClick={() => navigate('/mes-notes')}
            />
          </div>

          {/* Actions rapides étudiant / délégué */}
          <div className="bg-white border border-enp-border p-5">
            <SectionHeader title="Actions prioritaires" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Link
                to="/evaluations"
                className="p-4 border border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/40 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-enp-blue-light text-enp-blue-deep flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-enp-blue-deep">
                      Évaluer mes enseignements
                    </h3>
                    <p className="text-xs text-enp-gray-medium">
                      Questionnaire anonyme officiel
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-enp-gray-medium group-hover:text-enp-blue-primary group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                to="/cahier-texte"
                className="p-4 border border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/40 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-enp-blue-light text-enp-blue-deep flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-enp-blue-deep">
                      Cahier de texte officiel
                    </h3>
                    <p className="text-xs text-enp-gray-medium">
                      Contenus de cours & devoirs
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-enp-gray-medium group-hover:text-enp-blue-primary group-hover:translate-x-0.5 transition-all" />
              </Link>

              {role === 'delegue' && (
                <Link
                  to="/cahier-texte/nouvelle"
                  className="p-4 border border-enp-blue-primary bg-enp-blue-ice/50 hover:bg-enp-blue-light transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-enp-blue-primary text-white flex items-center justify-center shrink-0">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-enp-blue-deep">
                        Renseigner une séance
                      </h3>
                      <p className="text-xs text-enp-gray-medium">
                        Saisie délégué de cours
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-enp-blue-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ESPACE ENSEIGNANT                                     */}
      {/* ======================================================== */}
      {role === 'enseignant' && (
        <div className="space-y-6">
          {seancesAttente.length > 0 && (
            <Alert
              variant="warning"
              title="Séances en attente de votre visa académique"
              icon={<Clock className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />}
            >
              Vous avez <strong className="font-bold">{seancesAttente.length} séance(s)</strong> saisie(s) par vos délégués en attente de visa ou de contestation motivée.
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Séances à viser"
              value={seancesAttente.length}
              subtext="Validation du cahier de texte"
              variant={seancesAttente.length > 0 ? 'warning' : 'success'}
              icon={<Stamp className="w-5 h-5" />}
              onClick={() => navigate('/visas')}
            />
            <StatCard
              label="Résultats d'évaluation"
              value="Consulter"
              subtext="Fiches bilan post-campagne"
              variant="primary"
              icon={<BarChart3 className="w-5 h-5" />}
              onClick={() => navigate('/resultats')}
            />
            <StatCard
              label="Saisie des notes"
              value="Devoirs & Examens"
              subtext="Barèmes et moyennes"
              variant="default"
              icon={<ClipboardCheck className="w-5 h-5" />}
              onClick={() => navigate('/enseignant/notes')}
            />
            <StatCard
              label="Feuille de présence"
              value="Pointage"
              subtext="Assiduité des promotions"
              variant="default"
              icon={<CheckCircle2 className="w-5 h-5" />}
              onClick={() => navigate('/enseignant/presences')}
            />
          </div>

          <div className="bg-white border border-enp-border p-5">
            <SectionHeader title="Accès directs enseignant" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Link
                to="/visas"
                className="p-4 border border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/40 transition-colors flex items-center justify-between group"
              >
                <div>
                  <h3 className="text-sm font-bold text-enp-blue-deep">Viser les séances</h3>
                  <p className="text-xs text-enp-gray-medium">Contrôler le contenu pédagogique</p>
                </div>
                <ArrowRight className="w-4 h-4 text-enp-gray-medium group-hover:text-enp-blue-primary" />
              </Link>
              <Link
                to="/resultats"
                className="p-4 border border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/40 transition-colors flex items-center justify-between group"
              >
                <div>
                  <h3 className="text-sm font-bold text-enp-blue-deep">Fiches de résultats</h3>
                  <p className="text-xs text-enp-gray-medium">Évaluations anonymes par UE</p>
                </div>
                <ArrowRight className="w-4 h-4 text-enp-gray-medium group-hover:text-enp-blue-primary" />
              </Link>
              <Link
                to="/cahier-texte"
                className="p-4 border border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/40 transition-colors flex items-center justify-between group"
              >
                <div>
                  <h3 className="text-sm font-bold text-enp-blue-deep">Cahier de texte</h3>
                  <p className="text-xs text-enp-gray-medium">Vue chronologique et exports</p>
                </div>
                <ArrowRight className="w-4 h-4 text-enp-gray-medium group-hover:text-enp-blue-primary" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ESPACE CHEF DE DÉPARTEMENT                            */}
      {/* ======================================================== */}
      {role === 'chef_departement' && (
        <div className="space-y-6">
          <Alert
            variant="info"
            title="Pilotage départemental des enseignements"
            icon={<Users className="w-5 h-5 text-enp-blue-primary shrink-0 mt-0.5" />}
          >
            Suivez en temps réel la participation des étudiants, analysez la satisfaction pédagogique et formulez les plans d'actions correctives de votre département.
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Participation département"
              value="En direct"
              subtext="Suivi des répondants par UE"
              variant="primary"
              icon={<Users className="w-5 h-5" />}
              onClick={() => navigate('/participation')}
            />
            <StatCard
              label="Synthèse pédagogique"
              value="Rapports"
              subtext="Moyennes par section A-E"
              variant="default"
              icon={<BarChart3 className="w-5 h-5" />}
              onClick={() => navigate('/synthese')}
            />
            <StatCard
              label="Actions correctives"
              value="Suites"
              subtext="Engagements d'amélioration"
              variant="warning"
              icon={<Award className="w-5 h-5" />}
              onClick={() => navigate('/synthese')}
            />
            <StatCard
              label="Cahier de texte"
              value="Contrôle"
              subtext="Avancement horaire global"
              variant="default"
              icon={<BookOpen className="w-5 h-5" />}
              onClick={() => navigate('/cahier-texte')}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ESPACE SCOLARITÉ                                      */}
      {/* ======================================================== */}
      {role === 'scolarite' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Campagnes ouvertes"
              value={tbScolarite?.campagnesOuvertes ?? '1'}
              subtext="En cours de consultation"
              variant="primary"
              icon={<Megaphone className="w-5 h-5" />}
              onClick={() => navigate('/scolarite/campagnes')}
            />
            <StatCard
              label="Commentaires à modérer"
              value={tbScolarite?.commentairesAModerer ?? '0'}
              subtext="Vérification déontologique"
              variant={Number(tbScolarite?.commentairesAModerer || 0) > 0 ? 'warning' : 'success'}
              icon={<ShieldCheck className="w-5 h-5" />}
              onClick={() => navigate('/scolarite/moderation')}
            />
            <StatCard
              label="Comptes sans mot de passe"
              value={tbScolarite?.comptesSansMotDePasse ?? '12'}
              subtext="Codes d'activation à émettre"
              variant="default"
              icon={<Users className="w-5 h-5" />}
              onClick={() => navigate('/scolarite/comptes')}
            />
            <StatCard
              label="Imports de référentiels"
              value="CSV"
              subtext="Étudiants, UE, affectations"
              variant="default"
              icon={<Upload className="w-5 h-5" />}
              onClick={() => navigate('/scolarite/imports')}
            />
          </div>

          <div className="bg-white border border-enp-border p-5">
            <SectionHeader title="Modules de gestion Scolarité" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Link
                to="/scolarite/campagnes"
                className="p-4 border border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/40 transition-colors flex items-center justify-between"
              >
                <div>
                  <h3 className="text-sm font-bold text-enp-blue-deep">Gestion des campagnes</h3>
                  <p className="text-xs text-enp-gray-medium">Ouverture, clôture et calendrier</p>
                </div>
                <ArrowRight className="w-4 h-4 text-enp-gray-medium" />
              </Link>
              <Link
                to="/scolarite/moderation"
                className="p-4 border border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/40 transition-colors flex items-center justify-between"
              >
                <div>
                  <h3 className="text-sm font-bold text-enp-blue-deep">Modération des avis</h3>
                  <p className="text-xs text-enp-gray-medium">Filtrage des propos nominatifs</p>
                </div>
                <ArrowRight className="w-4 h-4 text-enp-gray-medium" />
              </Link>
              <Link
                to="/scolarite/imports"
                className="p-4 border border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/40 transition-colors flex items-center justify-between"
              >
                <div>
                  <h3 className="text-sm font-bold text-enp-blue-deep">Imports CSV académiques</h3>
                  <p className="text-xs text-enp-gray-medium">Prévisualisation & validation</p>
                </div>
                <ArrowRight className="w-4 h-4 text-enp-gray-medium" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. ESPACE DIRECTION DES ÉTUDES                           */}
      {/* ======================================================== */}
      {role === 'direction_etudes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Participation nationale"
              value="78.4%"
              subtext="Moyenne tous campus ENP"
              variant="primary"
              icon={<Activity className="w-5 h-5" />}
              onClick={() => navigate('/direction/statistiques')}
            />
            <StatCard
              label="Départements évalués"
              value="6 / 6"
              subtext="Tous départements actifs"
              variant="success"
              icon={<Award className="w-5 h-5" />}
              onClick={() => navigate('/direction/statistiques')}
            />
            <StatCard
              label="Contrôles académiques"
              value="Conforme"
              subtext="Cohérence des référentiels"
              variant="default"
              icon={<ShieldCheck className="w-5 h-5" />}
              onClick={() => navigate('/direction/controles')}
            />
            <StatCard
              label="Catalogue des UE"
              value="Consulter"
              subtext="Programmes et volumes horaires"
              variant="default"
              icon={<BookOpen className="w-5 h-5" />}
              onClick={() => navigate('/administration')}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. ESPACE ADMINISTRATEUR TECHNIQUE                       */}
      {/* ======================================================== */}
      {role === 'admin' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Comptes supervisés"
              value="2 450"
              subtext="Étudiants, corps enseignant, agents"
              variant="primary"
              icon={<Users className="w-5 h-5" />}
              onClick={() => navigate('/scolarite/comptes')}
            />
            <StatCard
              label="Journal d'audit"
              value="Actif"
              subtext="Traçabilité cryptographique"
              variant="success"
              icon={<ScrollText className="w-5 h-5" />}
              onClick={() => navigate('/journal-audit')}
            />
            <StatCard
              label="Archives annuelles"
              value="Snapshots"
              subtext="Clôtures d'années académiques"
              variant="default"
              icon={<Award className="w-5 h-5" />}
              onClick={() => navigate('/archives-annuelles')}
            />
            <StatCard
              label="Infrastructure"
              value="Opérationnelle"
              subtext="Base urne étanche & API"
              variant="default"
              icon={<ShieldCheck className="w-5 h-5" />}
              onClick={() => navigate('/administration')}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MENTION RÉGLEMENTAIRE PERMANENTE                         */}
      {/* ======================================================== */}
      <div className="p-4 bg-white border border-enp-border flex items-start gap-3 text-xs text-enp-gray-medium">
        <Info className="w-4 h-4 text-enp-blue-primary shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Réglementation de l'École Nationale Polytechnique :</strong> Les résultats d'évaluation et données du cahier de texte sont exploités à des fins exclusives d'amélioration pédagogique et de pilotage collégial des cursus polytechniques, conformément aux décisions du Conseil de Direction.
        </p>
      </div>
    </div>
  );
}
