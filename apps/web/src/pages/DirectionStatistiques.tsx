import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type {
  ControlesAcademiques,
  PeriodeDirection,
  StatistiquesDirection as StatistiquesDirectionType,
} from '@/api/types';

const DEBUT_ANNEE_ACADEMIQUE = (() => {
  const aujourdHui = new Date();
  return aujourdHui.getMonth() >= 8
    ? aujourdHui.getFullYear()
    : aujourdHui.getFullYear() - 1;
})();
const ANNEE_DEFAUT = `${DEBUT_ANNEE_ACADEMIQUE}-${DEBUT_ANNEE_ACADEMIQUE + 1}`;
const SEMESTRE_DEFAUT = 5;

function afficherNombre(valeur: number | null): string {
  return valeur === null ? '—' : valeur.toLocaleString('fr-FR');
}

function afficherPourcentage(valeur: number | null): string {
  return valeur === null ? '—' : `${valeur.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;
}

function messageErreur(erreur: unknown): string {
  return erreur instanceof ApiError
    ? erreur.messages.join(' ')
    : 'Une erreur réseau est survenue. Réessayez.';
}

export function DirectionStatistiques() {
  const [anneeUniversitaire, setAnneeUniversitaire] = useState(ANNEE_DEFAUT);
  const [semestre, setSemestre] = useState(SEMESTRE_DEFAUT);
  const [statistiques, setStatistiques] = useState<StatistiquesDirectionType | null>(null);
  const [controles, setControles] = useState<ControlesAcademiques | null>(null);
  const [chargement, setChargement] = useState(true);
  const [publicationEnCours, setPublicationEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    setConfirmation(null);
    try {
      const periode: PeriodeDirection = { anneeUniversitaire, semestre };
      const [resume, controle] = await Promise.all([
        api.directionStatistiques(periode),
        api.directionControles(periode),
      ]);
      setStatistiques(resume);
      setControles(controle);
    } catch (err) {
      setErreur(messageErreur(err));
      setStatistiques(null);
      setControles(null);
    } finally {
      setChargement(false);
    }
  }, [anneeUniversitaire, semestre]);

  const periode: PeriodeDirection = { anneeUniversitaire, semestre };

  useEffect(() => {
    void charger();
  }, [charger]);

  async function publier() {
    setPublicationEnCours(true);
    setErreur(null);
    setConfirmation(null);
    try {
      await api.directionPublierStatistiques(periode);
      setConfirmation(`Les statistiques de ${anneeUniversitaire}, semestre ${semestre}, ont été publiées.`);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setPublicationEnCours(false);
    }
  }

  const annees = Array.from({ length: 8 }, (_, index) => {
    const debut = DEBUT_ANNEE_ACADEMIQUE - 5 + index;
    return `${debut}-${debut + 1}`;
  });
  const kpis = statistiques
    ? [
        { libelle: 'Campus couverts', valeur: afficherNombre(statistiques.global.campus), icone: Building2, couleur: 'bg-enp-violet' },
        { libelle: 'Campagnes / clôturées', valeur: `${afficherNombre(statistiques.global.campagnes)} / ${afficherNombre(statistiques.global.campagnesCloses)}`, icone: BarChart3, couleur: 'bg-enp-primary' },
        { libelle: 'Participation', valeur: afficherPourcentage(statistiques.global.tauxParticipation), detail: `${afficherNombre(statistiques.global.participations)} / ${afficherNombre(statistiques.global.inscriptions)} inscriptions`, icone: Users, couleur: 'bg-enp-teal' },
        { libelle: 'Moyenne des évaluations', valeur: statistiques.global.moyenneEvaluations === null ? '—' : `${statistiques.global.moyenneEvaluations.toFixed(2)} / 5`, detail: `${afficherNombre(statistiques.global.coursSynthesables)} cours publiables`, icone: CheckCircle2, couleur: 'bg-enp-bordeaux' },
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-enp-ink">Statistiques globales ENP</h1>
          <p className="mt-1.5 text-sm text-enp-ink-soft">
            Synthèse multisite de la participation et des résultats académiques.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void publier()}
          disabled={!statistiques || publicationEnCours || chargement}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-enp-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-enp-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={17} aria-hidden="true" />
          {publicationEnCours ? 'Publication…' : 'Publier les statistiques'}
        </button>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-enp-border bg-white p-4 shadow-card sm:flex-row sm:items-end">
        <div>
          <label htmlFor="direction-annee" className="mb-1 block text-sm font-medium text-enp-ink">
            Année universitaire
          </label>
          <select
            id="direction-annee"
            value={anneeUniversitaire}
            onChange={(event) => setAnneeUniversitaire(event.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-enp-border bg-white px-3 py-2 text-enp-ink sm:w-auto"
          >
            {annees.map((annee) => <option key={annee} value={annee}>{annee}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="direction-semestre" className="mb-1 block text-sm font-medium text-enp-ink">
            Semestre
          </label>
          <select
            id="direction-semestre"
            value={semestre}
            onChange={(event) => setSemestre(Number(event.target.value))}
            className="min-h-[44px] w-full rounded-lg border border-enp-border bg-white px-3 py-2 text-enp-ink sm:w-auto"
          >
            {Array.from({ length: 10 }, (_, index) => index + 1).map((numero) => (
              <option key={numero} value={numero}>Semestre {numero}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void charger()}
          disabled={chargement}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-enp-border px-4 py-2 text-sm font-medium text-enp-ink hover:bg-enp-sky disabled:opacity-60"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Actualiser
        </button>
      </section>

      {erreur && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-enp-bordeaux/15 bg-enp-bordeaux-light p-4 text-enp-bordeaux">
          <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p>{erreur}</p>
            <button type="button" onClick={() => void charger()} className="mt-2 text-sm font-semibold underline">
              Réessayer
            </button>
          </div>
        </div>
      )}

      {confirmation && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 size={19} aria-hidden="true" />
          {confirmation}
        </div>
      )}

      {chargement && !erreur && (
        <div className="flex items-center gap-3 text-enp-ink-soft" role="status">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-enp-sky border-t-enp-primary" aria-hidden="true" />
          Chargement des statistiques de la période…
        </div>
      )}

      {!chargement && statistiques && controles && !erreur && (
        <>
          <section aria-label="Indicateurs globaux" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map(({ libelle, valeur, detail, icone: Icone, couleur }) => (
              <article key={libelle} className="rounded-xl border border-enp-border bg-white p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${couleur}`}>
                    <Icone size={21} className="text-white" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold tracking-tight text-enp-ink">{valeur}</p>
                    <p className="text-xs text-enp-ink-soft">{libelle}</p>
                  </div>
                </div>
                {detail && <p className="mt-3 text-xs text-enp-ink-soft">{detail}</p>}
              </article>
            ))}
          </section>

          <section className="overflow-hidden rounded-xl border border-enp-border bg-white shadow-card">
            <div className="border-b border-enp-border px-5 py-4">
              <h2 className="font-semibold text-enp-ink">Résultats par campus</h2>
              <p className="mt-1 text-sm text-enp-ink-soft">
                {anneeUniversitaire} · Semestre {semestre} · le détail des notes est agrégé uniquement si le seuil d’anonymat ({statistiques.seuilAnonymat}) est atteint.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="bg-enp-teal-dark text-left text-white">
                    <th scope="col" className="px-4 py-3 font-semibold">Campus</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold">Campagnes</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold">Inscriptions</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold">Participations</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold">Taux</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold">Moyenne</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold">Cours synthétisables</th>
                  </tr>
                </thead>
                <tbody>
                  {statistiques.campus.map((campus, index) => (
                    <tr key={campus.campusId} className={index % 2 === 0 ? 'bg-slate-50/60' : 'bg-white'}>
                      <th scope="row" className="px-4 py-3 text-left font-semibold text-enp-ink">{campus.campus}</th>
                      <td className="px-4 py-3 text-center text-enp-ink-soft">{campus.campagnesCloses} / {campus.campagnes} clôturées</td>
                      <td className="px-4 py-3 text-center text-enp-ink-soft">{afficherNombre(campus.inscriptions)}</td>
                      <td className="px-4 py-3 text-center text-enp-ink-soft">{afficherNombre(campus.participations)}</td>
                      <td className="px-4 py-3 text-center font-medium text-enp-ink">{afficherPourcentage(campus.tauxParticipation)}</td>
                      <td className="px-4 py-3 text-center font-medium text-enp-ink">
                        {campus.moyenneEvaluations === null ? 'Non disponible' : `${campus.moyenneEvaluations.toFixed(2)} / 5`}
                      </td>
                      <td className="px-4 py-3 text-center text-enp-ink-soft">{campus.coursSynthesables}</td>
                    </tr>
                  ))}
                  {statistiques.campus.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-enp-ink-soft">Aucun campus enregistré.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-enp-border bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-enp-ink">Contrôles académiques</h2>
                <p className="mt-1 text-sm text-enp-ink-soft">Vérification des règles pour les campagnes de cette période.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${controles.nombreAnomalies ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>
                {controles.nombreAnomalies} anomalie{controles.nombreAnomalies === 1 ? '' : 's'}
              </span>
            </div>
            {controles.anomalies.length > 0 ? (
              <ul className="mt-4 divide-y divide-enp-border">
                {controles.anomalies.map((anomalie, index) => {
                  const regle = controles.reglesVerifiees.find((element) => element.code === anomalie.code);
                  return (
                    <li key={`${anomalie.campagneId}-${anomalie.code}-${index}`} className="py-3">
                      <p className="font-medium text-enp-ink">{anomalie.libelle} — {anomalie.campus} / {anomalie.departement}</p>
                      <p className="mt-1 text-sm text-enp-ink-soft">{regle?.description ?? anomalie.code}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-enp-ink-soft">Aucune anomalie détectée pour cette période.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
