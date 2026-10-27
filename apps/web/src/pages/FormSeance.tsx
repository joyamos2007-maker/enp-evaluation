import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, AlertCircle, Save } from "lucide-react";
import { api, ApiError } from "@/api";
import type {
  SeanceEntree,
  TypeSeance,
  StatutSeance,
  UeCahier,
  Seance,
} from "@/api/types";
import { InfoCard } from "@/components/InfoCard";

const TYPES: { valeur: TypeSeance; libelle: string }[] = [
  { valeur: "CM", libelle: "CM" },
  { valeur: "TD", libelle: "TD" },
  { valeur: "TP", libelle: "TP" },
  { valeur: "AUTRE", libelle: "Autre" },
];

const STATUTS: { valeur: StatutSeance; libelle: string }[] = [
  { valeur: "tenue", libelle: "Tenue" },
  { valeur: "reportee", libelle: "Reportée" },
  { valeur: "annulee", libelle: "Annulée" },
  { valeur: "enseignant_absent", libelle: "Enseignant absent" },
  { valeur: "planifiee", libelle: "Planifiée" },
];

function aujourdISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FormSeance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const modeModification = Boolean(id);

  const [ues, setUes] = useState<UeCahier[]>([]);
  const [seanceExistante, setSeanceExistante] = useState<Seance | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [erreurGlobal, setErreurGlobal] = useState<string | null>(null);

  const [form, setForm] = useState<SeanceEntree>({
    ueId: 0,
    date: aujourdISO(),
    debut: "08:00",
    fin: "10:00",
    type: "CM",
    statut: "tenue",
  });

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const uesData = await api.cahierMesUes();
      setUes(uesData);

      if (modeModification && id) {
        const seances = await api.cahierSeances();
        const seance = seances.find((s) => s.id === Number(id));
        if (!seance) {
          setErreurGlobal("Séance introuvable.");
          setChargement(false);
          return;
        }
        setSeanceExistante(seance);
        setForm({
          ueId: seance.ueId,
          date: seance.date,
          debut: seance.debut,
          fin: seance.fin,
          type: seance.type,
          groupe: seance.groupe,
          statut: seance.statut,
          intitule: seance.intitule,
          contenu: seance.contenu,
          travailAFaire: seance.travailAFaire,
          effectif: seance.effectif,
          observations: seance.observations,
        });
      } else if (uesData.length > 0) {
        setForm((f) => ({ ...f, ueId: uesData[0].ueId }));
      }
    } catch (err) {
      if (err instanceof ApiError) setErreurGlobal(err.messages.join(" "));
      else setErreurGlobal("Erreur réseau.");
    } finally {
      setChargement(false);
    }
  }, [id, modeModification]);

  useEffect(() => {
    void charger();
  }, [charger]);

  function update<K extends keyof SeanceEntree>(
    cle: K,
    valeur: SeanceEntree[K],
  ) {
    setForm((f) => ({ ...f, [cle]: valeur }));
    setErreurs([]);
  }

  function valider(): string[] {
    const errs: string[] = [];
    if (!form.ueId) errs.push("L'UE est obligatoire.");
    if (!form.date) errs.push("La date est obligatoire.");
    if (form.statut === "planifiee" && form.date <= aujourdISO()) {
      errs.push("Une séance planifiée doit avoir une date future.");
    } else if (form.statut !== "planifiee" && form.date > aujourdISO()) {
      errs.push("La date ne peut pas être dans le futur.");
    }
    if (!form.debut) errs.push("L'heure de début est obligatoire.");
    if (!form.fin) errs.push("L'heure de fin est obligatoire.");
    if (form.debut && form.fin && form.fin <= form.debut) {
      errs.push("L'heure de fin doit être postérieure à l'heure de début.");
    }
    if (form.statut === "tenue") {
      if (!form.intitule?.trim())
        errs.push("L'intitulé est obligatoire pour une séance tenue.");
      if (!form.contenu?.trim())
        errs.push("Le contenu est obligatoire pour une séance tenue.");
    }
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = valider();
    if (errs.length > 0) {
      setErreurs(errs);
      return;
    }
    setEnCours(true);
    setErreurGlobal(null);
    try {
      if (modeModification && id) {
        await api.modifierSeance(Number(id), form);
        navigate(`/cahier-texte/${id}`, { replace: true });
      } else {
        const seance = await api.creerSeance(form);
        navigate(`/cahier-texte/${seance.id}`, { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) setErreurGlobal(err.messages.join(" "));
      else
        setErreurGlobal("Erreur réseau : impossible d'enregistrer la séance.");
    } finally {
      setEnCours(false);
    }
  }

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

  const enLectureSeule = seanceExistante ? !seanceExistante.modifiable : false;

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        to="/cahier-texte"
        className="inline-flex items-center gap-2 text-enp-primary hover:underline text-sm"
      >
        <ArrowLeft size={18} aria-hidden="true" /> Retour au cahier
      </Link>

      <h1 className="text-xl font-bold text-enp-ink">
        {modeModification ? "Modifier la séance" : "Nouvelle séance"}
      </h1>

      {enLectureSeule && (
        <InfoCard titre="Séance visée : modification impossible">
          <p>
            Cette séance a été visée par l'enseignant. Les champs sont en
            lecture seule.
          </p>
        </InfoCard>
      )}

      {erreurGlobal && (
        <div
          className="flex items-start gap-2 rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-4 text-enp-bordeaux"
          role="alert"
        >
          <AlertCircle
            size={20}
            className="shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <span>{erreurGlobal}</span>
        </div>
      )}

      {erreurs.length > 0 && (
        <div
          className="rounded-lg bg-enp-bordeaux-light border border-enp-bordeaux/15 p-3 text-enp-bordeaux text-sm"
          role="alert"
        >
          <ul className="list-disc list-inside space-y-0.5">
            {erreurs.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-enp-ink mb-1"
            >
              Date
            </label>
            <input
              id="date"
              type="date"
              required
              min={form.statut === "planifiee" ? aujourdISO() : undefined}
              max={form.statut === "planifiee" ? undefined : aujourdISO()}
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              disabled={enLectureSeule || enCours}
              className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px] disabled:bg-enp-sky"
            />
          </div>
          <div>
            <label
              htmlFor="debut"
              className="block text-sm font-medium text-enp-ink mb-1"
            >
              Début
            </label>
            <input
              id="debut"
              type="time"
              required
              value={form.debut}
              onChange={(e) => update("debut", e.target.value)}
              disabled={enLectureSeule || enCours}
              className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px] disabled:bg-enp-sky"
            />
          </div>
          <div>
            <label
              htmlFor="fin"
              className="block text-sm font-medium text-enp-ink mb-1"
            >
              Fin
            </label>
            <input
              id="fin"
              type="time"
              required
              value={form.fin}
              onChange={(e) => update("fin", e.target.value)}
              disabled={enLectureSeule || enCours}
              className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px] disabled:bg-enp-sky"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="ue"
              className="block text-sm font-medium text-enp-ink mb-1"
            >
              UE
            </label>
            <select
              id="ue"
              required
              value={form.ueId}
              onChange={(e) => update("ueId", Number(e.target.value))}
              disabled={enLectureSeule || enCours}
              className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px] disabled:bg-enp-sky"
            >
              {ues.map((u) => (
                <option key={u.ueId} value={u.ueId}>
                  {u.code} — {u.intitule}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-enp-ink mb-1"
            >
              Type
            </label>
            <select
              id="type"
              value={form.type}
              onChange={(e) => update("type", e.target.value as TypeSeance)}
              disabled={enLectureSeule || enCours}
              className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px] disabled:bg-enp-sky"
            >
              {TYPES.map((t) => (
                <option key={t.valeur} value={t.valeur}>
                  {t.libelle}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="groupe"
              className="block text-sm font-medium text-enp-ink mb-1"
            >
              Groupe (facultatif)
            </label>
            <input
              id="groupe"
              type="text"
              value={form.groupe ?? ""}
              onChange={(e) => update("groupe", e.target.value || undefined)}
              disabled={enLectureSeule || enCours}
              className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px] disabled:bg-enp-sky"
            />
          </div>
          <div>
            <label
              htmlFor="statut"
              className="block text-sm font-medium text-enp-ink mb-1"
            >
              Statut
            </label>
            <select
              id="statut"
              value={form.statut}
              onChange={(e) => update("statut", e.target.value as StatutSeance)}
              disabled={enLectureSeule || enCours}
              className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px] disabled:bg-enp-sky"
            >
              {STATUTS.map((s) => (
                <option key={s.valeur} value={s.valeur}>
                  {s.libelle}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="intitule"
            className="block text-sm font-medium text-enp-ink mb-1"
          >
            Intitulé de la séance
            {form.statut === "tenue" ? " (obligatoire)" : ""}
          </label>
          <input
            id="intitule"
            type="text"
            value={form.intitule ?? ""}
            onChange={(e) => update("intitule", e.target.value || undefined)}
            disabled={enLectureSeule || enCours}
            className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px] disabled:bg-enp-sky"
          />
        </div>

        <div>
          <label
            htmlFor="contenu"
            className="block text-sm font-medium text-enp-ink mb-1"
          >
            Contenu traité{form.statut === "tenue" ? " (obligatoire)" : ""}
          </label>
          <textarea
            id="contenu"
            rows={3}
            value={form.contenu ?? ""}
            onChange={(e) => update("contenu", e.target.value || undefined)}
            disabled={enLectureSeule || enCours}
            className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none resize-y disabled:bg-enp-sky"
          />
        </div>

        <div>
          <label
            htmlFor="travail"
            className="block text-sm font-medium text-enp-ink mb-1"
          >
            Travail à faire (facultatif)
          </label>
          <textarea
            id="travail"
            rows={2}
            value={form.travailAFaire ?? ""}
            onChange={(e) =>
              update("travailAFaire", e.target.value || undefined)
            }
            disabled={enLectureSeule || enCours}
            className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none resize-y disabled:bg-enp-sky"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="effectif"
              className="block text-sm font-medium text-enp-ink mb-1"
            >
              Effectif présent (facultatif)
            </label>
            <input
              id="effectif"
              type="number"
              min={0}
              value={form.effectif ?? ""}
              onChange={(e) =>
                update(
                  "effectif",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              disabled={enLectureSeule || enCours}
              className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none min-h-[44px] disabled:bg-enp-sky"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="observations"
            className="block text-sm font-medium text-enp-ink mb-1"
          >
            Observations (facultatif)
          </label>
          <textarea
            id="observations"
            rows={2}
            value={form.observations ?? ""}
            onChange={(e) =>
              update("observations", e.target.value || undefined)
            }
            disabled={enLectureSeule || enCours}
            className="w-full rounded-lg border border-enp-border px-3 py-2.5 text-enp-ink bg-white focus:border-enp-primary focus:ring-2 focus:ring-enp-primary/20 outline-none resize-y disabled:bg-enp-sky"
          />
        </div>

        {!enLectureSeule && (
          <button
            type="submit"
            disabled={enCours}
            className="inline-flex items-center gap-2 bg-enp-primary text-white font-semibold px-5 py-3 rounded-md hover:bg-enp-primary-dark transition-all disabled:opacity-60 min-h-[44px]"
          >
            <Save size={20} aria-hidden="true" />
            {enCours
              ? "Enregistrement…"
              : modeModification
                ? "Enregistrer les modifications"
                : "Créer la séance"}
          </button>
        )}
      </form>
    </div>
  );
}
