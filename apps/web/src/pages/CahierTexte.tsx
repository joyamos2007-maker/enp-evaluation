import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Filter,
  Download,
  List,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Stamp,
  AlertCircle,
  FileCheck2,
  Paperclip,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { Avancement, Seance, UeCahier, TypeSeance, StatutSeance, StatutVisa } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import {
  PageHeader,
  Button,
  Table,
  Badge,
  ProgressBar,
  Input,
  Select,
  Alert,
  EmptyState,
} from '@/components/ui';

type ModeAffichage = 'chronologique' | 'tableau' | 'calendrier';

const LIBELLES_VISA: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' }> = {
  en_attente: { label: 'En attente de visa', variant: 'warning' },
  vise: { label: 'Visée par l’enseignant', variant: 'success' },
  conteste: { label: 'Contestée', variant: 'danger' },
};

const LIBELLES_STATUT: Record<string, string> = {
  tenue: 'Séance tenue',
  reportee: 'Reportée',
  annulee: 'Annulée',
  enseignant_absent: 'Enseignant absent',
  planifiee: 'Planifiée',
};

export function CahierTexte() {
  const { aRole, utilisateur } = useAuth();
  const navigate = useNavigate();

  const peutSaisir = aRole('delegue');
  const peutViser = aRole('enseignant');

  const [ues, setUes] = useState<UeCahier[]>([]);
  const [seances, setSeances] = useState<Seance[]>([]);
  const [avancements, setAvancements] = useState<Map<number, Avancement>>(new Map());

  // Vues & Filtres
  const [mode, setMode] = useState<ModeAffichage>('chronologique');
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
        // En cas de droits limités sur avancement, on ignore
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

  // Séances filtrées
  const seancesFiltrees = useMemo(() => {
    return seances.filter((s) => {
      const matchUe = filtreUe === 'all' || String(s.ueId) === filtreUe;
      const matchType = filtreType === 'all' || s.type === filtreType;
      const matchVisa = filtreVisa === 'all' || s.visa.statut === filtreVisa;
      const matchSearch =
        !recherche ||
        (s.intitule && s.intitule.toLowerCase().includes(recherche.toLowerCase())) ||
        s.ueCode.toLowerCase().includes(recherche.toLowerCase()) ||
        (s.contenu && s.contenu.toLowerCase().includes(recherche.toLowerCase()));

      return matchUe && matchType && matchVisa && matchSearch;
    });
  }, [seances, filtreUe, filtreType, filtreVisa, recherche]);

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

  function formaterDateFr(dateIso: string) {
    try {
      const d = new Date(dateIso + 'T00:00:00');
      return d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateIso;
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Cahier de Texte Numérique Officiel"
        description="Traçabilité des cours magistraux, travaux dirigés et pratiques • Visas des enseignants"
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Cahier de texte' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {peutSaisir && (
              <Link to="/cahier-texte/nouvelle" className="w-full sm:w-auto">
                <Button variant="primary" size="md" className="w-full sm:w-auto justify-center" leftIcon={<Plus className="w-4 h-4" />}>
                  Nouvelle séance
                </Button>
              </Link>
            )}
            <div className="flex items-center border border-enp-border bg-white w-full sm:w-auto justify-center">
              <button
                type="button"
                disabled={exportEnCours}
                onClick={() => void telechargerExport('pdf')}
                className="px-2.5 py-1.5 text-xs font-semibold hover:bg-enp-blue-ice border-r border-enp-border transition-colors"
                title="Exporter au format PDF officiel"
              >
                PDF
              </button>
              <button
                type="button"
                disabled={exportEnCours}
                onClick={() => void telechargerExport('xlsx')}
                className="px-2.5 py-1.5 text-xs font-semibold hover:bg-enp-blue-ice border-r border-enp-border transition-colors"
                title="Exporter au format Excel"
              >
                Excel
              </button>
              <button
                type="button"
                disabled={exportEnCours}
                onClick={() => void telechargerExport('docx')}
                className="px-2.5 py-1.5 text-xs font-semibold hover:bg-enp-blue-ice transition-colors"
                title="Exporter au format Word"
              >
                Word
              </button>
            </div>
          </div>
        }
      />

      {/* Cartes d'avancement horaire si disponibles */}
      {ues.length > 0 && avancements.size > 0 && (
        <div className="bg-white border border-enp-border p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep mb-3">
            Avancement horaire des Unités d'Enseignement
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ues.map((u) => {
              const av = avancements.get(u.ueId);
              const heuresRealisees = av
                ? av.heuresEffectuees.cm + av.heuresEffectuees.td + av.heuresEffectuees.tp
                : 0;
              const volumePrevu = av
                ? av.heuresPrevues.cm + av.heuresPrevues.td + av.heuresPrevues.tp
                : 45;
              const pct = volumePrevu > 0 ? Math.min(100, Math.round((heuresRealisees / volumePrevu) * 100)) : 0;

              return (
                <div key={u.ueId} className="p-3 border border-enp-border/80 bg-enp-blue-ice/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-enp-blue-deep">{u.code}</span>
                    <span className="text-xs font-semibold text-enp-black">{pct}%</span>
                  </div>
                  <p className="text-xs text-enp-gray-medium truncate" title={u.intitule}>
                    {u.intitule}
                  </p>
                  <ProgressBar
                    value={pct}
                    showPercent={false}
                    size="sm"
                    variant={pct >= 80 ? 'success' : 'primary'}
                  />
                  <p className="text-[11px] text-enp-gray-medium">
                    {heuresRealisees}h réalisées sur {volumePrevu}h prévues
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Barre de contrôle : Recherche, Filtres & Bascule de vue */}
      <div className="bg-white border border-enp-border p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="w-full lg:max-w-sm lg:flex-1">
            <Input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher dans les contenus ou intitulés..."
              startIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-40">
              <Select
                value={filtreUe}
                onChange={(e) => setFiltreUe(e.target.value)}
                aria-label="Filtrer par unité d'enseignement"
              >
                <option value="all">Toutes les UE</option>
                {ues.map((u) => (
                  <option key={u.ueId} value={u.ueId}>
                    {u.code} : {u.intitule}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-full sm:w-32">
              <Select
                value={filtreType}
                onChange={(e) => setFiltreType(e.target.value)}
                aria-label="Filtrer par type de séance"
              >
                <option value="all">Tous types</option>
                <option value="CM">CM</option>
                <option value="TD">TD</option>
                <option value="TP">TP</option>
                <option value="AUTRE">Autre</option>
              </Select>
            </div>

            <div className="w-full sm:w-36">
              <Select
                value={filtreVisa}
                onChange={(e) => setFiltreVisa(e.target.value)}
                aria-label="Filtrer par statut de visa"
              >
                <option value="all">Tous les visas</option>
                <option value="en_attente">En attente</option>
                <option value="vise">Visées</option>
                <option value="conteste">Contestées</option>
              </Select>
            </div>

            {/* Sélecteur de mode d'affichage */}
            <div className="flex items-center border border-enp-border ml-auto mt-1 sm:mt-0">
              <button
                type="button"
                onClick={() => setMode('chronologique')}
                className={`p-2 transition-colors ${
                  mode === 'chronologique'
                    ? 'bg-enp-blue-primary text-white'
                    : 'bg-white text-enp-gray-medium hover:text-enp-black'
                }`}
                aria-label="Vue chronologique"
                title="Vue chronologique"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMode('tableau')}
                className={`p-2 border-l border-enp-border transition-colors ${
                  mode === 'tableau'
                    ? 'bg-enp-blue-primary text-white'
                    : 'bg-white text-enp-gray-medium hover:text-enp-black'
                }`}
                aria-label="Vue tableau"
                title="Vue tableau structuré"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMode('calendrier')}
                className={`p-2 border-l border-enp-border transition-colors ${
                  mode === 'calendrier'
                    ? 'bg-enp-blue-primary text-white'
                    : 'bg-white text-enp-gray-medium hover:text-enp-black'
                }`}
                aria-label="Vue calendrier"
                title="Vue calendrier"
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu selon le mode sélectionné */}
      {chargement ? (
        <div className="py-12 text-center text-enp-gray-medium text-sm">
          Chargement des séances officielles…
        </div>
      ) : erreur ? (
        <Alert variant="danger" title="Erreur">{erreur}</Alert>
      ) : seancesFiltrees.length === 0 ? (
        <EmptyState
          title="Aucune séance trouvée"
          description={
            peutSaisir
              ? "Aucune séance ne correspond aux filtres appliqués. Cliquez sur « Nouvelle séance » pour consigner une heure de cours."
              : "Aucune séance consignée pour ces critères."
          }
          actionLabel={peutSaisir ? "Nouvelle séance" : undefined}
          onAction={peutSaisir ? () => navigate('/cahier-texte/nouvelle') : undefined}
        />
      ) : mode === 'tableau' ? (
        // VUE 1 : TABLEAU STRUCTURÉ
        <Table<Seance>
          columns={[
            {
              key: 'date',
              header: 'Date & Horaires',
              render: (s) => (
                <div>
                  <span className="font-semibold text-enp-blue-deep block">
                    {formaterDateFr(s.date)}
                  </span>
                  <span className="text-xs text-enp-gray-medium">
                    {s.debut} - {s.fin}
                  </span>
                </div>
              ),
            },
            {
              key: 'ue',
              header: 'UE',
              render: (s) => (
                <div>
                  <span className="font-mono text-xs font-bold text-enp-blue-deep bg-enp-blue-light px-1.5 py-0.5 border border-enp-blue-primary/20">
                    {s.ueCode}
                  </span>
                </div>
              ),
            },
            {
              key: 'type',
              header: 'Type',
              render: (s) => (
                <span className="text-xs font-semibold px-2 py-0.5 bg-enp-bg border border-enp-border">
                  {s.type}
                </span>
              ),
            },
            {
              key: 'intitule',
              header: 'Intitulé & Contenu',
              render: (s) => (
                <div className="max-w-md">
                  <p className="font-bold text-enp-black truncate">{s.intitule}</p>
                  <p className="text-xs text-enp-gray-medium line-clamp-1">{s.contenu}</p>
                </div>
              ),
            },
            {
              key: 'visa',
              header: 'Visa enseignant',
              render: (s) => {
                const conf = LIBELLES_VISA[s.visa.statut] ?? { label: s.visa.statut, variant: 'neutral' };
                return <Badge variant={conf.variant}>{conf.label}</Badge>;
              },
            },
            {
              key: 'actions',
              header: 'Détails',
              align: 'right',
              render: (s) => (
                <Link to={`/cahier-texte/${s.id}`}>
                  <Button variant="outline" size="sm">
                    Consulter
                  </Button>
                </Link>
              ),
            },
          ]}
          data={seancesFiltrees}
          keyExtractor={(s) => s.id}
          onRowClick={(s) => navigate(`/cahier-texte/${s.id}`)}
        />
      ) : mode === 'calendrier' ? (
        // VUE 2 : CALENDRIER HEBDOMADAIRE / MENSUEL RECTILIGNE
        <div className="bg-white border border-enp-border p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-enp-border">
            <span className="text-sm font-bold text-enp-blue-deep">
              Vue Calendaire des Enseignements
            </span>
            <span className="text-xs text-enp-gray-medium">
              {seancesFiltrees.length} séance(s) répertoriée(s)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {seancesFiltrees.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/cahier-texte/${s.id}`)}
                className="p-3.5 border border-enp-border hover:border-enp-blue-primary bg-white cursor-pointer transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-enp-blue-deep">
                    {formaterDateFr(s.date)}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-enp-bg border border-enp-border">
                    {s.type}
                  </span>
                </div>
                <p className="text-sm font-bold text-enp-black truncate">{s.intitule}</p>
                <p className="text-xs text-enp-gray-medium line-clamp-2">{s.contenu}</p>
                <div className="pt-2 border-t border-enp-border flex items-center justify-between text-xs">
                  <span className="text-enp-gray-medium">{s.debut} - {s.fin}</span>
                  <Badge variant={LIBELLES_VISA[s.visa.statut]?.variant || 'neutral'}>
                    {LIBELLES_VISA[s.visa.statut]?.label || s.visa.statut}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // VUE 3 : CHRONOLOGIQUE ÉLÉGANTE (PAR DÉFAUT)
        <div className="space-y-3">
          {seancesFiltrees.map((s) => {
            const visaConf = LIBELLES_VISA[s.visa.statut] ?? { label: s.visa.statut, variant: 'neutral' };

            return (
              <div
                key={s.id}
                className="bg-white border border-enp-border hover:border-enp-blue-primary/80 transition-colors p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-enp-blue-light text-enp-blue-deep border border-enp-blue-primary/20">
                      {s.ueCode}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-enp-bg border border-enp-border">
                      {s.type}
                    </span>
                    <Badge variant={visaConf.variant}>{visaConf.label}</Badge>
                    <span className="text-xs text-enp-gray-medium">
                      {LIBELLES_STATUT[s.statut] || s.statut}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-enp-black truncate">
                    {s.intitule}
                  </h3>

                  <p className="text-xs sm:text-sm text-enp-gray-dark leading-relaxed line-clamp-2">
                    {s.contenu}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-enp-gray-medium pt-1">
                    <span className="flex items-center gap-1 font-medium text-enp-blue-deep">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {formaterDateFr(s.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {s.debut} à {s.fin}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0">
                  <Link to={`/cahier-texte/${s.id}`}>
                    <Button variant="outline" size="sm">
                      Détail & Historique
                    </Button>
                  </Link>
                  {peutViser && s.visa.statut === 'en_attente' && (
                    <Link to="/visas">
                      <Button variant="primary" size="sm" leftIcon={<Stamp className="w-4 h-4" />}>
                        Viser
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
