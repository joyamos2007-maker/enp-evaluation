import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Clock,
  Download,
  Stamp,
  AlertCircle,
  Search,
  CheckCircle2,
  Calendar,
  X,
  FileText,
  Filter,
  Check,
  MessageSquare,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { Avancement, Seance, UeCahier, TypeSeance, StatutVisa } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import {
  PageHeader,
  Button,
  Badge,
  Input,
  Select,
  Alert,
  EmptyState,
  Modal,
} from '@/components/ui';

const LIBELLES_VISA: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' }> = {
  en_attente: { label: 'En attente de visa', variant: 'warning' },
  vise: { label: 'Visée', variant: 'success' },
  conteste: { label: 'Contestée', variant: 'danger' },
};

export function CahierTexte() {
  const { aRole } = useAuth();
  const navigate = useNavigate();

  const peutSaisir = aRole('delegue');
  const peutViser = aRole('enseignant');

  const [ues, setUes] = useState<UeCahier[]>([]);
  const [seances, setSeances] = useState<Seance[]>([]);
  const [avancements, setAvancements] = useState<Map<number, Avancement>>(new Map());

  // Filtres simplifiés et pratiques
  const [recherche, setRecherche] = useState('');
  const [filtreUe, setFiltreUe] = useState<string>('all');
  const [filtreVisa, setFiltreVisa] = useState<'all' | 'en_attente' | 'vise' | 'conteste'>('all');
  const [filtreType, setFiltreType] = useState<string>('all');

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [messageSucces, setMessageSucces] = useState<string | null>(null);
  const [exportEnCours, setExportEnCours] = useState(false);

  // Actions de visa directes
  const [seanceEnCoursVisa, setSeanceEnCoursVisa] = useState<number | null>(null);
  const [seanceAContester, setSeanceAContester] = useState<Seance | null>(null);
  const [motifContestation, setMotifContestation] = useState('');
  const [erreurContestation, setErreurContestation] = useState<string | null>(null);
  const [envoiContestation, setEnvoiContestation] = useState(false);

  // Chargement des données
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

      // Chargement avancements
      const avMap = new Map<number, Avancement>();
      try {
        const avancees = await Promise.all(uesData.map((u) => api.avancementUe(u.ueId)));
        avancees.forEach((av) => avMap.set(av.ueId, av));
      } catch {
        // Ignorer si droits restreints
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

  // Nombre de séances en attente pour l'enseignant
  const nbEnAttente = useMemo(() => {
    return seances.filter((s) => s.visa.statut === 'en_attente').length;
  }, [seances]);

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

  // Action rapide : Viser directement une séance
  async function viserDirectement(seance: Seance) {
    setSeanceEnCoursVisa(seance.id);
    setMessageSucces(null);
    try {
      const seanceVisée = await api.visaSeance(seance.id, { decision: 'vise' });
      // Mise à jour immédiate en local
      setSeances((prev) =>
        prev.map((s) => (s.id === seance.id ? { ...s, visa: seanceVisée.visa } : s))
      );
      setMessageSucces(`La séance de « ${seance.ueCode} » du ${seance.date} a été visée avec succès.`);
      setTimeout(() => setMessageSucces(null), 4000);
    } catch (err) {
      alert(err instanceof ApiError ? err.messages.join(' ') : 'Erreur lors du visa de la séance.');
    } finally {
      setSeanceEnCoursVisa(null);
    }
  }

  // Action : Confirmer la contestation
  async function soumettreContestation() {
    if (!seanceAContester) return;
    if (!motifContestation.trim()) {
      setErreurContestation('Veuillez indiquer le motif de votre réserve ou contestation.');
      return;
    }
    setEnvoiContestation(true);
    setErreurContestation(null);
    try {
      const seanceModifiee = await api.visaSeance(seanceAContester.id, {
        decision: 'conteste',
        commentaire: motifContestation.trim(),
      });
      setSeances((prev) =>
        prev.map((s) => (s.id === seanceAContester.id ? { ...s, visa: seanceModifiee.visa } : s))
      );
      setMessageSucces(`Réserve enregistrée pour la séance de « ${seanceAContester.ueCode} ».`);
      setTimeout(() => setMessageSucces(null), 4000);
      setSeanceAContester(null);
      setMotifContestation('');
    } catch (err) {
      setErreurContestation(
        err instanceof ApiError ? err.messages.join(' ') : 'Erreur lors de la contestation.'
      );
    } finally {
      setEnvoiContestation(false);
    }
  }

  // Téléchargement d'exportation
  async function telechargerExport(format: 'pdf' | 'xlsx') {
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
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* En-tête sobre et direct */}
      <PageHeader
        title="Cahier de texte"
        description="Traçabilité des cours dispensés et validation officielle des séances."
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Cahier de texte' }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {peutSaisir && (
              <Link to="/cahier-texte/nouvelle">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="font-bold min-h-[38px]"
                >
                  Nouvelle séance
                </Button>
              </Link>
            )}
            <div className="inline-flex border border-enp-border bg-white">
              <button
                type="button"
                disabled={exportEnCours}
                onClick={() => void telechargerExport('pdf')}
                className="px-3 py-1.5 text-xs font-semibold text-enp-blue-deep hover:bg-enp-blue-ice border-r border-enp-border transition-colors flex items-center gap-1.5"
                title="Exporter le cahier de texte en PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
              <button
                type="button"
                disabled={exportEnCours}
                onClick={() => void telechargerExport('xlsx')}
                className="px-3 py-1.5 text-xs font-semibold text-enp-blue-deep hover:bg-enp-blue-ice transition-colors flex items-center gap-1.5"
                title="Exporter vers Excel"
              >
                <span>Excel</span>
              </button>
            </div>
          </div>
        }
      />

      {/* Message de succès temporaire */}
      {messageSucces && (
        <Alert variant="success" onClose={() => setMessageSucces(null)}>
          {messageSucces}
        </Alert>
      )}

      {/* Bannière d'attention immédiate pour les enseignants : séances à viser */}
      {peutViser && nbEnAttente > 0 && (
        <div className="p-3.5 bg-enp-gold/15 border-l-4 border-enp-gold text-enp-blue-deep flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-subtle">
          <div className="flex items-center gap-2.5">
            <Stamp className="w-5 h-5 text-enp-gold shrink-0" />
            <div>
              <p className="text-xs font-bold font-sans">
                {nbEnAttente} séance{nbEnAttente > 1 ? 's' : ''} en attente de votre visa
              </p>
              <p className="text-[11px] text-enp-gray-medium">
                Vérifiez les heures et le contenu consignés par les délégués, puis validez d'un simple clic.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltreVisa('en_attente')}
            className={`border-enp-gold/40 text-enp-blue-deep shrink-0 text-xs font-bold ${
              filtreVisa === 'en_attente' ? 'bg-white shadow-subtle' : 'bg-white/80 hover:bg-white'
            }`}
          >
            {filtreVisa === 'en_attente' ? 'Filtre actif' : 'Afficher uniquement celles-ci'}
          </Button>
        </div>
      )}

      {/* Raccourcis par UE : sélecteur horizontal épuré */}
      {ues.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-enp-gray-medium uppercase tracking-wider">
            Matières dispensées :
          </p>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => setFiltreUe('all')}
              className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors border select-none ${
                filtreUe === 'all'
                  ? 'bg-enp-blue-deep text-white border-enp-blue-deep shadow-subtle'
                  : 'bg-white text-enp-black border-enp-border hover:bg-slate-50'
              }`}
            >
              Toutes les UE ({seances.length})
            </button>

            {ues.map((u) => {
              const estActif = String(u.ueId) === filtreUe;
              const av = avancements.get(u.ueId);
              const heuresRealisees = av
                ? av.heuresEffectuees.cm + av.heuresEffectuees.td + av.heuresEffectuees.tp
                : null;
              const nbSeancesUe = seances.filter((s) => s.ueId === u.ueId).length;

              return (
                <button
                  key={u.ueId}
                  type="button"
                  onClick={() => setFiltreUe(String(u.ueId))}
                  className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors border flex items-center gap-2 select-none ${
                    estActif
                      ? 'bg-enp-blue-deep text-white border-enp-blue-deep shadow-subtle'
                      : 'bg-white text-enp-black border-enp-border hover:bg-slate-50'
                  }`}
                >
                  <span className="font-mono">{u.code}</span>
                  <span className="text-[11px] opacity-80 truncate max-w-[140px] font-normal">
                    {u.intitule}
                  </span>
                  <span
                    className={`text-[10px] px-1 py-0.2 ${
                      estActif ? 'bg-white/20 text-white' : 'bg-slate-100 text-enp-gray-medium'
                    }`}
                  >
                    {heuresRealisees !== null ? `${heuresRealisees}h` : `${nbSeancesUe}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Barre de recherche et filtres simples */}
      <div className="bg-white border border-enp-border p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Recherche rapide */}
          <div className="flex-1 max-w-md">
            <Input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher par thème, leçon, mot-clé..."
              startIcon={<Search className="w-4 h-4 text-enp-gray-medium" />}
            />
          </div>

          {/* Filtres par état de visa */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFiltreVisa('all')}
              className={`px-2.5 py-1.5 text-xs font-semibold border transition-colors ${
                filtreVisa === 'all'
                  ? 'bg-enp-blue-primary text-white border-enp-blue-primary'
                  : 'bg-white text-enp-gray-medium border-enp-border hover:text-enp-black'
              }`}
            >
              Toutes ({seances.length})
            </button>
            {(peutViser || peutSaisir || aRole('chef_departement') || aRole('scolarite')) && (
              <button
                type="button"
                onClick={() => setFiltreVisa('en_attente')}
                className={`px-2.5 py-1.5 text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                  filtreVisa === 'en_attente'
                    ? 'bg-enp-blue-primary text-white border-enp-blue-primary'
                    : 'bg-white text-enp-gray-medium border-enp-border hover:text-enp-black'
                }`}
              >
                <span>À viser</span>
                {nbEnAttente > 0 && (
                  <span className="w-2 h-2 bg-enp-gold rounded-full" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setFiltreVisa('vise')}
              className={`px-2.5 py-1.5 text-xs font-semibold border transition-colors ${
                filtreVisa === 'vise'
                  ? 'bg-enp-blue-primary text-white border-enp-blue-primary'
                  : 'bg-white text-enp-gray-medium border-enp-border hover:text-enp-black'
              }`}
            >
              Visées
            </button>
            <button
              type="button"
              onClick={() => setFiltreVisa('conteste')}
              className={`px-2.5 py-1.5 text-xs font-semibold border transition-colors ${
                filtreVisa === 'conteste'
                  ? 'bg-enp-blue-primary text-white border-enp-blue-primary'
                  : 'bg-white text-enp-gray-medium border-enp-border hover:text-enp-black'
              }`}
            >
              Réserves
            </button>
          </div>

          {/* Filtre par type */}
          <div className="w-28 shrink-0">
            <Select
              value={filtreType}
              onChange={(e) => setFiltreType(e.target.value)}
              aria-label="Type de cours"
            >
              <option value="all">Tous types</option>
              <option value="CM">CM</option>
              <option value="TD">TD</option>
              <option value="TP">TP</option>
              <option value="AUTRE">Autre</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Liste chronologique épurée des séances */}
      {chargement ? (
        <div className="py-12 text-center text-enp-gray-medium text-xs">
          Chargement du cahier de texte…
        </div>
      ) : erreur ? (
        <Alert variant="danger" title="Erreur de chargement">
          {erreur}
        </Alert>
      ) : seancesFiltrees.length === 0 ? (
        <EmptyState
          title="Aucune séance ne correspond aux critères"
          description={
            filtreVisa === 'en_attente'
              ? "Toutes les séances ont déjà été visées. Vous êtes parfaitement à jour !"
              : "Aucune séance enregistrée pour cette matière ou ce filtre."
          }
          actionLabel={filtreVisa !== 'all' || filtreUe !== 'all' ? 'Réinitialiser les filtres' : undefined}
          onAction={() => {
            setFiltreVisa('all');
            setFiltreUe('all');
            setFiltreType('all');
            setRecherche('');
          }}
        />
      ) : (
        <div className="space-y-3">
          {seancesFiltrees.map((s) => {
            const visaInfo = LIBELLES_VISA[s.visa.statut] ?? {
              label: s.visa.statut,
              variant: 'neutral' as const,
            };
            const estEnAttente = s.visa.statut === 'en_attente';
            const enCoursSurCetteSeance = seanceEnCoursVisa === s.id;

            return (
              <div
                key={s.id}
                className={`bg-white border p-4 sm:p-5 transition-all space-y-3 ${
                  estEnAttente
                    ? 'border-l-4 border-l-enp-gold border-enp-border shadow-subtle'
                    : s.visa.statut === 'conteste'
                    ? 'border-l-4 border-l-enp-red-error border-enp-border'
                    : 'border-l-4 border-l-enp-green-valid border-enp-border'
                }`}
              >
                {/* Ligne 1 : Date, UE, Type et Statut du visa */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-enp-border/70">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Badge date et heure */}
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-enp-blue-deep bg-enp-blue-ice px-2.5 py-1 border border-enp-border">
                      <Calendar className="w-3.5 h-3.5 text-enp-blue-primary" />
                      <span>{formaterDateFr(s.date)}</span>
                      <span className="text-enp-gray-medium">•</span>
                      <Clock className="w-3.5 h-3.5 text-enp-gray-medium" />
                      <span>{s.debut} - {s.fin}</span>
                    </span>

                    {/* Badge code UE */}
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-enp-blue-light text-enp-blue-deep border border-enp-blue-primary/20">
                      {s.ueCode}
                    </span>

                    {/* Badge type */}
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-enp-black border border-enp-border">
                      {s.type}
                    </span>
                  </div>

                  {/* Statut du visa */}
                  <div className="flex items-center gap-2">
                    <Badge variant={visaInfo.variant} size="sm">
                      {visaInfo.label}
                    </Badge>
                  </div>
                </div>

                {/* Ligne 2 : Titre de la leçon & Contenu pédagogique */}
                <div className="space-y-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-enp-black">
                    {s.intitule || 'Séance sans titre'}
                  </h3>
                  {s.contenu && (
                    <p className="text-xs sm:text-sm text-enp-gray-dark leading-relaxed">
                      {s.contenu}
                    </p>
                  )}
                </div>

                {/* Travail à faire / Devoirs (si présent) */}
                {s.travailAFaire && (
                  <div className="p-2.5 bg-slate-50 border border-enp-border/80 text-xs flex items-start gap-2">
                    <FileText className="w-4 h-4 text-enp-blue-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-enp-blue-deep">Travail à faire : </span>
                      <span className="text-enp-black">{s.travailAFaire}</span>
                    </div>
                  </div>
                )}

                {/* Commentaire de contestation si existant */}
                {s.visa.statut === 'conteste' && s.visa.commentaire && (
                  <div className="p-2.5 bg-enp-red-light border-l-2 border-enp-red-error text-xs text-enp-red-error flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Motif de la réserve : </span>
                      <span>{s.visa.commentaire}</span>
                    </div>
                  </div>
                )}

                {/* Ligne 3 : Barre d'action rapide pour le professeur */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="text-[11px] text-enp-gray-medium">
                    {s.visa.statut === 'vise' && s.visa.date && (
                      <span className="text-enp-green-valid font-medium inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Visée le {new Date(s.visa.date).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Actions de visa directes pour les profs */}
                    {peutViser && estEnAttente && (
                      <>
                        <button
                          type="button"
                          disabled={enCoursSurCetteSeance}
                          onClick={() => void viserDirectement(s)}
                          className="px-3.5 py-1.5 bg-enp-green-valid hover:bg-enp-teal-dark text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-subtle disabled:opacity-50"
                          title="Valider et viser cette séance en 1 clic"
                        >
                          <Check className="w-4 h-4" />
                          <span>{enCoursSurCetteSeance ? 'Validation…' : 'Viser la séance'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={enCoursSurCetteSeance}
                          onClick={() => {
                            setSeanceAContester(s);
                            setMotifContestation('');
                            setErreurContestation(null);
                          }}
                          className="px-3 py-1.5 bg-white border border-enp-border hover:border-enp-red-error text-enp-red-error text-xs font-semibold transition-colors flex items-center gap-1.5"
                          title="Signaler une erreur ou émettre une réserve"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Réserve</span>
                        </button>
                      </>
                    )}

                    {/* Lien vers consultation détaillée */}
                    <Link to={`/cahier-texte/${s.id}`}>
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-white border border-enp-border hover:bg-slate-50 text-enp-black text-xs font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <span>Détails</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale simple pour émettre une réserve (Contestation) */}
      <Modal
        isOpen={Boolean(seanceAContester)}
        onClose={() => setSeanceAContester(null)}
        title="Émettre une réserve sur la séance"
        subtitle={
          seanceAContester
            ? `${seanceAContester.ueCode} • ${formaterDateFr(seanceAContester.date)} (${seanceAContester.debut}-${seanceAContester.fin})`
            : undefined
        }
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              disabled={envoiContestation}
              onClick={() => setSeanceAContester(null)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={envoiContestation}
              onClick={() => void soumettreContestation()}
            >
              Enregistrer la réserve
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-left">
          <p className="text-xs text-enp-gray-medium leading-relaxed">
            Indiquez le motif précis de la réserve (ex : horaires réels différents, enseignement reporté, contenu non conforme).
          </p>

          <textarea
            rows={3}
            value={motifContestation}
            onChange={(e) => setMotifContestation(e.target.value)}
            placeholder="Ex : Le cours a duré 1h30 au lieu de 2h..."
            className="w-full text-xs p-2.5 border border-enp-border focus:border-enp-blue-primary focus:outline-none"
            autoFocus
          />

          {erreurContestation && (
            <p className="text-xs text-enp-red-error font-medium">{erreurContestation}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
