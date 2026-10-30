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
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <PageHeader
        title="Évaluations des Unités d'Enseignement"
        description="Campagne officielle d'évaluation pédagogique anonyme de l'École Nationale Polytechnique"
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Évaluations des UE' },
        ]}
      />

      {/* Encart institutionnel certifiant l'anonymat intégral */}
      <Alert
        variant="institutional"
        title="Garantie institutionnelle d'anonymat et de neutralité"
        icon={<ShieldCheck className="w-5 h-5 text-enp-gold shrink-0 mt-0.5" />}
      >
        <p className="leading-relaxed">
          Votre évaluation est <strong>strictement anonyme</strong>. Le bulletin est déposé dans l'urne numérique
          séparée sans aucun lien avec votre identité ou votre matricule. Une seule soumission définitive est autorisée par unité d'enseignement.
          Ces retours sont exploités par les Conseils de Département et la Direction des Études à des fins exclusives d'amélioration pédagogique.
        </p>
      </Alert>

      {/* Indicateurs de progression globale */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="UE restantes à évaluer"
          value={aFaire}
          subtext={aFaire > 0 ? "Campagne active en cours" : "Toutes vos évaluations sont transmises"}
          variant={aFaire > 0 ? 'warning' : 'success'}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Évaluations validées"
          value={terminees}
          subtext={`Sur ${total} UE inscrites à votre cursus`}
          variant="primary"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <div className="bg-white border border-enp-border p-5 flex flex-col justify-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-enp-gray-medium mb-1">
            Progression globale
          </span>
          <ProgressBar
            value={pct}
            label={`${terminees} sur ${total} complétée(s)`}
            showPercent={true}
            size="md"
            variant={pct === 100 ? 'success' : 'primary'}
          />
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <div className="bg-white border border-enp-border p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par code (ex: MAT101) ou intitulé..."
            startIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFiltreEtat('tous')}
            className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
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
            className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
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
            className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
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
                className={`bg-white border transition-colors p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  estAFaire
                    ? 'border-enp-border hover:border-enp-blue-primary hover:bg-enp-blue-ice/20'
                    : 'border-enp-border/60 bg-[#FAFAFA]'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-enp-blue-light text-enp-blue-deep border border-enp-blue-primary/20">
                      {ue.code}
                    </span>
                    <Badge variant={estAFaire ? 'warning' : 'success'}>
                      {estAFaire ? 'À faire' : 'Évaluation enregistrée'}
                    </Badge>
                  </div>

                  <h2 className="text-base font-bold text-enp-black break-words">
                    {ue.intitule}
                  </h2>

                  <div className="flex items-center gap-4 text-xs text-enp-gray-medium pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Date limite : {formaterDate(ue.finCampagne)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 pt-2 sm:pt-0 w-full sm:w-auto">
                  {estAFaire ? (
                    <Link to={`/evaluations/${ue.ueId}`} className="block w-full sm:w-auto">
                      <Button
                        variant="primary"
                        size="md"
                        className="w-full sm:w-auto justify-center"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                      >
                        Évaluer l'UE
                      </Button>
                    </Link>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-enp-green-light text-enp-green-valid text-xs font-bold border border-enp-green-valid/20 w-full sm:w-auto">
                      <Check className="w-4 h-4 stroke-[3]" />
                      Participation enregistrée
                    </span>
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
