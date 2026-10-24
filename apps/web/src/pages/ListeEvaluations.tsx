import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, CalendarClock, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { UeAEvaluer } from '@/api/types';
import { InfoCard } from '@/components/InfoCard';

export function ListeEvaluations() {
  const [ues, setUes] = useState<UeAEvaluer[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.listeEvaluations();
      setUes(data);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur réseau : impossible de charger la liste des évaluations.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const total = ues.length;
  const terminees = ues.filter((u) => u.etat === 'terminee').length;
  const aFaire = total - terminees;
  const pct = total > 0 ? Math.round((terminees / total) * 100) : 0;

  function formaterDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  if (chargement) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Mes évaluations</h1>
        <div className="flex items-center gap-3 text-enp-ink-soft">
          <div
            className="h-6 w-6 rounded-full border-2 border-enp-sky border-t-enp-primary animate-spin"
            aria-hidden="true"
          />
          <span>Chargement des évaluations…</span>
        </div>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Mes évaluations</h1>
        <div
          className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux"
          role="alert"
        >
          <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p>{erreur}</p>
            <button
              type="button"
              onClick={() => void charger()}
              className="mt-2 inline-flex items-center gap-2 bg-enp-primary text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-enp-primary-dark transition-all min-h-[44px]"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Mes évaluations</h1>
        <p className="text-sm text-enp-ink-soft mt-1">
          Évaluez les enseignements de votre semestre.
        </p>
      </div>

      <InfoCard titre="Anonymat de vos réponses" icone={false}>
        <p>
          Vos réponses sont anonymes : elles ne sont reliées ni à votre nom ni
          à votre matricule.
        </p>
      </InfoCard>

      {/* Compteur et barre de progression */}
      <div className="bg-enp-sky border border-enp-border rounded-lg p-4">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-enp-ink font-medium">
            {terminees} UE évaluée{terminees > 1 ? 's' : ''} sur {total}
          </p>
          <p className="text-sm text-enp-ink-soft">{pct}%</p>
        </div>
        <div
          className="h-2.5 w-full rounded-full bg-white border border-enp-border overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="h-full bg-enp-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {aFaire > 0 && (
          <p className="text-sm text-enp-ink-soft mt-2">
            {aFaire} UE{aFaire > 1 ? 's' : ''} restante{aFaire > 1 ? 's' : ''} à évaluer.
          </p>
        )}
      </div>

      {/* Liste des UE */}
      <div className="space-y-3">
        {ues.map((ue) => {
          const termine = ue.etat === 'terminee';
          return (
            <div
              key={ue.ueId}
              className="bg-white border border-enp-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center bg-enp-primary text-white text-xs font-semibold px-2 py-0.5 rounded">
                    {ue.code}
                  </span>
                  {termine && (
                    <span className="inline-flex items-center gap-1 text-enp-primary text-xs font-medium">
                      <CheckCircle2 size={14} aria-hidden="true" />
                      Terminée
                    </span>
                  )}
                </div>
                <p className="text-enp-ink font-medium leading-snug">
                  {ue.intitule}
                </p>
                <p className="text-sm text-enp-ink-soft mt-1 flex items-center gap-1.5">
                  <CalendarClock size={15} aria-hidden="true" />
                  Évaluer avant le {formaterDate(ue.finCampagne)}
                </p>
              </div>

              {termine ? (
                <span className="inline-flex items-center gap-2 bg-enp-sky text-enp-ink-soft text-sm font-medium px-4 py-2.5 rounded-md cursor-default min-h-[44px] sm:self-center">
                  <ClipboardCheck size={18} aria-hidden="true" />
                  Terminée
                </span>
              ) : (
                <Link
                  to={`/evaluations/${ue.ueId}?campagne=${ue.campagneId}`}
                  className="inline-flex items-center gap-2 bg-enp-primary text-white text-sm font-medium px-4 py-2.5 rounded-md hover:bg-enp-primary-dark transition-all min-h-[44px] sm:self-center"
                >
                  Évaluer
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
