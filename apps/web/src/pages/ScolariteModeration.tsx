import { useEffect, useState, useCallback, useMemo } from 'react';
import { AlertCircle, CheckCircle, EyeOff } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CampagneGestion, CommentaireAModerer } from '@/api/types';
import { InfoCard } from '@/components/InfoCard';

const STATUT_FILTRE: { valeur: string; libelle: string }[] = [
  { valeur: 'a_moderer', libelle: 'À modérer' },
  { valeur: 'valide', libelle: 'Validé' },
  { valeur: 'masque', libelle: 'Masqué' },
];

// Ordre aléatoire stable pour la session
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
      const cs = await api.scolariteCommentaires(
        campagneId,
        statut || undefined,
      );
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

  useEffect(() => { void chargerCampagnes(); }, [chargerCampagnes]);
  useEffect(() => { ordreSession = null; void chargerCommentaires(); }, [campagneId, statut]);

  async function moderer(id: string | number, decision: 'valide' | 'masque') {
    setEnCoursId(id);
    try {
      const c = await api.scolariteModererCommentaire(id, { statut: decision });
      setCommentaires((prev) => prev.map((x) => x.id === c.id ? c : x));
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
    } finally {
      setEnCoursId(null);
    }
  }

  const compteur = useMemo(() => commentaires.length, [commentaires]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Modération</h1>
        <p className="text-sm text-enp-ink-soft mt-1">Validez ou masquez les commentaires des étudiants.</p>
      </div>

      <InfoCard titre="Règles de modération">
        <p>Masquez tout commentaire contenant un élément qui permettrait d'identifier un étudiant, ou des propos injurieux. Un commentaire masqué n'est jamais transmis à l'enseignant.</p>
      </InfoCard>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="campagne-mod" className="block text-sm font-medium text-enp-ink mb-1">Campagne</label>
          <select id="campagne-mod"
            value={campagneId}
            onChange={(e) => setCampagneId(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
          >
            <option value="">Toutes</option>
            {campagnes.map((c) => <option key={c.id} value={c.id}>{c.libelle}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="statut-mod" className="block text-sm font-medium text-enp-ink mb-1">Statut</label>
          <select id="statut-mod"
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
          >
            {STATUT_FILTRE.map((s) => <option key={s.valeur} value={s.valeur}>{s.libelle}</option>)}
          </select>
        </div>
      </div>

      <p className="text-sm text-enp-ink-soft">{compteur} commentaire(s)</p>

      {!chargement && !erreur && campagnes.length === 0 && (
        <InfoCard titre="Aucune campagne modérable">
          La modération est disponible après la clôture et la préparation des résultats d’une campagne.
        </InfoCard>
      )}

      {erreur && (
        <div className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux" role="alert">
          <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{erreur}</span>
        </div>
      )}

      {chargement && !erreur && (
        <div className="flex items-center gap-3 text-enp-ink-soft">
          <div className="h-6 w-6 rounded-full border-2 border-enp-sky border-t-enp-primary animate-spin" aria-hidden="true" />
          <span>Chargement…</span>
        </div>
      )}

      {!chargement && !erreur && (
        <div className="space-y-3">
          {commentaires.length === 0 && (
            <p className="text-sm text-enp-ink-soft">Aucun commentaire.</p>
          )}
          {commentaires.map((c) => (
            <div key={c.id} className="bg-white border border-enp-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-enp-primary text-white text-xs font-semibold px-1.5 py-0.5 rounded">{c.ueCode}</span>
                  <span className="text-sm text-enp-ink">{c.ueIntitule}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  c.statut === 'a_moderer' ? 'bg-enp-sky text-enp-ink' :
                  c.statut === 'valide' ? 'bg-enp-primary text-white' :
                  'bg-enp-primary-light text-enp-ink-soft border border-enp-primary/15'
                }`}>
                  {c.statut === 'a_moderer' ? 'À modérer' : c.statut === 'valide' ? 'Validé' : 'Masqué'}
                </span>
              </div>
              <p className="text-xs text-enp-ink-soft">{c.type === 'points_forts' ? 'Points forts' : 'Points à améliorer'}</p>
              <p className="text-sm text-enp-ink leading-relaxed">{c.texte}</p>
              {c.statut === 'a_moderer' && (
                <div className="flex gap-2 pt-1">
                  <button type="button"
                    onClick={() => void moderer(c.id, 'valide')}
                    disabled={enCoursId === c.id}
                    className="inline-flex items-center gap-1.5 bg-enp-primary text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-enp-primary-dark transition-all disabled:opacity-60 min-h-[44px]"
                  >
                    <CheckCircle size={16} aria-hidden="true" /> Valider
                  </button>
                  <button type="button"
                    onClick={() => void moderer(c.id, 'masque')}
                    disabled={enCoursId === c.id}
                    className="inline-flex items-center gap-1.5 bg-white border border-enp-border text-enp-ink text-sm font-medium px-3 py-2 rounded-md hover:bg-enp-sky transition-colors disabled:opacity-60 min-h-[44px]"
                  >
                    <EyeOff size={16} aria-hidden="true" /> Masquer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
