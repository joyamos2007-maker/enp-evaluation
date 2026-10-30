import { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Printer,
  Save,
  CheckCircle2,
  AlertTriangle,
  Award,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { Campagne, Synthese, SuitesDonnees, LigneSynthese } from '@/api/types';
import {
  PageHeader,
  Button,
  Select,
  Table,
  Badge,
  Alert,
  Textarea,
  Input,
  Checkbox,
  EmptyState,
} from '@/components/ui';

const SEUIL_ATTENTION = 3.0;

function fmtMoy(v: number | null): string {
  return v !== null ? v.toFixed(2) : '-';
}

export function SynthesePage() {
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [campagneId, setCampagneId] = useState<number | null>(null);
  const [synthese, setSynthese] = useState<Synthese | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [suites, setSuites] = useState<SuitesDonnees>({
    meilleuresUe: '',
    ueAttention: '',
    actions: '',
    etabliPar: '',
    date: new Date().toISOString().slice(0, 10),
    visaChef: false,
  });
  const [enCours, setEnCours] = useState(false);
  const [erreurSave, setErreurSave] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const chargerCampagnes = useCallback(async () => {
    try {
      const data = await api.pilotageCampagnes();
      setCampagnes(data);
      if (data.length > 0 && campagneId === null) {
        setCampagneId(data[0].id);
      }
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
    }
  }, [campagneId]);

  const chargerSynthese = useCallback(async () => {
    if (campagneId === null) return;
    setChargement(true);
    setErreur(null);
    try {
      const [data, suitesChargees] = await Promise.all([
        api.pilotageSynthese(campagneId),
        api.pilotageChargerSuites(campagneId),
      ]);
      setSynthese(data);
      setSuites(suitesChargees);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Impossible de charger la synthèse départementale.');
    } finally {
      setChargement(false);
    }
  }, [campagneId]);

  useEffect(() => {
    void chargerCampagnes();
  }, [chargerCampagnes]);

  useEffect(() => {
    if (campagneId !== null) void chargerSynthese();
  }, [campagneId, chargerSynthese]);

  async function enregistrerSuites() {
    if (campagneId === null) return;
    setEnCours(true);
    setErreurSave(null);
    setSaveOk(false);
    try {
      await api.pilotageSuites(campagneId, suites);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 5000);
    } catch (err) {
      setErreurSave(err instanceof ApiError ? err.messages.join(' ') : 'Échec de l’enregistrement.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in print-area">
      <PageHeader
        title="Synthèse Pédagogique & Plan d'Actions Départemental"
        description="Consolidation des évaluations et engagements d'amélioration collégiale du Chef de Département"
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Synthèse départementale' }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto justify-center no-print"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Imprimer le rapport
          </Button>
        }
      />

      {/* Sélecteur de campagne */}
      <div className="bg-white border border-enp-border p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
        <div className="w-full sm:w-80">
          <Select
            label="Campagne d'évaluation"
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

        {synthese && (
          <div className="text-xs text-enp-gray-medium text-right">
            <span>Campus : <strong>{synthese.campus}</strong></span> •{' '}
            <span>Département : <strong>{synthese.departement}</strong></span>
          </div>
        )}
      </div>

      {chargement ? (
        <div className="py-12 text-center text-enp-gray-medium text-sm">
          Calcul des moyennes consolidées du département…
        </div>
      ) : erreur ? (
        <Alert variant="danger" title="Erreur">{erreur}</Alert>
      ) : !synthese || synthese.lignes.length === 0 ? (
        <EmptyState
          title="Aucune donnée de synthèse disponible"
          description="Cette campagne ne dispose pas encore de résultats clos et mélangés."
        />
      ) : (
        <div className="space-y-6">
          {/* Table récapitulative des moyennes de section A à E */}
          <div className="bg-white border border-enp-border p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-enp-border">
              <h2 className="text-sm font-bold uppercase tracking-wider text-enp-blue-deep">
                Moyennes départementales par section pédagogique
              </h2>
              <span className="text-xs text-enp-gray-medium">
                Barème sur 5.0 • Seuil d’alerte : &lt; {SEUIL_ATTENTION.toFixed(1)}
              </span>
            </div>

            <Table<LigneSynthese>
              columns={[
                {
                  key: 'code',
                  header: 'Code UE',
                  render: (l) => (
                    <span className="font-mono text-xs font-bold text-enp-blue-deep bg-enp-blue-light px-2 py-0.5 border border-enp-blue-primary/20">
                      {l.code}
                    </span>
                  ),
                },
                {
                  key: 'intitule',
                  header: 'Intitulé',
                  render: (l) => <span className="font-bold text-enp-black">{l.intitule}</span>,
                },
                {
                  key: 'reponses',
                  header: 'Suffrages',
                  align: 'center',
                  render: (l) => (
                    <span className={`font-semibold ${l.detailDisponible ? 'text-enp-black' : 'text-enp-gray-medium'}`}>
                      {l.nbReponses} {l.detailDisponible ? '' : '(< 5)'}
                    </span>
                  ),
                },
                {
                  key: 'moyA',
                  header: 'A. Organisation',
                  align: 'center',
                  render: (l) => <span className="font-medium">{l.detailDisponible ? fmtMoy(l.moyA) : '-'}</span>,
                },
                {
                  key: 'moyB',
                  header: 'B. Pédagogie',
                  align: 'center',
                  render: (l) => <span className="font-medium">{l.detailDisponible ? fmtMoy(l.moyB) : '-'}</span>,
                },
                {
                  key: 'moyC',
                  header: 'C. Écoute',
                  align: 'center',
                  render: (l) => <span className="font-medium">{l.detailDisponible ? fmtMoy(l.moyC) : '-'}</span>,
                },
                {
                  key: 'moyD',
                  header: 'D. Évaluation',
                  align: 'center',
                  render: (l) => <span className="font-medium">{l.detailDisponible ? fmtMoy(l.moyD) : '-'}</span>,
                },
                {
                  key: 'satisfactionE',
                  header: 'Satisfaction E',
                  align: 'center',
                  render: (l) => {
                    if (!l.detailDisponible || l.satisfactionE === null) {
                      return <span className="text-enp-gray-medium">-</span>;
                    }
                    const note = l.satisfactionE;
                    const estFaible = note < SEUIL_ATTENTION;
                    return (
                      <span
                        className={`font-bold px-2 py-0.5 ${
                          estFaible
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-enp-green-light text-enp-green-valid border border-enp-green-valid/30'
                        }`}
                      >
                        {note.toFixed(2)}
                      </span>
                    );
                  },
                },
              ]}
              data={synthese.lignes}
              keyExtractor={(l) => l.ueId}
            />
          </div>

          {/* Formulaire des suites et plan d'actions correctives */}
          <div className="bg-white border border-enp-border p-6 space-y-5">
            <div className="border-b border-enp-border pb-3">
              <h2 className="text-base font-bold text-enp-blue-deep flex items-center gap-2">
                <Award className="w-5 h-5 text-enp-gold" />
                Plan d'Actions Correctives & Délibération Départementale
              </h2>
              <p className="text-xs text-enp-gray-medium mt-0.5">
                Renseigné sous la responsabilité du Chef de Département et transmis à la Direction des Études
              </p>
            </div>

            {saveOk && (
              <Alert variant="success" title="Enregistré">
                Le plan d'actions départemental a été sauvegardé avec succès.
              </Alert>
            )}

            {erreurSave && (
              <Alert variant="danger" title="Erreur">
                {erreurSave}
              </Alert>
            )}

            <div className="space-y-4">
              <Textarea
                label="Enseignements exemplaires & Bonnes pratiques à valoriser"
                value={suites.meilleuresUe}
                onChange={(e) => setSuites((s) => ({ ...s, meilleuresUe: e.target.value }))}
                rows={3}
                placeholder="Ex : Remarquable animation des TP en Mécanique des Sols, excellente structuration des polycopiés..."
              />

              <Textarea
                label="Points de vigilance & Enseignements nécessitant un appui"
                value={suites.ueAttention}
                onChange={(e) => setSuites((s) => ({ ...s, ueAttention: e.target.value }))}
                rows={3}
                placeholder="Ex : Rythme trop soutenu en Mathématiques appliquées, manque de matériel en laboratoire d'Hydraulique..."
              />

              <Textarea
                label="Décisions & Actions correctives engagées par le Département"
                value={suites.actions}
                onChange={(e) => setSuites((s) => ({ ...s, actions: e.target.value }))}
                rows={4}
                placeholder="Ex : Réunion de concertation avec l'équipe pédagogique le 15 novembre, révision de l'échéancier des devoirs, dédoublement des groupes de TP..."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Input
                  label="Établi et visé par"
                  value={suites.etabliPar}
                  onChange={(e) => setSuites((s) => ({ ...s, etabliPar: e.target.value }))}
                  placeholder="Nom et titre du Chef de Département"
                />

                <Input
                  label="Date de validation officielle"
                  type="date"
                  value={suites.date}
                  onChange={(e) => setSuites((s) => ({ ...s, date: e.target.value }))}
                />
              </div>

              <div className="pt-3 border-t border-enp-border">
                <Checkbox
                  label="Visa officiel du Chef de Département"
                  description="En cochant cette case, j'atteste avoir pris connaissance des évaluations et validé les engagements départementaux."
                  checked={suites.visaChef}
                  onChange={(e) =>
                    setSuites((s) => ({ ...s, visaChef: (e.target as HTMLInputElement).checked }))
                  }
                />
              </div>
            </div>

            <div className="pt-4 border-t border-enp-border flex justify-end">
              <Button
                variant="primary"
                size="md"
                isLoading={enCours}
                onClick={() => void enregistrerSuites()}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Enregistrer le plan d'actions
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
