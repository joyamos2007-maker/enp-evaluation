import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  UserX,
  Activity,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { PresencesEtudiant, StatutPresenceEtudiant } from '@/api/types';
import { PageHeader, Alert, StatCard, Badge } from '@/components/ui';

const LIBELLES_STATUT: Record<StatutPresenceEtudiant, string> = {
  present: 'Présent',
  absent: 'Absent',
  retard: 'En retard',
};

export function EtudiantPresences() {
  const [donnees, setDonnees] = useState<PresencesEtudiant | null>(null);
  const [filtreUe, setFiltreUe] = useState<string>('toutes');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    api
      .dossierMesPresences()
      .then((data) => {
        if (actif) setDonnees(data);
      })
      .catch((err: unknown) => {
        if (actif) {
          setErreur(
            err instanceof ApiError
              ? err.messages.join(' ')
              : 'Impossible de charger vos présences.',
          );
        }
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, []);

  const presences = donnees?.presences ?? [];
  const statistiques = donnees?.statistiques;

  const uesUniques = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of presences) {
      if (!map.has(p.code)) map.set(p.code, p.intitule);
    }
    return Array.from(map.entries());
  }, [presences]);

  const presencesFiltrees = useMemo(() => {
    if (filtreUe === 'toutes') return presences;
    return presences.filter((p) => p.code === filtreUe);
  }, [presences, filtreUe]);

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl mx-auto pb-6">
      <PageHeader
        title="Mon relevé d'assiduité"
        description="Consultez l'historique de vos présences, retards et absences par unité d'enseignement."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Mes présences' },
        ]}
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {chargement ? (
        <div className="bg-white border border-enp-border p-12 text-center text-sm text-enp-gray-medium">
          Chargement de votre relevé d'assiduité…
        </div>
      ) : (
        <>
          {statistiques && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
              <StatCard
                title="Taux de présence"
                value={statistiques.tauxPresence === null ? '-' : `${statistiques.tauxPresence}%`}
                icon={<Activity className="w-4 h-4 sm:w-5 sm:h-5 text-enp-blue-primary" />}
                description={`${statistiques.seancesMarquees} / ${statistiques.seancesTotal} séances`}
                variant="primary"
                className="p-3 sm:p-5"
              />
              <StatCard
                title="Présences"
                value={statistiques.presents}
                icon={<CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-enp-green-valid" />}
                description="Séances validées"
                variant="success"
                className="p-3 sm:p-5"
              />
              <StatCard
                title="Retards"
                value={statistiques.retards}
                icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-enp-gold" />}
                description="Arrivées tardives"
                variant="warning"
                className="p-3 sm:p-5"
              />
              <StatCard
                title="Absences"
                value={statistiques.absents}
                icon={<UserX className="w-4 h-4 sm:w-5 sm:h-5 text-enp-red-error" />}
                description="Séances manquées"
                variant={statistiques.absents > 0 ? 'danger' : 'default'}
                className="p-3 sm:p-5"
              />
            </div>
          )}

          {presences.length === 0 ? (
            <div className="bg-white border border-enp-border p-10 text-center space-y-2 shadow-xs">
              <CalendarCheck className="w-10 h-10 text-enp-gray-medium mx-auto opacity-40" />
              <p className="text-sm font-bold text-enp-blue-deep">
                Aucun pointage enregistré pour le moment
              </p>
              <p className="text-xs text-enp-gray-medium">
                Vos feuilles de présence apparaîtront ici dès leur saisie par vos enseignants.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-enp-border shadow-xs overflow-hidden">
              {uesUniques.length > 1 && (
                <div className="p-3.5 border-b border-enp-border bg-enp-bg flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep mr-1">
                    Filtrer par UE :
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiltreUe('toutes')}
                    className={`px-2.5 py-1 text-xs font-semibold border transition-colors ${
                      filtreUe === 'toutes'
                        ? 'bg-enp-blue-deep text-white border-enp-blue-deep'
                        : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice/40'
                    }`}
                  >
                    Toutes ({presences.length})
                  </button>
                  {uesUniques.map(([code, intitule]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setFiltreUe(code)}
                      title={intitule}
                      className={`px-2.5 py-1 text-xs font-semibold border transition-colors ${
                        filtreUe === code
                          ? 'bg-enp-blue-primary text-white border-enp-blue-primary'
                          : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice/40'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-enp-blue-deep text-left text-white text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Unité d'Enseignement</th>
                      <th className="px-4 py-3 font-semibold">Séance</th>
                      <th className="px-4 py-3 text-center font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-enp-border">
                    {presencesFiltrees.map((ligne) => (
                      <tr key={ligne.seanceId} className="hover:bg-enp-blue-ice/20">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-enp-black whitespace-nowrap">
                          {ligne.date}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-enp-blue-light text-enp-blue-deep border border-enp-blue-primary/20 px-1.5 py-0.5">
                              {ligne.code}
                            </span>
                            <span className="font-semibold text-enp-black text-xs sm:text-sm">
                              {ligne.intitule}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-enp-gray-dark text-xs sm:text-sm">
                          {ligne.libelle}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              ligne.statut === 'present'
                                ? 'success'
                                : ligne.statut === 'retard'
                                  ? 'warning'
                                  : 'danger'
                            }
                          >
                            {LIBELLES_STATUT[ligne.statut]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
