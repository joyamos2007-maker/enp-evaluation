import { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  EyeOff,
  Filter,
  AlertCircle,
  Clock,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CampagneGestion, CommentaireAModerer } from '@/api/types';
import {
  PageHeader,
  Button,
  Select,
  Badge,
  Alert,
  EmptyState,
} from '@/components/ui';

const STATUTS_MODERATION = [
  { valeur: 'a_moderer', label: 'À modérer (en attente)' },
  { valeur: 'valide', label: 'Commentaires validés' },
  { valeur: 'masque', label: 'Commentaires masqués' },
];

export function ScolariteModeration() {
  const [campagnes, setCampagnes] = useState<CampagneGestion[]>([]);
  const [campagneId, setCampagneId] = useState<number | ''>('');
  const [statut, setStatut] = useState<string>('a_moderer');
  const [commentaires, setCommentaires] = useState<CommentaireAModerer[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCoursId, setEnCoursId] = useState<string | number | null>(null);

  const chargerCampagnes = useCallback(async () => {
    setErreur(null);
    try {
      const cs = await api.scolariteCampagnes();
      const disponibles = cs.filter((c) => c.statut === 'close' || c.statut === 'restituee');
      setCampagnes(disponibles);
      setCampagneId((precedent) =>
        disponibles.some((c) => c.id === precedent) ? precedent : disponibles[0]?.id ?? '',
      );
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Impossible de charger les campagnes pour la modération.');
    }
  }, []);

  const chargerCommentaires = useCallback(async () => {
    if (campagneId === '') {
      setCommentaires([]);
      setChargement(false);
      return;
    }
    setChargement(true);
    setErreur(null);
    try {
      const cs = await api.scolariteCommentaires(campagneId, statut || undefined);
      setCommentaires(cs);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Impossible de charger les commentaires.');
    } finally {
      setChargement(false);
    }
  }, [campagneId, statut]);

  useEffect(() => {
    void chargerCampagnes();
  }, [chargerCampagnes]);

  useEffect(() => {
    void chargerCommentaires();
  }, [chargerCommentaires]);

  async function handleDecision(id: string | number, decision: 'valide' | 'masque') {
    setEnCoursId(id);
    try {
      await api.scolariteModererCommentaire(id, { statut: decision });
      setCommentaires((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof ApiError ? err.messages.join(' ') : 'Échec de la modération.');
    } finally {
      setEnCoursId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <PageHeader
        title="Modération Déontologique des Commentaires"
        description="Filtrage strict des remarques textuelles des étudiants avant publication de la restitution"
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Scolarité', href: '/scolarite' },
          { label: 'Modération' },
        ]}
      />

      <Alert
        variant="institutional"
        title="Charte déontologique de la Scolarité Centrale"
        icon={<ShieldCheck className="w-5 h-5 text-enp-gold shrink-0 mt-0.5" />}
      >
        <p className="leading-relaxed">
          Seule la Scolarité Centrale est habilitée à modérer les commentaires. L'administrateur technique ne lit jamais ces avis.
          Doivent être masqués : les propos injurieux, diffamatoires ou comportant des éléments nominatifs susceptibles
          d'identifier un étudiant ou de viser nommément un agent en dehors de l'appréciation pédagogique collégiale.
        </p>
      </Alert>

      {/* Barre de sélection de la campagne et du statut */}
      <div className="bg-white border border-enp-border p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full sm:w-72">
            <Select
              label="Campagne d'évaluation"
              value={campagneId}
              onChange={(e) => setCampagneId(e.target.value ? Number(e.target.value) : '')}
            >
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle} ({c.anneeUniversitaire} • S{c.semestre})
                </option>
              ))}
            </Select>
          </div>

          <div className="w-full sm:w-56">
            <Select
              label="Statut des commentaires"
              value={statut}
              onChange={(e) => setStatut(e.target.value)}
            >
              {STATUTS_MODERATION.map((s) => (
                <option key={s.valeur} value={s.valeur}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <span className="text-xs text-enp-gray-medium self-end sm:self-auto font-medium">
          {commentaires.length} commentaire(s) affiché(s)
        </span>
      </div>

      {chargement ? (
        <div className="py-12 text-center text-enp-gray-medium text-sm">
          Chargement des avis en attente de modération…
        </div>
      ) : erreur ? (
        <Alert variant="danger" title="Erreur">{erreur}</Alert>
      ) : commentaires.length === 0 ? (
        <EmptyState
          title="Aucun commentaire dans cette catégorie"
          description="Tous les commentaires de cette campagne ont été traités ou aucun avis ne correspond aux filtres."
          icon={<CheckCircle2 className="w-8 h-8 text-enp-green-valid" />}
        />
      ) : (
        <div className="space-y-4">
          {commentaires.map((c) => {
            const estPointsForts = c.type === 'points_forts';

            return (
              <div
                key={c.id}
                className="bg-white border border-enp-border p-5 space-y-3 hover:border-enp-blue-primary/60 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-enp-border pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-enp-blue-deep bg-enp-blue-light px-2 py-0.5 border border-enp-blue-primary/20">
                      {c.ueCode}
                    </span>
                    <span className="text-xs font-semibold text-enp-black">
                      {c.ueIntitule}
                    </span>
                  </div>

                  <Badge variant={estPointsForts ? 'success' : 'primary'}>
                    {estPointsForts ? 'Point fort' : 'Axe de progrès'}
                  </Badge>
                </div>

                <div className="p-3.5 bg-enp-bg/50 border border-enp-border text-xs sm:text-sm text-enp-black italic leading-relaxed whitespace-pre-line">
                  « {c.texte} »
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-[11px] text-enp-gray-medium">
                    Statut actuel : <strong className="text-enp-black">{c.statut}</strong>
                  </span>

                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto justify-center"
                      isLoading={enCoursId === c.id}
                      onClick={() => void handleDecision(c.id, 'masque')}
                      leftIcon={<EyeOff className="w-3.5 h-3.5" />}
                    >
                      Masquer
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      className="w-full sm:w-auto justify-center"
                      isLoading={enCoursId === c.id}
                      onClick={() => void handleDecision(c.id, 'valide')}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Valider pour publication
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
