import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Send } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CampagneGestion } from '@/api/types';
import { InfoCard } from '@/components/InfoCard';

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
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void charger(); }, [charger]);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Restitution</h1>
        <p className="text-sm text-enp-ink-soft mt-1">Publiez la restitution des résultats aux étudiants.</p>
      </div>

      <InfoCard titre="Article 77">
        <p>Une restitution des principaux résultats et des suites données est faite aux étudiants.</p>
      </InfoCard>

      <div>
        <label htmlFor="campagne-rest" className="block text-sm font-medium text-enp-ink mb-1">Campagne (close)</label>
        <select id="campagne-rest"
          value={campagneId}
          onChange={(e) => { setCampagneId(e.target.value ? Number(e.target.value) : ''); setPubliee(false); setErreur(null); }}
          className="w-full sm:w-auto rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
        >
          <option value="">— Choisir —</option>
          {campagnes.map((c) => <option key={c.id} value={c.id}>{c.libelle} ({c.statut === 'restituee' ? 'restituée' : 'close'})</option>)}
        </select>
      </div>

      {campagne && enLectureSeule && (
        <div className="rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-3 text-enp-bordeaux text-sm">
          Cette campagne a été restituée. L'écran est en lecture seule.
        </div>
      )}

      {campagne && (
        <div className="space-y-4">
          <div>
            <label htmlFor="resultats" className="block text-sm font-medium text-enp-ink mb-1">
              Principaux résultats <span className="text-enp-ink-soft">({resultats.length}/{MAX_CHARS})</span>
            </label>
            <textarea id="resultats" rows={6} maxLength={MAX_CHARS}
              value={resultats}
              onChange={(e) => setResultats(e.target.value)}
              disabled={enLectureSeule}
              className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none resize-y disabled:bg-enp-sky"
            />
          </div>
          <div>
            <label htmlFor="suites" className="block text-sm font-medium text-enp-ink mb-1">
              Suites données <span className="text-enp-ink-soft">({suites.length}/{MAX_CHARS})</span>
            </label>
            <textarea id="suites" rows={6} maxLength={MAX_CHARS}
              value={suites}
              onChange={(e) => setSuites(e.target.value)}
              disabled={enLectureSeule}
              className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none resize-y disabled:bg-enp-sky"
            />
          </div>

          {erreur && (
            <div className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux" role="alert">
              <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span>{erreur}</span>
            </div>
          )}

          {!enLectureSeule && (
            <button type="button"
              onClick={() => setConfirmPub(true)}
              disabled={enCours}
              className="inline-flex items-center gap-2 bg-enp-primary text-white font-semibold px-5 py-3 rounded-md hover:bg-enp-primary-dark transition-all disabled:opacity-60 min-h-[44px]"
            >
              <Send size={20} aria-hidden="true" /> Publier la restitution aux étudiants
            </button>
          )}
        </div>
      )}

      {confirmPub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold text-enp-ink">Publication définitive</h2>
            <p className="text-sm text-enp-ink">Cette publication est définitive. Les étudiants pourront consulter la restitution. La campagne passera au statut « restituée ».</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmPub(false)}
                className="inline-flex items-center bg-white border border-enp-border text-enp-ink font-medium px-4 py-2.5 rounded-md hover:bg-enp-sky transition-colors text-sm min-h-[44px]">
                Annuler
              </button>
              <button type="button" onClick={() => void publier()} disabled={enCours}
                className="inline-flex items-center bg-enp-primary text-white font-semibold px-4 py-2.5 rounded-md hover:bg-enp-primary-dark transition-all text-sm min-h-[44px] disabled:opacity-60">
                {enCours ? 'Publication…' : 'Confirmer la publication'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
