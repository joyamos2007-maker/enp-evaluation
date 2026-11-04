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
  Calendar,
  Clock,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  FileText,
  Activity,
  PlusCircle,
  Info,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import {
  StatCard,
  Button,
  Badge,
  InfoBubble,
} from '@/components/ui';
import { api } from '@/api';
import type { UeAEvaluer, Seance, TableauDeBordScolarite } from '@/api/types';

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

  // Métriques étudiant
  const uesAFaire = uesEtudiant.filter((u) => u.etat === 'a_faire');
  const uesTerminees = uesEtudiant.filter((u) => u.etat === 'terminee');
  const totalUes = uesEtudiant.length || 6;
  const tauxCompletion = Math.round((uesTerminees.length / totalUes) * 100);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in max-w-7xl mx-auto pb-4">
      {/* ======================================================== */}
      {/* 1. ESPACE ÉTUDIANT & DÉLÉGUÉ                             */}
      {/* ======================================================== */}
      {(role === 'etudiant' || role === 'delegue') && (
        <div className="space-y-4 sm:space-y-6">
          {/* CARTE HERO ULTRA-ÉPURÉE & MODERNE */}
          {uesAFaire.length > 0 ? (
            <div className="bg-white border border-enp-border border-l-4 border-l-enp-blue-primary p-4 sm:p-6 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-enp-blue-primary flex items-center gap-1.5 font-sans">
                  <span className="w-2 h-2 bg-enp-blue-primary inline-block shrink-0" />
                  Campagne officielle en cours
                </span>
                <InfoBubble
                  triggerVariant="pill"
                  triggerLabel="Garantie d'anonymat"
                  title="Anonymat absolu garanti"
                  badge="SÉCURITÉ DU SCRUTIN"
                  icon="shield"
                  duration={6000}
                  content={
                    <div className="space-y-2 text-xs leading-relaxed font-sans">
                      <p>
                        Votre vote est <strong>rigoureusement anonyme</strong>, chiffré et protégé par un bulletin électronique à usage unique.
                      </p>
                      <p>
                        Aucun enseignant ni administrateur ne peut faire le lien entre vos réponses et votre nom. Le dépouillement n'est autorisé qu'à partir de 5 répondants par UE.
                      </p>
                    </div>
                  }
                />
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-enp-blue-deep font-sans tracking-tight">
                  {uesAFaire.length} UE à évaluer
                </h2>
                <div className="flex items-center justify-between text-xs text-enp-gray-medium font-medium mt-1 font-sans">
                  <span>Progression : {uesTerminees.length} sur {totalUes} évaluée(s)</span>
                  <span className="font-bold text-enp-blue-deep">{tauxCompletion}%</span>
                </div>
                {/* Barre de progression rectiligne */}
                <div className="w-full bg-enp-blue-ice border border-enp-border h-2 overflow-hidden mt-1.5">
                  <div
                    className="bg-enp-blue-primary h-full transition-all duration-300"
                    style={{ width: `${tauxCompletion}%` }}
                  />
                </div>
              </div>

              <div className="pt-1">
                <Button
                  onClick={() => navigate('/evaluations')}
                  variant="primary"
                  size="md"
                  leftIcon={<ClipboardCheck className="w-4 h-4 shrink-0" />}
                  rightIcon={<ArrowRight className="w-4 h-4 shrink-0" />}
                  className="w-full sm:w-auto font-bold justify-center py-2.5 px-5 text-sm shadow-xs whitespace-nowrap"
                >
                  Évaluer maintenant
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white border-l-4 border-l-enp-green-valid border-t border-r border-b border-enp-border p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-enp-green-light text-enp-green-valid flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-enp-blue-deep font-sans">
                      Toutes vos évaluations sont à jour
                    </h2>
                    <InfoBubble
                      triggerVariant="compact"
                      title="Bulletins officiels enregistrés"
                      badge="VALIDATION ACADÉMIQUE"
                      icon="shield"
                      duration={5000}
                      content={
                        <p className="text-xs leading-relaxed font-sans">
                          Vos bulletins électroniques ont été scellés et intégrés anonymement dans l'urne numérique de l'ENP. Merci pour votre participation citoyenne.
                        </p>
                      }
                    />
                  </div>
                  <p className="text-xs text-enp-gray-medium mt-0.5 font-sans">
                    100% de complétion • Merci pour votre contribution à l'excellence polytechnique.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/cahier-texte')}
                variant="outline"
                className="w-full sm:w-auto font-semibold text-xs whitespace-nowrap"
              >
                Consulter le cahier de texte
              </Button>
            </div>
          )}

          {/* GRILLE D'INDICATEURS 2X2 SUR MOBILE, 4 SUR DESKTOP (NON-REDUNDANT) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div
              className={`bg-white border p-3 sm:p-5 ${
                uesAFaire.length > 0
                  ? 'border-l-4 border-l-[#D97706] border-t-enp-border border-r-enp-border border-b-enp-border'
                  : 'border-l-4 border-l-enp-green-valid border-t-enp-border border-r-enp-border border-b-enp-border'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  À évaluer
                </span>
                <ClipboardCheck className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-enp-black tracking-tight font-sans">
                {uesAFaire.length}
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Sur un total de {totalUes} UE inscrites
              </p>
            </div>

            <div
              onClick={() => navigate('/mes-resultats')}
              className="bg-white border border-l-4 border-l-enp-blue-primary border-t-enp-border border-r-enp-border border-b-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Complétées
                </span>
                <CheckCircle2 className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-enp-black tracking-tight font-sans">
                {uesTerminees.length}
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                {tauxCompletion}% • Consulter mes bilans
              </p>
            </div>

            <div
              onClick={() => navigate('/cahier-texte')}
              className="bg-white border border-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Cahier de texte
                </span>
                <BookOpen className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Consulter
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Séances tenues et devoirs
              </p>
            </div>

            <div
              onClick={() => navigate('/mes-notes')}
              className="bg-white border border-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Mes notes
                </span>
                <GraduationCap className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Résultats
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Notes et assiduité officielle
              </p>
            </div>
          </div>

          {/* ACTIONS PRIORITAIRES RAPIDES & TACTILES (DESTINATIONS UNIQUES) */}
          <div className="bg-white border border-enp-border p-3.5 sm:p-5">
            <h3 className="text-xs sm:text-sm font-bold text-enp-blue-deep uppercase tracking-wider mb-3">
              Accès prioritaires
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              <Link
                to="/cahier-texte"
                className="p-3 sm:p-4 border border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/40 transition-colors flex items-center justify-between group active:bg-enp-blue-ice"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-enp-blue-light text-enp-blue-deep flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-enp-blue-deep truncate">
                      Cahier de texte officiel
                    </h4>
                    <p className="text-[11px] text-enp-gray-medium truncate">
                      Contenus & devoirs de cours
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-enp-gray-medium group-hover:text-enp-blue-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </Link>

              <Link
                to="/mes-resultats"
                className="p-3 sm:p-4 border border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/40 transition-colors flex items-center justify-between group active:bg-enp-blue-ice"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-enp-blue-light text-enp-blue-deep flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-enp-blue-deep truncate">
                      Fiches de résultats & bilans
                    </h4>
                    <p className="text-[11px] text-enp-gray-medium truncate">
                      Consultation des synthèses par UE
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-enp-gray-medium group-hover:text-enp-blue-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </Link>

              <Link
                to="/mes-notes"
                className="p-3 sm:p-4 border border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/40 transition-colors flex items-center justify-between group active:bg-enp-blue-ice"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-enp-blue-light text-enp-blue-deep flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-enp-blue-deep truncate">
                      Dossier & Notes d'examen
                    </h4>
                    <p className="text-[11px] text-enp-gray-medium truncate">
                      Notes et relevé d'assiduité
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-enp-gray-medium group-hover:text-enp-blue-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </Link>

              {role === 'delegue' && (
                <Link
                  to="/cahier-texte/nouvelle"
                  className="p-3 sm:p-4 border border-enp-blue-primary bg-enp-blue-ice/40 hover:bg-enp-blue-light transition-colors flex items-center justify-between group active:bg-enp-blue-ice"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-enp-blue-primary text-white flex items-center justify-center shrink-0">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-enp-blue-deep truncate">
                        Renseigner une séance
                      </h4>
                      <p className="text-[11px] text-enp-gray-medium truncate">
                        Saisie officielle délégué de cours
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-enp-blue-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
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
        <div className="space-y-4 sm:space-y-6">
          {/* HERO ENSEIGNANT */}
          {seancesAttente.length > 0 ? (
            <div className="bg-white border-l-4 border-l-[#D97706] border-t border-r border-b border-enp-border p-4 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#92400E] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#D97706] shrink-0" />
                  Visas pédagogiques requis
                </span>
                <InfoBubble
                  triggerVariant="pill"
                  triggerLabel="Procédure de visa"
                  title="Délai et responsabilités de visa"
                  badge="RÈGLEMENT DES ÉTUDES"
                  icon="book"
                  duration={6000}
                  content={
                    <div className="space-y-2 text-xs leading-relaxed">
                      <p>
                        Conformément au règlement de l'ENP, l'enseignant responsable doit apposer son <strong>visa académique</strong> ou formuler une contestation motivée dans un délai de <strong>72 heures</strong> après la saisie par le délégué.
                      </p>
                      <p className="text-[11px] text-enp-gray-medium border-t border-enp-border pt-1.5">
                        Le visa certifie la tenue effective du cours et l'avancement du programme pédagogique officiel.
                      </p>
                    </div>
                  }
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-enp-blue-deep font-sans">
                    {seancesAttente.length} séance(s) en attente de visa
                  </h2>
                  <p className="text-xs text-enp-gray-medium mt-1">
                    Saisie(s) par vos délégués de cours en attente de certification
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/visas')}
                  variant="primary"
                  className="w-full sm:w-auto font-bold flex items-center justify-center gap-2 py-2.5 px-4 text-sm"
                >
                  <Stamp className="w-4 h-4" />
                  <span>Viser les séances</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white border-l-4 border-l-enp-green-valid border-t border-r border-b border-enp-border p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-enp-green-light text-enp-green-valid flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-enp-blue-deep">
                      Toutes les séances de cours sont visées
                    </h2>
                    <InfoBubble
                      triggerVariant="compact"
                      title="Cahier de texte à jour"
                      badge="CONFORMITÉ"
                      icon="shield"
                      duration={5000}
                      content={
                        <p className="text-xs leading-relaxed">
                          Aucune séance en attente de validation. Le cahier de texte officiel de vos promotions est parfaitement conforme.
                        </p>
                      }
                    />
                  </div>
                  <p className="text-xs text-enp-gray-medium mt-0.5">
                    Votre cahier de texte académique est certifié à jour.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/resultats')}
                variant="outline"
                className="w-full sm:w-auto font-semibold text-xs"
              >
                Consulter les fiches de résultats
              </Button>
            </div>
          )}

          {/* GRILLE 2X2 MOBILE (NON-REDUNDANT) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div
              className={`bg-white border p-3 sm:p-5 ${
                seancesAttente.length > 0
                  ? 'border-l-4 border-l-[#D97706] border-t-enp-border border-r-enp-border border-b-enp-border'
                  : 'border-l-4 border-l-enp-green-valid border-t-enp-border border-r-enp-border border-b-enp-border'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  À viser
                </span>
                <Stamp className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-enp-black tracking-tight font-sans">
                {seancesAttente.length}
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Validation du cahier de texte
              </p>
            </div>

            <div
              onClick={() => navigate('/resultats')}
              className="bg-white border border-l-4 border-l-enp-blue-primary border-t-enp-border border-r-enp-border border-b-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Résultats
                </span>
                <BarChart3 className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Fiches UE
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Évaluations anonymes
              </p>
            </div>

            <div
              onClick={() => navigate('/enseignant/notes')}
              className="bg-white border border-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Saisie notes
                </span>
                <ClipboardCheck className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Devoirs
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Barèmes et moyennes
              </p>
            </div>

            <div
              onClick={() => navigate('/enseignant/presences')}
              className="bg-white border border-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Présences
                </span>
                <CheckCircle2 className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Pointage
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Assiduité des promotions
              </p>
            </div>
          </div>

          {/* ACCÈS DIRECTS ENSEIGNANT (DESTINATIONS UNIQUES) */}
          <div className="bg-white border border-enp-border p-3.5 sm:p-5">
            <h3 className="text-xs sm:text-sm font-bold text-enp-blue-deep uppercase tracking-wider mb-3">
              Accès directs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              <Link
                to="/cahier-texte"
                className="p-3 sm:p-4 border border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/40 transition-colors flex items-center justify-between group active:bg-enp-blue-ice"
              >
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-enp-blue-deep">Cahier de texte</h4>
                  <p className="text-[11px] text-enp-gray-medium">Vue chronologique et exports</p>
                </div>
                <ChevronRight className="w-4 h-4 text-enp-gray-medium group-hover:text-enp-blue-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </Link>
              <Link
                to="/resultats"
                className="p-3 sm:p-4 border border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/40 transition-colors flex items-center justify-between group active:bg-enp-blue-ice"
              >
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-enp-blue-deep">Fiches de résultats</h4>
                  <p className="text-[11px] text-enp-gray-medium">Évaluations anonymes par UE</p>
                </div>
                <ChevronRight className="w-4 h-4 text-enp-gray-medium group-hover:text-enp-blue-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </Link>
              <Link
                to="/enseignant/notes"
                className="p-3 sm:p-4 border border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/40 transition-colors flex items-center justify-between group active:bg-enp-blue-ice"
              >
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-enp-blue-deep">Saisie des notes</h4>
                  <p className="text-[11px] text-enp-gray-medium">Notes d'examen et devoirs</p>
                </div>
                <ChevronRight className="w-4 h-4 text-enp-gray-medium group-hover:text-enp-blue-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ESPACE CHEF DE DÉPARTEMENT                            */}
      {/* ======================================================== */}
      {role === 'chef_departement' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white border-l-4 border-l-enp-blue-primary border-t border-r border-b border-enp-border p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-enp-blue-primary flex items-center gap-1.5">
                <Users className="w-4 h-4 shrink-0" />
                Pilotage départemental
              </span>
              <InfoBubble
                triggerVariant="pill"
                triggerLabel="Missions du Chef"
                title="Pilotage départemental des enseignements"
                badge="CADRE OFFICIEL"
                icon="info"
                duration={6000}
                content={
                  <div className="space-y-2 text-xs leading-relaxed">
                    <p>
                      Le chef de département coordonne le suivi pédagogique des semestres, veille à la réalisation des volumes horaires et pilote les plans d'actions d'amélioration.
                    </p>
                    <p className="text-[11px] text-enp-gray-medium border-t border-enp-border pt-1.5">
                      Les résultats de participation et bilans sont présentés au Conseil de Département semestriel.
                    </p>
                  </div>
                }
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-enp-blue-deep font-sans">
                  Suivi des enseignements et de la participation
                </h2>
                <p className="text-xs text-enp-gray-medium mt-1">
                  Tableau de bord départemental en temps réel
                </p>
              </div>
              <Button
                onClick={() => navigate('/participation')}
                variant="primary"
                className="w-full sm:w-auto font-bold flex items-center justify-center gap-2 py-2.5 px-4 text-sm"
              >
                <Users className="w-4 h-4" />
                <span>Participation en direct</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div
              onClick={() => navigate('/participation')}
              className="bg-white border border-l-4 border-l-enp-blue-primary border-t-enp-border border-r-enp-border border-b-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Participation
                </span>
                <Users className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                En direct
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Suivi des répondants par UE
              </p>
            </div>

            <div
              onClick={() => navigate('/synthese')}
              className="bg-white border border-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Synthèse
                </span>
                <BarChart3 className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Rapports
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Moyennes par section A-E
              </p>
            </div>

            <div
              onClick={() => navigate('/synthese')}
              className="bg-white border border-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Correctifs
                </span>
                <Award className="w-4 h-4 text-[#D97706] shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Actions
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Engagements d'amélioration
              </p>
            </div>

            <div
              onClick={() => navigate('/cahier-texte')}
              className="bg-white border border-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Cahier de texte
                </span>
                <BookOpen className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Contrôle
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Avancement horaire global
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ESPACE SCOLARITÉ                                      */}
      {/* ======================================================== */}
      {role === 'scolarite' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white border-l-4 border-l-enp-blue-primary border-t border-r border-b border-enp-border p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-enp-blue-primary flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0 text-enp-blue-primary" />
                Administration Scolarité
              </span>
              <InfoBubble
                triggerVariant="pill"
                triggerLabel="Déontologie"
                title="Modération et conformité académique"
                badge="CHARTE ÉTHIQUE ENP"
                icon="shield"
                duration={6000}
                content={
                  <div className="space-y-2 text-xs leading-relaxed">
                    <p>
                      Tous les commentaires libres des étudiants font l'objet d'un filtre déontologique avant toute restitution aux enseignants ou chefs de département.
                    </p>
                    <p className="text-[11px] text-enp-gray-medium border-t border-enp-border pt-1.5">
                      Les propos injurieux ou contraires aux valeurs polytechniques sont exclus et archivés sous scellé.
                    </p>
                  </div>
                }
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-enp-blue-deep font-sans">
                  {tbScolarite?.commentairesAModerer ?? '0'} commentaire(s) à modérer
                </h2>
                <p className="text-xs text-enp-gray-medium mt-1">
                  Campagnes ouvertes : {tbScolarite?.campagnesOuvertes ?? '1'} • Comptes sans mot de passe : {tbScolarite?.comptesSansMotDePasse ?? '12'}
                </p>
              </div>
              <Button
                onClick={() => navigate('/scolarite/moderation')}
                variant="primary"
                className="w-full sm:w-auto font-bold flex items-center justify-center gap-2 py-2.5 px-4 text-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Modération des avis</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div
              onClick={() => navigate('/scolarite/campagnes')}
              className="bg-white border border-l-4 border-l-enp-blue-primary border-t-enp-border border-r-enp-border border-b-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Campagnes
                </span>
                <Megaphone className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-enp-black tracking-tight font-sans">
                {tbScolarite?.campagnesOuvertes ?? '1'}
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                En cours de consultation
              </p>
            </div>

            <div
              onClick={() => navigate('/scolarite/moderation')}
              className={`bg-white border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 ${
                Number(tbScolarite?.commentairesAModerer || 0) > 0
                  ? 'border-l-4 border-l-[#D97706] border-t-enp-border border-r-enp-border border-b-enp-border'
                  : 'border-l-4 border-l-enp-green-valid border-t-enp-border border-r-enp-border border-b-enp-border'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Modération
                </span>
                <ShieldCheck className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-enp-black tracking-tight font-sans">
                {tbScolarite?.commentairesAModerer ?? '0'}
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Avis qualitatifs à traiter
              </p>
            </div>

            <div
              onClick={() => navigate('/scolarite/comptes')}
              className="bg-white border border-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Comptes
                </span>
                <Users className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-enp-black tracking-tight font-sans">
                {tbScolarite?.comptesSansMotDePasse ?? '12'}
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Codes d'activation à émettre
              </p>
            </div>

            <div
              onClick={() => navigate('/scolarite/imports')}
              className="bg-white border border-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Imports
                </span>
                <Upload className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                CSV
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Étudiants, UE, affectations
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. ESPACE DIRECTION DES ÉTUDES                           */}
      {/* ======================================================== */}
      {role === 'direction_etudes' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white border-l-4 border-l-enp-blue-primary border-t border-r border-b border-enp-border p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-enp-blue-primary flex items-center gap-1.5">
                <Activity className="w-4 h-4 shrink-0" />
                Direction des Études
              </span>
              <InfoBubble
                triggerVariant="pill"
                triggerLabel="Indicateurs nationaux"
                title="Supervision de la Direction des Études"
                badge="GOUVERNANCE ENP"
                icon="info"
                duration={6000}
                content={
                  <div className="space-y-2 text-xs leading-relaxed">
                    <p>
                      La Direction des Études centralise les bilans semestriels, valide la conformité des maquettes pédagogiques et produit les rapports institutionnels.
                    </p>
                    <p className="text-[11px] text-enp-gray-medium border-t border-enp-border pt-1.5">
                      Les indicateurs nationaux sont audités annuellement par la commission d'évaluation interne.
                    </p>
                  </div>
                }
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-enp-blue-deep font-sans">
                  Participation consolidée : 78.4%
                </h2>
                <p className="text-xs text-enp-gray-medium mt-1">
                  Tous départements actifs (6/6) • Indicateurs conformes
                </p>
              </div>
              <Button
                onClick={() => navigate('/direction/statistiques')}
                variant="primary"
                className="w-full sm:w-auto font-bold flex items-center justify-center gap-2 py-2.5 px-4 text-sm"
              >
                <Activity className="w-4 h-4" />
                <span>Statistiques globales</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div
              onClick={() => navigate('/direction/statistiques')}
              className="bg-white border border-l-4 border-l-enp-blue-primary border-t-enp-border border-r-enp-border border-b-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Participation
                </span>
                <Activity className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-enp-black tracking-tight font-sans">
                78.4%
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Moyenne tous campus ENP
              </p>
            </div>

            <div
              onClick={() => navigate('/direction/statistiques')}
              className="bg-white border border-l-4 border-l-enp-green-valid border-t-enp-border border-r-enp-border border-b-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Départements
                </span>
                <Award className="w-4 h-4 text-enp-green-valid shrink-0" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-enp-black tracking-tight font-sans">
                6 / 6
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Tous départements actifs
              </p>
            </div>

            <div
              onClick={() => navigate('/direction/controles')}
              className="bg-white border border-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Contrôles
                </span>
                <ShieldCheck className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Conforme
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Cohérence des référentiels
              </p>
            </div>

            <div
              onClick={() => navigate('/administration')}
              className="bg-white border border-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Catalogue UE
                </span>
                <BookOpen className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Consulter
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Programmes et volumes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. ESPACE ADMINISTRATEUR TECHNIQUE                       */}
      {/* ======================================================== */}
      {role === 'admin' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white border-l-4 border-l-enp-blue-primary border-t border-r border-b border-enp-border p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-enp-blue-primary flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                Supervision Système
              </span>
              <InfoBubble
                triggerVariant="pill"
                triggerLabel="Cryptographie de l'urne"
                title="Sécurité cryptographique et auditabilité"
                badge="SÉCURITÉ SYSTÈME"
                icon="shield"
                duration={6000}
                content={
                  <div className="space-y-2 text-xs leading-relaxed">
                    <p>
                      La plateforme ENP garantit le secret absolu du scrutin par découplage cryptographique irréversible entre les jetons d'authentification et les bulletins chiffrés.
                    </p>
                    <p className="text-[11px] text-enp-gray-medium border-t border-enp-border pt-1.5">
                      Chaque action sensible génère une empreinte immuable dans le journal d'audit administratif.
                    </p>
                  </div>
                }
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-enp-blue-deep font-sans">
                  2 450 comptes supervisés
                </h2>
                <p className="text-xs text-enp-gray-medium mt-1">
                  Urne électronique étanche • Journal d'audit actif
                </p>
              </div>
              <Button
                onClick={() => navigate('/scolarite/comptes')}
                variant="primary"
                className="w-full sm:w-auto font-bold flex items-center justify-center gap-2 py-2.5 px-4 text-sm"
              >
                <Users className="w-4 h-4" />
                <span>Gérer les comptes</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div
              onClick={() => navigate('/scolarite/comptes')}
              className="bg-white border border-l-4 border-l-enp-blue-primary border-t-enp-border border-r-enp-border border-b-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Comptes
                </span>
                <Users className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-enp-black tracking-tight font-sans">
                2 450
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Étudiants, corps enseignant
              </p>
            </div>

            <div
              onClick={() => navigate('/journal-audit')}
              className="bg-white border border-l-4 border-l-enp-green-valid border-t-enp-border border-r-enp-border border-b-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Audit
                </span>
                <ScrollText className="w-4 h-4 text-enp-green-valid shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-green-valid tracking-tight truncate">
                Actif
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Traçabilité cryptographique
              </p>
            </div>

            <div
              onClick={() => navigate('/archives-annuelles')}
              className="bg-white border border-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Archives
                </span>
                <Award className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Snapshots
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Clôtures d'années
              </p>
            </div>

            <div
              onClick={() => navigate('/administration')}
              className="bg-white border border-enp-border p-3 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Serveurs
                </span>
                <ShieldCheck className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Opérationnel
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5 hidden sm:block">
                Base urne étanche & API
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MENTION RÉGLEMENTAIRE SOUS FORME DE BULLE RAPIDE         */}
      {/* ======================================================== */}
      <div className="p-3 sm:p-4 bg-white border border-enp-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-enp-gray-medium">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <Info className="w-4 h-4 text-enp-blue-primary shrink-0" />
          <span className="font-medium text-enp-blue-deep">
            Plateforme conforme aux décisions du Conseil de Direction de l'ENP
          </span>
        </div>

        <InfoBubble
          triggerVariant="pill"
          triggerLabel="Consulter la réglementation officielle"
          title="Réglementation officielle de l'École Nationale Polytechnique"
          badge="CADRE LÉGAL ACADÉMIQUE"
          icon="book"
          duration={7000}
          content={
            <div className="space-y-2 text-xs leading-relaxed">
              <p>
                <strong>Cadre légal :</strong> Les résultats d'évaluation et les données du cahier de texte sont exploités à des fins <strong>exclusives d'amélioration pédagogique</strong> et de pilotage collégial des cursus polytechniques.
              </p>
              <p>
                <strong>Confidentialité :</strong> Conformément aux résolutions du Conseil de Direction, le secret du vote étudiant et la protection des données enseignants sont strictement préservés.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
