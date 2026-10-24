import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, AlertCircle, ArrowRight } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { ResultatUeResume } from '@/api/types';

export function MesResultats() {
  const [resultats, setResultats] = useState<ResultatUeResume[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.resultatsMesUes();
      setResultats(data);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur réseau : impossible de charger vos résultats.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (chargement) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Mes résultats</h1>
        <div className="flex items-center gap-3 text-enp-ink-soft">
          <div className="h-6 w-6 rounded-full border-2 border-enp-sky border-t-enp-primary animate-spin" aria-hidden="true" />
          <span>Chargement…</span>
        </div>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Mes résultats</h1>
        <div className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux" role="alert">
          <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p>{erreur}</p>
            <button type="button" onClick={() => void charger()} className="mt-2 inline-flex items-center gap-2 bg-enp-primary text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-enp-primary-dark transition-all min-h-[44px]">Réessayer</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Mes résultats</h1>
        <p className="text-sm text-enp-ink-soft mt-1">Résultats de vos évaluations par UE et par campagne.</p>
      </div>

      {/* Desktop: tableau */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-enp-primary text-white">
              <th scope="col" className="text-left px-3 py-3 font-semibold rounded-tl-xl">Code</th>
              <th scope="col" className="text-left px-3 py-3 font-semibold">Intitulé</th>
              <th scope="col" className="text-left px-3 py-3 font-semibold">Campagne</th>
              <th scope="col" className="text-left px-3 py-3 font-semibold">Participation</th>
              <th scope="col" className="px-3 py-3 font-semibold rounded-tr-xl">Détail</th>
            </tr>
          </thead>
          <tbody>
            {resultats.map((r, i) => {
              const pct = r.inscrits > 0 ? Math.round((r.repondants / r.inscrits) * 100) : 0;
              return (
                <tr key={r.ueId} className={i % 2 === 0 ? 'bg-enp-sky' : 'bg-white'}>
                  <td className="px-3 py-3">
                    <Link to={`/resultats/${r.ueId}?campagne=${r.campagneId}`} className="text-enp-primary font-medium hover:underline">{r.code}</Link>
                  </td>
                  <td className="px-3 py-3 text-enp-ink">{r.intitule}</td>
                  <td className="px-3 py-3 text-enp-ink-soft">{r.libelleCampagne}</td>
                  <td className="px-3 py-3">
                    <BarreParticipation repondants={r.repondants} inscrits={r.inscrits} pct={pct} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    {r.detailDisponible ? (
                      <Link to={`/resultats/${r.ueId}?campagne=${r.campagneId}`} className="inline-flex items-center gap-1 text-enp-primary hover:underline text-sm">
                        Voir <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    ) : (
                      <span className="inline-block bg-enp-primary-light text-enp-ink-soft text-xs px-2 py-1 rounded">Détail non disponible (&lt; 5 répondants)</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: cartes */}
      <div className="lg:hidden space-y-3">
        {resultats.map((r) => {
          const pct = r.inscrits > 0 ? Math.round((r.repondants / r.inscrits) * 100) : 0;
          return (
            <div key={r.ueId} className="bg-white border border-enp-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center justify-center bg-enp-primary text-white text-xs font-semibold px-2 py-0.5 rounded">{r.code}</span>
                <span className="text-xs text-enp-ink-soft">{r.libelleCampagne}</span>
              </div>
              <p className="text-enp-ink font-medium leading-snug mb-3">{r.intitule}</p>
              <BarreParticipation repondants={r.repondants} inscrits={r.inscrits} pct={pct} />
              <div className="mt-3">
                {r.detailDisponible ? (
                  <Link to={`/resultats/${r.ueId}?campagne=${r.campagneId}`} className="inline-flex items-center gap-2 bg-enp-primary text-white text-sm font-medium px-3 py-2.5 rounded-md hover:bg-enp-primary-dark transition-all min-h-[44px] w-full justify-center">
                    <BarChart3 size={18} aria-hidden="true" /> Voir le détail
                  </Link>
                ) : (
                  <span className="inline-block bg-enp-primary-light text-enp-ink-soft text-xs px-3 py-2 rounded w-full text-center">
                    Détail non disponible (moins de 5 répondants)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarreParticipation({ repondants, inscrits, pct }: { repondants: number; inscrits: number; pct: number }) {
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm text-enp-ink font-medium">{repondants} répondants sur {inscrits} inscrits</span>
        <span className="text-xs text-enp-ink-soft">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-enp-sky overflow-hidden" aria-hidden="true">
        <div className="h-full bg-enp-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
