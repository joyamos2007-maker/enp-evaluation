import { useEffect, useState, useCallback, useMemo } from 'react';
import { AlertCircle, Users } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { Campagne, ParticipationUe } from '@/api/types';

export function Participation() {
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [campagneId, setCampagneId] = useState<number | null>(null);
  const [participations, setParticipations] = useState<ParticipationUe[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const chargerCampagnes = useCallback(async () => {
    try {
      const data = await api.pilotageCampagnes();
      setCampagnes(data);
      if (data.length > 0 && campagneId === null) {
        setCampagneId(data[0].id);
      }
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur réseau.');
    }
  }, [campagneId]);

  const chargerParticipation = useCallback(async () => {
    if (campagneId === null) return;
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.pilotageParticipation(campagneId);
      setParticipations(data);
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
    if (campagneId !== null) void chargerParticipation();
  }, [campagneId, chargerParticipation]);

  const trie = useMemo(() => {
    return [...participations].sort((a, b) => {
      const ta = a.inscrits > 0 ? a.repondants / a.inscrits : 0;
      const tb = b.inscrits > 0 ? b.repondants / b.inscrits : 0;
      return ta - tb;
    });
  }, [participations]);

  const totalInscrits = participations.reduce((s, p) => s + p.inscrits, 0);
  const totalRepondants = participations.reduce((s, p) => s + p.repondants, 0);
  const tauxGlobal = totalInscrits > 0 ? Math.round((totalRepondants / totalInscrits) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Participation</h1>
        <p className="text-sm text-enp-ink-soft mt-1">Taux de participation aux campagnes d'évaluation.</p>
      </div>

      {/* Sélecteur de campagne */}
      <div>
        <label htmlFor="campagne" className="block text-sm font-medium text-enp-ink mb-1">Campagne</label>
        <select
          id="campagne"
          value={campagneId ?? ''}
          onChange={(e) => setCampagneId(Number(e.target.value))}
          className="w-full sm:w-auto rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
        >
          {campagnes.map((c) => (
            <option key={c.id} value={c.id}>{c.libelle}</option>
          ))}
        </select>
      </div>

      {erreur && (
        <div className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux" role="alert">
          <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p>{erreur}</p>
            <button type="button" onClick={() => void chargerParticipation()} className="mt-2 inline-flex items-center gap-2 bg-enp-primary text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-enp-primary-dark transition-all min-h-[44px]">Réessayer</button>
          </div>
        </div>
      )}

      {chargement && !erreur && (
        <div className="flex items-center gap-3 text-enp-ink-soft">
          <div className="h-6 w-6 rounded-full border-2 border-enp-sky border-t-enp-primary animate-spin" aria-hidden="true" />
          <span>Chargement…</span>
        </div>
      )}

      {!chargement && !erreur && (
        <>
          {/* Carte taux global */}
          <div className="bg-enp-sky border border-enp-border rounded-lg p-4 flex items-center gap-4">
            <div className="shrink-0 w-12 h-12 rounded-full bg-enp-primary flex items-center justify-center">
              <Users size={24} className="text-white" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-enp-ink font-medium">Taux global de participation</p>
              <p className="text-sm text-enp-ink-soft">{totalRepondants} répondants sur {totalInscrits} inscrits</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-enp-ink">{tauxGlobal}%</p>
            </div>
            <div className="hidden sm:block w-32">
              <div className="h-2.5 w-full rounded-full bg-white border border-enp-border overflow-hidden" aria-hidden="true">
                <div className="h-full bg-enp-primary transition-all duration-500" style={{ width: `${tauxGlobal}%` }} />
              </div>
            </div>
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-enp-primary text-white">
                  <th scope="col" className="text-left px-3 py-2.5 font-semibold rounded-tl-xl">Code</th>
                  <th scope="col" className="text-left px-3 py-2.5 font-semibold">Intitulé</th>
                  <th scope="col" className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Inscrits</th>
                  <th scope="col" className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Répondants</th>
                  <th scope="col" className="text-left px-3 py-2.5 font-semibold rounded-tr-xl">Taux</th>
                </tr>
              </thead>
              <tbody>
                {trie.map((p, i) => {
                  const taux = p.inscrits > 0 ? Math.round((p.repondants / p.inscrits) * 100) : 0;
                  return (
                    <tr key={p.ueId} className={i % 2 === 0 ? 'bg-enp-sky/60' : 'bg-white'}>
                      <td className="px-3 py-2.5">
                        <span className="bg-enp-primary text-white text-xs font-semibold px-2 py-0.5 rounded">{p.code}</span>
                      </td>
                      <td className="px-3 py-2.5 text-enp-ink">{p.intitule}</td>
                      <td className="px-3 py-2.5 text-center text-enp-ink-soft">{p.inscrits}</td>
                      <td className="px-3 py-2.5 text-center text-enp-ink font-medium">{p.repondants}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-enp-sky overflow-hidden shrink-0" aria-hidden="true">
                            <div className="h-full bg-enp-primary transition-all duration-500" style={{ width: `${taux}%` }} />
                          </div>
                          <span className="text-enp-ink font-medium text-xs">{taux}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
