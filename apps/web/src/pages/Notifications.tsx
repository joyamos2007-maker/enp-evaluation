import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, AlertCircle, Check } from "lucide-react";
import { api, ApiError } from "@/api";
import type { Notification } from "@/api/types";

export function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      setItems(await api.notifications());
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.messages.join(" ")
          : "Chargement des notifications impossible.",
      );
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function marquerLue(id: number) {
    try {
      await api.marquerNotificationLue(id);
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, luLe: new Date().toISOString() } : item,
        ),
      );
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.messages.join(" ")
          : "Mise à jour impossible.",
      );
    }
  }

<<<<<<< Updated upstream
=======
  async function marquerToutesLues() {
    const nonLues = items.filter((it) => !it.luLe);
    for (const notif of nonLues) {
      try {
        await api.marquerNotificationLue(notif.id);
      } catch {
        //
      }
    }
    setItems((prev) => prev.map((it) => ({ ...it, luLe: new Date().toISOString() })));
  }

  const itemsFiltres = useMemo(() => {
    return items.filter((it) => {
      if (filtre === 'non_lues') return !it.luLe;
      return true;
    });
  }, [items, filtre]);

  const totalPages = Math.max(1, Math.ceil(itemsFiltres.length / pageSize));
  const itemsPagines = useMemo(() => {
    const debut = (page - 1) * pageSize;
    return itemsFiltres.slice(debut, debut + pageSize);
  }, [itemsFiltres, page, pageSize]);

  const nonLuesCount = items.filter((it) => !it.luLe).length;

  function iconeType(titre: string) {
    const lower = titre.toLowerCase();
    if (lower.includes('campagne') || lower.includes('ouverte') || lower.includes('clôture')) {
      return <Megaphone className="w-5 h-5 text-enp-blue-primary shrink-0" />;
    }
    if (lower.includes('visa') || lower.includes('séance')) {
      return <Stamp className="w-5 h-5 text-enp-violet shrink-0" />;
    }
    if (lower.includes('restitution') || lower.includes('résultat')) {
      return <FileCheck2 className="w-5 h-5 text-enp-green-valid shrink-0" />;
    }
    if (lower.includes('import') || lower.includes('synchronisation')) {
      return <Upload className="w-5 h-5 text-enp-blue-deep shrink-0" />;
    }
    return <Info className="w-5 h-5 text-enp-blue-primary shrink-0" />;
  }

>>>>>>> Stashed changes
  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-enp-ink">
        <Bell size={24} aria-hidden="true" /> Notifications
      </h1>
      {erreur && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-enp-bordeaux/15 bg-enp-bordeaux-light p-4 text-enp-bordeaux"
        >
          <AlertCircle size={18} aria-hidden="true" /> {erreur}
        </div>
      )}
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={`rounded-lg border p-4 ${item.luLe ? "border-enp-border bg-white" : "border-enp-primary/30 bg-enp-sky"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-enp-ink">{item.title}</h2>
                  <p className="mt-1 text-sm text-enp-ink-soft">
                    {item.message}
                  </p>
                  <time
                    className="mt-2 block text-xs text-enp-ink-soft"
                    dateTime={item.creeLe}
                  >
                    {new Date(item.creeLe).toLocaleString("fr-FR")}
                  </time>
                </div>
                {!item.luLe && (
                  <button
                    type="button"
                    onClick={() => void marquerLue(item.id)}
                    className="inline-flex shrink-0 items-center gap-1 text-sm text-enp-primary hover:underline"
                  >
                    <Check size={16} aria-hidden="true" /> Lu
                  </button>
                )}
              </div>
              {item.link && (
                <Link
                  to={item.link}
                  className="mt-3 inline-block text-sm font-medium text-enp-primary hover:underline"
                >
                  Ouvrir
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : !erreur ? (
        <p className="rounded-lg border border-enp-border bg-white p-6 text-center text-enp-ink-soft">
          Vous n’avez pas de notification.
        </p>
      ) : null}
    </section>
  );
}
