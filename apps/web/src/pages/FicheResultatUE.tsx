import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Printer } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { ResultatUe } from '@/api/types';
import { InfoCard } from '@/components/InfoCard';

export function FicheResultatUE() {
  const { ueId } = useParams<{ ueId: string }>();
  const [params] = useSearchParams();
  const campagneId = Number(params.get('campagne'));

  const [resultat, setResultat] = useState<ResultatUe | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    if (!ueId || !campagneId) {
      setErreur('Paramètres invalides.');
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
      else setErreur('Erreur réseau : impossible de charger ce résultat.');
    } finally {
      setChargement(false);
    }
  }, [ueId, campagneId]);

  useEffect(() => {
    void charger();
  }, [charger]);

<<<<<<< Updated upstream
=======
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
      { note: '2 - Plutôt pas', effectif: totaux[1], fill: '#6D28D9' },
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

>>>>>>> Stashed changes
  if (chargement) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 text-enp-ink-soft">
          <div className="h-6 w-6 rounded-full border-2 border-enp-sky border-t-enp-primary animate-spin" aria-hidden="true" />
          <span>Chargement du résultat…</span>
        </div>
      </div>
    );
  }

  if (erreur || !resultat) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux" role="alert">
          <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{erreur ?? 'Résultat introuvable.'}</span>
        </div>
        <Link to="/resultats" className="inline-flex items-center gap-2 text-enp-primary hover:underline">
          <ArrowLeft size={18} aria-hidden="true" /> Retour à la liste
        </Link>
      </div>
    );
  }

  const pct = resultat.inscrits > 0 ? Math.round((resultat.repondants / resultat.inscrits) * 100) : 0;
  const sectionLibelle: Record<string, string> = {
    A: 'A — Contenu', B: 'B — Pédagogie', C: 'C — Évaluation', D: 'D — Moyens', E: 'E — Satisfaction',
  };

  return (
    <div className="space-y-6 print-area">
      {/* En-tête */}
      <div className="no-print flex items-center justify-between gap-4">
        <Link to="/resultats" className="inline-flex items-center gap-2 text-enp-primary hover:underline text-sm">
          <ArrowLeft size={18} aria-hidden="true" /> Retour à la liste
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-white border border-enp-border text-enp-ink font-medium px-3 py-2 rounded-md hover:bg-enp-sky transition-colors text-sm min-h-[44px]"
        >
          <Printer size={18} aria-hidden="true" /> Imprimer / PDF
        </button>
      </div>

      {/* Titre (visible à l'impression) */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center bg-enp-primary text-white text-xs font-semibold px-2 py-0.5 rounded">{resultat.code}</span>
        </div>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">{resultat.intitule}</h1>
        <p className="text-sm text-enp-ink-soft mt-1">Semestre automne 2026</p>
      </div>

      {/* Encadré permanent */}
      <InfoCard titre="Usage des résultats" icone={false}>
        <p>
          Résultats à visée d'amélioration pédagogique ; ils ne peuvent
          constituer, à eux seuls, un élément d'appréciation individuelle.
        </p>
      </InfoCard>

      {/* Ligne de participation */}
      <div className="bg-enp-sky border border-enp-border rounded-lg p-4">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-enp-ink font-medium">
            {resultat.repondants} répondants sur {resultat.inscrits} inscrits
          </p>
          <p className="text-sm text-enp-ink-soft">{pct}%</p>
        </div>
        <div className="h-2.5 w-full rounded-full bg-white border border-enp-border overflow-hidden" aria-hidden="true">
          <div className="h-full bg-enp-primary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

<<<<<<< Updated upstream
      {/* Détail non disponible */}
      {!resultat.detailDisponible && (
        <InfoCard titre="Détail non disponible" icone={false}>
          <p>
            Moins de 5 répondants : le détail n'est pas affiché afin de
            protéger l'anonymat des étudiants.
=======
      {/* Mention réglementaire obligatoire permanente */}
      <div className="p-3.5 bg-enp-violet-soft border-l-4 border-enp-violet text-xs text-enp-black leading-relaxed">
        <strong>Avertissement déontologique :</strong> « Résultats à visée exclusive d'amélioration pédagogique ; ils ne peuvent constituer, à eux seuls, un élément d'appréciation individuelle. »
      </div>

      {/* CAS 1 : QUORUM NON ATTEINT (< 5 RÉPONDANTS) */}
      {!resultat.detailDisponible && (
        <div className="bg-[#FAF8F5] border border-enp-border p-6 space-y-3">
          <div className="flex items-center gap-2 text-enp-blue-deep font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-enp-violet" />
            <span>Protection statutaire de l'anonymat des étudiants</span>
          </div>
          <p className="text-xs sm:text-sm text-enp-gray-dark leading-relaxed">
            Pour cette unité d'enseignement, le nombre d'étudiants ayant validé leur évaluation ({resultat.repondants} répondant{resultat.repondants > 1 ? 's' : ''})
            est inférieur au seuil réglementaire strict de <strong>5 répondants</strong> fixé par le Conseil de Direction de l'ENP.
>>>>>>> Stashed changes
          </p>
        </InfoCard>
      )}

      {/* Détail disponible */}
      {resultat.detailDisponible && (
        <>
          {/* Cartes moyennes par section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resultat.sections.map((s) => (
              <div key={s.code} className="bg-white border border-enp-border rounded-lg p-4">
                <p className="text-sm font-medium text-enp-ink mb-2">{sectionLibelle[s.code] ?? s.titre}</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold text-enp-ink tracking-tight">
                    {s.moyenne !== null ? s.moyenne.toFixed(1) : '—'}
                  </span>
                  <span className="text-sm text-enp-ink-soft">/ 5</span>
                </div>
                <div className="h-2 w-full rounded-full bg-enp-sky overflow-hidden" aria-hidden="true">
                  <div
                    className="h-full bg-enp-primary transition-all duration-500"
                    style={{ width: `${s.moyenne !== null ? (s.moyenne / 5) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Tableaux détaillés par section */}
          <div className="space-y-6">
            {resultat.sections.map((s) => (
              <div key={s.code}>
                <h2 className="text-lg font-semibold text-enp-ink mb-3">
                  Section {s.code} — {s.titre}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-enp-primary text-white">
                        <th scope="col" className="text-left px-3 py-2.5 font-semibold rounded-tl-xl">Critère</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold text-center whitespace-nowrap">Moyenne</th>
                        <th scope="col" className="text-left px-3 py-2.5 font-semibold">Répartition</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold text-center rounded-tr-xl whitespace-nowrap">Sans avis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.criteres.map((c, i) => (
                        <tr key={c.critereId} className={i % 2 === 0 ? 'bg-enp-sky/60' : 'bg-white'}>
                          <td className="px-3 py-2.5 text-enp-ink">
                            <span className="font-semibold mr-1.5">{c.code}</span>
                            {c.libelle}
                          </td>
                          <td className="px-3 py-2.5 text-center font-medium text-enp-ink">
                            {c.moyenne !== null ? c.moyenne.toFixed(1) : '—'}
                          </td>
<<<<<<< Updated upstream
                          <td className="px-3 py-2.5">
                            <DistributionBarres distribution={c.distribution} />
=======
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1 font-mono text-[11px]">
                              <span className="px-1 bg-red-50 text-enp-red-error" title="Note 1">{crit.distribution?.[0] ?? 0}</span>
                              <span className="px-1 bg-enp-violet-soft text-[#5B21B6]" title="Note 2">{crit.distribution?.[1] ?? 0}</span>
                              <span className="px-1 bg-gray-50 text-gray-600" title="Note 3">{crit.distribution?.[2] ?? 0}</span>
                              <span className="px-1 bg-blue-50 text-enp-blue-primary" title="Note 4">{crit.distribution?.[3] ?? 0}</span>
                              <span className="px-1 bg-green-50 text-enp-green-valid font-bold" title="Note 5">{crit.distribution?.[4] ?? 0}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center text-enp-gray-medium">
                            {crit.sansAvis ?? 0}
>>>>>>> Stashed changes
                          </td>
                          <td className="px-3 py-2.5 text-center text-enp-ink-soft">{c.sansAvis}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Commentaires */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-enp-ink mb-3">Points forts</h2>
              <ul className="space-y-2">
                {resultat.pointsForts.map((c, i) => (
                  <li key={i} className="bg-enp-sky/60 border border-enp-border rounded-md p-3 text-sm text-enp-ink">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-enp-ink mb-3">Points à améliorer</h2>
              <ul className="space-y-2">
                {resultat.pointsAAmeliorer.map((c, i) => (
                  <li key={i} className="bg-enp-sky/60 border border-enp-border rounded-md p-3 text-sm text-enp-ink">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DistributionBarres({ distribution }: { distribution: [number, number, number, number, number] }) {
  const max = Math.max(...distribution, 1);
  const labels = ['1', '2', '3', '4', '5'];
  return (
    <div className="flex items-end gap-1.5 h-10">
      {distribution.map((n, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5" title={`${labels[i]} : ${n} répondant(s)`}>
          <span className="text-[10px] text-enp-ink-soft leading-none">{n}</span>
          <div className="w-5 rounded-sm bg-enp-sky overflow-hidden flex flex-col-reverse" style={{ height: '28px' }}>
            <div
              className="bg-enp-primary transition-all duration-300"
              style={{ height: `${(n / max) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-enp-ink-soft leading-none">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
