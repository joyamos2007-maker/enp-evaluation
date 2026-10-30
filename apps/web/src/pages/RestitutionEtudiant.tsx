import { useEffect, useState } from 'react';
import {
  FileText,
  AlertCircle,
  Building,
  Calendar,
  CheckCircle2,
  Printer,
  Award,
  Sparkles,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { Restitution } from '@/api/types';
import {
  PageHeader,
  SectionHeader,
  Button,
  Alert,
  Badge,
} from '@/components/ui';

export function RestitutionEtudiant() {
  const [restitutions, setRestitutions] = useState<Restitution[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setChargement(true);
    api
      .restitutions()
      .then((data) => {
        if (active) setRestitutions(data);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError) setErreur(err.messages.join(' '));
        else setErreur('Erreur réseau lors du chargement des restitutions.');
      })
      .finally(() => {
        if (active) setChargement(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function formaterDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restitution officielle des évaluations"
        subtitle="Consultez les synthèses d'évaluation et les mesures concrètes engagées par l'école."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Restitution institutionnelle' },
        ]}
        actions={
          restitutions.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto justify-center"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => window.print()}
            >
              Imprimer les restitutions
            </Button>
          ) : undefined
        }
      />

      {/* Cadre légal Article 77 */}
      <div className="bg-enp-bg border-l-4 border-enp-blue-primary border-r border-t border-b border-enp-border p-4 text-xs text-enp-gray-medium leading-relaxed">
        <span className="font-bold text-enp-blue-deep block mb-0.5">
          Article 77 du Règlement des Études de l'ENP :
        </span>
        « Conformément à la politique d'assurance qualité de l'École Nationale Polytechnique, les
        principaux enseignements tirés de vos évaluations anonymes et les décisions d'amélioration
        arrêtées par la Scolarité et les départements vous sont régulièrement restitués sur cette page. »
      </div>

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {chargement && !erreur && (
        <div className="p-12 text-center bg-white border border-enp-border">
          <div className="inline-block w-8 h-8 border-2 border-enp-blue-ice border-t-enp-blue-primary animate-spin mb-2" />
          <p className="text-sm text-enp-gray-medium">Chargement des restitutions officielles…</p>
        </div>
      )}

      {!chargement && !erreur && restitutions.length === 0 && (
        <div className="bg-white border border-enp-border p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-enp-blue-ice text-enp-blue-primary border border-enp-blue-primary/30 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-enp-blue-deep font-serif">
            Aucune restitution publiée pour le moment
          </h3>
          <p className="text-xs text-enp-gray-medium max-w-md mx-auto mt-1 leading-relaxed">
            Les restitutions relatives à vos cours seront affichées dès la clôture des campagnes en cours
            et la tenue des commissions pédagogiques de département.
          </p>
        </div>
      )}

      {!chargement && !erreur && restitutions.length > 0 && (
        <div className="space-y-6">
          {restitutions.map((r) => (
            <article
              key={r.campagneId}
              className="bg-white border border-enp-border shadow-sm overflow-hidden"
            >
              {/* Header de la campagne */}
              <div className="bg-enp-blue-deep text-white p-5 border-b border-[#00172E]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-white/20 text-white px-2 py-0.5">
                      S{r.semestre}
                    </span>
                    <h2 className="text-lg font-bold font-serif">{r.libelle}</h2>
                  </div>
                  <span className="text-xs font-mono text-slate-300">
                    Publiée le {formaterDate(r.publieLe)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-2">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" />
                    Département : {r.departement}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Année universitaire : {r.anneeUniversitaire}
                  </span>
                  <span>·</span>
                  <Badge variant="success">Restitution validée</Badge>
                </div>
              </div>

              {/* Corps de la restitution */}
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2 pb-1 border-b border-enp-border">
                    <Award className="w-4 h-4 text-enp-blue-primary" />
                    <h3 className="text-sm font-bold text-enp-blue-deep uppercase tracking-wider font-serif">
                      1. Synthèse des résultats et retours étudiants
                    </h3>
                  </div>
                  <div className="p-4 bg-enp-bg border border-enp-border text-sm text-enp-black leading-relaxed whitespace-pre-wrap font-sans">
                    {r.resultats}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2 pb-1 border-b border-enp-border">
                    <Sparkles className="w-4 h-4 text-enp-green-valid" />
                    <h3 className="text-sm font-bold text-enp-blue-deep uppercase tracking-wider font-serif">
                      2. Décisions & Suites concrètes données
                    </h3>
                  </div>
                  <div className="p-4 bg-enp-bg border-l-4 border-enp-green-valid border-r border-t border-b border-enp-border text-sm text-enp-black leading-relaxed whitespace-pre-wrap font-sans">
                    {r.suites}
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 bg-enp-bg border-t border-enp-border text-xs text-enp-gray-medium flex items-center justify-between">
                <span>Document académique officiel : Direction des Études & Scolarité</span>
                <span className="font-mono">Réf. ENP-ART77-CAMP-{r.campagneId}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
