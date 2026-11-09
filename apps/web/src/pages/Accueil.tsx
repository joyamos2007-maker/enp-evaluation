import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Clock,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  FileText,
  Activity,
  PlusCircle,
  Info,
  CalendarCheck,
  Building2,
  Archive,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { Button, InfoBubble } from '@/components/ui';
import { api } from '@/api';
import type { UeAEvaluer, Seance, TableauDeBordScolarite } from '@/api/types';

export function Accueil() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();

  const [uesEtudiant, setUesEtudiant] = useState<UeAEvaluer[]>([]);
  const [seancesAttente, setSeancesAttente] = useState<Seance[]>([]);
  const [tbScolarite, setTbScolarite] = useState<TableauDeBordScolarite | null>(null);

  const role = utilisateur?.activeRole;

  useEffect(() => {
    let actif = true;
    async function chargerDonneesRole() {
      if (!role) return;
      try {
        if (role === 'etudiant' || role === 'delegue') {
          const ues = await api.listeEvaluations();
          if (actif) setUesEtudiant(ues);
        } else if (role === 'enseignant') {
          const seances = await api.cahierSeances(undefined, 'en_attente');
          if (actif) setSeancesAttente(seances);
        } else if (role === 'scolarite') {
          const tb = await api.scolariteTableauDeBord();
          if (actif) setTbScolarite(tb);
        }
      } catch {
        // Mode silencieux si API non joignable
      }
    }
    void chargerDonneesRole();
    return () => {
      actif = false;
    };
  }, [role]);

  if (!utilisateur) return null;

  const uesAFaire = uesEtudiant.filter((u) => u.etat === 'a_faire');
  const uesTerminees = uesEtudiant.filter((u) => u.etat === 'terminee');
  const totalUes = uesEtudiant.length || 6;
  const tauxCompletion = Math.round((uesTerminees.length / totalUes) * 100);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in max-w-7xl mx-auto pb-4">
      {/* ======================================================== */}
      {/* 1. ESPACE ÉTUDIANT                                       */}
      {/* ======================================================== */}
      {role === 'etudiant' && (
        <div className="space-y-4 sm:space-y-6">
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
                  <h2 className="text-base sm:text-lg font-bold text-enp-blue-deep font-sans">
                    Toutes vos évaluations sont à jour
                  </h2>
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

          {/* GRILLE UNIQUE ÉTUDIANT */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
            <div
              onClick={() => navigate('/evaluations')}
              className={`bg-white border p-3.5 sm:p-5 cursor-pointer transition-colors hover:bg-enp-blue-ice/30 ${
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
              <div className="text-xl sm:text-2xl font-bold text-enp-black tracking-tight font-sans">
                {uesAFaire.length} UE
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Sur {totalUes} inscrites
              </p>
            </div>

            <div
              onClick={() => navigate('/cahier-texte')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Cahier de texte
                </span>
                <BookOpen className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                Séances
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Contenus et devoirs
              </p>
            </div>

            <div
              onClick={() => navigate('/mes-notes')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Mes notes
                </span>
                <GraduationCap className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                Relevé
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Devoirs et examens
              </p>
            </div>

            <div
              onClick={() => navigate('/mes-presences')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Présences
                </span>
                <CalendarCheck className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                Assiduité
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Historique et taux
              </p>
            </div>

            <div
              onClick={() => navigate('/restitution')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40 col-span-2 sm:col-span-1"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Restitution
                </span>
                <FileText className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                Rapports
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Bilans et suites (Art. 77)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ESPACE DÉLÉGUÉ DE PROMOTION                           */}
      {/* ======================================================== */}
      {role === 'delegue' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white border-l-4 border-l-enp-blue-primary border-t border-r border-b border-enp-border p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-enp-blue-primary flex items-center gap-1.5 font-sans">
                <PlusCircle className="w-4 h-4 text-enp-blue-primary shrink-0" />
                Mandat officiel de Délégué de cours
              </span>
              <InfoBubble
                triggerVariant="pill"
                triggerLabel="Rôle du Délégué"
                title="Attributions officielles du Délégué"
                badge="RÈGLEMENT DES ÉTUDES"
                icon="book"
                duration={6000}
                content={
                  <div className="space-y-2 text-xs leading-relaxed font-sans">
                    <p>
                      En tant que délégué, vous êtes chargé de <strong>renseigner chaque séance de cours</strong> dispensée (date, durée, thème, travail à faire) dans le cahier de texte officiel.
                    </p>
                    <p className="text-[11px] text-enp-gray-medium border-t border-enp-border pt-1.5">
                      L'enseignant responsable dispose ensuite de 72h pour apposer son visa académique.
                    </p>
                  </div>
                }
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-enp-blue-deep font-sans">
                  Tenue du Cahier de Texte officiel
                </h2>
                <p className="text-xs text-enp-gray-medium mt-1">
                  Enregistrez les séances tenues pour certification par vos professeurs.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => navigate('/cahier-texte/nouvelle')}
                  variant="primary"
                  className="font-bold flex items-center justify-center gap-2 py-2.5 px-4 text-sm shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Renseigner une séance</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <Button
                  onClick={() => navigate('/cahier-texte')}
                  variant="outline"
                  className="font-semibold text-xs py-2.5 px-3"
                >
                  Consulter le cahier
                </Button>
              </div>
            </div>
          </div>

          {/* GRILLE UNIQUE DÉLÉGUÉ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
            <div
              onClick={() => navigate('/cahier-texte/nouvelle')}
              className="bg-white border border-l-4 border-l-enp-blue-primary border-t-enp-border border-r-enp-border border-b-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Saisie séance
                </span>
                <PlusCircle className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                Renseigner
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Nouvelle fiche de cours
              </p>
            </div>

            <div
              onClick={() => navigate('/cahier-texte')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Cahier de texte
                </span>
                <BookOpen className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                Historique
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Suivi des visas professeurs
              </p>
            </div>

            <div
              onClick={() => navigate('/evaluations')}
              className={`bg-white border p-3.5 sm:p-5 cursor-pointer transition-colors hover:bg-enp-blue-ice/30 ${
                uesAFaire.length > 0
                  ? 'border-l-4 border-l-[#D97706] border-t-enp-border border-r-enp-border border-b-enp-border'
                  : 'border-l-4 border-l-enp-green-valid border-t-enp-border border-r-enp-border border-b-enp-border'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Évaluations
                </span>
                <ClipboardCheck className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-enp-black tracking-tight font-sans">
                {uesAFaire.length} UE
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Restantes à évaluer
              </p>
            </div>

            <div
              onClick={() => navigate('/mes-notes')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Mes notes
                </span>
                <GraduationCap className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                Relevé
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Devoirs et examens
              </p>
            </div>

            <div
              onClick={() => navigate('/mes-presences')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40 col-span-2 sm:col-span-1"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Présences
                </span>
                <CalendarCheck className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                Assiduité
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Historique et retards
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ESPACE ENSEIGNANT                                     */}
      {/* ======================================================== */}
      {role === 'enseignant' && (
        <div className="space-y-4 sm:space-y-6">
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
                    Validez-les en 1 clic directement depuis le cahier de texte
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/cahier-texte')}
                  variant="primary"
                  className="w-full sm:w-auto font-bold flex items-center justify-center gap-2 py-2.5 px-4 text-sm"
                >
                  <Stamp className="w-4 h-4" />
                  <span>Viser dans le cahier de texte</span>
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
                  <h2 className="text-base sm:text-lg font-bold text-enp-blue-deep">
                    Toutes les séances de cours sont visées
                  </h2>
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

          {/* GRILLE UNIQUE ENSEIGNANT */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div
              onClick={() => navigate('/cahier-texte')}
              className={`bg-white border p-3.5 sm:p-5 cursor-pointer transition-colors hover:bg-enp-blue-ice/30 ${
                seancesAttente.length > 0
                  ? 'border-l-4 border-l-[#D97706] border-t-enp-border border-r-enp-border border-b-enp-border'
                  : 'border-l-4 border-l-enp-green-valid border-t-enp-border border-r-enp-border border-b-enp-border'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Cahier & Visas
                </span>
                <BookOpen className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight font-sans truncate">
                {seancesAttente.length > 0 ? `${seancesAttente.length} à viser` : 'À jour'}
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Séances, visas et exports
              </p>
            </div>

            <div
              onClick={() => navigate('/enseignant/notes')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Saisie notes
                </span>
                <ClipboardCheck className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Notes
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Devoirs et examens
              </p>
            </div>

            <div
              onClick={() => navigate('/enseignant/presences')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Présences
                </span>
                <CalendarCheck className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Appel 1-clic
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Assiduité des promotions
              </p>
            </div>

            <div
              onClick={() => navigate('/resultats')}
              className="bg-white border border-l-4 border-l-enp-blue-primary border-t-enp-border border-r-enp-border border-b-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30"
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
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Évaluations anonymes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ESPACE CHEF DE DÉPARTEMENT                            */}
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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div
              onClick={() => navigate('/participation')}
              className="bg-white border border-l-4 border-l-enp-blue-primary border-t-enp-border border-r-enp-border border-b-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30"
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
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Suivi des répondants par UE
              </p>
            </div>

            <div
              onClick={() => navigate('/synthese')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Synthèse
                </span>
                <Award className="w-4 h-4 text-[#D97706] shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Plan d'actions
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Moyennes A-E et suites
              </p>
            </div>

            <div
              onClick={() => navigate('/resultats')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Résultats UE
                </span>
                <BarChart3 className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Fiches UE
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Détails par enseignement
              </p>
            </div>

            <div
              onClick={() => navigate('/cahier-texte')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
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
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Avancement horaire global
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. ESPACE SCOLARITÉ                                      */}
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
            <div
              onClick={() => navigate('/scolarite/campagnes')}
              className="bg-white border border-l-4 border-l-enp-blue-primary border-t-enp-border border-r-enp-border border-b-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Campagnes
                </span>
                <Megaphone className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-enp-black tracking-tight font-sans">
                {tbScolarite?.campagnesOuvertes ?? '1'}
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                En cours
              </p>
            </div>

            <div
              onClick={() => navigate('/scolarite/moderation')}
              className={`bg-white border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 ${
                Number(tbScolarite?.commentairesAModerer || 0) > 0
                  ? 'border-l-4 border-l-[#D97706] border-t-enp-border border-r-enp-border border-b-enp-border'
                  : 'border-l-4 border-l-enp-green-valid border-t-enp-border border-r-enp-border border-b-enp-border'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Modération
                </span>
                <ShieldCheck className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-enp-black tracking-tight font-sans">
                {tbScolarite?.commentairesAModerer ?? '0'}
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Avis à traiter
              </p>
            </div>

            <div
              onClick={() => navigate('/scolarite/deliberations')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Examens
                </span>
                <ClipboardCheck className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                Délibérer
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Jurys et publication
              </p>
            </div>

            <div
              onClick={() => navigate('/scolarite/comptes')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Comptes
                </span>
                <Users className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-enp-black tracking-tight font-sans">
                {tbScolarite?.comptesSansMotDePasse ?? '12'}
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                À activer
              </p>
            </div>

            <div
              onClick={() => navigate('/scolarite/imports')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Imports
                </span>
                <Upload className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                CSV
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Assistant 3 étapes
              </p>
            </div>

            <div
              onClick={() => navigate('/scolarite/restitution')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Restitution
                </span>
                <FileText className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                Article 77
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Bilan aux étudiants
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. ESPACE DES DIRECTIONS DE CAMPUS ET GÉNÉRALE           */}
      {/* ======================================================== */}
      {(role === 'directeur_campus' || role === 'directeur_general') && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white border-l-4 border-l-enp-blue-primary border-t border-r border-b border-enp-border p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-enp-blue-primary flex items-center gap-1.5">
                <Activity className="w-4 h-4 shrink-0" />
                {role === 'directeur_general' ? 'Direction générale' : 'Direction de campus'}
              </span>
              <InfoBubble
                triggerVariant="pill"
                triggerLabel={role === 'directeur_general' ? 'Indicateurs ENP' : 'Indicateurs du campus'}
                title={role === 'directeur_general' ? 'Supervision globale ENP' : 'Supervision de votre campus'}
                badge={role === 'directeur_general' ? 'GOUVERNANCE ENP' : 'GOUVERNANCE DU CAMPUS'}
                icon="info"
                duration={6000}
                content={
                  <div className="space-y-2 text-xs leading-relaxed">
                    <p>
                      {role === 'directeur_general'
                        ? 'La Direction générale consolide les bilans de tous les campus et publie les statistiques globales de l’ENP.'
                        : 'La Direction de campus suit les résultats et la conformité académique dans le périmètre de son campus.'}
                    </p>
                    <p className="text-[11px] text-enp-gray-medium border-t border-enp-border pt-1.5">
                      {role === 'directeur_general'
                        ? 'Les indicateurs nationaux sont audités annuellement par la commission d’évaluation interne.'
                        : 'Les indicateurs visibles dans votre espace sont limités à votre campus.'}
                    </p>
                  </div>
                }
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-enp-blue-deep font-sans">
                  {role === 'directeur_general'
                    ? 'Participation consolidée ENP : 78.4%'
                    : 'Pilotage statistique du campus'}
                </h2>
                <p className="text-xs text-enp-gray-medium mt-1">
                  {role === 'directeur_general'
                    ? 'Tous les campus • Indicateurs consolidés'
                    : 'Départements de votre campus • Indicateurs locaux'}
                </p>
              </div>
              <Button
                onClick={() => navigate('/direction/statistiques')}
                variant="primary"
                className="w-full sm:w-auto font-bold flex items-center justify-center gap-2 py-2.5 px-4 text-sm"
              >
                <Activity className="w-4 h-4" />
                <span>{role === 'directeur_general' ? 'Statistiques globales ENP' : 'Statistiques du campus'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div
              onClick={() => navigate('/direction/statistiques')}
              className="bg-white border border-l-4 border-l-enp-blue-primary border-t-enp-border border-r-enp-border border-b-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Statistiques
                </span>
                <Activity className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight font-sans">
                {role === 'directeur_general' ? '78.4%' : 'Campus'}
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                {role === 'directeur_general' ? 'Moyenne tous campus ENP' : 'Indicateurs de votre campus'}
              </p>
            </div>

            <div
              onClick={() => navigate('/direction/controles')}
              className="bg-white border border-l-4 border-l-enp-green-valid border-t-enp-border border-r-enp-border border-b-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Contrôles
                </span>
                <ShieldCheck className="w-4 h-4 text-enp-green-valid shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Conformité
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Cohérence des référentiels
              </p>
            </div>

            <div
              onClick={() => navigate('/resultats')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Résultats UE
                </span>
                <BarChart3 className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Fiches UE
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Synthèses pédagogiques
              </p>
            </div>

            <div
              onClick={() => navigate('/direction/commentaires')}
              className="bg-white border border-enp-border p-3.5 sm:p-5 transition-colors cursor-pointer hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Commentaires
                </span>
                <FileText className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-2xl font-bold text-enp-blue-deep tracking-tight truncate">
                Lecture
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Avis modérés des campagnes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. ESPACE ADMINISTRATEUR TECHNIQUE                       */}
      {/* ======================================================== */}
      {role === 'admin' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white border-l-4 border-l-enp-blue-primary border-t border-r border-b border-enp-border p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-enp-blue-primary flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                Administration système
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-enp-blue-deep font-sans">
                  Configuration & Sécurité de la plateforme
                </h2>
                <p className="text-xs text-enp-gray-medium mt-1">
                  Gérez les référentiels institutionnels, les comptes, les imports et le journal d'audit.
                </p>
              </div>
              <Button
                onClick={() => navigate('/administration')}
                variant="primary"
                className="w-full sm:w-auto font-bold flex items-center justify-center gap-2 py-2.5 px-4 text-sm"
              >
                <Building2 className="w-4 h-4" />
                <span>Gérer les référentiels</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate('/administration')}
              className="text-left bg-white border border-l-4 border-l-enp-blue-primary border-t-enp-border border-r-enp-border border-b-enp-border p-3.5 sm:p-5 transition-colors hover:bg-enp-blue-ice/30"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Référentiels
                </span>
                <Building2 className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                Structures
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Campus, dépts, cursus
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/scolarite/comptes')}
              className="text-left bg-white border border-enp-border p-3.5 sm:p-5 transition-colors hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Comptes
                </span>
                <Users className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                Utilisateurs
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Rôles et activations
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/scolarite/imports')}
              className="text-left bg-white border border-enp-border p-3.5 sm:p-5 transition-colors hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Imports
                </span>
                <Upload className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                CSV
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Données de masse
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/archives-annuelles')}
              className="text-left bg-white border border-enp-border p-3.5 sm:p-5 transition-colors hover:bg-enp-blue-ice/30 hover:border-enp-blue-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Archives
                </span>
                <Archive className="w-4 h-4 text-enp-blue-primary shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                Millésimes
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Clôture annuelle
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/journal-audit')}
              className="text-left bg-white border border-l-4 border-l-enp-green-valid border-t-enp-border border-r-enp-border border-b-enp-border p-3.5 sm:p-5 transition-colors hover:bg-enp-blue-ice/30 col-span-2 sm:col-span-1"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-enp-gray-medium truncate">
                  Audit
                </span>
                <ScrollText className="w-4 h-4 text-enp-green-valid shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-enp-blue-deep tracking-tight truncate">
                Journal
              </div>
              <p className="text-[11px] text-enp-gray-medium truncate mt-0.5">
                Traçabilité système
              </p>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MENTION RÉGLEMENTAIRE DISCRÈTE                           */}
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
