import { useEffect, useState, useCallback, useMemo } from 'react';
import { Users, CheckCircle2, Activity, RefreshCw } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { Campagne, ParticipationUe } from '@/api/types';
import { PageHeader, Button, Alert, StatCard, Badge } from '@/components/ui';

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
  const uesQuorumAtteint = participations.filter((p) => p.repondants >= 5).length;

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in pb-6">
      <PageHeader
        title="Suivi de la participation"
        description="Suivez en direct le taux de réponse des étudiants par unité d'enseignement."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Participation' },
        ]}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={chargement}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${chargement ? 'animate-spin' : ''}`} />}
            onClick={() => void chargerParticipation()}
          >
            Actualiser
          </Button>
        }
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {/* SÉLECTEUR DE CAMPAGNE EN 1 CLIC */}
      {campagnes.length > 0 && (
        <div className="bg-white border border-enp-border p-4 flex flex-wrap items-center gap-2 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep mr-2">
            Campagne :
          </span>
          {campagnes.map((c) => {
            const active = c.id === campagneId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCampagneId(c.id)}
                className={`px-3.5 py-2 text-xs font-semibold border transition-colors ${
                  active
                    ? 'bg-enp-blue-deep text-white border-enp-blue-deep'
                    : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice/40'
                }`}
              >
                {c.libelle}
              </button>
            );
          })}
        </div>
      )}

      {chargement ? (
        <div className="bg-white border border-enp-border p-12 text-center text-sm text-enp-gray-medium">
          Chargement des indicateurs de participation…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              title="Taux global"
              value={`${tauxGlobal}%`}
              icon={<Activity className="w-5 h-5 text-enp-blue-primary" />}
              description={`${totalRepondants} suffrages sur ${totalInscrits} inscrits`}
              variant="primary"
            />
            <StatCard
              title="Répondants"
              value={totalRepondants}
              icon={<Users className="w-5 h-5 text-enp-blue-deep" />}
              description={`Sur ${participations.length} UE suivies`}
            />
            <StatCard
              title="Seuil d'anonymat (≥ 5)"
              value={`${uesQuorumAtteint} / ${participations.length}`}
              icon={<CheckCircle2 className="w-5 h-5 text-enp-green-valid" />}
              description="UE exploitables au dépouillement"
              variant="success"
            />
          </div>

          <div className="bg-white border border-enp-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-enp-blue-deep text-white text-xs uppercase tracking-wider">
                    <th scope="col" className="text-left px-4 py-3 font-semibold">Code</th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold">Unité d'Enseignement</th>
                    <th scope="col" className="text-center px-4 py-3 font-semibold">Inscrits</th>
                    <th scope="col" className="text-center px-4 py-3 font-semibold">Répondants</th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold w-56">Progression</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-enp-border">
                  {trie.map((p) => {
                    const taux = p.inscrits > 0 ? Math.round((p.repondants / p.inscrits) * 100) : 0;
                    return (
                      <tr key={p.ueId} className="hover:bg-enp-blue-ice/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold bg-enp-blue-light text-enp-blue-deep border border-enp-blue-primary/20 px-2 py-0.5">
                            {p.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-enp-black">{p.intitule}</td>
                        <td className="px-4 py-3 text-center text-enp-gray-medium">{p.inscrits}</td>
                        <td className="px-4 py-3 text-center font-bold text-enp-black">
                          {p.repondants}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-2 flex-1 bg-enp-bg border border-enp-border overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  taux >= 50 ? 'bg-enp-green-valid' : 'bg-enp-blue-primary'
                                }`}
                                style={{ width: `${taux}%` }}
                              />
                            </div>
                            <Badge variant={taux >= 50 ? 'success' : 'outline'}>{taux}%</Badge>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
