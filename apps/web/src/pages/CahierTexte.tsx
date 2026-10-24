import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, AlertCircle, Clock, Calendar } from "lucide-react";
import { api, ApiError } from "@/api";
import type { Avancement, Seance, UeCahier } from "@/api/types";
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
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function CahierTexte() {
  const { aRole } = useAuth();
  const peutGerer = aRole("delegue");
  const peutVoirAvancement = aRole("delegue") || aRole("enseignant");
  const [ues, setUes] = useState<UeCahier[]>([]);
  const [seances, setSeances] = useState<Seance[]>([]);
  const [avancements, setAvancements] = useState<Map<number, Avancement>>(
    new Map(),
  );
  const [filtreUe, setFiltreUe] = useState<number | "all">("all");
  const [filtreVisa, setFiltreVisa] = useState<string>("all");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurExport, setErreurExport] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [uesData, seancesData] = await Promise.all([
        api.cahierMesUes(),
        api.cahierSeances(),
      ]);
      setUes(uesData);
      setSeances(seancesData);
      const avMap = new Map<number, Avancement>();
      if (peutVoirAvancement) {
        const avancees = await Promise.all(
          uesData.map((u) => api.avancementUe(u.ueId)),
        );
        avancees.forEach((av) => avMap.set(av.ueId, av));
      }
      setAvancements(avMap);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(" "));
      else
        setErreur("Erreur réseau : impossible de charger le cahier de texte.");
    } finally {
      setChargement(false);
    }
  }, [peutVoirAvancement]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const seancesFiltrees = seances
    .filter((s) => filtreUe === "all" || s.ueId === filtreUe)
    .filter((s) => filtreVisa === "all" || s.visa.statut === filtreVisa);

  async function telechargerExport(format: "pdf" | "xlsx" | "docx") {
    try {
      const blob = await api.exporterCahier(
        format,
        filtreUe === "all" ? undefined : filtreUe,
      );
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `cahier-texte.${format}`;
      lien.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErreurExport(
        err instanceof ApiError
          ? err.messages.join(" ")
          : "Export indisponible.",
      );
    }
  }

  if (chargement) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">
          Cahier de texte
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
          Cahier de texte
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
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">
          Cahier de texte
        </h1>
        {peutGerer && (
          <Link
            to="/cahier-texte/nouvelle"
            className="hidden sm:inline-flex items-center gap-2 bg-enp-primary text-white font-semibold px-4 py-2.5 rounded-md hover:bg-enp-primary-dark transition-all min-h-[44px]"
          >
            <Plus size={20} aria-hidden="true" /> Nouvelle séance
          </Link>
        )}
      </div>

      <div
        className="flex flex-wrap items-center gap-2"
        aria-label="Exporter le cahier de texte"
      >
        <span className="text-sm text-enp-ink-soft">Exporter :</span>
        {(["pdf", "xlsx", "docx"] as const).map((format) => (
          <button
            key={format}
            type="button"
            onClick={() => void telechargerExport(format)}
            className="rounded-md border border-enp-border bg-white px-3 py-2 text-sm font-medium text-enp-primary hover:bg-enp-sky"
          >
            {format.toUpperCase()}
          </button>
        ))}
      </div>
      {erreurExport && (
        <p role="alert" className="text-sm text-enp-bordeaux">
          {erreurExport}
        </p>
      )}

      {/* Bandeau d'avancement */}
      {peutVoirAvancement && (
        <div className="space-y-3">
          {ues.map((u) => {
            const av = avancements.get(u.ueId);
            if (!av) return null;
            const totalPrev =
              av.heuresPrevues.cm + av.heuresPrevues.td + av.heuresPrevues.tp;
            const totalEff =
              av.heuresEffectuees.cm +
              av.heuresEffectuees.td +
              av.heuresEffectuees.tp;
            const pct =
              totalPrev > 0
                ? Math.min(100, Math.round((totalEff / totalPrev) * 100))
                : 0;
            return (
              <div
                key={u.ueId}
                className="bg-enp-sky border border-enp-border rounded-lg p-4"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-enp-ink font-medium text-sm">
                    <span className="font-semibold">{u.code}</span> —{" "}
                    {u.intitule}
                  </p>
                  <p className="text-sm text-enp-ink-soft">
                    {totalEff} h / {totalPrev} h ({pct}%)
                  </p>
                </div>
                <div
                  className="h-2 w-full rounded-full bg-white border border-enp-border overflow-hidden mb-2"
                  aria-hidden="true"
                >
                  <div
                    className="h-full bg-enp-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-enp-ink-soft">
                  CM : {av.heuresEffectuees.cm}/{av.heuresPrevues.cm} h · TD :{" "}
                  {av.heuresEffectuees.td}/{av.heuresPrevues.td} h · TP :{" "}
                  {av.heuresEffectuees.tp}/{av.heuresPrevues.tp} h
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label
            htmlFor="filtre-ue"
            className="block text-xs font-medium text-enp-ink-soft mb-1"
          >
            UE
          </label>
          <select
            id="filtre-ue"
            value={filtreUe === "all" ? "all" : String(filtreUe)}
            onChange={(e) =>
              setFiltreUe(
                e.target.value === "all" ? "all" : Number(e.target.value),
              )
            }
            className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
          >
            <option value="all">Toutes les UE</option>
            {ues.map((u) => (
              <option key={u.ueId} value={u.ueId}>
                {u.code} — {u.intitule}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label
            htmlFor="filtre-visa"
            className="block text-xs font-medium text-enp-ink-soft mb-1"
          >
            Visa
          </label>
          <select
            id="filtre-visa"
            value={filtreVisa}
            onChange={(e) => setFiltreVisa(e.target.value)}
            className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px]"
          >
            <option value="all">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="vise">Visée</option>
            <option value="conteste">Contestée</option>
          </select>
        </div>
      </div>

      {/* Liste des séances — desktop tableau */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-enp-primary text-white">
              <th
                scope="col"
                className="text-left px-3 py-2.5 font-semibold rounded-tl-xl"
              >
                Date
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold">
                UE
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold">
                Type
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold">
                Intitulé
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold">
                Statut
              </th>
              <th
                scope="col"
                className="text-center px-3 py-2.5 font-semibold rounded-tr-xl"
              >
                Visa
              </th>
            </tr>
          </thead>
          <tbody>
            {seancesFiltrees.map((s, i) => {
              const v = LIBELLES_VISA[s.visa.statut];
              return (
                <tr
                  key={s.id}
                  className={i % 2 === 0 ? "bg-enp-sky/60" : "bg-white"}
                >
                  <td className="px-3 py-2.5 text-enp-ink whitespace-nowrap">
                    {formaterDate(s.date)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/cahier-texte/${s.id}`}
                      className="text-enp-primary hover:underline font-medium"
                    >
                      {s.ueCode}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-enp-ink-soft">
                    {LIBELLES_TYPE[s.type]}
                  </td>
                  <td className="px-3 py-2.5 text-enp-ink">
                    {s.intitule ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-enp-ink-soft">
                    {LIBELLES_STATUT[s.statut]}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-1 rounded ${v.classe}`}
                    >
                      {v.libelle}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {seancesFiltrees.length === 0 && (
          <p className="text-center text-enp-ink-soft py-8 text-sm">
            Aucune séance trouvée.
          </p>
        )}
      </div>

      {/* Liste des séances — mobile cartes */}
      <div className="lg:hidden space-y-3">
        {seancesFiltrees.map((s) => {
          const v = LIBELLES_VISA[s.visa.statut];
          return (
            <Link
              key={s.id}
              to={`/cahier-texte/${s.id}`}
              className="block bg-white border border-enp-border rounded-lg p-4 hover:border-enp-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-sm text-enp-ink-soft">
                  <Calendar size={14} aria-hidden="true" />{" "}
                  {formaterDate(s.date)}
                </span>
                <span
                  className={`inline-block text-xs font-medium px-2 py-1 rounded ${v.classe}`}
                >
                  {v.libelle}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-enp-primary text-white text-xs font-semibold px-1.5 py-0.5 rounded">
                  {s.ueCode}
                </span>
                <span className="text-xs text-enp-ink-soft">
                  {LIBELLES_TYPE[s.type]}
                  {s.groupe ? ` — ${s.groupe}` : ""}
                </span>
              </div>
              <p className="text-enp-ink font-medium text-sm leading-snug">
                {s.intitule ?? "—"}
              </p>
              <p className="text-xs text-enp-ink-soft mt-1 flex items-center gap-1">
                <Clock size={12} aria-hidden="true" /> {s.debut}–{s.fin} ·{" "}
                {LIBELLES_STATUT[s.statut]}
              </p>
            </Link>
          );
        })}
        {seancesFiltrees.length === 0 && (
          <p className="text-center text-enp-ink-soft py-8 text-sm">
            Aucune séance trouvée.
          </p>
        )}
      </div>

      {/* Bouton flottant mobile */}
      {peutGerer && (
        <Link
          to="/cahier-texte/nouvelle"
          className="sm:hidden fixed bottom-5 right-5 z-30 inline-flex items-center justify-center w-14 h-14 rounded-full bg-enp-primary text-white shadow-lg hover:bg-enp-primary-dark transition-all"
          aria-label="Nouvelle séance"
        >
          <Plus size={26} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
