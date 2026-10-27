import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Printer, Save, CheckSquare, Square } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { Campagne, Synthese, SuitesDonnees } from '@/api/types';
import { InfoCard } from '@/components/InfoCard';

const SEUIL_ATTENTION = 3.0;

function fmtMoy(v: number | null): string {
  return v !== null ? v.toFixed(1) : '—';
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
      // Pré-remplir les champs d'analyse
      const avecDetail = data.lignes.filter((l) => l.detailDisponible && l.satisfactionE !== null);
      const meilleures = [...avecDetail].sort((a, b) => (b.satisfactionE ?? 0) - (a.satisfactionE ?? 0));
      const attention = avecDetail.filter((l) => (l.satisfactionE ?? 5) < SEUIL_ATTENTION);
      setSuites((s) => ({
        ...s,
        meilleuresUe: suitesChargees.meilleuresUe || meilleures.slice(0, 3).map((l) => `${l.code} (${fmtMoy(l.satisfactionE)})`).join(', '),
        ueAttention: suitesChargees.ueAttention || attention.map((l) => `${l.code} (${fmtMoy(l.satisfactionE)})`).join(', '),
      }));
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur réseau.');
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

  // Meilleure satisfaction
  const meilleureUe = synthese?.lignes
    .filter((l) => l.detailDisponible && l.satisfactionE !== null)
    .reduce((best, l) => !best || (l.satisfactionE ?? 0) > (best.satisfactionE ?? 0) ? l : best, null as null | typeof synthese.lignes[0]) ?? null;

  async function enregistrer() {
    if (campagneId === null) return;
    setEnCours(true);
    setErreurSave(null);
    setSaveOk(false);
    try {
      await api.pilotageSuites(campagneId, suites);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      if (err instanceof ApiError) setErreurSave(err.messages.join(' '));
      else setErreurSave("Erreur réseau : impossible d'enregistrer.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="space-y-6 print-area">
      {/* En-tête et navigation */}
      <div className="no-print flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Synthèse</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void enregistrer()}
            disabled={enCours}
            className="inline-flex items-center gap-2 bg-enp-primary text-white font-semibold px-3 py-2 rounded-md hover:bg-enp-primary-dark transition-all text-sm min-h-[44px] disabled:opacity-60"
          >
            <Save size={16} aria-hidden="true" />
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-white border border-enp-border text-enp-ink font-medium px-3 py-2 rounded-md hover:bg-enp-sky transition-colors text-sm min-h-[44px]"
          >
            <Printer size={16} aria-hidden="true" /> Imprimer / PDF
          </button>
        </div>
      </div>

      {/* Sélecteur de campagne */}
      <div className="no-print">
        <label htmlFor="campagne-synthese" className="block text-sm font-medium text-enp-ink mb-1">Campagne</label>
        <select
          id="campagne-synthese"
          value={campagneId ?? ''}
          onChange={(e) => { setCampagneId(Number(e.target.value)); setSuites({ meilleuresUe: '', ueAttention: '', actions: '', etabliPar: '', date: new Date().toISOString().slice(0, 10), visaChef: false }); }}
          className="w-full sm:w-auto rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
        >
          {campagnes.map((c) => (
            <option key={c.id} value={c.id}>{c.libelle}</option>
          ))}
        </select>
      </div>

      <InfoCard titre="Usage des résultats" icone={false}>
        <p>Résultats à visée d'amélioration pédagogique ; ils ne peuvent constituer, à eux seuls, un élément d'appréciation individuelle.</p>
      </InfoCard>

      {erreur && (
        <div className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux" role="alert">
          <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{erreur}</span>
        </div>
      )}

      {chargement && !erreur && (
        <div className="flex items-center gap-3 text-enp-ink-soft">
          <div className="h-6 w-6 rounded-full border-2 border-enp-sky border-t-enp-primary animate-spin" aria-hidden="true" />
          <span>Chargement de la synthèse…</span>
        </div>
      )}

      {!chargement && synthese && !erreur && (
        <>
          {/* En-tête synthèse */}
          <div className="bg-enp-sky border border-enp-border rounded-lg p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
              <div><p className="text-enp-ink-soft">Campus</p><p className="text-enp-ink font-medium">{synthese.campus}</p></div>
              <div><p className="text-enp-ink-soft">Département</p><p className="text-enp-ink font-medium">{synthese.departement}</p></div>
              <div><p className="text-enp-ink-soft">Semestre</p><p className="text-enp-ink font-medium">{synthese.campagne.semestre}</p></div>
              <div><p className="text-enp-ink-soft">Année universitaire</p><p className="text-enp-ink font-medium">{synthese.campagne.anneeUniversitaire}</p></div>
              <div><p className="text-enp-ink-soft">Répondants total</p><p className="text-enp-ink font-medium">{synthese.totalRepondants}</p></div>
            </div>
          </div>

          {/* Tableau de synthèse */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-enp-primary text-white">
                  <th scope="col" className="text-left px-2 py-2.5 font-semibold rounded-tl-xl">Code UE</th>
                  <th scope="col" className="text-left px-2 py-2.5 font-semibold">Intitulé de l'UE</th>
                  <th scope="col" className="text-left px-2 py-2.5 font-semibold">Enseignant</th>
                  <th scope="col" className="text-center px-2 py-2.5 font-semibold">Nb réponses</th>
                  <th scope="col" className="text-center px-2 py-2.5 font-semibold">Moy. A</th>
                  <th scope="col" className="text-center px-2 py-2.5 font-semibold">Moy. B</th>
                  <th scope="col" className="text-center px-2 py-2.5 font-semibold">Moy. C</th>
                  <th scope="col" className="text-center px-2 py-2.5 font-semibold">Moy. D</th>
                  <th scope="col" className="text-center px-2 py-2.5 font-semibold rounded-tr-xl">Satisfaction (E)</th>
                </tr>
              </thead>
              <tbody>
                {synthese.lignes.map((l, i) => {
                  const estMeilleure = meilleureUe?.ueId === l.ueId;
                  const aSurveiller = l.detailDisponible && l.satisfactionE !== null && l.satisfactionE < SEUIL_ATTENTION;
                  const fond = !l.detailDisponible ? 'bg-enp-primary-light' : aSurveiller ? 'bg-enp-primary-light' : i % 2 === 0 ? 'bg-enp-sky/60' : 'bg-white';
                  return (
                    <tr key={l.ueId} className={fond}>
                      <td className="px-2 py-2.5">
                        <span className="bg-enp-primary text-white text-xs font-semibold px-1.5 py-0.5 rounded">{l.code}</span>
                      </td>
                      <td className="px-2 py-2.5 text-enp-ink">
                        <div className="flex items-center gap-2">
                          <span>{l.intitule}</span>
                          {estMeilleure && (
                            <span className="inline-block bg-enp-primary text-white text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap">Meilleure appréciation</span>
                          )}
                          {aSurveiller && (
                            <span className="inline-block bg-enp-primary-light text-enp-ink-soft text-[10px] font-medium px-1.5 py-0.5 rounded border border-enp-primary/15 whitespace-nowrap">À surveiller</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-enp-ink-soft">{l.enseignant}</td>
                      <td className="px-2 py-2.5 text-center text-enp-ink font-medium">{l.nbReponses}</td>
                      <td className="px-2 py-2.5 text-center text-enp-ink">{fmtMoy(l.moyA)}</td>
                      <td className="px-2 py-2.5 text-center text-enp-ink">{fmtMoy(l.moyB)}</td>
                      <td className="px-2 py-2.5 text-center text-enp-ink">{fmtMoy(l.moyC)}</td>
                      <td className="px-2 py-2.5 text-center text-enp-ink">{fmtMoy(l.moyD)}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-enp-ink">{fmtMoy(l.satisfactionE)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bloc analyse et suites */}
          <div className="bg-white border border-enp-border rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-semibold text-enp-ink">Analyse et suites données</h2>

            <div>
              <label htmlFor="meilleures-ue" className="block text-sm font-medium text-enp-ink mb-1">
                UE ayant obtenu les meilleures appréciations
              </label>
              <textarea
                id="meilleures-ue" rows={2}
                value={suites.meilleuresUe}
                onChange={(e) => setSuites((s) => ({ ...s, meilleuresUe: e.target.value }))}
                className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none resize-y"
              />
            </div>

            <div>
              <label htmlFor="ue-attention" className="block text-sm font-medium text-enp-ink mb-1">
                UE nécessitant une attention particulière
              </label>
              <textarea
                id="ue-attention" rows={2}
                value={suites.ueAttention}
                onChange={(e) => setSuites((s) => ({ ...s, ueAttention: e.target.value }))}
                className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none resize-y"
              />
            </div>

            <div>
              <label htmlFor="actions" className="block text-sm font-medium text-enp-ink mb-1">
                Actions correctives envisagées / suites données
              </label>
              <textarea
                id="actions" rows={4}
                value={suites.actions}
                onChange={(e) => setSuites((s) => ({ ...s, actions: e.target.value }))}
                className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="etabli-par" className="block text-sm font-medium text-enp-ink mb-1">Établi par</label>
                <input
                  id="etabli-par" type="text"
                  value={suites.etabliPar}
                  onChange={(e) => setSuites((s) => ({ ...s, etabliPar: e.target.value }))}
                  className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label htmlFor="date-suite" className="block text-sm font-medium text-enp-ink mb-1">Date</label>
                <input
                  id="date-suite" type="date"
                  value={suites.date}
                  onChange={(e) => setSuites((s) => ({ ...s, date: e.target.value }))}
                  className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={suites.visaChef}
                  onChange={(e) => setSuites((s) => ({ ...s, visaChef: e.target.checked }))}
                  className="sr-only"
                />
                {suites.visaChef ? (
                  <CheckSquare size={22} className="text-enp-ink" aria-hidden="true" />
                ) : (
                  <Square size={22} className="text-enp-border" aria-hidden="true" />
                )}
                <span className="text-sm font-medium text-enp-ink">Visa du Chef de Département</span>
              </label>
            </div>

            {erreurSave && (
              <div className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-3 text-enp-bordeaux text-sm" role="alert">
                <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
                <span>{erreurSave}</span>
              </div>
            )}
            {saveOk && (
              <p className="text-sm text-enp-primary font-medium">Modifications enregistrées.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
