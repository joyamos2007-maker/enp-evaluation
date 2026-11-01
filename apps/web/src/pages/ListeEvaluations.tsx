import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  Check,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { UeAEvaluer } from '@/api/types';
import {
  PageHeader,
  ProgressBar,
  StatCard,
  Alert,
  Button,
  Input,
  Badge,
  EmptyState,
  SkeletonCard,
  InfoBubble,
} from '@/components/ui';

export function ListeEvaluations() {
  const [ues, setUes] = useState<UeAEvaluer[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Filtres
  const [recherche, setRecherche] = useState('');
  const [filtreEtat, setFiltreEtat] = useState<'tous' | 'a_faire' | 'terminee'>('tous');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.listeEvaluations();
      setUes(data);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur de communication : impossible de charger la liste de vos UE.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const total = ues.length;
  const terminees = ues.filter((u) => u.etat === 'terminee').length;
  const aFaire = total - terminees;
  const pct = total > 0 ? Math.round((terminees / total) * 100) : 0;

  const uesFiltrees = useMemo(() => {
    return ues.filter((ue) => {
      const matchRecherche =
        !recherche ||
        ue.code.toLowerCase().includes(recherche.toLowerCase()) ||
        ue.intitule.toLowerCase().includes(recherche.toLowerCase());
      const matchEtat =
        filtreEtat === 'tous' || ue.etat === filtreEtat;
      return matchRecherche && matchEtat;
    });
  }, [ues, recherche, filtreEtat]);

  function formaterDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto animate-fade-in pb-4">
      <PageHeader
        title="Évaluations des Unités d'Enseignement"
        description="Campagne officielle d'évaluation pédagogique anonyme • Session Harmattan"
        badge={
          <InfoBubble
            triggerVariant="pill"
            triggerLabel="Garantie d'anonymat"
            title="Garantie institutionnelle d'anonymat et de neutralité"
            badge="SÉCURITÉ DU SCRUTIN"
            icon="shield"
            duration={7000}
            content={
              <div className="space-y-2 text-xs leading-relaxed font-sans">
                <p>
                  Votre évaluation est <strong>strictement anonyme</strong>. Le bulletin est déposé dans l'urne numérique séparée sans aucun lien avec votre identité ou votre matricule.
                </p>
                <p>
                  Une seule soumission définitive est autorisée par unité d'enseignement. Dépouillement sous contrôle du Conseil de Direction.
                </p>
              </div>
            }
          />
        }
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Évaluations des UE' },
        ]}
      />

      {/* Indicateurs de progression globale adaptés au mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <StatCard
          label="UE à évaluer"
          value={aFaire}
          subtext={aFaire > 0 ? "Campagne active" : "Toutes transmises"}
          variant={aFaire > 0 ? 'warning' : 'success'}
          icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5" />}
          className="p-3 sm:p-5"
        />
        <StatCard
          label="Validées"
          value={terminees}
          subtext={`Sur ${total} UE`}
          variant="primary"
          icon={<CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          className="p-3 sm:p-5"
        />
        <div className="col-span-2 sm:col-span-1 bg-white border border-enp-border p-3 sm:p-5 flex flex-col justify-center">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-enp-gray-medium text-[11px] sm:text-xs font-sans">
              Progression globale
            </span>
            <span className="font-bold text-enp-blue-deep font-sans">{pct}%</span>
          </div>
          <ProgressBar
            value={pct}
            showPercent={false}
            size="md"
            variant={pct === 100 ? 'success' : 'primary'}
          />
          <span className="text-[11px] text-enp-gray-medium mt-1 font-sans">
            {terminees} sur {total} complétée(s)
          </span>
        </div>
      </div>

      {/* Barre de filtres et recherche ergonomique mobile */}
      <div className="bg-white border border-enp-border p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher (ex: MAT101)..."
            startIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFiltreEtat('tous')}
            className={`py-2 px-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-center border transition-colors select-none font-sans min-h-[38px] ${
              filtreEtat === 'tous'
                ? 'bg-enp-blue-primary text-white border-enp-blue-primary'
                : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice'
            }`}
          >
            Toutes ({total})
          </button>
          <button
            type="button"
            onClick={() => setFiltreEtat('a_faire')}
            className={`py-2 px-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-center border transition-colors select-none font-sans min-h-[38px] ${
              filtreEtat === 'a_faire'
                ? 'bg-enp-blue-primary text-white border-enp-blue-primary'
                : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice'
            }`}
          >
            À faire ({aFaire})
          </button>
          <button
            type="button"
            onClick={() => setFiltreEtat('terminee')}
            className={`py-2 px-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-center border transition-colors select-none font-sans min-h-[38px] ${
              filtreEtat === 'terminee'
                ? 'bg-enp-blue-primary text-white border-enp-blue-primary'
                : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice'
            }`}
          >
            Terminées ({terminees})
          </button>
        </div>
      </div>

      {/* Liste des unités d'enseignement */}
      {chargement ? (
        <div className="grid grid-cols-1 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : erreur ? (
        <Alert variant="danger" title="Erreur lors du chargement">
          <div className="space-y-3">
            <p>{erreur}</p>
            <Button variant="outline" size="sm" onClick={() => void charger()}>
              Réessayer
            </Button>
          </div>
        </Alert>
      ) : uesFiltrees.length === 0 ? (
        <EmptyState
          title="Aucune unité d'enseignement trouvée"
          description={
            recherche
              ? "Aucune UE ne correspond à vos critères de recherche."
              : "Vous n'avez aucune unité d'enseignement à évaluer pour cette session."
          }
        />
      ) : (
        <div className="space-y-3">
          {uesFiltrees.map((ue) => {
            const estAFaire = ue.etat === 'a_faire';

            return (
              <div
                key={ue.ueId}
                className={`bg-white border transition-colors p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 ${
                  estAFaire
                    ? 'border-l-4 border-l-enp-blue-primary border-t-enp-border border-r-enp-border border-b-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/20'
                    : 'border-l-4 border-l-enp-green-valid border-t-enp-border/60 border-r-enp-border/60 border-b-enp-border/60 bg-[#FAFAFA]'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-enp-blue-light text-enp-blue-deep border border-enp-blue-primary/20">
                      {ue.code}
                    </span>
                    <Badge variant={estAFaire ? 'warning' : 'success'}>
                      {estAFaire ? 'À évaluer' : 'Transmise'}
                    </Badge>
                  </div>

                  <h2 className="text-sm sm:text-base font-bold text-enp-black font-sans break-words">
                    {ue.intitule}
                  </h2>

                  <div className="flex items-center gap-4 text-xs text-enp-gray-medium pt-0.5 font-sans">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Date limite : {formaterDate(ue.finCampagne)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 pt-1 sm:pt-0 w-full sm:w-auto">
                  {estAFaire ? (
                    <Link to={`/evaluations/${ue.ueId}`} className="block w-full sm:w-auto">
                      <Button
                        variant="primary"
                        size="md"
                        className="w-full sm:w-auto justify-center font-bold whitespace-nowrap min-h-[42px]"
                        leftIcon={<ClipboardCheck className="w-4 h-4 shrink-0" />}
                        rightIcon={<ArrowRight className="w-4 h-4 shrink-0" />}
                      >
                        Évaluer l'UE
                      </Button>
                    </Link>
                  ) : (
                    <div className="inline-flex items-center justify-center sm:justify-end gap-1.5 text-enp-green-valid text-xs font-bold py-1.5 px-3 bg-enp-green-light border border-enp-green-valid/20 w-full sm:w-auto font-sans">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-enp-green-valid" />
                      Bulletin officiel scellé
                    </div>
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
