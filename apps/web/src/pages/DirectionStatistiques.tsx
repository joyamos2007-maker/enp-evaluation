import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  RefreshCw,
  Send,
  Users,
  ShieldAlert,
  Globe2,
  FileCheck2,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api, ApiError } from '@/api';
import type {
  ControlesAcademiques,
  PeriodeDirection,
  StatistiquesDirection as StatistiquesDirectionType,
} from '@/api/types';
import {
  PageHeader,
  Button,
  Select,
  Alert,
  StatCard,
  ChartCard,
  Table,
  Badge,
  Tabs,
} from '@/components/ui';

const DEBUT_ANNEE_ACADEMIQUE = (() => {
  const aujourdHui = new Date();
  return aujourdHui.getMonth() >= 8
    ? aujourdHui.getFullYear()
    : aujourdHui.getFullYear() - 1;
})();
const ANNEE_DEFAUT = `${DEBUT_ANNEE_ACADEMIQUE}-${DEBUT_ANNEE_ACADEMIQUE + 1}`;
const SEMESTRE_DEFAUT = 1;

export function DirectionStatistiques() {
  const location = useLocation();
  const [anneeUniversitaire, setAnneeUniversitaire] = useState(ANNEE_DEFAUT);
  const [semestre, setSemestre] = useState(SEMESTRE_DEFAUT);
  const [onglet, setOnglet] = useState(() =>
    location.pathname.includes('/controles') ? 'controles' : 'statistiques'
  );

  useEffect(() => {
    if (location.pathname.includes('/controles')) {
      setOnglet('controles');
    }
  }, [location.pathname]);

  const [statistiques, setStatistiques] = useState<StatistiquesDirectionType | null>(null);
  const [controles, setControles] = useState<ControlesAcademiques | null>(null);
  const [chargement, setChargement] = useState(true);
  const [publicationEnCours, setPublicationEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    setConfirmation(null);
    try {
      const periode: PeriodeDirection = { anneeUniversitaire, semestre };
      const [resume, controle] = await Promise.all([
        api.directionStatistiques(periode),
        api.directionControles(periode),
      ]);
      setStatistiques(resume);
      setControles(controle);
    } catch (cause) {
      setErreur(cause instanceof ApiError ? cause.messages.join(' ') : 'Erreur de chargement.');
    } finally {
      setChargement(false);
    }
  }, [anneeUniversitaire, semestre]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function publier() {
    setPublicationEnCours(true);
    setErreur(null);
    setConfirmation(null);
    try {
      const periode: PeriodeDirection = { anneeUniversitaire, semestre };
      await api.directionPublierStatistiques(periode);
      setConfirmation('Publication validée. Les statistiques officielles et restitutions ont été actualisées.');
      await charger();
    } catch (cause) {
      setErreur(cause instanceof ApiError ? cause.messages.join(' ') : 'Échec de la publication.');
    } finally {
      setPublicationEnCours(false);
    }
  }

  // Graphique comparatif des campus et départements
  const donneesDepartements = (statistiques?.campus ?? []).map((c) => ({
    departement: c.campus,
    tauxParticipation: c.tauxParticipation !== null ? Number(c.tauxParticipation.toFixed(1)) : 0,
    satisfactionGlobale: c.moyenneEvaluations !== null ? Number(c.moyenneEvaluations.toFixed(2)) : 0,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Supervision & Statistiques de la Direction des Études"
        description="Vue consolidée multi-campus, intégrité des référentiels et publication officielle des rapports ministériels"
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Direction des Études' }]}
        actions={
          <Button
            variant="primary"
            size="md"
            className="w-full sm:w-auto justify-center"
            isLoading={publicationEnCours}
            onClick={() => void publier()}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Publier les synthèses officielles
          </Button>
        }
      />

      {/* Sélecteur de période académique */}
      <div className="bg-white border border-enp-border p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-44">
            <Select
              label="Année académique"
              value={anneeUniversitaire}
              onChange={(e) => setAnneeUniversitaire(e.target.value)}
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027 (Actuelle)</option>
              <option value="2027-2028">2027-2028</option>
            </Select>
          </div>

          <div className="w-full sm:w-36">
            <Select
              label="Semestre"
              value={semestre}
              onChange={(e) => setSemestre(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                <option key={s} value={s}>
                  Semestre {s}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto justify-center"
          onClick={() => void charger()}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Actualiser les indicateurs
        </Button>
      </div>

      {confirmation && <Alert variant="success" title="Publication">{confirmation}</Alert>}
      {erreur && <Alert variant="danger" title="Alerte">{erreur}</Alert>}

      {/* Onglets entre Statistiques et Contrôles académiques */}
      <Tabs
        tabs={[
          { id: 'statistiques', label: 'Statistiques & Participations', count: statistiques?.campus.length },
          { id: 'controles', label: 'Contrôles académiques & Intégrité', count: controles?.nombreAnomalies },
        ]}
        activeTab={onglet}
        onChange={setOnglet}
      />

      {chargement ? (
        <div className="py-12 text-center text-enp-gray-medium text-sm">
          Calcul des données institutionnelles…
        </div>
      ) : onglet === 'statistiques' && statistiques ? (
        <div className="space-y-6">
          {/* Indicateurs nationaux ENP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Participation nationale"
              value={`${statistiques.global.tauxParticipation !== null ? statistiques.global.tauxParticipation.toFixed(1) : 0}%`}
              subtext={`${statistiques.global.bulletins} bulletins reçus sur ${statistiques.global.inscriptions} inscrits`}
              variant="primary"
              icon={<Users className="w-5 h-5" />}
            />
            <StatCard
              label="Satisfaction moyenne"
              value={`${statistiques.global.moyenneEvaluations !== null ? statistiques.global.moyenneEvaluations.toFixed(2) : '-'} / 5.0`}
              subtext="Moyenne générale tous campus confondus"
              variant="success"
              icon={<Award className="w-5 h-5" />}
            />
            <StatCard
              label="Campus analysés"
              value={statistiques.campus.length}
              subtext="Périmètre actif ENP"
              variant="default"
              icon={<Building2 className="w-5 h-5" />}
            />
            <StatCard
              label="Unités d'enseignement"
              value={statistiques.global.coursSynthesables}
              subtext="Cours au catalogue"
              variant="default"
              icon={<Globe2 className="w-5 h-5" />}
            />
          </div>

          {/* Graphique des départements */}
          <ChartCard
            title="Comparatif des taux de participation par campus et département"
            subtitle="Taux effectif de mobilisation (%) pour le semestre actif"
          >
            <div className="h-64 w-full" aria-label="Graphique des taux par département">
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={donneesDepartements} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="departement" stroke="#6B7280" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#6B7280" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D8DEE5', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="tauxParticipation" name="Participation (%)" fill="#0A4275" barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Tableau détaillé des campus */}
          <div className="bg-white border border-enp-border p-5 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-enp-blue-deep border-b border-enp-border pb-2">
              Indicateurs détaillés par campus et département
            </h2>
            {/* Vue mobile (< 640px) */}
            <div className="block sm:hidden divide-y divide-enp-border">
              {statistiques.campus.map((d: any) => (
                <div key={d.campusId} className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-enp-blue-deep">{d.campus}</span>
                    <span className="text-xs font-bold text-enp-green-valid">
                      {d.tauxParticipation !== null ? `${d.tauxParticipation.toFixed(1)}%` : '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <div className="bg-enp-bg p-2 text-center border border-enp-border">
                      <span className="text-enp-gray-medium block text-[10px] uppercase">UE</span>
                      <span className="font-semibold">{d.coursSynthesables}</span>
                    </div>
                    <div className="bg-enp-bg p-2 text-center border border-enp-border">
                      <span className="text-enp-gray-medium block text-[10px] uppercase">Bulletins</span>
                      <span className="font-semibold text-enp-blue-deep">{d.bulletins} / {d.inscriptions}</span>
                    </div>
                    <div className="bg-enp-bg p-2 text-center border border-enp-border">
                      <span className="text-enp-gray-medium block text-[10px] uppercase">Moyenne</span>
                      <span className="font-bold">{d.moyenneEvaluations !== null ? `${d.moyenneEvaluations.toFixed(2)}/5` : '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tableau desktop (>= 640px) */}
            <div className="hidden sm:block">
              <Table
                columns={[
                  { key: 'campus', header: 'Campus / Département' },
                  {
                    key: 'coursSynthesables',
                    header: 'UE au catalogue',
                    align: 'center',
                    render: (d: any) => <span>{d.coursSynthesables}</span>,
                  },
                  {
                    key: 'inscriptions',
                    header: 'Inscrits',
                    align: 'center',
                    render: (d: any) => <span>{d.inscriptions}</span>,
                  },
                  {
                    key: 'bulletins',
                    header: 'Bulletins reçus',
                    align: 'center',
                    render: (d: any) => <span className="font-bold text-enp-blue-deep">{d.bulletins}</span>,
                  },
                  {
                    key: 'taux',
                    header: 'Taux participation',
                    align: 'center',
                    render: (d: any) => (
                      <span className="font-bold text-enp-green-valid">
                        {d.tauxParticipation !== null ? `${d.tauxParticipation.toFixed(1)}%` : '-'}
                      </span>
                    ),
                  },
                  {
                    key: 'satisfaction',
                    header: 'Moyenne d’évaluation',
                    align: 'right',
                    render: (d: any) => (
                      <span className="font-bold">
                        {d.moyenneEvaluations !== null ? `${d.moyenneEvaluations.toFixed(2)} / 5` : '-'}
                      </span>
                    ),
                  },
                ]}
                data={statistiques.campus}
                keyExtractor={(d: any) => d.campusId}
              />
            </div>
          </div>
        </div>
      ) : onglet === 'controles' && controles ? (
        <div className="space-y-6">
          <div className="bg-white border border-enp-border p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-enp-border pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-enp-blue-deep">
                Vérification automatique de conformité des référentiels
              </h2>
              <Badge variant={controles.nombreAnomalies === 0 ? 'success' : 'warning'}>
                {controles.nombreAnomalies === 0 ? 'Conforme (0 anomalie)' : `${controles.nombreAnomalies} anomalie(s)`}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {controles.reglesVerifiees.map((regle) => (
                <div key={regle.code} className="p-3 bg-enp-blue-ice/40 border border-enp-border text-xs">
                  <span className="font-mono font-bold text-enp-blue-deep mr-2">[{regle.code}]</span>
                  <span className="text-enp-black font-medium">{regle.description}</span>
                </div>
              ))}
            </div>

            {controles.anomalies.length > 0 && (
              <div className="pt-4 border-t border-enp-border space-y-2">
                <p className="text-xs font-bold text-enp-red-error uppercase">Anomalies relevées :</p>
                <div className="space-y-2">
                  {controles.anomalies.map((a, i) => (
                    <div key={i} className="p-3 bg-enp-red-light border border-enp-red-error/30 text-xs text-enp-red-inst">
                      <span className="font-bold font-mono mr-2">[{a.code}]</span>
                      <span>{a.libelle} : {a.departement} ({a.campus}, S{a.semestre})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
