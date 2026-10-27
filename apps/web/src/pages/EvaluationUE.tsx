import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AlertCircle, Send, CheckCircle2, Lock, Info } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { JetonVote, Note, Questionnaire, UeAEvaluer } from '@/api/types';
import { InfoCard } from '@/components/InfoCard';
import {
  chargerBrouillon,
  sauvegarderBrouillon,
  effacerBrouillon,
  type BrouillonEvaluation,
} from '@/evaluation/brouillon';

const CHOIX: { valeur: Note; libelle: string; court: string }[] = [
  { valeur: 1, libelle: 'Pas du tout d\'accord', court: 'Pas du tout d\'accord' },
  { valeur: 2, libelle: 'Plutôt pas d\'accord', court: 'Plutôt pas d\'accord' },
  { valeur: 3, libelle: 'Neutre', court: 'Neutre' },
  { valeur: 4, libelle: 'Plutôt d\'accord', court: 'Plutôt d\'accord' },
  { valeur: 5, libelle: 'Tout à fait d\'accord', court: 'Tout à fait d\'accord' },
  { valeur: null, libelle: 'Sans avis', court: 'Sans avis' },
];

const MAX_COMMENTAIRE = 2000;

type Phase = 'chargement' | 'erreur-chargement' | 'introduction' | 'section' | 'commentaires' | 'envoi' | 'remerciement';

