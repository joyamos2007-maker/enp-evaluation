import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Megaphone, UserCog, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { TableauDeBordScolarite } from '@/api/types';
import { InfoCard } from '@/components/InfoCard';

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon',
  ouverte: 'Ouverte',
  close: 'Close',
  restituee: 'Restituée',
};

const STATUT_STYLE: Record<string, string> = {
  brouillon: 'bg-enp-sky text-enp-ink',
  ouverte: 'bg-enp-primary text-white',
  close: 'bg-enp-violet text-white',
  restituee: 'bg-enp-teal-light text-enp-teal',
};

export function TableauDeBordScolaritePage() {
  const [data, setData] = useState<TableauDeBordScolarite | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const d = await api.scolariteTableauDeBord();
      setData(d);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur réseau.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  const tauxParticipation = data && data.participation.inscriptions > 0
    ? Math.round((data.participation.participations / data.participation.inscriptions) * 100) : 0;

  const campagnesACloturer = data?.campagnes.filter((c) => c.statut === 'ouverte' && new Date(c.fin) < new Date()) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-enp-ink-soft mt-1.5">Vue d'ensemble de l'activité de la Scolarité.</p>
      </div>

      {erreur && (
        <div className="flex items-start gap-2.5 rounded-xl bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux" role="alert">
          <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p>{erreur}</p>
            <button type="button" onClick={() => void charger()} className="mt-2 inline-flex items-center gap-2 bg-enp-primary text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-enp-primary-dark transition-all min-h-[44px]">Réessayer</button>
          </div>
        </div>
      )}

      {chargement && !erreur && (
        <div className="flex items-center gap-3 text-enp-ink-soft">
          <div className="h-6 w-6 rounded-full border-2 border-enp-sky border-t-enp-primary animate-spin" aria-hidden="true" />
          <span>Chargement…</span>
        </div>
      )}

      {!chargement && data && !erreur && (
        <>
          {/* Cartes statistiques */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-enp-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-11 h-11 rounded-lg bg-enp-primary flex items-center justify-center">
                  <Megaphone size={22} className="text-white" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-enp-ink tracking-tight">{data.campagnesOuvertes}</p>
                  <p className="text-xs text-enp-ink-soft">Campagnes ouvertes</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-enp-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-11 h-11 rounded-lg bg-enp-violet flex items-center justify-center">
                  <UserCog size={22} className="text-white" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-enp-ink tracking-tight">{data.comptesSansMotDePasse}</p>
                  <p className="text-xs text-enp-ink-soft">Comptes sans mot de passe</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-enp-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-11 h-11 rounded-lg bg-enp-bordeaux flex items-center justify-center">
                  <MessageSquare size={22} className="text-white" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-enp-ink tracking-tight">{data.commentairesAModerer}</p>
                  <p className="text-xs text-enp-ink-soft">Commentaires à modérer</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-enp-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-11 h-11 rounded-lg bg-enp-teal flex items-center justify-center">
                  <TrendingUp size={22} className="text-white" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-enp-ink tracking-tight">{tauxParticipation}%</p>
                  <p className="text-xs text-enp-ink-soft">Participation globale</p>
                </div>
              </div>
            </div>
          </div>

          {/* Barre participation */}
          <div className="bg-white border border-enp-border rounded-xl p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-enp-ink font-semibold">Participation</span>
              <span className="text-enp-ink-soft">{data.participation.participations} / {data.participation.inscriptions} jetons</span>
            </div>
            <div className="h-3 w-full rounded-full bg-enp-sky overflow-hidden" aria-hidden="true">
              <div className="h-full bg-gradient-to-r from-enp-primary to-enp-teal transition-all duration-500" style={{ width: `${tauxParticipation}%` }} />
            </div>
            <p className="text-xs text-enp-ink-soft">Participation = jetons de vote émis ; bulletins déposés = {data.participation.bulletins} bulletins reçus</p>
          </div>

          {/* Tableau campagnes */}
          <div className="bg-white border border-enp-border rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-enp-teal-dark text-white">
                    <th scope="col" className="text-left px-4 py-3 font-semibold">Libellé</th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold">Département</th>
                    <th scope="col" className="text-center px-4 py-3 font-semibold">Année</th>
                    <th scope="col" className="text-center px-4 py-3 font-semibold">S.</th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold">Période</th>
                    <th scope="col" className="text-center px-4 py-3 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.campagnes.map((c, i) => (
                    <tr key={c.id} className={i % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                      <td className="px-4 py-3 text-enp-ink font-medium">{c.libelle}</td>
                      <td className="px-4 py-3 text-enp-ink-soft">{c.departement}</td>
                      <td className="px-4 py-3 text-center text-enp-ink-soft">{c.anneeUniversitaire}</td>
                      <td className="px-4 py-3 text-center text-enp-ink-soft">S{c.semestre}</td>
                      <td className="px-4 py-3 text-enp-ink-soft whitespace-nowrap">{c.debut.slice(0, 10)} → {c.fin.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-md ${STATUT_STYLE[c.statut] ?? 'bg-enp-sky text-enp-ink'}`}>{STATUT_LABEL[c.statut]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* À faire */}
          <InfoCard titre="À faire">
            <ul className="space-y-1.5">
              {data.comptesSansMotDePasse > 0 && (
                <li>
                  <Link to="/scolarite/comptes" className="underline hover:text-enp-ink">
                    {data.comptesSansMotDePasse} compte(s) sans code d'activation à générer
                  </Link>
                </li>
              )}
              {data.commentairesAModerer > 0 && (
                <li>
                  <Link to="/scolarite/moderation" className="underline hover:text-enp-ink">
                    {data.commentairesAModerer} commentaire(s) à modérer
                  </Link>
                </li>
              )}
              {campagnesACloturer.map((c) => (
                <li key={c.id}>
                  <Link to="/scolarite/campagnes" className="underline hover:text-enp-ink">
                    Clôturer la campagne « {c.libelle} » (date de fin passée)
                  </Link>
                </li>
              ))}
              {data.comptesSansMotDePasse === 0 && data.commentairesAModerer === 0 && campagnesACloturer.length === 0 && (
                <li>Rien à faire pour le moment.</li>
              )}
            </ul>
          </InfoCard>
        </>
      )}
    </div>
  );
}
