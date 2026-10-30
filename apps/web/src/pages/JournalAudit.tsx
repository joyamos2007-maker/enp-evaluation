import { useCallback, useEffect, useState, useMemo } from 'react';
import { ScrollText, ShieldCheck, Search, Clock, RefreshCw } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { LigneAudit } from '@/api/types';
import { PageHeader, Table, Button, Input, Alert, EmptyState, Badge } from '@/components/ui';

export function JournalAudit() {
  const [lignes, setLignes] = useState<LigneAudit[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.journalAudit();
      setLignes(data);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.messages.join(' ') : 'Consultation du journal d’audit impossible.',
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const lignesFiltrees = useMemo(() => {
    return lignes.filter(
      (l) =>
        !recherche ||
        l.action.toLowerCase().includes(recherche.toLowerCase()) ||
        (l.objet && l.objet.toLowerCase().includes(recherche.toLowerCase())) ||
        (l.detail && l.detail.toLowerCase().includes(recherche.toLowerCase()))
    );
  }, [lignes, recherche]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Journal d'Audit & Traçabilité Sécurisée"
        description="Historique immuable des opérations administratives et pédagogiques de l'École Nationale Polytechnique"
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Administration', href: '/administration' },
          { label: 'Journal d’audit' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void charger()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Actualiser
          </Button>
        }
      />

      <Alert
        variant="institutional"
        title="Garantie de non-traçabilité des scrutins anonymes"
        icon={<ShieldCheck className="w-5 h-5 text-enp-gold shrink-0 mt-0.5" />}
      >
        Conformément aux protocoles de vote anonyme, les bulletins électroniques, les choix exprimés et les adresses IP
        ne font l'objet d'aucune écriture dans ce journal. Seules les actions administratives d'ouverture, de modération,
        d'import et de visas y sont scellées.
      </Alert>

      {/* Barre de recherche */}
      <div className="bg-white border border-enp-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 w-full sm:max-w-sm">
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par action, entité ou utilisateur..."
            startIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <span className="text-xs text-enp-gray-medium">
          {lignesFiltrees.length} événement(s) répertorié(s)
        </span>
      </div>

      {chargement ? (
        <div className="py-12 text-center text-enp-gray-medium text-sm">
          Chargement du journal sécurisé…
        </div>
      ) : erreur ? (
        <Alert variant="danger" title="Erreur">{erreur}</Alert>
      ) : lignesFiltrees.length === 0 ? (
        <EmptyState title="Aucun événement d'audit" description="Aucune entrée enregistrée pour les filtres actifs." />
      ) : (
        <>
          {/* Cartes tactiles pour mobile (< 640px) */}
          <div className="space-y-3 block sm:hidden">
            {lignesFiltrees.map((l) => (
              <div key={l.id} className="bg-white border border-enp-border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-enp-blue-light text-enp-blue-deep border border-enp-blue-primary/20">
                    {l.action}
                  </span>
                  <div className="text-right font-mono text-[11px] text-enp-gray-medium">
                    {new Date(l.creeLe).toLocaleDateString('fr-FR')} {new Date(l.creeLe).toLocaleTimeString('fr-FR')}
                  </div>
                </div>
                <div className="text-xs font-semibold text-enp-black">
                  {l.userId ? `Usager #${l.userId}` : 'Système automatisé'}
                  {(l.objet || l.courseId || l.campaignId) && (
                    <span className="text-enp-gray-medium font-normal ml-1.5">
                      • {l.objet || (l.courseId ? `UE #${l.courseId}` : `Campagne #${l.campaignId}`)}
                    </span>
                  )}
                </div>
                {l.detail && (
                  <p className="text-xs text-enp-gray-medium font-mono bg-enp-bg p-2 border border-enp-border break-words">
                    {l.detail}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Tableau standard pour tablettes et ordinateurs (>= 640px) */}
          <div className="hidden sm:block">
            <Table<LigneAudit>
              columns={[
                {
                  key: 'date',
                  header: 'Horodatage officiel',
                  render: (l) => (
                    <div className="font-mono text-xs">
                      <span className="font-bold text-enp-blue-deep block">
                        {new Date(l.creeLe).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-enp-gray-medium">
                        {new Date(l.creeLe).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'utilisateur',
                  header: 'Acteur',
                  render: (l) => (
                    <div>
                      <span className="font-semibold text-enp-black block">
                        {l.userId ? `Usager #${l.userId}` : 'Système automatisé'}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'action',
                  header: 'Action effectuée',
                  render: (l) => (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-enp-blue-light text-enp-blue-deep border border-enp-blue-primary/20">
                      {l.action}
                    </span>
                  ),
                },
                {
                  key: 'entite',
                  header: 'Objet / Cible',
                  render: (l) => (
                    <span className="text-xs text-enp-gray-dark font-medium">
                      {l.objet || (l.courseId ? `UE #${l.courseId}` : l.campaignId ? `Campagne #${l.campaignId}` : '-')}
                    </span>
                  ),
                },
                {
                  key: 'details',
                  header: 'Détail d\'audit',
                  render: (l) => (
                    <span className="text-xs text-enp-gray-medium font-mono line-clamp-1 max-w-xs" title={l.detail}>
                      {l.detail || '-'}
                    </span>
                  ),
                },
              ]}
              data={lignesFiltrees}
              keyExtractor={(l) => l.id}
            />
          </div>
        </>
      )}
    </div>
  );
}
