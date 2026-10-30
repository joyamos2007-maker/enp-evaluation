import { useEffect, useState, useCallback, useMemo } from 'react';
import { Users, TrendingUp, AlertCircle, CheckCircle2, Clock, Search, ArrowUpDown } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { Campagne, ParticipationUe } from '@/api/types';
import {
  PageHeader,
  StatCard,
  ProgressBar,
  Select,
  Input,
  Table,
  Badge,
  Alert,
  EmptyState,
} from '@/components/ui';

export function Participation() {
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [campagneId, setCampagneId] = useState<number | null>(null);
  const [participations, setParticipations] = useState<ParticipationUe[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [triParTaux, setTriParTaux] = useState<'croissant' | 'decroissant'>('croissant');

  const chargerCampagnes = useCallback(async () => {
    try {
      const data = await api.pilotageCampagnes();
      setCampagnes(data);
      if (data.length > 0 && campagneId === null) {
        setCampagneId(data[0].id);
      }
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Impossible de charger les campagnes de pilotage.');
    }
  }, [campagneId]);

  const chargerParticipation = useCallback(async () => {
    if (campagneId === null) return;
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.pilotageParticipation(campagneId);
      setParticipations(data);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Impossible de récupérer les taux de participation.');
    } finally {
      setChargement(false);
    }
  }, [campagneId]);

  useEffect(() => {
    void chargerCampagnes();
  }, [chargerCampagnes]);

  useEffect(() => {
    if (campagneId !== null) void chargerParticipation();
  }, [campagneId, chargerParticipation]);

  const participationsFiltrees = useMemo(() => {
    const list = participations.filter(
      (p) =>
        !recherche ||
        p.code.toLowerCase().includes(recherche.toLowerCase()) ||
        p.intitule.toLowerCase().includes(recherche.toLowerCase()),
    );

    return list.sort((a, b) => {
      const ta = a.inscrits > 0 ? a.repondants / a.inscrits : 0;
      const tb = b.inscrits > 0 ? b.repondants / b.inscrits : 0;
      return triParTaux === 'croissant' ? ta - tb : tb - ta;
    });
  }, [participations, recherche, triParTaux]);

  const totalInscrits = participations.reduce((s, p) => s + p.inscrits, 0);
  const totalRepondants = participations.reduce((s, p) => s + p.repondants, 0);
  const tauxGlobal = totalInscrits > 0 ? Math.round((totalRepondants / totalInscrits) * 100) : 0;
  const uesSeuilAtteint = participations.filter((p) => p.repondants >= 5).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Suivi de la Participation aux Évaluations"
        description="Tableau de bord de mobilisation des promotions • Surveillance du seuil d'anonymat (5 répondants)"
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Participation' }]}
      />

      {/* Cartes d'indicateurs globaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Taux de participation global"
          value={`${tauxGlobal}%`}
          subtext={`${totalRepondants} votants sur ${totalInscrits} inscrits`}
          variant="primary"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="UE avec seuil validé"
          value={`${uesSeuilAtteint} / ${participations.length}`}
          subtext="Ayant atteint le minimum de 5 suffrages"
          variant={uesSeuilAtteint === participations.length ? 'success' : 'warning'}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          label="UE à mobiliser prioritairement"
          value={participations.length - uesSeuilAtteint}
          subtext="Risque de masquage des résultats détaillés"
          variant={participations.length - uesSeuilAtteint > 0 ? 'warning' : 'success'}
          icon={<Clock className="w-5 h-5" />}
        />
        <div className="bg-white border border-enp-border p-5 flex flex-col justify-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-enp-gray-medium mb-1.5">
            Quorum départemental
          </span>
          <ProgressBar
            value={tauxGlobal}
            showPercent={true}
            size="md"
            variant={tauxGlobal >= 70 ? 'success' : tauxGlobal >= 50 ? 'primary' : 'warning'}
          />
        </div>
      </div>

      {/* Filtres de campagne & recherche */}
      <div className="bg-white border border-enp-border p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full sm:w-72">
            <Select
              label="Sélectionner la campagne"
              value={campagneId ?? ''}
              onChange={(e) => setCampagneId(Number(e.target.value))}
            >
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle} ({c.anneeUniversitaire} • {c.semestre})
                </option>
              ))}
            </Select>
          </div>

          <div className="w-full sm:w-64 pt-5 sm:pt-0">
            <Input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Filtrer par code ou intitulé..."
              startIcon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setTriParTaux((prev) => (prev === 'croissant' ? 'decroissant' : 'croissant'))}
          className="px-3 py-2 bg-white border border-enp-border text-xs font-semibold flex items-center gap-1.5 hover:bg-enp-blue-ice transition-colors self-end sm:self-auto"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Taux : {triParTaux === 'croissant' ? 'Plus faibles d’abord' : 'Plus élevés d’abord'}</span>
        </button>
      </div>

      {chargement ? (
        <div className="py-12 text-center text-enp-gray-medium text-sm">
          Calcul des effectifs et des participations…
        </div>
      ) : erreur ? (
        <Alert variant="danger" title="Erreur">{erreur}</Alert>
      ) : participationsFiltrees.length === 0 ? (
        <EmptyState
          title="Aucune donnée de participation disponible"
          description="Aucune unité d'enseignement enregistrée pour cette campagne."
        />
      ) : (
        <>
          {/* Cartes tactiles pour mobiles (< 640px) */}
          <div className="space-y-3 block sm:hidden">
            {participationsFiltrees.map((p) => {
              const pctUe = p.inscrits > 0 ? Math.round((p.repondants / p.inscrits) * 100) : 0;
              const seuilAtteint = p.repondants >= 5;
              return (
                <div
                  key={p.ueId}
                  className="bg-white border border-enp-border p-4 space-y-3 shadow-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-enp-blue-deep bg-enp-blue-light px-2 py-0.5 border border-enp-blue-primary/20">
                      {p.code}
                    </span>
                    <Badge variant={seuilAtteint ? 'success' : 'warning'}>
                      {seuilAtteint ? 'Seuil atteint' : `${5 - p.repondants} restant(s)`}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-enp-black">{p.intitule}</h3>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-enp-blue-deep">
                        {p.repondants} / {p.inscrits} répondants
                      </span>
                      <span className="font-bold">{pctUe}%</span>
                    </div>
                    <ProgressBar
                      value={pctUe}
                      showPercent={false}
                      size="sm"
                      variant={seuilAtteint ? 'success' : 'warning'}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tableau standard pour tablettes et ordinateurs (>= 640px) */}
          <div className="hidden sm:block">
            <Table<ParticipationUe>
              columns={[
                {
                  key: 'code',
                  header: 'Code UE',
                  render: (p) => (
                    <span className="font-mono text-xs font-bold text-enp-blue-deep bg-enp-blue-light px-2 py-0.5 border border-enp-blue-primary/20">
                      {p.code}
                    </span>
                  ),
                },
                {
                  key: 'intitule',
                  header: 'Intitulé de l’enseignement',
                  render: (p) => <span className="font-bold text-enp-black">{p.intitule}</span>,
                },
                {
                  key: 'inscrits',
                  header: 'Inscrits',
                  align: 'center',
                  render: (p) => <span className="font-semibold text-enp-black">{p.inscrits}</span>,
                },
                {
                  key: 'repondants',
                  header: 'Répondants',
                  align: 'center',
                  render: (p) => (
                    <span className="font-bold text-enp-blue-primary">{p.repondants}</span>
                  ),
                },
                {
                  key: 'taux',
                  header: 'Taux de participation',
                  render: (p) => {
                    const pctUe = p.inscrits > 0 ? Math.round((p.repondants / p.inscrits) * 100) : 0;
                    return (
                      <div className="w-40 space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span>{pctUe}%</span>
                          <span className="text-enp-gray-medium">{p.repondants}/{p.inscrits}</span>
                        </div>
                        <ProgressBar
                          value={pctUe}
                          showPercent={false}
                          size="sm"
                          variant={p.repondants >= 5 ? 'success' : 'warning'}
                        />
                      </div>
                    );
                  },
                },
                {
                  key: 'statut',
                  header: 'Statut quorum (≥ 5)',
                  align: 'right',
                  render: (p) => (
                    <Badge variant={p.repondants >= 5 ? 'success' : 'warning'}>
                      {p.repondants >= 5 ? 'Seuil atteint' : `${5 - p.repondants} restant(s)`}
                    </Badge>
                  ),
                },
              ]}
              data={participationsFiltrees}
              keyExtractor={(p) => p.ueId}
            />
          </div>
        </>
      )}
    </div>
  );
}
