import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Stamp, CheckCircle2, AlertTriangle, Clock, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { Seance } from '@/api/types';
import { PageHeader, Button, Badge, Alert, Modal, Textarea, EmptyState } from '@/components/ui';

export function Visas() {
  const [seances, setSeances] = useState<Seance[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [contesteId, setContesteId] = useState<number | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [enCoursId, setEnCoursId] = useState<number | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.cahierSeances(undefined, 'en_attente');
      setSeances(data);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Impossible de charger les séances en attente de visa.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function validerVisa(id: number) {
    setEnCoursId(id);
    try {
      await api.visaSeance(id, { decision: 'vise' });
      setSeances((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof ApiError ? err.messages.join(' ') : 'Échec de la validation du visa.');
    } finally {
      setEnCoursId(null);
    }
  }

  async function contesterSeance() {
    if (!contesteId) return;
    setEnCoursId(contesteId);
    try {
      await api.visaSeance(contesteId, {
        decision: 'conteste',
        commentaire: commentaire.trim(),
      });
      setSeances((prev) => prev.filter((s) => s.id !== contesteId));
      setContesteId(null);
      setCommentaire('');
    } catch (err) {
      alert(err instanceof ApiError ? err.messages.join(' ') : 'Échec de la contestation.');
    } finally {
      setEnCoursId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <PageHeader
        title="Séances en attente de visa académique"
        description="Contrôle et validation officielle des séances renseignées par vos délégués de promotion"
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Visas des séances' }]}
        badge={
          <Badge variant={seances.length > 0 ? 'warning' : 'success'}>
            {seances.length} séance(s) à viser
          </Badge>
        }
      />

      <Alert
        variant="institutional"
        title="Responsabilité pédagogique de l'enseignant"
        icon={<Stamp className="w-5 h-5 text-enp-gold shrink-0 mt-0.5" />}
      >
        Le visa confère valeur officielle aux heures d'enseignement consignées.
        En cas de désaccord sur le contenu ou le volume horaire, contestez la séance avec un motif explicatif
        afin de permettre au délégué de procéder à la rectification.
      </Alert>

      {chargement ? (
        <div className="py-12 text-center text-enp-gray-medium text-sm">
          Chargement des séances en attente…
        </div>
      ) : erreur ? (
        <Alert variant="danger" title="Erreur">{erreur}</Alert>
      ) : seances.length === 0 ? (
        <EmptyState
          title="Toutes les séances sont visées"
          description="Vous n'avez actuellement aucune séance en attente de visa. Les prochaines saisies de vos délégués apparaîtront ici."
          icon={<CheckCircle2 className="w-8 h-8 text-enp-green-valid" />}
        />
      ) : (
        <div className="space-y-4">
          {seances.map((s) => (
            <div
              key={s.id}
              className="bg-white border border-enp-border p-5 space-y-4 hover:border-enp-blue-primary/60 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-enp-border pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-enp-blue-light text-enp-blue-deep border border-enp-blue-primary/20">
                    {s.ueCode}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-enp-bg border border-enp-border">
                    {s.type}
                  </span>
                  <span className="text-xs font-medium text-enp-gray-medium">
                    Séance du {s.date} • {s.debut} à {s.fin}
                  </span>
                </div>
                <Badge variant="warning">En attente de visa</Badge>
              </div>

              <div>
                <h2 className="text-base font-bold text-enp-black mb-1.5">{s.intitule}</h2>
                <div className="p-3 bg-enp-blue-ice/30 border border-enp-border text-xs sm:text-sm text-enp-black whitespace-pre-line leading-relaxed">
                  {s.contenu}
                </div>
              </div>

              {s.travailAFaire && (
                <div className="text-xs text-enp-gray-medium">
                  <strong>Travail demandé :</strong> {s.travailAFaire}
                </div>
              )}

              <div className="pt-3 border-t border-enp-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Link
                  to={`/cahier-texte/${s.id}`}
                  className="text-xs text-enp-blue-primary hover:text-enp-blue-deep font-semibold underline underline-offset-2"
                >
                  Consulter la fiche complète & pièces jointes
                </Link>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full sm:w-auto justify-center"
                    onClick={() => {
                      setContesteId(s.id);
                      setCommentaire('');
                    }}
                    leftIcon={<AlertTriangle className="w-4 h-4" />}
                  >
                    Contester
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    className="w-full sm:w-auto justify-center"
                    isLoading={enCoursId === s.id}
                    onClick={() => void validerVisa(s.id)}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Viser la séance
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale de contestation */}
      <Modal
        isOpen={Boolean(contesteId)}
        onClose={() => setContesteId(null)}
        title="Contester la séance"
        subtitle="Un commentaire d'explication est légalement requis pour motiver la contestation."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setContesteId(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!commentaire.trim()}
              isLoading={Boolean(enCoursId)}
              onClick={() => void contesterSeance()}
            >
              Confirmer la contestation
            </Button>
          </>
        }
      >
        <Textarea
          label="Motif obligatoire de contestation"
          required
          rows={4}
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Ex : les exercices 3 et 4 n'ont pas été traités ; l'horaire de fin était 11:30 et non 12:00..."
        />
      </Modal>
    </div>
  );
}
