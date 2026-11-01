import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, MessageSquare, Send } from "lucide-react";
import { api, ApiError } from "@/api";
import type { Seance } from "@/api/types";

const LIBELLES_STATUT: Record<string, string> = {
  tenue: "Tenue",
  reportee: "Reportée",
  annulee: "Annulée",
  enseignant_absent: "Enseignant absent",
  planifiee: "Planifiée",
};

const LIBELLES_TYPE: Record<string, string> = {
  CM: "CM",
  TD: "TD",
  TP: "TP",
  AUTRE: "Autre",
};

function formaterDate(iso: string): string {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
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
  const [commentaire, setCommentaire] = useState("");
  const [enCours, setEnCours] = useState<number | null>(null);
  const [erreurAction, setErreurAction] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.cahierSeances(undefined, "en_attente");
      setSeances(data);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(" "));
      else setErreur("Erreur réseau : impossible de charger les séances.");
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
      await api.visaSeance(s.id, { decision: "vise" });
      setSeances((prev) => prev.filter((x) => x.id !== s.id));
    } catch (err) {
      if (err instanceof ApiError) setErreurAction(err.messages.join(" "));
      else setErreurAction("Erreur réseau.");
    } finally {
      setEnCours(null);
    }
  }

  async function contester(s: Seance) {
    if (!commentaire.trim()) {
      setErreurAction("Un commentaire est obligatoire pour contester.");
      return;
    }
    setEnCours(s.id);
    setErreurAction(null);
    try {
      await api.visaSeance(s.id, {
        decision: "conteste",
        commentaire: commentaire.trim(),
      });
      setSeances((prev) => prev.filter((x) => x.id !== s.id));
      setContesteId(null);
      setCommentaire("");
    } catch (err) {
      if (err instanceof ApiError) setErreurAction(err.messages.join(" "));
      else setErreurAction("Erreur réseau.");
    } finally {
      setEnCours(null);
    }
  }

  if (chargement) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">
          Séances à viser
        </h1>
        <div className="flex items-center gap-3 text-enp-ink-soft">
          <div
            className="h-6 w-6 rounded-full border-2 border-enp-sky border-t-enp-primary animate-spin"
            aria-hidden="true"
          />
          <span>Chargement…</span>
        </div>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">
          Séances à viser
        </h1>
        <div
          className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux"
          role="alert"
        >
          <AlertCircle
            size={20}
            className="shrink-0 mt-0.5"
            aria-hidden="true"
          />
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
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">
          Séances à viser
        </h1>
        <p className="text-sm text-enp-ink-soft mt-1">
          {seances.length} séance{seances.length > 1 ? "s" : ""} en attente de
          visa.
        </p>
      </div>

<<<<<<< Updated upstream
      {erreurAction && (
        <div
          className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux"
          role="alert"
        >
          <AlertCircle
            size={20}
            className="shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <span>{erreurAction}</span>
=======
      <Alert
        variant="institutional"
        title="Responsabilité pédagogique de l'enseignant"
        icon={<Stamp className="w-5 h-5 text-enp-violet shrink-0 mt-0.5" />}
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
>>>>>>> Stashed changes
        </div>
      )}

      {seances.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle2
            size={48}
            className="mx-auto text-enp-teal mb-3"
            aria-hidden="true"
          />
          <p className="text-enp-ink font-medium">Aucune séance en attente.</p>
          <p className="text-sm text-enp-ink-soft mt-1">
            Toutes les séances ont été visées.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {seances.map((s) => (
          <div
            key={s.id}
            className="bg-white border border-enp-border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center bg-enp-primary text-white text-xs font-semibold px-2 py-0.5 rounded">
                {s.ueCode}
              </span>
              <span className="text-xs text-enp-ink-soft">
                {LIBELLES_TYPE[s.type]}
                {s.groupe ? ` — ${s.groupe}` : ""}
              </span>
              <span className="text-xs text-enp-ink-soft ml-auto">
                {formaterDate(s.date)} · {s.debut}–{s.fin}
              </span>
            </div>
            <p className="text-enp-ink font-medium">
              {s.intitule ?? "Sans intitulé"}
            </p>
            <p className="text-sm text-enp-ink-soft">{s.ueIntitule}</p>

            {s.contenu && (
              <div className="text-sm text-enp-ink bg-enp-sky/40 border border-enp-border rounded-md p-3">
                <span className="font-medium">Contenu : </span>
                {s.contenu}
              </div>
            )}
            {s.travailAFaire && (
              <div className="text-sm text-enp-ink bg-enp-sky/40 border border-enp-border rounded-md p-3">
                <span className="font-medium">Travail à faire : </span>
                {s.travailAFaire}
              </div>
            )}
            {s.observations && (
              <div className="text-sm text-enp-ink bg-enp-sky/40 border border-enp-border rounded-md p-3">
                <span className="font-medium">Observations : </span>
                {s.observations}
              </div>
            )}
            <p className="text-xs text-enp-ink-soft">
              Statut : {LIBELLES_STATUT[s.statut]}
            </p>

            {/* Boutons d'action */}
            {contesteId === s.id ? (
              <div className="space-y-3 border-t border-enp-border pt-3">
                <label
                  htmlFor={`commentaire-${s.id}`}
                  className="block text-sm font-medium text-enp-ink"
                >
                  Commentaire (obligatoire)
                </label>
                <textarea
                  id={`commentaire-${s.id}`}
                  rows={3}
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Expliquez la raison de la contestation..."
                  className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none resize-y"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setContesteId(null);
                      setCommentaire("");
                      setErreurAction(null);
                    }}
                    className="inline-flex items-center gap-2 bg-white border border-enp-border text-enp-ink font-medium px-3 py-2.5 rounded-md hover:bg-enp-sky transition-colors text-sm min-h-[44px]"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => void contester(s)}
                    disabled={enCours === s.id}
                    className="inline-flex items-center gap-2 bg-enp-primary text-white font-semibold px-3 py-2.5 rounded-md hover:bg-enp-primary-dark transition-all text-sm min-h-[44px] disabled:opacity-60"
                  >
                    <Send size={16} aria-hidden="true" />
                    {enCours === s.id ? "Envoi…" : "Confirmer la contestation"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 border-t border-enp-border pt-3">
                <button
                  type="button"
                  onClick={() => void viser(s)}
                  disabled={enCours === s.id}
                  className="inline-flex items-center gap-2 bg-enp-primary text-white font-semibold px-3 py-2.5 rounded-md hover:bg-enp-primary-dark transition-all text-sm min-h-[44px] disabled:opacity-60"
                >
                  <CheckCircle2 size={18} aria-hidden="true" />
                  {enCours === s.id ? "Traitement…" : "Viser"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContesteId(s.id);
                    setCommentaire("");
                    setErreurAction(null);
                  }}
                  disabled={enCours === s.id}
                  className="inline-flex items-center gap-2 bg-white border border-enp-border text-enp-ink font-medium px-3 py-2.5 rounded-md hover:bg-enp-primary-light hover:border-enp-primary/40 transition-colors text-sm min-h-[44px] disabled:opacity-60"
                >
                  <MessageSquare size={18} aria-hidden="true" />
                  Contester
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
