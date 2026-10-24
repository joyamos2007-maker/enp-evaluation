import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  AlertCircle,
  Pencil,
  Paperclip,
  History,
  Download,
} from "lucide-react";
import { api, ApiError } from "@/api";
import type { PieceJointe, Seance, VersionSeance } from "@/api/types";
import { useAuth } from "@/auth/AuthContext";

const LIBELLES_VISA: Record<string, { libelle: string; classe: string }> = {
  en_attente: { libelle: "En attente", classe: "bg-enp-sky text-enp-ink" },
  vise: { libelle: "Visée", classe: "bg-enp-primary text-white" },
  conteste: {
    libelle: "Contestée",
    classe: "bg-enp-primary-light text-enp-ink-soft",
  },
};

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
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function DetailSeance() {
  const { id } = useParams<{ id: string }>();
  const { aRole } = useAuth();
  const [seance, setSeance] = useState<Seance | null>(null);
  const [versions, setVersions] = useState<VersionSeance[]>([]);
  const [pieces, setPieces] = useState<PieceJointe[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurPiece, setErreurPiece] = useState<string | null>(null);

  const charger = useCallback(async () => {
    if (!id) return;
    setChargement(true);
    setErreur(null);
    try {
      const [seances, historique, piecesJointes] = await Promise.all([
        api.cahierSeances(),
        api.historiqueSeance(Number(id)),
        api.piecesSeance(Number(id)),
      ]);
      const trouve = seances.find((s) => s.id === Number(id));
      if (!trouve) {
        setErreur("Séance introuvable.");
      } else {
        setSeance(trouve);
        setVersions(historique);
        setPieces(piecesJointes);
      }
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(" "));
      else setErreur("Erreur réseau.");
    } finally {
      setChargement(false);
    }
  }, [id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (chargement) {
    return (
      <div className="space-y-6">
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

  if (erreur || !seance) {
    return (
      <div className="space-y-6">
        <div
          className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux"
          role="alert"
        >
          <AlertCircle
            size={20}
            className="shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <span>{erreur ?? "Séance introuvable."}</span>
        </div>
        <Link
          to="/cahier-texte"
          className="inline-flex items-center gap-2 text-enp-primary hover:underline"
        >
          <ArrowLeft size={18} aria-hidden="true" /> Retour au cahier
        </Link>
      </div>
    );
  }

  const v = LIBELLES_VISA[seance.visa.statut];

  async function ajouterPiece(fichier: File | undefined) {
    if (!fichier || !id) return;
    setErreurPiece(null);
    try {
      await api.ajouterPieceSeance(Number(id), fichier);
      setPieces(await api.piecesSeance(Number(id)));
    } catch (err) {
      setErreurPiece(
        err instanceof ApiError
          ? err.messages.join(" ")
          : "Envoi du fichier impossible.",
      );
    }
  }

  async function telecharger(piece: PieceJointe) {
    try {
      const blob = await api.telechargerPiece(piece.id);
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = piece.nom;
      lien.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setErreurPiece(
        err instanceof ApiError
          ? err.messages.join(" ")
          : "Téléchargement impossible.",
      );
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/cahier-texte"
          className="inline-flex items-center gap-2 text-enp-primary hover:underline text-sm"
        >
          <ArrowLeft size={18} aria-hidden="true" /> Retour au cahier
        </Link>
        {seance.modifiable && (
          <Link
            to={`/cahier-texte/${seance.id}/modifier`}
            className="inline-flex items-center gap-2 bg-white border border-enp-border text-enp-ink font-medium px-3 py-2 rounded-md hover:bg-enp-sky transition-colors text-sm min-h-[44px]"
          >
            <Pencil size={16} aria-hidden="true" /> Modifier
          </Link>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center bg-enp-primary text-white text-xs font-semibold px-2 py-0.5 rounded">
            {seance.ueCode}
          </span>
          <span
            className={`inline-block text-xs font-medium px-2 py-1 rounded ${v.classe}`}
          >
            {v.libelle}
          </span>
        </div>
        <h1 className="text-xl font-bold text-enp-ink">
          {seance.intitule ?? "Séance"}
        </h1>
        <p className="text-sm text-enp-ink-soft mt-1">{seance.ueIntitule}</p>
      </div>

      <div className="bg-enp-sky border border-enp-border rounded-lg p-4 space-y-3 text-sm">
        <Ligne label="Date" valeur={formaterDate(seance.date)} />
        <Ligne label="Horaire" valeur={`${seance.debut} — ${seance.fin}`} />
        <Ligne label="Type" valeur={LIBELLES_TYPE[seance.type]} />
        {seance.groupe && <Ligne label="Groupe" valeur={seance.groupe} />}
        <Ligne label="Statut" valeur={LIBELLES_STATUT[seance.statut]} />
        {seance.effectif !== undefined && (
          <Ligne label="Effectif présent" valeur={String(seance.effectif)} />
        )}
      </div>

      {seance.contenu && (
        <div>
          <h2 className="text-sm font-semibold text-enp-ink mb-1">
            Contenu traité
          </h2>
          <p className="text-sm text-enp-ink bg-enp-sky/40 border border-enp-border rounded-md p-3 leading-relaxed">
            {seance.contenu}
          </p>
        </div>
      )}

      {seance.travailAFaire && (
        <div>
          <h2 className="text-sm font-semibold text-enp-ink mb-1">
            Travail à faire
          </h2>
          <p className="text-sm text-enp-ink bg-enp-sky/40 border border-enp-border rounded-md p-3 leading-relaxed">
            {seance.travailAFaire}
          </p>
        </div>
      )}

      {seance.observations && (
        <div>
          <h2 className="text-sm font-semibold text-enp-ink mb-1">
            Observations
          </h2>
          <p className="text-sm text-enp-ink bg-enp-sky/40 border border-enp-border rounded-md p-3 leading-relaxed">
            {seance.observations}
          </p>
        </div>
      )}

      {/* Visa */}
      <div className="bg-white border border-enp-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-enp-ink mb-2">
          Visa de l'enseignant
        </h2>
        <p className="text-sm text-enp-ink">
          Statut :{" "}
          <span
            className={`inline-block text-xs font-medium px-2 py-1 rounded ${v.classe}`}
          >
            {v.libelle}
          </span>
        </p>
        {seance.visa.commentaire && (
          <p className="text-sm text-enp-ink-soft mt-2">
            <span className="font-medium text-enp-ink">Commentaire : </span>
            {seance.visa.commentaire}
          </p>
        )}
        {seance.visa.date && (
          <p className="text-xs text-enp-ink-soft mt-2">
            Visé le {formaterDate(seance.visa.date)}
          </p>
        )}
      </div>

      <section className="bg-white border border-enp-border rounded-lg p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-enp-ink">
          <Paperclip size={16} aria-hidden="true" /> Pièces jointes
        </h2>
        {pieces.length ? (
          <ul className="space-y-2">
            {pieces.map((piece) => (
              <li
                key={piece.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate">{piece.nom}</span>
                <button
                  type="button"
                  onClick={() => void telecharger(piece)}
                  className="inline-flex shrink-0 items-center gap-1 text-enp-primary hover:underline"
                >
                  <Download size={14} aria-hidden="true" /> Télécharger
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-enp-ink-soft">Aucune pièce jointe.</p>
        )}
        {aRole("delegue") && (
          <label className="block text-sm text-enp-ink-soft">
            Ajouter un PDF ou une image (10 Mo maximum)
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(event) => void ajouterPiece(event.target.files?.[0])}
              className="mt-1 block w-full text-sm"
            />
          </label>
        )}
        {erreurPiece && (
          <p role="alert" className="text-sm text-enp-bordeaux">
            {erreurPiece}
          </p>
        )}
      </section>

      <section className="bg-white border border-enp-border rounded-lg p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-enp-ink">
          <History size={16} aria-hidden="true" /> Historique des versions
        </h2>
        {versions.length ? (
          versions.map((version) => (
            <article
              key={version.id}
              className="border-l-2 border-enp-primary pl-3 text-sm"
            >
              <p className="font-medium text-enp-ink">
                Version {version.id} —{" "}
                {new Date(version.creeLe).toLocaleString("fr-FR")}
              </p>
              <p className="text-enp-ink-soft">
                {typeof version.seance.intitule === "string"
                  ? version.seance.intitule
                  : "Séance"}{" "}
                ·{" "}
                {typeof version.seance.visa_statut === "string"
                  ? version.seance.visa_statut
                  : ""}
              </p>
              {typeof version.seance.contenu === "string" && (
                <p className="mt-1 whitespace-pre-wrap">
                  {version.seance.contenu}
                </p>
              )}
            </article>
          ))
        ) : (
          <p className="text-sm text-enp-ink-soft">
            Aucune modification antérieure enregistrée.
          </p>
        )}
      </section>
    </div>
  );
}

function Ligne({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-enp-ink-soft w-28 shrink-0">{label}</span>
      <span className="text-enp-ink font-medium">{valeur}</span>
    </div>
  );
}
