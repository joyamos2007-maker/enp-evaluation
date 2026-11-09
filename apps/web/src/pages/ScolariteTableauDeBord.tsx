import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, UserCog, MessageSquare, TrendingUp } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { TableauDeBordScolarite } from '@/api/types';
import { PageHeader, Alert, StatCard, Badge } from '@/components/ui';

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon',
  ouverte: 'Ouverte',
  close: 'Close',
  restituee: 'Restituée',
};

const STATUT_VARIANT: Record<string, 'outline' | 'success' | 'warning' | 'institutional'> = {
  brouillon: 'outline',
  ouverte: 'success',
  close: 'warning',
  restituee: 'institutional',
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

  useEffect(() => {
    void charger();
  }, [charger]);

  const tauxParticipation =
    data && data.participation.inscriptions > 0
      ? Math.round((data.participation.participations / data.participation.inscriptions) * 100)
      : 0;

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in pb-6">
      <PageHeader
        title="Tableau de bord Scolarité"
        description="Vue d'ensemble des campagnes d'évaluation, de la participation et des comptes à activer."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Tableau de bord' },
        ]}
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {chargement && !erreur && (
        <div className="bg-white border border-enp-border p-12 text-center text-sm text-enp-gray-medium">
          Chargement des indicateurs de scolarité…
        </div>
      )}

      {!chargement && data && !erreur && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Link to="/scolarite/campagnes">
              <StatCard
                title="Campagnes ouvertes"
                value={data.campagnesOuvertes}
                icon={<Megaphone className="w-5 h-5 text-enp-blue-primary" />}
                description="Scrutins en cours"
                variant="primary"
              />
            </Link>
            <Link to="/scolarite/comptes">
              <StatCard
                title="Comptes à activer"
                value={data.comptesSansMotDePasse}
                icon={<UserCog className="w-5 h-5 text-enp-gold" />}
                description="Codes d'activation"
                variant={data.comptesSansMotDePasse > 0 ? 'warning' : 'default'}
              />
            </Link>
            <Link to="/scolarite/moderation">
              <StatCard
                title="À modérer"
                value={data.commentairesAModerer}
                icon={<MessageSquare className="w-5 h-5 text-enp-blue-deep" />}
                description="Commentaires libres"
              />
            </Link>
            <StatCard
              title="Participation"
              value={`${tauxParticipation}%`}
              icon={<TrendingUp className="w-5 h-5 text-enp-green-valid" />}
              description={`${data.participation.bulletins} bulletins reçus`}
              variant="success"
            />
          </div>

          <div className="bg-white border border-enp-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-enp-blue-deep text-white text-xs uppercase tracking-wider">
                    <th scope="col" className="text-left px-4 py-3 font-semibold">Libellé</th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold">Département</th>
                    <th scope="col" className="text-center px-4 py-3 font-semibold">Année / Sem.</th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold">Période</th>
                    <th scope="col" className="text-center px-4 py-3 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-enp-border">
                  {data.campagnes.map((c) => (
                    <tr key={c.id} className="hover:bg-enp-blue-ice/20">
                      <td className="px-4 py-3 font-semibold text-enp-black">{c.libelle}</td>
                      <td className="px-4 py-3 text-enp-gray-dark">{c.departement}</td>
                      <td className="px-4 py-3 text-center font-mono text-xs font-bold text-enp-blue-deep">
                        {c.anneeUniversitaire} • S{c.semestre}
                      </td>
                      <td className="px-4 py-3 text-xs text-enp-gray-medium whitespace-nowrap">
                        {c.debut.slice(0, 10)} au {c.fin.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={STATUT_VARIANT[c.statut] ?? 'outline'}>
                          {STATUT_LABEL[c.statut] ?? c.statut}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
