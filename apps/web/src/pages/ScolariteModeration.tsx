import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, EyeOff, MessageSquare, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CampagneCommentaire, CommentaireAModerer } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader, Button, Alert, Badge, InfoBubble } from '@/components/ui';

const STATUT_TABS: { valeur: string; libelle: string }[] = [
  { valeur: 'a_moderer', libelle: 'À modérer' },
  { valeur: 'valide', libelle: 'Validés' },
  { valeur: 'masque', libelle: 'Masqués' },
  { valeur: '', libelle: 'Tous' },
];

let ordreSession: (string | number)[] | null = null;

function melanger<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function ScolariteModeration() {
  const { aRole } = useAuth();
  const lectureSeule = aRole('directeur_campus') || aRole('directeur_general');
  const [campagnes, setCampagnes] = useState<CampagneCommentaire[]>([]);
  const [campagneId, setCampagneId] = useState<number | ''>('');
  const [statut, setStatut] = useState<string>(lectureSeule ? '' : 'a_moderer');
  const [commentaires, setCommentaires] = useState<CommentaireAModerer[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCoursId, setEnCoursId] = useState<string | number | null>(null);

  const chargerCampagnes = useCallback(async () => {
    setErreur(null);
    try {
      const disponibles = await api.moderationCampagnes();
      setCampagnes(disponibles);
      setCampagneId((precedent) =>
        disponibles.some((c) => c.id === precedent) ? precedent : disponibles[0]?.id ?? '',
      );
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur réseau lors du chargement des campagnes.');
    }
  }, []);

  const chargerCommentaires = useCallback(async () => {
    if (campagneId === '') {
      setCommentaires([]);
      setChargement(false);
      setErreur(null);
      return;
    }
    setChargement(true);
    setErreur(null);
    try {
      const cs = await api.scolariteCommentaires(campagneId, statut || undefined);
      if (!ordreSession || cs.length !== commentaires.length) {
        ordreSession = melanger(cs.map((c) => c.id));
      }
      const ids = ordreSession ?? [];
      const tries = ids
        .map((id) => cs.find((c) => c.id === id))
        .filter((c): c is CommentaireAModerer => !!c);
      setCommentaires(tries);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur réseau.');
    } finally {
      setChargement(false);
    }
  }, [campagneId, statut, commentaires.length]);

  useEffect(() => {
    void chargerCampagnes();
  }, [chargerCampagnes]);

  useEffect(() => {
    ordreSession = null;
    void chargerCommentaires();
  }, [campagneId, statut]);

  async function moderer(id: string | number, decision: 'valide' | 'masque') {
    setEnCoursId(id);
    try {
      const c = await api.scolariteModererCommentaire(id, { statut: decision });
      setCommentaires((prev) =>
        statut === 'a_moderer'
          ? prev.filter((x) => x.id !== c.id)
          : prev.map((x) => (x.id === c.id ? c : x)),
      );
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
    } finally {
      setEnCoursId(null);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-fade-in pb-6">
      <PageHeader
        title={lectureSeule ? 'Commentaires libres des campagnes' : 'Modération des avis étudiants'}
        description={
          lectureSeule
            ? 'Consultation en lecture seule des avis qualitatifs déposés lors des campagnes.'
            : 'Validez ou masquez les commentaires qualitatifs en 1 clic avant leur transmission aux enseignants.'
        }
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: lectureSeule ? 'Commentaires' : 'Modération' },
        ]}
        badge={
          !lectureSeule ? (
            <InfoBubble
              triggerVariant="pill"
              triggerLabel="Règles de modération"
              title="Charte de modération déontologique"
              badge="PROTECTION DE L'ANONYMAT"
              icon="shield"
              duration={7000}
              content={
                <p className="text-xs leading-relaxed">
                  Masquez tout commentaire contenant un élément susceptible d'identifier un étudiant ou comportant des propos injurieux. Un commentaire masqué n'est jamais transmis à l'enseignant.
                </p>
              }
            />
          ) : undefined
        }
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {/* BARRE DE FILTRES EN 1 CLIC */}
      <div className="bg-white border border-enp-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUT_TABS.map((t) => (
            <button
              key={t.valeur || 'tous'}
              type="button"
              onClick={() => setStatut(t.valeur)}
              className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
                statut === t.valeur
                  ? 'bg-enp-blue-deep text-white border-enp-blue-deep'
                  : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice/40'
              }`}
            >
              {t.libelle}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="campagne-mod" className="text-xs font-bold text-enp-blue-deep whitespace-nowrap">
            Campagne :
          </label>
          <select
            id="campagne-mod"
            value={campagneId}
            onChange={(e) => setCampagneId(e.target.value ? Number(e.target.value) : '')}
            className="border border-enp-border px-3 py-1.5 text-xs sm:text-sm font-semibold text-enp-black bg-white focus:border-enp-blue-primary outline-none min-h-[36px]"
          >
            {campagnes.length === 0 && <option value="">Aucune campagne</option>}
            {campagnes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.libelle}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!chargement && !erreur && campagnes.length === 0 ? (
        <div className="bg-white border border-enp-border p-10 text-center space-y-2 shadow-xs">
          <ShieldCheck className="w-10 h-10 text-enp-gray-medium mx-auto opacity-40" />
          <p className="text-sm font-bold text-enp-blue-deep">Aucune campagne à modérer</p>
          <p className="text-xs text-enp-gray-medium">
            La modération est ouverte après la clôture d’une campagne d’évaluation.
          </p>
        </div>
      ) : chargement ? (
        <div className="bg-white border border-enp-border p-12 text-center text-sm text-enp-gray-medium">
          Chargement des commentaires…
        </div>
      ) : commentaires.length === 0 ? (
        <div className="bg-white border border-enp-border p-10 text-center space-y-2 shadow-xs">
          <MessageSquare className="w-10 h-10 text-enp-green-valid mx-auto opacity-60" />
          <p className="text-sm font-bold text-enp-blue-deep">Aucun commentaire dans cette vue</p>
          <p className="text-xs text-enp-gray-medium">
            {statut === 'a_moderer'
              ? 'Tous les commentaires de cette campagne ont été traités.'
              : 'Aucun commentaire ne correspond au filtre sélectionné.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {commentaires.map((c) => (
            <article
              key={c.id}
              className="bg-white border border-enp-border p-4 sm:p-5 space-y-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-enp-blue-light text-enp-blue-deep border border-enp-blue-primary/20 px-2 py-0.5">
                    {c.ueCode}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-enp-black truncate">
                    {c.ueIntitule}
                  </span>
                  <Badge variant={c.type === 'points_forts' ? 'success' : 'warning'}>
                    {c.type === 'points_forts' ? 'Points forts' : 'Axes à améliorer'}
                  </Badge>
                  <Badge
                    variant={
                      c.statut === 'a_moderer'
                        ? 'outline'
                        : c.statut === 'valide'
                          ? 'primary'
                          : 'danger'
                    }
                  >
                    {c.statut === 'a_moderer'
                      ? 'À modérer'
                      : c.statut === 'valide'
                        ? 'Validé'
                        : 'Masqué'}
                  </Badge>
                </div>

                <p className="text-sm text-enp-black leading-relaxed bg-enp-bg border border-enp-border p-3">
                  {c.texte}
                </p>
              </div>

              {!lectureSeule && (
                <div className="flex sm:flex-col gap-2 shrink-0">
                  {c.statut !== 'valide' && (
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      disabled={enCoursId === c.id}
                      isLoading={enCoursId === c.id}
                      leftIcon={<CheckCircle className="w-4 h-4" />}
                      onClick={() => void moderer(c.id, 'valide')}
                    >
                      Valider
                    </Button>
                  )}
                  {c.statut !== 'masque' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={enCoursId === c.id}
                      leftIcon={<EyeOff className="w-4 h-4 text-enp-red-error" />}
                      onClick={() => void moderer(c.id, 'masque')}
                    >
                      Masquer
                    </Button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
