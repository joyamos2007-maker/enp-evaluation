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
