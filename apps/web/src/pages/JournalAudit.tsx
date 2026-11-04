import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ScrollText } from "lucide-react";
import { api, ApiError } from "@/api";
import type { LigneAudit } from "@/api/types";

export function JournalAudit() {
  const [lignes, setLignes] = useState<LigneAudit[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setLignes(await api.journalAudit());
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.messages.join(" ")
          : "Consultation du journal impossible.",
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <section className="space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-enp-ink">
        <ScrollText size={24} aria-hidden="true" /> Journal d’audit
      </h1>
      <p className="text-sm text-enp-ink-soft">
        Les 200 événements les plus récents. Les bulletins, réponses de vote et
        adresses IP ne sont pas consignés.
      </p>
      {erreur && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-enp-bordeaux/15 bg-enp-bordeaux-light p-4 text-enp-bordeaux"
        >
          <AlertCircle size={18} aria-hidden="true" /> {erreur}
        </div>
      )}
      {chargement ? (
        <p className="text-sm text-enp-ink-soft">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-enp-border bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-enp-primary text-white">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Utilisateur</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Objet</th>
                <th className="px-3 py-2">Détail</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne) => (
                <tr key={ligne.id} className="border-t border-enp-border">
                  <td className="whitespace-nowrap px-3 py-2">
                    {new Date(ligne.creeLe).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-3 py-2">{ligne.userId ?? "Système"}</td>
                  <td className="px-3 py-2">{ligne.action}</td>
                  <td className="px-3 py-2">
                    {ligne.objet ?? ligne.courseId ?? "—"}
                  </td>
                  <td className="px-3 py-2">{ligne.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!lignes.length && (
            <p className="p-5 text-center text-sm text-enp-ink-soft">
              Aucun événement d’audit.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
