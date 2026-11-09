import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { Restitution } from '@/api/types';
import { PageHeader, Alert, Badge } from '@/components/ui';

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
        else setErreur('Erreur réseau.');
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
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-fade-in pb-6">
      <PageHeader
        title="Restitution des résultats d'évaluation"
        description="Conformément à l'article 77 du Règlement des Études, consultez les synthèses et suites données aux évaluations."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Restitution' },
        ]}
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {chargement && !erreur && (
        <div className="bg-white border border-enp-border p-12 text-center text-sm text-enp-gray-medium">
          Chargement des rapports de restitution…
        </div>
      )}

      {!chargement && !erreur && restitutions.length === 0 && (
        <div className="bg-white border border-enp-border p-10 text-center space-y-2 shadow-xs">
          <FileText className="w-10 h-10 text-enp-gray-medium mx-auto opacity-40" />
          <p className="text-sm font-bold text-enp-blue-deep">
            Aucune restitution publiée pour le moment
          </p>
          <p className="text-xs text-enp-gray-medium">
            Les synthèses sont publiées par la Scolarité à la clôture des campagnes semestrielles.
          </p>
        </div>
      )}

      {!chargement && !erreur && restitutions.length > 0 && (
        <div className="space-y-4">
          {restitutions.map((r) => (
            <article
              key={r.campagneId}
              className="bg-white border border-enp-border overflow-hidden shadow-xs"
            >
              <div className="bg-enp-blue-deep text-white px-4 py-3.5 sm:px-6 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight">{r.libelle}</h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {r.departement} • {r.anneeUniversitaire} • Semestre {r.semestre}
                  </p>
                </div>
                <Badge variant="institutional">Publiée le {formaterDate(r.publieLe)}</Badge>
              </div>

              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="p-4 bg-enp-bg border border-enp-border space-y-1.5">
                  <h3 className="text-xs font-bold text-enp-blue-deep uppercase tracking-wider">
                    Principaux résultats constatés
                  </h3>
                  <p className="text-xs sm:text-sm text-enp-black leading-relaxed whitespace-pre-wrap">
                    {r.resultats}
                  </p>
                </section>

                <section className="p-4 bg-enp-blue-ice/30 border border-enp-border space-y-1.5">
                  <h3 className="text-xs font-bold text-enp-blue-primary uppercase tracking-wider">
                    Suites données & engagements
                  </h3>
                  <p className="text-xs sm:text-sm text-enp-black leading-relaxed whitespace-pre-wrap">
                    {r.suites}
                  </p>
                </section>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