export function EvaluationUE() {
  const { ueId } = useParams<{ ueId: string }>();
  const [params] = useSearchParams();
  const campagneId = Number(params.get('campagne'));

  const [phase, setPhase] = useState<Phase>('chargement');
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [ue, setUe] = useState<UeAEvaluer | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [jeton, setJeton] = useState<JetonVote | null>(null);
  const [indexSection, setIndexSection] = useState(0);
  const [reponses, setReponses] = useState<Record<number, Note>>({});
  const [pointsForts, setPointsForts] = useState('');
  const [pointsAAmeliorer, setPointsAAmeliorer] = useState('');
  const [erreurAction, setErreurAction] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const ueIdNum = Number(ueId);

  /* ---------------------------------------------------------------- */
  /*  Chargement initial : UE + brouillon éventuel                     */
  /* ---------------------------------------------------------------- */

  const initialiser = useCallback(async () => {
    if (!ueId || !campagneId || Number.isNaN(ueIdNum)) {
      setErreurChargement('Paramètres invalides dans l\'URL.');
      setPhase('erreur-chargement');
      return;
    }

    try {
      const ues = await api.listeEvaluations();
      const trouve = ues.find((u) => u.ueId === ueIdNum);
      if (!trouve) {
        setErreurChargement('Cette UE n\'existe pas ou ne fait pas partie de vos évaluations.');
        setPhase('erreur-chargement');
        return;
      }
      setUe(trouve);

      // Vérifier s'il existe un brouillon → reprendre sans redemander de jeton.
      const brouillon = chargerBrouillon(ueIdNum, campagneId);
      if (brouillon) {
        setJeton(brouillon.jeton);
        setReponses(brouillon.reponses);
        setPointsForts(brouillon.pointsForts);
        setPointsAAmeliorer(brouillon.pointsAAmeliorer);
        setIndexSection(brouillon.etape);
        // Charger le questionnaire aussi pour la reprise.
        const q = await api.questionnaire(campagneId);
        setQuestionnaire(q);
        setPhase('section');
        return;
      }

      setPhase('introduction');
    } catch (err) {
      setErreurChargement(
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Erreur réseau : impossible de charger l\'évaluation.',
      );
      setPhase('erreur-chargement');
    }
  }, [ueId, campagneId, ueIdNum]);

  useEffect(() => {
    void initialiser();
  }, [initialiser]);

  /* ---------------------------------------------------------------- */
  /*  Sauvegarde du brouillon à chaque changement                      */
  /* ---------------------------------------------------------------- */

  const sauvegarder = useCallback(
    (etape: number, rep: Record<number, Note>, pf: string, pa: string, j: JetonVote | null) => {
      if (!j) return;
      const brouillon: BrouillonEvaluation = {
        jeton: j,
        reponses: rep,
        pointsForts: pf,
        pointsAAmeliorer: pa,
        etape,
      };
      sauvegarderBrouillon(ueIdNum, campagneId, brouillon);
    },
    [ueIdNum, campagneId],
  );

  useEffect(() => {
    if (jeton && phase === 'section') {
      sauvegarder(indexSection, reponses, pointsForts, pointsAAmeliorer, jeton);
    }
  }, [reponses, indexSection, jeton, phase, pointsForts, pointsAAmeliorer, sauvegarder]);

  /* ---------------------------------------------------------------- */
  /*  Démarrage : obtenir jeton + charger questionnaire               */
  /* ---------------------------------------------------------------- */

  async function demarrer() {
    setEnCours(true);
    setErreurAction(null);
    try {
      const j = await api.obtenirJeton(ueIdNum, campagneId);
      setJeton(j);
      const q = await api.questionnaire(campagneId);
      setQuestionnaire(q);
      setIndexSection(0);
      sauvegarder(0, {}, '', '', j);
      setPhase('section');
    } catch (err) {
      if (err instanceof ApiError) {
        setErreurAction(err.messages.join(' '));
      } else {
        setErreurAction('Erreur réseau : impossible de démarrer l\'évaluation.');
      }
    } finally {
      setEnCours(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Navigation entre sections                                        */
  /* ---------------------------------------------------------------- */

  function sectionValide(idx: number): boolean {
    if (!questionnaire) return false;
    const section = questionnaire.sections[idx];
    if (!section) return false;
    return section.criteres.every((c) => c.id in reponses);
  }

  function sectionSuivante() {
    if (!questionnaire) return;
    if (indexSection < questionnaire.sections.length - 1) {
      setIndexSection((i) => i + 1);
    } else {
      setPhase('commentaires');
    }
  }

  function sectionPrecedente() {
    if (indexSection > 0) {
      setIndexSection((i) => i - 1);
    } else {
      setPhase('introduction');
    }
  }

  function setNote(critereId: number, valeur: Note) {
    setReponses((r) => ({ ...r, [critereId]: valeur }));
  }

  /* ---------------------------------------------------------------- */
  /*  Envoi du bulletin                                                */
  /* ---------------------------------------------------------------- */

  const totalCriteres = useMemo(() => {
    if (!questionnaire) return 0;
    return questionnaire.sections.reduce((acc, s) => acc + s.criteres.length, 0);
  }, [questionnaire]);

  const nbRepondu = useMemo(() => {
    return Object.values(reponses).filter((v) => v !== undefined).length;
  }, [reponses]);

  async function envoyer() {
    if (!jeton || !questionnaire) return;
    setEnCours(true);
    setErreurAction(null);
    try {
      const reponsesTab = questionnaire.sections.flatMap((s) =>
        s.criteres.map((c) => ({ critereId: c.id, valeur: reponses[c.id] ?? null })),
      );
      await api.envoyerBulletin({
        jeton: jeton.jeton,
        reponses: reponsesTab,
        pointsForts: pointsForts.trim() || undefined,
        pointsAAmeliorer: pointsAAmeliorer.trim() || undefined,
      });
      effacerBrouillon(ueIdNum, campagneId);
      setPhase('remerciement');
    } catch (err) {
      if (err instanceof ApiError) {
        setErreurAction(err.messages.join(' '));
      } else {
        setErreurAction('Erreur réseau : l\'envoi a échoué. Votre brouillon est conservé.');
      }
    } finally {
      setEnCours(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Rendu                                                            */
  /* ---------------------------------------------------------------- */

  if (phase === 'chargement') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 text-enp-ink-soft">
          <div
            className="h-6 w-6 rounded-full border-2 border-enp-sky border-t-enp-primary animate-spin"
            aria-hidden="true"
          />
          <span>Chargement de l'évaluation…</span>
        </div>
      </div>
    );
  }

  if (phase === 'erreur-chargement') {
    return (
      <div className="space-y-6">
        <div
          className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux"
          role="alert"
        >
          <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{erreurChargement}</span>
        </div>
        <Link
          to="/evaluations"
          className="inline-flex items-center gap-2 text-enp-primary hover:underline"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Retour à la liste
        </Link>
      </div>
    );
  }

  // Phase introduction
  if (phase === 'introduction') {
    return (
      <div className="space-y-6 max-w-2xl">
        <Link
          to="/evaluations"
          className="inline-flex items-center gap-2 text-enp-primary hover:underline text-sm"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Retour à la liste
        </Link>

        <div>
          {ue && (
            <span className="inline-block bg-enp-primary text-white text-xs font-semibold px-2 py-0.5 rounded mb-2">
              {ue.code}
            </span>
          )}
          <h1 className="text-2xl font-bold text-enp-ink tracking-tight">
            {ue?.intitule ?? 'Évaluation'}
          </h1>
        </div>

        <InfoCard titre="Avant de commencer">
          <ul className="space-y-2 list-disc list-inside">
            <li>Cette évaluation dure environ <strong>5 minutes</strong>.</li>
            <li>
              Vos réponses sont <strong>anonymes</strong> : elles ne sont
              reliées ni à votre nom ni à votre matricule.
            </li>
            <li>
              Une fois envoyé, votre questionnaire <strong>ne peut plus être modifié</strong>.
            </li>
            <li>
              N'écrivez dans les commentaires <strong>aucun élément</strong>{' '}
              permettant de vous identifier.
            </li>
          </ul>
        </InfoCard>

        {erreurAction && (
          <div
            className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux"
            role="alert"
          >
            <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p>{erreurAction}</p>
              <p className="text-sm mt-1">
                {erreurAction.includes('déjà participé')
                  ? "Si vous pensez qu'il s'agit d'une erreur, contactez la Scolarité."
                  : "Si le problème persiste, contactez la Scolarité."}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => void demarrer()}
          disabled={enCours}
          className="inline-flex items-center gap-2 bg-enp-primary text-white font-semibold px-5 py-3 rounded-md hover:bg-enp-primary-dark transition-all disabled:opacity-60 min-h-[44px]"
        >
          {enCours ? 'Démarrage…' : 'Commencer'}
          {!enCours && <ArrowRight size={20} aria-hidden="true" />}
        </button>
      </div>
    );
  }

  // Phase section (A à E)
  if (phase === 'section' && questionnaire) {
    const section = questionnaire.sections[indexSection];
    const totalSections = questionnaire.sections.length;
    const valide = sectionValide(indexSection);
    const pctSection = Math.round(((indexSection + 1) / totalSections) * 100);

    return (
      <div className="space-y-6">
        {/* En-tête */}
        <div>
          <Link
            to="/evaluations"
            className="inline-flex items-center gap-2 text-enp-primary hover:underline text-sm mb-3"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Retour à la liste
          </Link>
          {ue && (
            <p className="text-sm text-enp-ink-soft mb-1">
              {ue.code} — {ue.intitule}
            </p>
          )}
          <h1 className="text-xl font-bold text-enp-ink">
            Section {section.code} — {section.titre}
          </h1>
        </div>

        {/* Barre de progression */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-enp-ink font-medium text-sm">
              Section {indexSection + 1} sur {totalSections}
            </p>
            <p className="text-sm text-enp-ink-soft">{pctSection}%</p>
          </div>
          <div
            className="h-2 w-full rounded-full bg-enp-sky overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full bg-enp-primary transition-all duration-300"
              style={{ width: `${pctSection}%` }}
            />
          </div>
        </div>

        {/* Critères — mobile : liste verticale, desktop : tableau */}
        <div className="block lg:hidden space-y-4">
          {section.criteres.map((c) => (
            <CritereMobile
              key={c.id}
              code={c.code}
              libelle={c.libelle}
              valeur={reponses[c.id]}
              onChange={(v) => setNote(c.id, v)}
            />
          ))}
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-enp-primary text-white">
                <th scope="col" className="text-left px-3 py-3 font-semibold rounded-tl-xl">
                  Critère
                </th>
                {CHOIX.map((ch) => (
                  <th
                    key={ch.libelle}
                    scope="col"
                    className="px-2 py-3 font-semibold text-center whitespace-nowrap"
                  >
                    {ch.court}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.criteres.map((c, i) => (
                <tr
                  key={c.id}
                  className={i % 2 === 0 ? 'bg-enp-sky' : 'bg-white'}
                >
                  <td className="px-3 py-3 text-enp-ink">
                    <span className="font-semibold mr-2">{c.code}</span>
                    {c.libelle}
                  </td>
                  {CHOIX.map((ch) => {
                    const selectionne = reponses[c.id] === ch.valeur;
                    return (
                      <td key={ch.libelle} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setNote(c.id, ch.valeur)}
                          className={`w-9 h-9 rounded-md border-2 transition-colors min-h-[44px] min-w-[44px] ${
                            selectionne
                              ? 'bg-enp-primary text-white border-enp-primary'
                              : 'bg-white text-enp-ink-soft border-enp-border hover:border-enp-primary'
                          }`}
                          aria-pressed={selectionne}
                          aria-label={`${c.code} — ${ch.libelle}`}
                          title={ch.libelle}
                        >
                          {ch.valeur ?? '—'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={sectionPrecedente}
            className="inline-flex items-center gap-2 bg-white border border-enp-border text-enp-ink font-medium px-4 py-2.5 rounded-md hover:bg-enp-sky transition-colors min-h-[44px]"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Précédent
          </button>
          <button
            type="button"
            onClick={sectionSuivante}
            disabled={!valide}
            className="inline-flex items-center gap-2 bg-enp-primary text-white font-semibold px-4 py-2.5 rounded-md hover:bg-enp-primary-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
          >
            {indexSection < totalSections - 1 ? 'Suivant' : 'Commentaires'}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
        {!valide && (
          <p className="text-sm text-enp-ink-soft text-center">
            Veuillez répondre à tous les critères pour continuer.
          </p>
        )}
      </div>
    );
  }

  // Phase commentaires
  if (phase === 'commentaires' && questionnaire) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <Link
            to="/evaluations"
            className="inline-flex items-center gap-2 text-enp-primary hover:underline text-sm mb-3"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Retour à la liste
          </Link>
          <h1 className="text-xl font-bold text-enp-ink">
            Commentaires libres
          </h1>
          <p className="text-sm text-enp-ink-soft mt-1">
            Ces champs sont facultatifs.
          </p>
        </div>

        <InfoCard>
          <p className="flex items-start gap-2">
            <Info size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Rappel : vos réponses sont anonymes. N'écrivez aucun élément
              permettant de vous identifier.
            </span>
          </p>
        </InfoCard>

        <div>
          <label
            htmlFor="points-forts"
            className="block text-sm font-medium text-enp-ink mb-1"
          >
            Points forts de l'enseignement
          </label>
          <textarea
            id="points-forts"
            rows={4}
            maxLength={MAX_COMMENTAIRE}
            value={pointsForts}
            onChange={(e) => setPointsForts(e.target.value)}
            className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none resize-y"
          />
          <p className="text-xs text-enp-ink-soft mt-1 text-right">
            {pointsForts.length}/{MAX_COMMENTAIRE}
          </p>
        </div>

        <div>
          <label
            htmlFor="points-ameliorer"
            className="block text-sm font-medium text-enp-ink mb-1"
          >
            Points à améliorer / suggestions
          </label>
          <textarea
            id="points-ameliorer"
            rows={4}
            maxLength={MAX_COMMENTAIRE}
            value={pointsAAmeliorer}
            onChange={(e) => setPointsAAmeliorer(e.target.value)}
            className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none resize-y"
          />
          <p className="text-xs text-enp-ink-soft mt-1 text-right">
            {pointsAAmeliorer.length}/{MAX_COMMENTAIRE}
          </p>
        </div>

        {/* Récapitulatif */}
        <div className="bg-enp-sky border border-enp-border rounded-lg p-4">
          <p className="text-enp-ink font-medium text-sm">
            Récapitulatif : {nbRepondu} critère{nbRepondu > 1 ? 's' : ''} répondu{nbRepondu > 1 ? 's' : ''} sur {totalCriteres}.
          </p>
        </div>

        {erreurAction && (
          <div
            className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux"
            role="alert"
          >
            <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p>{erreurAction}</p>
              <button
                type="button"
                onClick={() => void envoyer()}
                className="mt-2 inline-flex items-center gap-2 bg-enp-primary text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-enp-primary-dark transition-all min-h-[44px]"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              if (questionnaire) {
                setIndexSection(questionnaire.sections.length - 1);
                setPhase('section');
              }
            }}
            className="inline-flex items-center gap-2 bg-white border border-enp-border text-enp-ink font-medium px-4 py-2.5 rounded-md hover:bg-enp-sky transition-colors min-h-[44px]"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Précédent
          </button>
          <button
            type="button"
            onClick={() => setPhase('envoi')}
            className="inline-flex items-center gap-2 bg-enp-primary text-white font-semibold px-4 py-2.5 rounded-md hover:bg-enp-primary-dark transition-all min-h-[44px]"
          >
            Suivant
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  // Phase envoi (confirmation)
  if (phase === 'envoi') {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold text-enp-ink">
            Envoi de vos réponses
          </h1>
        </div>

        <InfoCard titre="Cette action est définitive" icone={false}>
          <p className="flex items-start gap-2">
            <Lock size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Une fois envoyé, votre questionnaire ne peut plus être modifié.
              Vos réponses seront transmises de façon anonyme.
            </span>
          </p>
        </InfoCard>

        <div className="bg-enp-sky border border-enp-border rounded-lg p-4">
          <p className="text-enp-ink font-medium text-sm">
            {nbRepondu} critère{nbRepondu > 1 ? 's' : ''} répondu{nbRepondu > 1 ? 's' : ''} sur {totalCriteres}.
          </p>
          {(pointsForts.trim() || pointsAAmeliorer.trim()) && (
            <p className="text-sm text-enp-ink-soft mt-1">
              Commentaires {' '}
              {pointsForts.trim() && pointsAAmeliorer.trim()
                ? 'remplis'
                : 'partiellement remplis'}.
            </p>
          )}
        </div>

        {erreurAction && (
          <div
            className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux"
            role="alert"
          >
            <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p>{erreurAction}</p>
              <p className="text-sm mt-1">Votre brouillon est conservé. Vous pouvez réessayer.</p>
              <button
                type="button"
                onClick={() => void envoyer()}
                disabled={enCours}
                className="mt-2 inline-flex items-center gap-2 bg-enp-primary text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-enp-primary-dark transition-all min-h-[44px] disabled:opacity-60"
              >
                {enCours ? 'Envoi…' : 'Réessayer'}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setPhase('commentaires')}
            className="inline-flex items-center gap-2 bg-white border border-enp-border text-enp-ink font-medium px-4 py-2.5 rounded-md hover:bg-enp-sky transition-colors min-h-[44px]"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Précédent
          </button>
          <button
            type="button"
            onClick={() => void envoyer()}
            disabled={enCours}
            className="inline-flex items-center gap-2 bg-enp-primary text-white font-semibold px-4 py-3 rounded-md hover:bg-enp-primary-dark transition-all min-h-[44px] disabled:opacity-60"
          >
            <Send size={20} aria-hidden="true" />
            {enCours ? 'Envoi en cours…' : 'Envoyer mes réponses'}
          </button>
        </div>
      </div>
    );
  }

  // Phase remerciement
  if (phase === 'remerciement') {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="text-center py-8">
          <CheckCircle2 size={56} className="mx-auto text-enp-teal mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-enp-ink mb-2">
            Merci pour votre évaluation
          </h1>
          <p className="text-enp-ink-soft mb-6">
            Vos réponses ont été enregistrées de façon anonyme. Elles
            contribuent à l'amélioration des enseignements.
          </p>
          <Link
            to="/evaluations"
            className="inline-flex items-center gap-2 bg-enp-primary text-white font-semibold px-5 py-3 rounded-md hover:bg-enp-primary-dark transition-all min-h-[44px]"
          >
            <ArrowLeft size={20} aria-hidden="true" />
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Composant : critère en mode mobile (liste verticale)               */
/* ------------------------------------------------------------------ */

interface CritereMobileProps {
  code: string;
  libelle: string;
  valeur: Note | undefined;
  onChange: (v: Note) => void;
}

function CritereMobile({ code, libelle, valeur, onChange }: CritereMobileProps) {
  return (
    <fieldset className="border border-enp-border/50 rounded-lg p-3 bg-white">
      <legend className="text-enp-ink font-medium text-sm px-1">
        <span className="font-semibold mr-1">{code}</span>
        {libelle}
      </legend>
      <div className="mt-2 space-y-2">
        {CHOIX.map((ch) => {
          const selectionne = valeur === ch.valeur;
          return (
            <label
              key={ch.libelle}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md border-2 cursor-pointer transition-colors min-h-[44px] ${
                selectionne
                  ? 'bg-enp-primary text-white border-enp-primary'
                  : 'bg-white text-enp-ink border-enp-border hover:border-enp-primary'
              }`}
            >
              <input
                type="radio"
                name={`critere-${code}`}
                value={ch.valeur ?? 'sans-avis'}
                checked={selectionne}
                onChange={() => onChange(ch.valeur)}
                className="sr-only"
              />
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full border-2 text-sm font-semibold shrink-0 ${
                  selectionne
                    ? 'border-white text-white'
                    : 'border-enp-border text-enp-ink-soft'
                }`}
                aria-hidden="true"
              >
                {ch.valeur ?? '—'}
              </span>
              <span className="text-sm">{ch.libelle}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
