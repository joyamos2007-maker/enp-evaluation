import { useEffect, useState, useCallback } from 'react';
import { Send, FileText } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CampagneGestion } from '@/api/types';
import { PageHeader, Button, Alert, Badge, Modal, Textarea } from '@/components/ui';

const MAX_CHARS = 3000;

export function ScolariteRestitution() {
  const [campagnes, setCampagnes] = useState<CampagneGestion[]>([]);
  const [campagneId, setCampagneId] = useState<number | ''>('');
  const [resultats, setResultats] = useState('');
  const [suites, setSuites] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmPub, setConfirmPub] = useState(false);
  const [publiee, setPubliee] = useState(false);

  const charger = useCallback(async () => {
    try {
      const cs = await api.scolariteCampagnes();
      const close = cs.filter((c) => c.statut === 'close' || c.statut === 'restituee');
      setCampagnes(close);
      if (close.length > 0 && campagneId === '') {
        setCampagneId(close[0].id);
      }
    } catch {
      /* ignore */
    }
  }, [campagneId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const campagne = campagnes.find((c) => c.id === (campagneId !== '' ? Number(campagneId) : -1));
  const enLectureSeule = campagne?.statut === 'restituee' || publiee;

  async function publier() {
    if (campagneId === '') return;
    setEnCours(true);
    setErreur(null);
    try {
      await api.scolariteRestitution(Number(campagneId), { resultats, suites });
      setPubliee(true);
      setConfirmPub(false);
      void charger();
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur réseau.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-fade-in pb-6">
      <PageHeader
        title="Restitution officielle (Article 77)"
        description="Rédigez et publiez la synthèse des principaux résultats et des suites données aux étudiants."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Restitution officielle' },
        ]}
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {campagnes.length === 0 ? (
        <div className="bg-white border border-enp-border p-10 text-center space-y-2 shadow-xs">
          <FileText className="w-10 h-10 text-enp-gray-medium mx-auto opacity-40" />
          <p className="text-sm font-bold text-enp-blue-deep">Aucune campagne clôturée</p>
          <p className="text-xs text-enp-gray-medium">
            La publication d'une restitution nécessite qu'une campagne soit préalablement clôturée.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-enp-border p-4 space-y-2.5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep block">
              Campagne concernée
            </span>
            <div className="flex flex-wrap gap-2">
              {campagnes.map((c) => {
                const active = c.id === campagneId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCampagneId(c.id);
                      setPubliee(false);
                      setErreur(null);
                    }}
                    className={`px-3.5 py-2 text-xs font-semibold border transition-colors flex items-center gap-2 ${
                      active
                        ? 'bg-enp-blue-deep text-white border-enp-blue-deep'
                        : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice/40'
                    }`}
                  >
                    <span>{c.libelle}</span>
                    <Badge variant={c.statut === 'restituee' ? 'success' : 'warning'}>
                      {c.statut === 'restituee' ? 'Restituée' : 'Close'}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {campagne && enLectureSeule && (
            <Alert variant="success" title="Campagne restituée">
              Cette restitution a été publiée auprès des étudiants. Les textes sont désormais scellés en lecture seule.
            </Alert>
          )}

          {campagne && (
            <div className="bg-white border border-enp-border p-5 sm:p-6 space-y-5 shadow-xs">
              <Textarea
                label="Principaux résultats constatés"
                rows={5}
                maxLength={MAX_CHARS}
                maxLengthIndicator={true}
                value={resultats}
                onChange={(e) => setResultats(e.target.value)}
                disabled={enLectureSeule}
                placeholder="Synthèse des points positifs et des enseignements plébiscités par les promotions..."
              />

              <Textarea
                label="Suites données et engagements pédagogiques"
                rows={5}
                maxLength={MAX_CHARS}
                maxLengthIndicator={true}
                value={suites}
                onChange={(e) => setSuites(e.target.value)}
                disabled={enLectureSeule}
                placeholder="Mesures d'amélioration retenues avec les départements pour le prochain semestre..."
              />

              {!enLectureSeule && (
                <div className="pt-3 border-t border-enp-border flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={enCours || !resultats.trim() || !suites.trim()}
                    leftIcon={<Send className="w-4 h-4" />}
                    onClick={() => setConfirmPub(true)}
                  >
                    Publier la restitution aux étudiants
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={confirmPub}
        onClose={() => setConfirmPub(false)}
        title="Confirmer la publication définitive"
        subtitle={campagne?.libelle}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setConfirmPub(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={enCours}
              onClick={() => void publier()}
            >
              Confirmer la publication
            </Button>
          </>
        }
      >
        <p className="text-sm text-enp-black">
          Cette publication est définitive. Les étudiants inscrits pourront consulter la restitution et la campagne passera au statut « Restituée ».
        </p>
      </Modal>
    </div>
  );
}
