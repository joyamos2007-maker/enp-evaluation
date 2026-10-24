import { useEffect, useState } from 'react';
import { AlertCircle, FileText } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { Restitution } from '@/api/types';

export function RestitutionEtudiant() {
  const [restitutions, setRestitutions] = useState<Restitution[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setChargement(true);
    api.restitutions()
      .then((data) => { if (active) setRestitutions(data); })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError) setErreur(err.messages.join(' '));
        else setErreur('Erreur réseau.');
      })
      .finally(() => { if (active) setChargement(false); });
    return () => { active = false; };
  }, []);

  function formaterDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Restitution</h1>
        <p className="text-sm text-enp-ink-soft mt-1.5">
          Conformément à l'article 77 du Règlement des Études, les principaux résultats de l'évaluation
          des enseignements et les suites données vous sont restitués.
        </p>
      </div>

      <div className="rounded-xl bg-enp-primary-light border border-enp-primary/15 p-4 sm:p-5 text-enp-ink text-sm leading-relaxed">
        Conformément à l'article 77 du Règlement des Études, les principaux résultats de l'évaluation
        des enseignements et les suites données vous sont restitués.
      </div>

      {erreur && (
        <div className="flex items-start gap-2.5 rounded-xl bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux" role="alert">
          <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{erreur}</span>
        </div>
      )}

      {chargement && !erreur && (
        <div className="flex items-center gap-3 text-enp-ink-soft">
          <div className="h-6 w-6 rounded-full border-2 border-enp-sky border-t-enp-primary animate-spin" aria-hidden="true" />
          <span>Chargement…</span>
        </div>
      )}

      {!chargement && !erreur && restitutions.length === 0 && (
        <div className="bg-white border border-enp-border rounded-xl p-8 text-center shadow-card">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-enp-sky mb-3">
            <FileText size={28} className="text-enp-primary" aria-hidden="true" />
          </div>
          <p className="text-enp-ink-soft">Aucune restitution n'est encore publiée.</p>
        </div>
      )}

      {!chargement && !erreur && restitutions.length > 0 && (
        <div className="space-y-4">
          {restitutions.map((r) => (
            <article key={r.campagneId} className="bg-white border border-enp-border rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow">
              <div className="bg-enp-teal-dark text-white px-4 py-3 sm:px-6 sm:py-4">
                <h2 className="text-lg font-semibold tracking-tight">{r.libelle}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400 mt-1">
                  <span>{r.departement}</span>
                  <span aria-hidden="true">·</span>
                  <span>{r.anneeUniversitaire}</span>
                  <span aria-hidden="true">·</span>
                  <span>S{r.semestre}</span>
                  <span aria-hidden="true">·</span>
                  <span>Publiée le {formaterDate(r.publieLe)}</span>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-5">
                <section>
                  <h3 className="text-sm font-semibold text-enp-primary uppercase tracking-wider mb-2">
                    Principaux résultats
                  </h3>
                  <p className="text-sm text-enp-ink-soft leading-relaxed whitespace-pre-wrap">
                    {r.resultats}
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-enp-primary uppercase tracking-wider mb-2">
                    Suites données
                  </h3>
                  <p className="text-sm text-enp-ink-soft leading-relaxed whitespace-pre-wrap">
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
