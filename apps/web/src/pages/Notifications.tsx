import { useCallback, useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  AlertTriangle,
  Megaphone,
  Stamp,
  FileCheck2,
  Upload,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { Notification } from '@/api/types';
import { PageHeader, Button, Badge, Alert, EmptyState, Pagination } from '@/components/ui';

export function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Pagination & filtre
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [filtre, setFiltre] = useState<'toutes' | 'non_lues'>('toutes');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.notifications();
      setItems(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setErreur(err.messages.join(' '));
      } else {
        setErreur('Impossible de charger les notifications officielles.');
      }
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function marquerLue(id: number) {
    try {
      await api.marquerNotificationLue(id);
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, luLe: new Date().toISOString() } : it)),
      );
    } catch (err) {
      alert(err instanceof ApiError ? err.messages.join(' ') : 'Échec de la mise à jour.');
    }
  }

  async function marquerToutesLues() {
    const nonLues = items.filter((it) => !it.luLe);
    for (const notif of nonLues) {
      try {
        await api.marquerNotificationLue(notif.id);
      } catch {
        //
      }
    }
    setItems((prev) => prev.map((it) => ({ ...it, luLe: new Date().toISOString() })));
  }

  const itemsFiltres = useMemo(() => {
    return items.filter((it) => {
      if (filtre === 'non_lues') return !it.luLe;
      return true;
    });
  }, [items, filtre]);

  const totalPages = Math.max(1, Math.ceil(itemsFiltres.length / pageSize));
  const itemsPagines = useMemo(() => {
    const debut = (page - 1) * pageSize;
    return itemsFiltres.slice(debut, debut + pageSize);
  }, [itemsFiltres, page, pageSize]);

  const nonLuesCount = items.filter((it) => !it.luLe).length;

  function iconeType(titre: string) {
    const lower = titre.toLowerCase();
    if (lower.includes('campagne') || lower.includes('ouverte') || lower.includes('clôture')) {
      return <Megaphone className="w-5 h-5 text-enp-blue-primary shrink-0" />;
    }
    if (lower.includes('visa') || lower.includes('séance')) {
      return <Stamp className="w-5 h-5 text-[#D97706] shrink-0" />;
    }
    if (lower.includes('restitution') || lower.includes('résultat')) {
      return <FileCheck2 className="w-5 h-5 text-enp-green-valid shrink-0" />;
    }
    if (lower.includes('import') || lower.includes('synchronisation')) {
      return <Upload className="w-5 h-5 text-enp-blue-deep shrink-0" />;
    }
    return <Info className="w-5 h-5 text-enp-blue-primary shrink-0" />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <PageHeader
        title="Centre Officiel de Notifications"
        description="Alertes institutionnelles, avis de clôture de campagne, visas et délibérations"
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Notifications' }]}
        badge={
          nonLuesCount > 0 ? (
            <Badge variant="warning">{nonLuesCount} non lue(s)</Badge>
          ) : (
            <Badge variant="success">Toutes lues</Badge>
          )
        }
        actions={
          nonLuesCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void marquerToutesLues()}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Tout marquer comme lu
            </Button>
          )
        }
      />

      {/* Barre de filtrage */}
      <div className="bg-white border border-enp-border p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setFiltre('toutes');
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
              filtre === 'toutes'
                ? 'bg-enp-blue-primary text-white border-enp-blue-primary'
                : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice'
            }`}
          >
            Toutes les alertes ({items.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setFiltre('non_lues');
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
              filtre === 'non_lues'
                ? 'bg-enp-blue-primary text-white border-enp-blue-primary'
                : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice'
            }`}
          >
            Non lues ({nonLuesCount})
          </button>
        </div>

        <span className="text-xs text-enp-gray-medium text-center sm:text-right">
          Trié par date décroissante
        </span>
      </div>

      {chargement ? (
        <div className="py-12 text-center text-enp-gray-medium text-sm">
          Chargement de vos notifications…
        </div>
      ) : erreur ? (
        <Alert variant="danger" title="Erreur">{erreur}</Alert>
      ) : itemsPagines.length === 0 ? (
        <EmptyState
          title="Aucune notification"
          description={
            filtre === 'non_lues'
              ? 'Toutes vos notifications sont marquées comme lues.'
              : 'Aucun message institutionnel dans votre registre.'
          }
        />
      ) : (
        <div className="space-y-3">
          {itemsPagines.map((item) => {
            const estLue = Boolean(item.luLe);

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 border transition-colors flex items-start gap-4 ${
                  estLue
                    ? 'bg-white border-enp-border/80 text-enp-gray-dark'
                    : 'bg-enp-blue-ice/40 border-enp-blue-primary/40 shadow-subtle'
                }`}
              >
                <div className="p-2 bg-white border border-enp-border mt-0.5">
                  {iconeType(item.title)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2
                      className={`text-sm ${
                        estLue ? 'font-semibold text-enp-black' : 'font-bold text-enp-blue-deep'
                      }`}
                    >
                      {item.title}
                    </h2>
                    <span className="text-[11px] text-enp-gray-medium shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.creeLe).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-enp-gray-dark leading-relaxed">
                    {item.message}
                  </p>

                  <div className="pt-2 flex items-center gap-3">
                    {item.link && (
                      <Link
                        to={item.link}
                        className="text-xs font-semibold text-enp-blue-primary hover:text-enp-blue-deep flex items-center gap-1 underline underline-offset-2"
                      >
                        Consulter l'action requise
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {!estLue && (
                      <button
                        type="button"
                        onClick={() => void marquerLue(item.id)}
                        className="text-xs font-medium text-enp-gray-medium hover:text-enp-black transition-colors"
                      >
                        Marquer comme lu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={itemsFiltres.length}
            pageSize={pageSize}
          />
        </div>
      )}
    </div>
  );
}
