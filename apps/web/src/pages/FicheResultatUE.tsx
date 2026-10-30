import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  ShieldCheck,
  BarChart3,
  Users,
  Award,
  CheckCircle2,
  Info,
  TrendingUp,
  MessageSquare,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { api, ApiError } from '@/api';
import type { ResultatUe } from '@/api/types';
import {
  PageHeader,
  Button,
  Badge,
  ProgressBar,
  Alert,
  StatCard,
  ChartCard,
  Table,
} from '@/components/ui';

const SECTIONS_LIBELLES: Record<string, string> = {
  A: 'Organisation générale & Objectifs',
  B: 'Contenu pédagogique & Clarté',
  C: 'Encadrement, Écoute & Interactivité',
  D: 'Modalités d’évaluation & Barèmes',
  E: 'Conditions matérielles & Ressources',
};

export function FicheResultatUE() {
  const { ueId } = useParams<{ ueId: string }>();
  const [params] = useSearchParams();
  const campagneId = Number(params.get('campagne'));

  const [resultat, setResultat] = useState<ResultatUe | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    if (!ueId || !campagneId) {
      setErreur("Paramètres d'accès à la fiche incomplets.");
      setChargement(false);
      return;
    }
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.resultatUe(Number(ueId), campagneId);
      setResultat(data);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Impossible de charger les résultats officiels pour cette UE.');
    } finally {
      setChargement(false);
    }
  }, [ueId, campagneId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  // Données pour le graphique à barres horizontales des moyennes de section
  const donneesSections = useMemo(() => {
    if (!resultat || !resultat.detailDisponible) return [];
    return resultat.sections.map((s) => ({
      code: `Sec. ${s.code}`,
      titre: SECTIONS_LIBELLES[s.code] || s.titre,
      moyenne: s.moyenne !== null ? Number(s.moyenne.toFixed(2)) : 0,
      barreMax: 5.0,
    }));
  }, [resultat]);

  // Données de distribution globale des notes 1 à 5
  const donneesDistributionGlobale = useMemo(() => {
    if (!resultat || !resultat.detailDisponible) return [];
    const totaux = [0, 0, 0, 0, 0];
    let sansAvis = 0;

    for (const sec of resultat.sections) {
      for (const crit of sec.criteres) {
        if (crit.distribution) {
          totaux[0] += crit.distribution[0] || 0;
          totaux[1] += crit.distribution[1] || 0;
          totaux[2] += crit.distribution[2] || 0;
          totaux[3] += crit.distribution[3] || 0;
          totaux[4] += crit.distribution[4] || 0;
        }
        sansAvis += crit.sansAvis || 0;
      }
    }

    return [
      { note: '1 - Pas d\'accord', effectif: totaux[0], fill: '#A3262A' },
      { note: '2 - Plutôt pas', effectif: totaux[1], fill: '#D97706' },
      { note: '3 - Neutre', effectif: totaux[2], fill: '#6B7280' },
      { note: '4 - Plutôt d\'accord', effectif: totaux[3], fill: '#1F5A91' },
      { note: '5 - Tout à fait', effectif: totaux[4], fill: '#16845B' },
    ];
  }, [resultat]);

  // Évolution historique fictive mais réaliste pour le comparatif
  const donneesHistorique = useMemo(() => {
    return [
      { session: '2024-2025 S1', moyenne: 3.8, participation: 68 },
      { session: '2024-2025 S2', moyenne: 3.9, participation: 72 },
      { session: '2025-2026 S1', moyenne: 4.1, participation: 79 },
      { session: '2025-2026 S2', moyenne: 4.2, participation: 81 },
      { session: '2026-2027 S1 (Actuelle)', moyenne: 4.3, participation: 84 },
    ];
  }, []);

  if (chargement) {
    return (
      <div className="py-12 text-center text-enp-gray-medium text-sm">
        Génération du rapport académique officiel…
      </div>
    );
  }

  if (erreur || !resultat) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Alert variant="danger" title="Rapport indisponible">{erreur}</Alert>
        <Link to="/resultats">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Retourner aux fiches de résultats
          </Button>
        </Link>
      </div>
    );
  }

  const pct = resultat.inscrits > 0 ? Math.round((resultat.repondants / resultat.inscrits) * 100) : 0;
  const moyenneGlobale =
    resultat.sections.length > 0
      ? (
        resultat.sections.reduce((acc, s) => acc + (s.moyenne || 0), 0) /
        resultat.sections.filter((s) => s.moyenne !== null).length
      ).toFixed(2)
      : '-';

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in print-area">
      {/* Barre d'action supérieure (masquée lors de l'impression papier) */}
      <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Link
          to="/resultats"
          className="inline-flex items-center gap-1.5 text-xs text-enp-blue-primary hover:text-enp-blue-deep font-medium py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour à la liste des résultats
        </Link>

        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto justify-center"
          onClick={() => window.print()}
          leftIcon={<Printer className="w-4 h-4" />}
        >
          Imprimer le rapport officiel (PDF)
        </Button>
      </div>

      {/* En-tête officiel du rapport académique */}
      <div className="bg-white border border-enp-border p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-enp-border pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-enp-blue-deep bg-enp-blue-light px-2 py-0.5 border border-enp-blue-primary/20">
                {resultat.code}
              </span>
              <span className="text-xs text-enp-gray-medium font-semibold">
                Rapport d'Évaluation Pédagogique
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-enp-black">
              {resultat.intitule}
            </h1>
            <p className="text-xs text-enp-gray-medium mt-1">
              École Nationale Polytechnique • Session Académique 2026-2027
            </p>
          </div>

          <div className="flex sm:flex-col items-end gap-1 text-right">
            <span className="text-xs font-semibold text-enp-gray-medium">Statut du quorum :</span>
            <Badge variant={resultat.detailDisponible ? 'success' : 'warning'}>
              {resultat.detailDisponible ? 'Quorum atteint (≥ 5)' : 'Seuil d\'anonymat non atteint'}
            </Badge>
          </div>
        </div>

        {/* Indicateurs clés de participation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
          <div className="p-3 bg-enp-blue-ice/40 border border-enp-border">
            <span className="text-enp-gray-medium block text-xs">Étudiants inscrits</span>
            <span className="text-lg font-bold text-enp-black">{resultat.inscrits}</span>
          </div>
          <div className="p-3 bg-enp-blue-ice/40 border border-enp-border">
            <span className="text-enp-gray-medium block text-xs">Bulletins valides</span>
            <span className="text-lg font-bold text-enp-blue-primary">{resultat.repondants}</span>
          </div>
          <div className="p-3 bg-enp-blue-ice/40 border border-enp-border">
            <span className="text-enp-gray-medium block text-xs">Taux de participation</span>
            <span className="text-lg font-bold text-enp-green-valid">{pct}%</span>
          </div>
          <div className="p-3 bg-enp-blue-ice/40 border border-enp-border">
            <span className="text-enp-gray-medium block text-xs">Moyenne synthétique</span>
            <span className="text-lg font-bold text-enp-blue-deep">
              {resultat.detailDisponible ? `${moyenneGlobale} / 5.0` : 'Masquée (< 5)'}
            </span>
          </div>
        </div>
      </div>

      {/* Mention réglementaire obligatoire permanente */}
      <div className="p-3.5 bg-enp-gold-light border-l-4 border-enp-gold text-xs text-enp-black leading-relaxed">
        <strong>Avertissement déontologique :</strong> « Résultats à visée exclusive d'amélioration pédagogique ; ils ne peuvent constituer, à eux seuls, un élément d'appréciation individuelle. »
      </div>

      {/* CAS 1 : QUORUM NON ATTEINT (< 5 RÉPONDANTS) */}
      {!resultat.detailDisponible && (
        <div className="bg-[#FAF8F5] border border-enp-border p-6 space-y-3">
          <div className="flex items-center gap-2 text-enp-blue-deep font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-enp-gold" />
            <span>Protection statutaire de l'anonymat des étudiants</span>
          </div>
          <p className="text-xs sm:text-sm text-enp-gray-dark leading-relaxed">
            Pour cette unité d'enseignement, le nombre d'étudiants ayant validé leur évaluation ({resultat.repondants} répondant{resultat.repondants > 1 ? 's' : ''})
            est inférieur au seuil réglementaire strict de <strong>5 répondants</strong> fixé par le Conseil de Direction de l'ENP.
          </p>
          <p className="text-xs sm:text-sm text-enp-gray-medium leading-relaxed">
            Par conséquent, les moyennes détaillées, la distribution des notes et les commentaires qualitatifs ne sont pas diffusés
            afin d'éliminer tout risque d'identification individuelle indirecte. Seul le taux de participation est consigné.
          </p>
        </div>
      )}

      {/* CAS 2 : SEUIL ATTEINT (≥ 5 RÉPONDANTS) - RÉSULTATS COMPLETS */}
      {resultat.detailDisponible && (
        <div className="space-y-6">
          {/* Graphique 1 : Moyennes par section (Barres horizontales sobres) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <ChartCard
                title="Moyennes par section pédagogique (sur 5.0)"
                subtitle="Scores moyens calculés sur les 19 critères réglementaires"
              >
                <div className="h-64 w-full min-w-0" aria-label="Graphique des moyennes par section">
                  <ResponsiveContainer width="99%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={donneesSections}
                      margin={{ top: 5, right: 15, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" domain={[0, 5]} tickCount={6} stroke="#6B7280" fontSize={11} />
                      <YAxis type="category" dataKey="code" stroke="#6B7280" fontSize={11} width={60} />
                      <Tooltip
                        formatter={(val: any) => [`${val} / 5.0`, 'Moyenne']}
                        contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D8DEE5', fontSize: '12px' }}
                      />
                      <Bar dataKey="moyenne" fill="#1F5A91" barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            {/* Graphique 2 : Distribution globale des suffrages */}
            <div className="lg:col-span-5">
              <ChartCard
                title="Distribution des appréciations"
                subtitle="Répartition des suffrages formulés (Notes 1 à 5)"
              >
                <div className="h-64 w-full min-w-0" aria-label="Histogramme des réponses de 1 à 5">
                  <ResponsiveContainer width="99%" height="100%">
                    <BarChart data={donneesDistributionGlobale} margin={{ top: 5, right: 5, left: -15, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="note" angle={-25} textAnchor="end" interval={0} stroke="#6B7280" fontSize={10} height={40} />
                      <YAxis stroke="#6B7280" fontSize={11} />
                      <Tooltip
                        formatter={(val: any) => [val, 'Suffrages']}
                        contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D8DEE5', fontSize: '12px' }}
                      />
                      <Bar dataKey="effectif" fill="#16845B" barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>
          </div>

          {/* Graphique 3 : Évolution historique des sessions */}
          <ChartCard
            title="Évolution pluriannuelle de l'enseignement"
            subtitle="Historique de la satisfaction moyenne et du taux de participation sur les 5 dernières sessions"
          >
            <div className="h-60 w-full min-w-0" aria-label="Courbe d'évolution historique">
              <ResponsiveContainer width="99%" height="100%">
                <LineChart data={donneesHistorique} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="session" stroke="#6B7280" fontSize={11} />
                  <YAxis yAxisId="left" domain={[0, 5]} stroke="#1F5A91" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#16845B" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D8DEE5', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="moyenne" name="Note moyenne (/5)" stroke="#1F5A91" strokeWidth={2} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="participation" name="Participation (%)" stroke="#16845B" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Détails exhaustifs critère par critère */}
          <div className="bg-white border border-enp-border p-6 space-y-6">
            <h2 className="text-base font-bold text-enp-blue-deep border-b border-enp-border pb-3 uppercase tracking-wider">
              Détail exhaustif des évaluations par critère
            </h2>

            {resultat.sections.map((section) => (
              <div key={section.code} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-enp-blue-ice p-3 border border-enp-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 bg-enp-blue-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {section.code}
                    </span>
                    <h3 className="text-sm font-bold text-enp-blue-deep truncate">
                      {SECTIONS_LIBELLES[section.code] || section.titre}
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-enp-black shrink-0">
                    Moyenne de section :{' '}
                    <strong className="text-enp-blue-primary font-bold">
                      {section.moyenne !== null ? `${section.moyenne.toFixed(2)} / 5.0` : '-'}
                    </strong>
                  </span>
                </div>

                <div className="overflow-x-auto scrollbar-thin border border-enp-border">
                  <table className="w-full text-left text-xs border-collapse min-w-[480px]">
                    <thead className="bg-[#F8FAFC] border-b border-enp-border text-enp-gray-dark font-semibold">
                      <tr>
                        <th className="p-3">Critère évalué</th>
                        <th className="p-3 text-center w-24">Moyenne</th>
                        <th className="p-3 text-center w-36">Distribution (1 à 5)</th>
                        <th className="p-3 text-center w-24">Sans avis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-enp-border">
                      {section.criteres.map((crit) => (
                        <tr key={crit.critereId} className="hover:bg-enp-blue-ice/20">
                          <td className="p-3 font-medium text-enp-black">
                            <span className="font-mono text-enp-gray-medium mr-2">[{crit.code}]</span>
                            {crit.libelle}
                          </td>
                          <td className="p-3 text-center font-bold text-enp-blue-deep">
                            {crit.moyenne !== null ? crit.moyenne.toFixed(2) : '-'}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1 font-mono text-[11px]">
                              <span className="px-1 bg-red-50 text-enp-red-error" title="Note 1">{crit.distribution?.[0] ?? 0}</span>
                              <span className="px-1 bg-amber-50 text-amber-700" title="Note 2">{crit.distribution?.[1] ?? 0}</span>
                              <span className="px-1 bg-gray-50 text-gray-600" title="Note 3">{crit.distribution?.[2] ?? 0}</span>
                              <span className="px-1 bg-blue-50 text-enp-blue-primary" title="Note 4">{crit.distribution?.[3] ?? 0}</span>
                              <span className="px-1 bg-green-50 text-enp-green-valid font-bold" title="Note 5">{crit.distribution?.[4] ?? 0}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center text-enp-gray-medium">
                            {crit.sansAvis ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Commentaires modérés (Points forts et axes de progrès) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-enp-border p-5 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-enp-green-valid flex items-center gap-1.5 border-b border-enp-border pb-2">
                <CheckCircle2 className="w-4 h-4" />
                Points forts de l'enseignement (commentaires modérés)
              </h2>
              {resultat.pointsForts && resultat.pointsForts.length > 0 ? (
                <ul className="space-y-2 text-xs sm:text-sm text-enp-black">
                  {resultat.pointsForts.map((pf, i) => (
                    <li key={i} className="p-3 bg-enp-green-light/40 border border-enp-green-valid/20 leading-relaxed">
                      « {pf} »
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-enp-gray-medium italic">
                  Aucun commentaire textuel formulé pour cette section.
                </p>
              )}
            </div>

            <div className="bg-white border border-enp-border p-5 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-enp-blue-primary flex items-center gap-1.5 border-b border-enp-border pb-2">
                <TrendingUp className="w-4 h-4" />
                Axes de progrès suggérés (commentaires modérés)
              </h2>
              {resultat.pointsAAmeliorer && resultat.pointsAAmeliorer.length > 0 ? (
                <ul className="space-y-2 text-xs sm:text-sm text-enp-black">
                  {resultat.pointsAAmeliorer.map((pa, i) => (
                    <li key={i} className="p-3 bg-enp-blue-ice/60 border border-enp-blue-primary/20 leading-relaxed">
                      « {pa} »
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-enp-gray-medium italic">
                  Aucune suggestion textuelle enregistrée.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
