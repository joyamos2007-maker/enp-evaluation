import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MessageSquare, Send, Stamp, BookOpen } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { Seance } from '@/api/types';
import { PageHeader, Button, Alert, Badge } from '@/components/ui';

const LIBELLES_STATUT: Record<string, string> = {
  tenue: 'Tenue',
  reportee: 'Reportée',
  annulee: 'Annulée',
  enseignant_absent: 'Enseignant absent',
  planifiee: 'Planifiée',
};

function formaterDate(iso: string): string {
  try {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function Visas() {
  const [seances, setSeances] = useState<Seance[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [contesteId, setContesteId] = useState<number | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [enCours, setEnCours] = useState<number | 'tous' | null>(null);
  const [erreurAction, setErreurAction] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.cahierSeances(undefined, 'en_attente');
      setSeances(data);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur réseau : impossible de charger les séances.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function viser(s: Seance) {
    setEnCours(s.id);
    setErreurAction(null);
    try {
      await api.visaSeance(s.id, { decision: 'vise' });
      setSeances((prev) => prev.filter((x) => x.id !== s.id));
    } catch (err) {
      if (err instanceof ApiError) setErreurAction(err.messages.join(' '));
      else setErreurAction('Erreur réseau.');
    } finally {
      setEnCours(null);
    }
  }

  async function viserToutes() {
    if (seances.length === 0) return;
    setEnCours('tous');
    setErreurAction(null);
    try {
      for (const s of seances) {
        await api.visaSeance(s.id, { decision: 'vise' });
      }
      setSeances([]);
    } catch (err) {
      if (err instanceof ApiError) setErreurAction(err.messages.join(' '));
      else setErreurAction('Erreur réseau lors de la validation groupée.');
      await charger();
    } finally {
      setEnCours(null);
    }
  }

  async function contester(s: Seance) {
    if (!commentaire.trim()) {
      setErreurAction('Un commentaire est obligatoire pour contester.');
      return;
    }
    setEnCours(s.id);
    setErreurAction(null);
    try {
      await api.visaSeance(s.id, {
        decision: 'conteste',
        commentaire: commentaire.trim(),
      });
      setSeances((prev) => prev.filter((x) => x.id !== s.id));
      setContesteId(null);
      setCommentaire('');
    } catch (err) {
      if (err instanceof ApiError) setErreurAction(err.messages.join(' '));
      else setErreurAction('Erreur réseau.');
    } finally {
      setEnCours(null);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-fade-in pb-6">
      <PageHeader
        title="Séances à viser"
        description={`${seances.length} séance(s) en attente de votre visa pédagogique.`}
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Cahier de texte', href: '/cahier-texte' },
          { label: 'Séances à viser' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/cahier-texte">
              <Button variant="outline" size="sm" leftIcon={<BookOpen className="w-4 h-4" />}>
                Ouvrir le cahier complet
              </Button>
            </Link>
            {seances.length > 1 && (
              <Button
                variant="primary"
                size="sm"
                isLoading={enCours === 'tous'}
                leftIcon={<Stamp className="w-4 h-4" />}
                onClick={() => void viserToutes()}
              >
                Tout viser ({seances.length})
              </Button>
            )}
          </div>
        }
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {erreurAction && (
        <Alert variant="danger" title="Action impossible" onClose={() => setErreurAction(null)}>
          {erreurAction}
        </Alert>
      )}

      {chargement ? (
        <div className="bg-white border border-enp-border p-10 text-center text-sm text-enp-gray-medium">
          Chargement des séances en attente…
        </div>
      ) : seances.length === 0 ? (
        <div className="bg-white border border-enp-border p-12 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-enp-green-valid mx-auto" />
          <p className="text-base font-bold text-enp-blue-deep">Aucune séance en attente</p>
          <p className="text-xs text-enp-gray-medium">
            Toutes les séances de vos cours ont été visées.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {seances.map((s) => (
            <article
              key={s.id}
              className="bg-white border border-enp-border border-l-4 border-l-[#D97706] p-4 sm:p-5 space-y-3 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-enp-blue-light text-enp-blue-deep border border-enp-blue-primary/20 px-2 py-0.5">
                    {s.ueCode}
                  </span>
                  <Badge variant="outline">
                    {s.type}
                    {s.groupe ? ` (${s.groupe})` : ''}
                  </Badge>
                  <Badge variant="neutral">{LIBELLES_STATUT[s.statut] ?? s.statut}</Badge>
                </div>
                <span className="text-xs font-semibold text-enp-gray-medium">
                  {formaterDate(s.date)} • {s.debut} - {s.fin}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-enp-blue-deep">
                  {s.intitule ?? 'Sans intitulé'}
                </h2>
                <p className="text-xs text-enp-gray-medium">{s.ueIntitule}</p>
              </div>

              {s.contenu && (
                <div className="text-xs sm:text-sm text-enp-black bg-enp-bg border border-enp-border p-3 leading-relaxed">
                  <strong className="text-enp-blue-deep">Contenu : </strong>
                  {s.contenu}
                </div>
              )}

              {s.travailAFaire && (
                <div className="text-xs text-enp-black bg-enp-blue-ice/30 border border-enp-border p-2.5">
                  <strong className="text-enp-blue-deep">Travail à faire : </strong>
                  {s.travailAFaire}
                </div>
              )}

              {contesteId === s.id ? (
                <div className="space-y-3 border-t border-enp-border pt-3">
                  <label
                    htmlFor={`commentaire-${s.id}`}
                    className="block text-xs font-bold text-enp-black"
                  >
                    Motif de la contestation (obligatoire)
                  </label>
                  <textarea
                    id={`commentaire-${s.id}`}
                    rows={2}
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    placeholder="Indiquez la correction attendue du délégué..."
                    className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white focus:border-enp-blue-primary outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setContesteId(null);
                        setCommentaire('');
                        setErreurAction(null);
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      isLoading={enCours === s.id}
                      leftIcon={<Send className="w-3.5 h-3.5" />}
                      onClick={() => void contester(s)}
                    >
                      Confirmer la contestation
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-enp-border pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={enCours !== null}
                    leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setContesteId(s.id);
                      setCommentaire('');
                      setErreurAction(null);
                    }}
                  >
                    Contester
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    disabled={enCours !== null}
                    isLoading={enCours === s.id}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => void viser(s)}
                  >
                    Viser en 1 clic
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
