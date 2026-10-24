import { useEffect, useState } from 'react';
import { AlertCircle, CalendarCheck } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { PresencesEtudiant, StatutPresenceEtudiant } from '@/api/types';

const LIBELLES_STATUT: Record<StatutPresenceEtudiant, string> = {
  present: 'Présent',
  absent: 'Absent',
  retard: 'En retard',
};

export function EtudiantPresences() {
  const [donnees, setDonnees] = useState<PresencesEtudiant | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    api.dossierMesPresences()
      .then((data) => { if (actif) setDonnees(data); })
      .catch((err: unknown) => {
        if (actif) setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Impossible de charger vos présences.');
      })
      .finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
  }, []);

  const presences = donnees?.presences ?? [];
  const statistiques = donnees?.statistiques;

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Mes présences</h1>
        <p className="text-sm text-enp-ink-soft mt-1">Historique des présences et retards enregistrés pour vos UE.</p>
      </header>
      {erreur && (
        <div className="flex items-start gap-2 rounded-lg border border-enp-bordeaux/15 bg-enp-bordeaux-light p-4 text-enp-bordeaux" role="alert">
          <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{erreur}</span>
        </div>
      )}
      {chargement ? <p className="text-enp-ink-soft">Chargement…</p> : (
        <>
          {statistiques && (
            <section aria-label="Statistiques de présence" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <CarteStatistique libelle="Taux de présence" valeur={statistiques.tauxPresence === null ? '—' : `${statistiques.tauxPresence}%`} />
              <CarteStatistique libelle="Séances marquées" valeur={`${statistiques.seancesMarquees} / ${statistiques.seancesTotal}`} />
              <CarteStatistique libelle="Présences" valeur={String(statistiques.presents)} />
              <CarteStatistique libelle="Absences" valeur={String(statistiques.absents)} />
              <CarteStatistique libelle="Retards" valeur={String(statistiques.retards)} />
            </section>
          )}
          {presences.length === 0 ? (
            <div className="rounded-xl border border-enp-border bg-white p-8 text-center">
              <CalendarCheck size={28} className="mx-auto mb-3 text-enp-primary" aria-hidden="true" />
              <p className="text-enp-ink-soft">Aucun statut n’est encore renseigné pour vos séances.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-enp-border bg-white">
              <table className="w-full text-sm">
                <thead><tr className="bg-enp-primary text-left text-white"><th className="px-4 py-3">Date</th><th className="px-4 py-3">UE</th><th className="px-4 py-3">Séance</th><th className="px-4 py-3">Statut</th></tr></thead>
                <tbody>{presences.map((ligne) => (
                  <tr key={ligne.seanceId} className="border-t border-enp-border">
                    <td className="px-4 py-3">{ligne.date}</td>
                    <td className="px-4 py-3"><span className="font-semibold text-enp-ink">{ligne.code}</span><span className="block text-xs text-enp-ink-soft">{ligne.intitule}</span></td>
                    <td className="px-4 py-3">{ligne.libelle}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ligne.statut === 'present' ? 'bg-emerald-100 text-emerald-800' : ligne.statut === 'retard' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{LIBELLES_STATUT[ligne.statut]}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CarteStatistique({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="rounded-xl border border-enp-border bg-white p-4">
      <p className="text-xs font-medium text-enp-ink-soft">{libelle}</p>
      <p className="mt-1 text-xl font-bold text-enp-primary">{valeur}</p>
    </div>
  );
}
