import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, AlertCircle, ArrowRight, ShieldCheck, Search, Users, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { ResultatUeResume } from '@/api/types';
import { PageHeader, Table, Button, Badge, ProgressBar, Input, Alert, EmptyState } from '@/components/ui';

export function MesResultats() {
  const navigate = useNavigate();
  const [resultats, setResultats] = useState<ResultatUeResume[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.resultatsMesUes();
      setResultats(data);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Impossible de charger vos fiches de résultats d’évaluation.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const resultatsFiltres = useMemo(() => {
    return resultats.filter(
      (r) =>
        !recherche ||
        r.code.toLowerCase().includes(recherche.toLowerCase()) ||
        r.intitule.toLowerCase().includes(recherche.toLowerCase()) ||
        r.libelleCampagne.toLowerCase().includes(recherche.toLowerCase()),
    );
  }, [resultats, recherche]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Résultats d'Évaluation des Enseignements"
        description="Fiches de synthèse officielles et bilans pédagogiques de vos unités d'enseignement"
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Résultats des évaluations' }]}
      />

      {/* Mention réglementaire officielle permanente */}
      <Alert variant="institutional" title="Cadre réglementaire de consultation">
        <p className="leading-relaxed">
          « Les résultats d'évaluation sont à visée exclusive d'amélioration pédagogique ; ils ne peuvent constituer, à eux seuls, un élément d'appréciation individuelle. »
          Conformément au règlement des études de l'ENP, les distributions détaillées ne sont déverrouillées que pour les enseignements atteignant le seuil de 5 répondants.
        </p>
      </Alert>

      {/* Barre de recherche */}
      <div className="bg-white border border-enp-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 w-full sm:max-w-sm">
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par code UE ou intitulé..."
            startIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <span className="text-xs text-enp-gray-medium">
          {resultatsFiltres.length} unité(s) d'enseignement répertoriée(s)
        </span>
      </div>

      {chargement ? (
        <div className="py-12 text-center text-enp-gray-medium text-sm">
          Chargement des fiches de résultats…
        </div>
      ) : erreur ? (
        <Alert variant="danger" title="Erreur">{erreur}</Alert>
      ) : resultatsFiltres.length === 0 ? (
        <EmptyState
          title="Aucun résultat d'évaluation disponible"
          description="Les résultats d'évaluation seront consultables dès la clôture des campagnes par la Scolarité et le dépouillement officiel de l'urne."
        />
      ) : (
        <>
          {/* Cartes tactiles pour mobiles (< 640px) */}
          <div className="space-y-3 block sm:hidden">
            {resultatsFiltres.map((r) => {
              const pct = r.inscrits > 0 ? Math.round((r.repondants / r.inscrits) * 100) : 0;
              return (
                <div
                  key={`${r.ueId}-${r.campagneId}`}
                  onClick={() => navigate(`/resultats/${r.ueId}?campagne=${r.campagneId}`)}
                  className="bg-white border border-enp-border p-4 space-y-3 cursor-pointer hover:border-enp-blue-primary/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-enp-blue-deep bg-enp-blue-light px-2 py-0.5 border border-enp-blue-primary/20">
                      {r.code}
                    </span>
                    <Badge variant={r.detailDisponible ? 'success' : 'warning'}>
                      {r.detailDisponible ? 'Quorum atteint' : 'Seuil anonymat (<5)'}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-enp-black">{r.intitule}</h3>
                    <p className="text-xs text-enp-gray-medium">{r.libelleCampagne}</p>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-enp-border/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-enp-gray-medium">{r.repondants} / {r.inscrits} répondants</span>
                      <span className="font-bold text-enp-blue-deep">{pct}%</span>
                    </div>
                    <ProgressBar value={pct} showPercent={false} size="sm" variant={r.detailDisponible ? 'success' : 'warning'} />
                  </div>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="font-medium text-enp-gray-medium">Moyenne synthétique :</span>
                    <span className="font-bold text-sm text-enp-blue-deep">
                      {r.detailDisponible && r.moyenneGlobale !== null ? `${r.moyenneGlobale.toFixed(2)} / 5.0` : 'Masquée (< 5)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tableau standard desktop (>= 640px) */}
          <div className="hidden sm:block">
            <Table<ResultatUeResume>
              columns={[
                {
                  key: 'code',
                  header: 'Code UE',
                  render: (r) => (
                    <span className="font-mono text-xs font-bold text-enp-blue-deep bg-enp-blue-light px-2 py-0.5 border border-enp-blue-primary/20">
                      {r.code}
                    </span>
                  ),
                },
                {
                  key: 'intitule',
                  header: 'Intitulé de l’enseignement',
                  render: (r) => (
                    <div>
                      <p className="font-bold text-enp-black">{r.intitule}</p>
                      <p className="text-xs text-enp-gray-medium">{r.libelleCampagne}</p>
                    </div>
                  ),
                },
                {
                  key: 'participation',
                  header: 'Participation effective',
                  render: (r) => {
                    const pct = r.inscrits > 0 ? Math.round((r.repondants / r.inscrits) * 100) : 0;
                    return (
                      <div className="w-40 space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span>{r.repondants} / {r.inscrits} inscrits</span>
                          <span className="font-bold text-enp-blue-deep">{pct}%</span>
                        </div>
                        <ProgressBar
                          value={pct}
                          showPercent={false}
                          size="sm"
                          variant={r.repondants >= 5 ? 'success' : 'warning'}
                        />
                      </div>
                    );
                  },
                },
                {
                  key: 'statut',
                  header: 'Seuil d’anonymat',
                  render: (r) => (
                    <Badge variant={r.detailDisponible ? 'success' : 'warning'}>
                      {r.detailDisponible ? 'Seuil atteint (≥ 5)' : 'Moins de 5 répondants'}
                    </Badge>
                  ),
                },
                {
                  key: 'action',
                  header: 'Rapport complet',
                  align: 'right',
                  render: (r) => (
                    <Link to={`/resultats/${r.ueId}?campagne=${r.campagneId}`}>
                      <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Consulter
                      </Button>
                    </Link>
                  ),
                },
              ]}
              data={resultatsFiltres}
              keyExtractor={(r) => `${r.ueId}-${r.campagneId}`}
              onRowClick={(r) => navigate(`/resultats/${r.ueId}?campagne=${r.campagneId}`)}
            />
          </div>
        </>
      )}
    </div>
  );
}
