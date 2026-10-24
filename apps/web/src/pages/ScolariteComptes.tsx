import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CompteAdministration } from '@/api/types';
import { LIBELLES_ROLES } from '@/components/menuConfig';

export function ScolariteComptes() {
  const [comptes, setComptes] = useState<CompteAdministration[]>([]);
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setComptes(await api.scolariteComptes());
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur réseau lors du chargement des comptes.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  const comptesFiltres = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLocaleLowerCase();
    if (!rechercheNormalisee) return comptes;
    return comptes.filter((compte) =>
      [compte.matricule, compte.email, compte.nom, compte.prenom, ...compte.roles]
        .some((valeur) => valeur?.toLocaleLowerCase().includes(rechercheNormalisee)),
    );
  }, [comptes, recherche]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Comptes</h1>
        <p className="mt-1 text-sm text-enp-ink-soft">
          Consultez les comptes, leurs rôles et leur état d’activation.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Rechercher un compte</span>
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-enp-ink-soft" aria-hidden="true" />
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Matricule, nom, email ou rôle"
            className="w-full rounded-lg border border-enp-border bg-white py-2.5 pl-10 pr-3 text-sm text-enp-ink outline-none focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20"
          />
        </label>
        {!chargement && <span className="text-sm text-enp-ink-soft">{comptesFiltres.length} compte(s)</span>}
      </div>

      {erreur && (
        <div className="flex items-start gap-2 rounded-lg border border-enp-bordeaux/15 bg-enp-bordeaux-light p-4 text-enp-bordeaux" role="alert">
          <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p>{erreur}</p>
            <button type="button" onClick={() => void charger()} className="mt-2 font-semibold underline">
              Réessayer
            </button>
          </div>
        </div>
      )}

      {chargement && !erreur && (
        <p className="text-sm text-enp-ink-soft" role="status">Chargement des comptes…</p>
      )}

      {!chargement && !erreur && (
        <div className="overflow-x-auto rounded-xl border border-enp-border bg-white shadow-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-enp-teal-dark text-white">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Identifiant</th>
                <th scope="col" className="px-4 py-3 font-semibold">Nom</th>
                <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                <th scope="col" className="px-4 py-3 font-semibold">Rôles</th>
                <th scope="col" className="px-4 py-3 font-semibold">État</th>
              </tr>
            </thead>
            <tbody>
              {comptesFiltres.map((compte, index) => (
                <tr key={compte.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-enp-ink">{compte.matricule ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-enp-ink">{compte.prenom} {compte.nom}</td>
                  <td className="px-4 py-3 text-enp-ink-soft">{compte.email ?? '—'}</td>
                  <td className="px-4 py-3 text-enp-ink-soft">
                    {compte.roles.length > 0
                      ? compte.roles.map((role) => LIBELLES_ROLES[role] ?? role).join(', ')
                      : 'Aucun rôle'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={compte.actif ? 'text-enp-teal font-medium' : 'text-enp-bordeaux font-medium'}>
                      {compte.actif ? 'Actif' : 'Désactivé'}
                    </span>
                    <span className="mx-2 text-enp-border" aria-hidden="true">·</span>
                    <span className="text-enp-ink-soft">
                      {compte.motDePasseConfigure ? 'Mot de passe défini' : 'À activer'}
                    </span>
                  </td>
                </tr>
              ))}
              {comptesFiltres.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-enp-ink-soft">
                    Aucun compte correspondant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
