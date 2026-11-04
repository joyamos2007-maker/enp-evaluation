import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Printer,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Stamp,
  BookOpen,
  FileText,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { Avancement, Seance, UeCahier, TypeSeance, StatutSeance, StatutVisa } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import {
  PageHeader,
  Button,
  Input,
  Select,
  Alert,
  InfoBubble,
} from '@/components/ui';

const LIBELLES_STATUT: Record<string, { label: string; badgeClass: string }> = {
  tenue: { label: 'Séance tenue', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  reportee: { label: 'Séance reportée', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  annulee: { label: 'Séance annulée', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' },
  enseignant_absent: { label: 'Enseignant absent', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' },
  planifiee: { label: 'Séance planifiée', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
};

const LIBELLES_VISA: Record<string, { label: string; badgeClass: string }> = {
  vise: { label: 'Visée par l’enseignant', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  en_attente: { label: 'En attente de visa', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  conteste: { label: 'Contestée par l’enseignant', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' },
};

export function CahierTexte() {
  const { aRole } = useAuth();
  const navigate = useNavigate();

  const peutSaisir = aRole('delegue');
  const peutViser = aRole('enseignant');

  const [ues, setUes] = useState<UeCahier[]>([]);
  const [seances, setSeances] = useState<Seance[]>([]);
  const [avancements, setAvancements] = useState<Map<number, Avancement>>(new Map());

  // Filtres
  const [recherche, setRecherche] = useState('');
  const [filtreUe, setFiltreUe] = useState<string>('all');
  const [filtreType, setFiltreType] = useState<string>('all');
  const [filtreVisa, setFiltreVisa] = useState<string>('all');

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [exportEnCours, setExportEnCours] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [uesData, seancesData] = await Promise.all([
        api.cahierMesUes(),
        api.cahierSeances(),
      ]);
      setUes(uesData);
      setSeances(seancesData);

      // Charger les avancements horaires pour les UE
      const avMap = new Map<number, Avancement>();
      try {
        const avancees = await Promise.all(uesData.map((u) => api.avancementUe(u.ueId)));
        avancees.forEach((av) => avMap.set(av.ueId, av));
      } catch {
        // ignorer si droits restreints
      }
      setAvancements(avMap);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Impossible de charger les données du cahier de texte.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  // Séances filtrées et triées chronologiquement
  const seancesFiltrees = useMemo(() => {
    return seances
      .filter((s) => {
        const matchUe = filtreUe === 'all' || String(s.ueId) === filtreUe;
        const matchType = filtreType === 'all' || s.type === filtreType;
        const matchVisa = filtreVisa === 'all' || s.visa.statut === filtreVisa;
        const matchSearch =
          !recherche ||
          (s.intitule && s.intitule.toLowerCase().includes(recherche.toLowerCase())) ||
          s.ueCode.toLowerCase().includes(recherche.toLowerCase()) ||
          (s.contenu && s.contenu.toLowerCase().includes(recherche.toLowerCase()));

        return matchUe && matchType && matchVisa && matchSearch;
      })
      .sort((a, b) => {
        const diffDate = a.date.localeCompare(b.date);
        if (diffDate !== 0) return diffDate;
        return a.debut.localeCompare(b.debut);
      });
  }, [seances, filtreUe, filtreType, filtreVisa, recherche]);

  // UE actuellement filtrée
  const ueCiblee = useMemo(() => {
    if (filtreUe === 'all') return null;
    return ues.find((u) => String(u.ueId) === filtreUe) ?? null;
  }, [ues, filtreUe]);

  // Synthèse des séances affichées
  const synthese = useMemo(() => {
    let totalMinutes = 0;
    let tenues = 0;
    let visees = 0;
    let enAttente = 0;
    let contestees = 0;

    seancesFiltrees.forEach((s) => {
      if (s.statut === 'tenue') {
        tenues++;
        try {
          const [dh, dm] = s.debut.split(':').map(Number);
          const [fh, fm] = s.fin.split(':').map(Number);
          const min = fh * 60 + fm - (dh * 60 + dm);
          if (min > 0) totalMinutes += min;
        } catch {
          // ignore parsing error
        }
      }
      if (s.visa.statut === 'vise') visees++;
      else if (s.visa.statut === 'en_attente') enAttente++;
      else if (s.visa.statut === 'conteste') contestees++;
    });

    const totalHeures = (totalMinutes / 60).toFixed(1);

    return {
      totalSeances: seancesFiltrees.length,
      tenues,
      totalHeures,
      visees,
      enAttente,
      contestees,
    };
  }, [seancesFiltrees]);

  async function telechargerExport(format: 'pdf' | 'xlsx' | 'docx') {
    setExportEnCours(true);
    try {
      const ueId = filtreUe === 'all' ? undefined : Number(filtreUe);
      const blob = await api.exporterCahier(format, ueId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cahier-de-texte-enp.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erreur lors de la génération de l'export.");
    } finally {
      setExportEnCours(false);
    }
  }

  function calculerDuree(debut: string, fin: string): string {
    try {
      const [dh, dm] = debut.split(':').map(Number);
      const [fh, fm] = fin.split(':').map(Number);
      const diffMinutes = fh * 60 + fm - (dh * 60 + dm);
      if (diffMinutes <= 0) return '';
      const h = Math.floor(diffMinutes / 60);
      const m = diffMinutes % 60;
      if (m === 0) return `${h}h00`;
      return `${h}h${m < 10 ? '0' : ''}${m}`;
    } catch {
      return '';
    }
  }

  function formaterDateFr(dateIso: string): string {
    try {
      const d = new Date(dateIso + 'T00:00:00');
      return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateIso;
    }
  }

  const dateDuJour = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const heureEdition = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto animate-fade-in pb-8">
      {/* ============================================================= */}
      {/* BARRE D'ACTION SUPÉRIEURE (Masquée à l'impression)           */}
      {/* ============================================================= */}
      <div className="no-print">
        <PageHeader
          title="Cahier de Texte Numérique Officiel"
          subtitle="Registre certifié des enseignements, suivi des volumes horaires et visas académiques."
          breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Cahier de texte' }]}
          badge={
            <InfoBubble
              triggerVariant="pill"
              triggerLabel="Cadre du visa"
              title="Réglementation officielle du visa pédagogique"
              badge="TRAÇABILITÉ ACADÉMIQUE"
              icon="book"
              duration={7000}
              content={
                <div className="space-y-2 text-xs leading-relaxed font-sans">
                  <p>
                    Chaque séance consignée engage la responsabilité académique. L'enseignant dispose d'un délai réglementaire pour viser la séance ou émettre une réserve motivée.
                  </p>
                  <p>
                    Les volumes horaires consolidés servent d'assiette aux états de service officiels et au suivi des maquettes pédagogiques par la Direction des Études.
                  </p>
                </div>
              }
            />
          }
          actions={
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {peutSaisir && (
                <Link to="/cahier-texte/nouvelle" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto justify-center font-bold min-h-[40px] bg-[#0d3b66] hover:bg-[#072440] text-white"
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Nouvelle séance
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="md"
                onClick={() => window.print()}
                leftIcon={<Printer className="w-4 h-4" />}
                className="w-full sm:w-auto font-semibold justify-center min-h-[40px] whitespace-nowrap bg-white text-[#0d3b66] border-[#0d3b66] hover:bg-[#f0f5ff]"
                title="Imprimer ou enregistrer le cahier de texte en PDF A4"
              >
                Imprimer le cahier de texte
              </Button>
              <div className="flex items-center border border-enp-border bg-white w-full sm:w-auto justify-center">
                <button
                  type="button"
                  disabled={exportEnCours}
                  onClick={() => void telechargerExport('pdf')}
                  className="flex-1 sm:flex-none px-3 py-2 text-xs font-semibold hover:bg-enp-blue-ice border-r border-enp-border transition-colors text-center font-sans"
                  title="Télécharger fichier PDF officiel généré par le serveur"
                >
                  PDF
                </button>
                <button
                  type="button"
                  disabled={exportEnCours}
                  onClick={() => void telechargerExport('xlsx')}
                  className="flex-1 sm:flex-none px-3 py-2 text-xs font-semibold hover:bg-enp-blue-ice border-r border-enp-border transition-colors text-center font-sans"
                  title="Exporter au format Excel"
                >
                  Excel
                </button>
                <button
                  type="button"
                  disabled={exportEnCours}
                  onClick={() => void telechargerExport('docx')}
                  className="flex-1 sm:flex-none px-3 py-2 text-xs font-semibold hover:bg-enp-blue-ice transition-colors text-center font-sans"
                  title="Exporter au format Word"
                >
                  Word
                </button>
              </div>
            </div>
          }
        />
      </div>

      {erreur && (
        <div className="no-print">
          <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
            {erreur}
          </Alert>
        </div>
      )}

      {/* ============================================================= */}
      {/* BARRE DE FILTRES ET RECHERCHE ERGONOMIQUE (Masquée à l'impression) */}
      {/* ============================================================= */}
      <div className="no-print bg-white border border-slate-300 p-3 sm:p-4 shadow-xs space-y-3 font-sans">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="w-full lg:max-w-xs">
            <Input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher séance, contenu, thème..."
              startIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
            {/* Sélection UE */}
            <div>
              <Select
                value={filtreUe}
                onChange={(e) => setFiltreUe(e.target.value)}
                aria-label="Filtrer par unité d'enseignement"
              >
                <option value="all">Toutes les UE ({ues.length})</option>
                {ues.map((u) => (
                  <option key={u.ueId} value={String(u.ueId)}>
                    {u.code} : {u.intitule}
                  </option>
                ))}
              </Select>
            </div>

            {/* Type */}
            <div>
              <Select
                value={filtreType}
                onChange={(e) => setFiltreType(e.target.value)}
                aria-label="Filtrer par type de séance"
              >
                <option value="all">Tous types (CM, TD, TP)</option>
                <option value="CM">Cours Magistral (CM)</option>
                <option value="TD">Travaux Dirigés (TD)</option>
                <option value="TP">Travaux Pratiques (TP)</option>
                <option value="AUTRE">Autre format</option>
              </Select>
            </div>

            {/* Statut Visa */}
            <div>
              <Select
                value={filtreVisa}
                onChange={(e) => setFiltreVisa(e.target.value)}
                aria-label="Filtrer par statut de visa"
              >
                <option value="all">Tous statuts de visa</option>
                <option value="vise">Séances visées</option>
                <option value="en_attente">En attente de visa</option>
                <option value="conteste">Contestées</option>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {chargement ? (
        <div className="p-12 text-center bg-white border border-enp-border shadow-xs">
          <div className="inline-block w-8 h-8 border-2 border-enp-blue-ice border-t-enp-blue-primary animate-spin mb-2" />
          <p className="text-sm text-enp-gray-medium font-sans">Chargement du registre officiel des enseignements…</p>
        </div>
      ) : (
        /* ============================================================= */
        /* NOUVEAU FORMAT : REGISTRE OFFICIEL DU CAHIER DE TEXTE DIRECT  */
        /* ============================================================= */
        <div className="cahier-document print-area bg-white border border-slate-300 p-5 sm:p-8 md:p-10 max-w-5xl mx-auto shadow-md print:shadow-none print:border-none print:p-0 print:max-w-none font-sans text-slate-900">
          
          {/* ========================================================= */}
          {/* 1. EN-TÊTE INSTITUTIONNEL OFFICIEL                        */}
          {/* ========================================================= */}
          {/* Logo ENP en haut à gauche | Nom école en haut au milieu | Armoiries Togo en haut à droite */}
          <div className="grid grid-cols-12 gap-3 sm:gap-4 items-center border-b-2 border-[#0d3b66] pb-4 sm:pb-5">
            {/* En haut à gauche : Logo ENP officiel */}
            <div className="col-span-12 sm:col-span-3 print:col-span-3 flex flex-col items-center sm:items-start print:items-start justify-center">
              <img
                src="/logo-enp-transparent.png"
                alt="Logo École Nationale Polytechnique"
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </div>

            {/* En haut au milieu : Nom de l'école & Direction */}
            <div className="col-span-12 sm:col-span-6 print:col-span-6 flex flex-col items-center justify-center text-center">
              <h1 className="text-base sm:text-lg md:text-xl font-bold uppercase tracking-wider text-[#0d3b66] font-sans">
                ÉCOLE NATIONALE POLYTECHNIQUE
              </h1>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-700 font-sans mt-0.5">
                Direction des Affaires Académiques & de la Scolarité Centrale
              </p>
              <p className="text-[10px] text-slate-600 font-sans">
                Registre Pédagogique Officiel • Cahier de Texte Numérique Certifié
              </p>
              <p className="text-[9px] text-slate-500 font-sans">
                BP 1515 Lomé • Lomé - République Togolaise
              </p>
            </div>

            {/* En haut à droite : Armoiries et devise de la République Togolaise */}
            <div className="col-span-12 sm:col-span-3 print:col-span-3 flex flex-col items-center sm:items-end print:items-end justify-center text-center sm:text-right print:text-right">
              <img
                src="/armoiries-togo.svg"
                alt="Armoiries de la République Togolaise"
                className="w-12 h-14 object-contain mb-1"
              />
              <div className="text-[10px] leading-tight text-slate-700 uppercase font-sans">
                <p className="font-bold text-[#0d3b66]">RÉPUBLIQUE TOGOLAISE</p>
                <p className="italic text-[9px] text-slate-600">Travail - Liberté - Patrie</p>
                <p className="text-[8px] text-slate-500 mt-0.5">Ministère de l'Enseignement Supérieur & de la Recherche</p>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. TITRE & BANNIÈRE DU REGISTRE                          */}
          {/* ========================================================= */}
          <div className="text-center my-4 sm:my-5 py-2 sm:py-2.5 bg-[#f0f5ff] border-y border-[#d8dee5]">
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-[#0d3b66] font-sans">
              REGISTRE OFFICIEL DU CAHIER DE TEXTE NUMÉRIQUE
            </h2>
            <p className="text-xs text-slate-700 font-sans mt-0.5">
              Année Universitaire <strong>2026-2027</strong> • Semestre 1 (Harmattan) • Session Normale
            </p>
          </div>

          {/* ========================================================= */}
          {/* 3. CARTOUCHE DE L'UE ET DE LA PROMOTION                   */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 p-3.5 bg-slate-50 print:bg-slate-50/50 border border-slate-300 text-xs mb-5 font-sans">
            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-36 text-slate-500 font-medium">Unité d'Enseignement :</span>
                <span className="font-bold text-[#0d3b66]">
                  {ueCiblee ? `${ueCiblee.code} - ${ueCiblee.intitule}` : 'Ensemble des Unités d\'Enseignement'}
                </span>
              </div>
              <div className="flex">
                <span className="w-36 text-slate-500 font-medium">Enseignant(s) titulaire(s) :</span>
                <span className="font-semibold text-slate-800">
                  {ueCiblee && ueCiblee.enseignants.length > 0
                    ? ueCiblee.enseignants.join(', ')
                    : 'Corps Professoral de l\'ENP'}
                </span>
              </div>
              <div className="flex">
                <span className="w-36 text-slate-500 font-medium">Régime d'études :</span>
                <span className="text-slate-800">Formation Initiale d'Ingénieurs Polytech</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-36 text-slate-500 font-medium">Promotion / Filière :</span>
                <span className="font-semibold text-slate-800">Cycle Ingénieur • Promotion 2026-2027</span>
              </div>
              <div className="flex">
                <span className="w-36 text-slate-500 font-medium">Date d'édition certifiée :</span>
                <span className="text-slate-800">{dateDuJour} à {heureEdition}</span>
              </div>
              <div className="flex">
                <span className="w-36 text-slate-500 font-medium">Référence d'archivage :</span>
                <span className="font-mono text-slate-700">
                  ENP-CDT-2026-{ueCiblee ? ueCiblee.code : 'GLOBAL'}-REG
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 4. SUIVI DES VOLUMES HORAIRES RÉGLEMENTAIRES (Si UE)      */}
          {/* ========================================================= */}
          {ueCiblee && avancements.get(ueCiblee.ueId) && (
            <div className="border border-slate-300 bg-slate-50 p-3.5 mb-5 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-[#0d3b66] text-[11px] mb-2.5 flex items-center justify-between">
                <span>Suivi de l'avancement horaire réglementaire (Maquette vs Réalisé)</span>
                <span className="font-mono text-xs font-semibold text-slate-600">
                  Volume global : {avancements.get(ueCiblee.ueId)!.heuresEffectuees.cm + avancements.get(ueCiblee.ueId)!.heuresEffectuees.td + avancements.get(ueCiblee.ueId)!.heuresEffectuees.tp}h effectives
                </span>
              </h3>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-white border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Cours Magistraux (CM)</p>
                  <p className="text-sm font-bold font-mono text-[#0d3b66] mt-0.5">
                    {avancements.get(ueCiblee.ueId)!.heuresEffectuees.cm}h / {avancements.get(ueCiblee.ueId)!.heuresPrevues.cm}h
                  </p>
                </div>
                <div className="p-2 bg-white border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Travaux Dirigés (TD)</p>
                  <p className="text-sm font-bold font-mono text-[#0d3b66] mt-0.5">
                    {avancements.get(ueCiblee.ueId)!.heuresEffectuees.td}h / {avancements.get(ueCiblee.ueId)!.heuresPrevues.td}h
                  </p>
                </div>
                <div className="p-2 bg-white border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Travaux Pratiques (TP)</p>
                  <p className="text-sm font-bold font-mono text-[#0d3b66] mt-0.5">
                    {avancements.get(ueCiblee.ueId)!.heuresEffectuees.tp}h / {avancements.get(ueCiblee.ueId)!.heuresPrevues.tp}h
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. BILAN GLOBAL DU PÉRIMÈTRE                              */}
          {/* ========================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-2.5 sm:gap-3 text-center mb-6">
            <div className="p-2.5 bg-slate-50 border border-slate-300">
              <p className="text-[10px] text-slate-500 uppercase font-medium">Séances au registre</p>
              <p className="text-base font-bold font-mono text-[#0d3b66] mt-0.5">
                {synthese.totalSeances}
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-300">
              <p className="text-[10px] text-slate-500 uppercase font-medium">Séances tenues</p>
              <p className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                {synthese.tenues} ({synthese.totalHeures}h)
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-300">
              <p className="text-[10px] text-slate-500 uppercase font-medium">Séances visées</p>
              <p className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                {synthese.visees}
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-300">
              <p className="text-[10px] text-slate-500 uppercase font-medium">En attente de visa</p>
              <p className="text-base font-bold font-mono text-amber-700 mt-0.5">
                {synthese.enAttente}
              </p>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 6. REGISTRE CHRONOLOGIQUE DES SÉANCES                     */}
          {/* ========================================================= */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-sans">
                Fiches chronologiques des séances enregistrées ({seancesFiltrees.length})
              </h3>
              <span className="text-[11px] text-slate-500 italic">
                Chaque séance fait l'objet d'un visa académique individuel
              </span>
            </div>

            {seancesFiltrees.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 text-slate-500 text-xs italic">
                Aucune séance n'est enregistrée pour ce périmètre.
              </div>
            ) : (
              seancesFiltrees.map((seance, index) => {
                const statutInfo = LIBELLES_STATUT[seance.statut] ?? {
                  label: seance.statut,
                  badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
                };
                const visaInfo = LIBELLES_VISA[seance.visa.statut] ?? {
                  label: seance.visa.statut,
                  badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
                };
                const duree = calculerDuree(seance.debut, seance.fin);

                return (
                  <div
                    key={seance.id}
                    className="cahier-seance-card border border-slate-300 bg-white overflow-hidden shadow-xs print:shadow-none break-inside-avoid"
                  >
                    {/* Bandeau supérieur de la séance */}
                    <div className="bg-[#0d3b66] text-white p-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs uppercase font-mono bg-white/15 px-2 py-0.5 border border-white/20">
                          Séance N° {index + 1}
                        </span>
                        <span className="text-xs font-semibold capitalize">
                          {formaterDateFr(seance.date)}
                        </span>
                        <span className="text-xs text-slate-200">
                          • {seance.debut} - {seance.fin} {duree && `(${duree})`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase px-2 py-0.5 bg-white text-[#0d3b66] border border-white">
                          {seance.type}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 bg-white/15 border border-white/20 text-white font-medium">
                          {statutInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Sous-bandeau d'identification */}
                    <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#0d3b66]">{seance.ueCode}</span>
                        <span className="text-slate-700 font-medium">{seance.ueIntitule}</span>
                      </div>

                      <div className="flex items-center gap-3 text-slate-600 text-[11px]">
                        <span>
                          Groupe : <strong>{seance.groupe || 'Promotion entière'}</strong>
                        </span>
                        {seance.effectif !== undefined && seance.effectif !== null && (
                          <span>
                            Effectif présent : <strong>{seance.effectif} étudiants</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Corps pédagogique de la séance */}
                    <div className="p-3.5 space-y-3 text-xs">
                      {/* Intitulé du cours / Chapitre */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                          Thème / Intitulé de la séance :
                        </p>
                        <p className="font-bold text-slate-900 text-sm">
                          {seance.intitule || 'Séance pédagogique régulière'}
                        </p>
                      </div>

                      {/* Contenu pédagogique développé */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                          Contenu pédagogique développé :
                        </p>
                        <div className="bg-slate-50 p-2.5 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line text-xs font-sans">
                          {seance.contenu || 'Aucun descriptif de contenu renseigné.'}
                        </div>
                      </div>

                      {/* Travail prescrit & Devoirs */}
                      {seance.travailAFaire && (
                        <div className="bg-amber-50/60 p-2.5 border-l-3 border-amber-500 border-t border-r border-b border-amber-200 text-slate-800">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-0.5">
                            Travail prescrit & Devoirs à préparer :
                          </p>
                          <p className="leading-relaxed whitespace-pre-line text-xs">
                            {seance.travailAFaire}
                          </p>
                        </div>
                      )}

                      {/* Observations & Incidents */}
                      {seance.observations && (
                        <div className="bg-slate-100 p-2 border-l-2 border-slate-400 text-slate-700 text-[11px]">
                          <span className="font-bold text-slate-800">Observations / Incidents : </span>
                          {seance.observations}
                        </div>
                      )}
                    </div>

                    {/* Bandeau de Visa officiel de l'enseignant + Liens d'action */}
                    <div className="px-3.5 py-2.5 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Visa de l'enseignant titulaire :
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 border ${visaInfo.badgeClass}`}>
                          {visaInfo.label}
                        </span>
                        {seance.visa.date && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            (le {new Date(seance.visa.date).toLocaleDateString('fr-FR')} à {new Date(seance.visa.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        )}
                      </div>

                      {/* Boutons d'action rapides (Masqués à l'impression) */}
                      <div className="no-print flex items-center gap-2">
                        <Link to={`/cahier-texte/${seance.id}`}>
                          <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                            Détail & Historique
                          </Button>
                        </Link>
                        {peutViser && seance.visa.statut === 'en_attente' && (
                          <Link to="/visas">
                            <Button variant="primary" size="sm" className="text-xs h-7 px-2 bg-emerald-700 hover:bg-emerald-800" leftIcon={<Stamp className="w-3 h-3" />}>
                              Viser
                            </Button>
                          </Link>
                        )}
                      </div>

                      {seance.visa.commentaire && (
                        <div className="w-full text-[11px] text-slate-700 italic bg-white p-2 border border-slate-200 mt-1">
                          <span className="font-semibold text-slate-900 not-italic">Remarque de visa : </span>
                          {seance.visa.commentaire}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ========================================================= */}
          {/* 7. CLÔTURE DU REGISTRE & SIGNATURES TRIPARTITES          */}
          {/* ========================================================= */}
          <div className="pt-2 text-[10px] text-slate-600 space-y-4 break-inside-avoid">
            <p className="italic text-center text-[9px] text-slate-500">
              Le présent registre officiel du Cahier de Texte Numérique est certifié conforme par le Système Pédagogique Intégré de l'École Nationale Polytechnique (ENP).
              Toute falsification ou rature entraîne de plein droit l'annulation du document et des poursuites disciplinaires.
            </p>

            <div className="grid grid-cols-3 print:grid-cols-3 gap-4 pt-3">
              {/* 1. Délégué de promotion */}
              <div className="border border-slate-300 p-2.5 text-center h-28 flex flex-col justify-between bg-slate-50/50">
                <p className="font-bold text-[10px] text-[#0d3b66] uppercase">
                  Le Délégué de Promotion
                </p>
                <p className="text-[8px] text-slate-500 leading-tight">
                  Rédacteur des séances
                </p>
                <p className="text-[8px] text-slate-400 italic">Visa & Signature</p>
              </div>

              {/* 2. Enseignant Titulaire */}
              <div className="border border-slate-300 p-2.5 text-center h-28 flex flex-col justify-between bg-slate-50/50">
                <p className="font-bold text-[10px] text-[#0d3b66] uppercase">
                  L'Enseignant Titulaire
                </p>
                <p className="text-[8px] text-slate-500 leading-tight">
                  Coordonnateur de l'UE
                </p>
                <p className="text-[8px] text-slate-400 italic">Visa Pédagogique & Signature</p>
              </div>

              {/* 3. Direction des Études */}
              <div className="border border-slate-300 p-2.5 text-center h-28 flex flex-col justify-between bg-slate-50/50">
                <p className="font-bold text-[10px] text-[#0d3b66] uppercase">
                  Pour la Direction des Études
                </p>
                <p className="text-[8px] text-slate-500 leading-tight">
                  Chef de Département & Scolarité
                </p>
                <p className="text-[8px] text-slate-400 italic">Sceau officiel ENP & Signature</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-2 border-t border-slate-200">
              <span>Identifiant de conformité numérique : ENP-CERT-CDT-2026-{filtreUe}-{Date.now().toString().slice(-6)}</span>
              <span>Fait à Lomé, le {dateDuJour}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
