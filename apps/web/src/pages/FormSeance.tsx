import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { api, ApiError } from '@/api';
import type {
  SeanceEntree,
  TypeSeance,
  StatutSeance,
  UeCahier,
  Seance,
} from '@/api/types';
import { PageHeader, Button, Alert } from '@/components/ui';

const TYPES: { valeur: TypeSeance; libelle: string }[] = [
  { valeur: 'CM', libelle: 'CM (Cours)' },
  { valeur: 'TD', libelle: 'TD' },
  { valeur: 'TP', libelle: 'TP' },
  { valeur: 'AUTRE', libelle: 'Autre' },
];

const STATUTS: { valeur: StatutSeance; libelle: string }[] = [
  { valeur: 'tenue', libelle: 'Tenue' },
  { valeur: 'reportee', libelle: 'Reportée' },
  { valeur: 'annulee', libelle: 'Annulée' },
  { valeur: 'enseignant_absent', libelle: 'Enseignant absent' },
  { valeur: 'planifiee', libelle: 'Planifiée' },
];

const CRENEAUX_RAPIDES: { label: string; debut: string; fin: string }[] = [
  { label: '08h - 10h', debut: '08:00', fin: '10:00' },
  { label: '10h - 12h', debut: '10:00', fin: '12:00' },
  { label: '14h - 16h', debut: '14:00', fin: '16:00' },
  { label: '16h - 18h', debut: '16:00', fin: '18:00' },
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
  const [afficherOptions, setAfficherOptions] = useState(false);

  const [form, setForm] = useState<SeanceEntree>({
    ueId: 0,
    date: aujourdISO(),
    debut: '08:00',
    fin: '10:00',
    type: 'CM',
    statut: 'tenue',
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
          setErreurGlobal('Séance introuvable.');
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
        if (seance.groupe || seance.travailAFaire || seance.effectif || seance.observations) {
          setAfficherOptions(true);
        }
      } else if (uesData.length > 0) {
        setForm((f) => ({ ...f, ueId: uesData[0].ueId }));
      }
    } catch (err) {
      if (err instanceof ApiError) setErreurGlobal(err.messages.join(' '));
      else setErreurGlobal('Erreur réseau.');
    } finally {
      setChargement(false);
    }
  }, [id, modeModification]);

  useEffect(() => {
    void charger();
  }, [charger]);

  function update<K extends keyof SeanceEntree>(cle: K, valeur: SeanceEntree[K]) {
    setForm((f) => ({ ...f, [cle]: valeur }));
    setErreurs([]);
  }

  function valider(): string[] {
    const errs: string[] = [];
    if (!form.ueId) errs.push("L'UE est obligatoire.");
    if (!form.date) errs.push('La date est obligatoire.');
    if (form.statut === 'planifiee' && form.date <= aujourdISO()) {
      errs.push('Une séance planifiée doit avoir une date future.');
    } else if (form.statut !== 'planifiee' && form.date > aujourdISO()) {
      errs.push('La date ne peut pas être dans le futur.');
    }
    if (!form.debut) errs.push("L'heure de début est obligatoire.");
    if (!form.fin) errs.push("L'heure de fin est obligatoire.");
    if (form.debut && form.fin && form.fin <= form.debut) {
      errs.push("L'heure de fin doit être postérieure à l'heure de début.");
    }
    if (form.statut === 'tenue') {
      if (!form.intitule?.trim()) {
        errs.push("L'intitulé est obligatoire pour une séance tenue.");
      }
      if (!form.contenu?.trim()) {
        errs.push('Le contenu est obligatoire pour une séance tenue.');
      }
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
      if (err instanceof ApiError) setErreurGlobal(err.messages.join(' '));
      else setErreurGlobal("Erreur réseau : impossible d'enregistrer la séance.");
    } finally {
      setEnCours(false);
    }
  }

  if (chargement) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-sm text-enp-gray-medium">
        Chargement du formulaire de séance…
      </div>
    );
  }

  const enLectureSeule = seanceExistante ? !seanceExistante.modifiable : false;
  const seanceNonTenue =
    form.statut === 'annulee' ||
    form.statut === 'reportee' ||
    form.statut === 'enseignant_absent';

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fade-in pb-6">
      <Link
        to="/cahier-texte"
        className="inline-flex items-center gap-1.5 text-xs text-enp-blue-primary hover:text-enp-blue-deep font-semibold"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Retour au cahier de texte
      </Link>

      <PageHeader
        title={modeModification ? 'Modifier la séance' : 'Renseigner une séance'}
        description="Enregistrez les informations essentielles du cours en quelques clics."
      />

      {enLectureSeule && (
        <Alert variant="institutional" title="Séance visée : modification verrouillée">
          Cette séance a déjà été visée par l'enseignant. Les champs sont en lecture seule.
        </Alert>
      )}

      {erreurGlobal && (
        <Alert variant="danger" title="Erreur">
          {erreurGlobal}
        </Alert>
      )}

      {erreurs.length > 0 && (
        <Alert variant="danger" title="Veuillez vérifier les champs suivants">
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            {erreurs.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-enp-border p-5 sm:p-6 space-y-5 shadow-xs" noValidate>
        {/* 1. UNITÉ D'ENSEIGNEMENT */}
        <div className="space-y-2">
          <label htmlFor="ue" className="block text-xs font-bold uppercase tracking-wider text-enp-blue-deep">
            1. Unité d'enseignement (UE)
          </label>
          <select
            id="ue"
            required
            value={form.ueId}
            onChange={(e) => update('ueId', Number(e.target.value))}
            disabled={enLectureSeule || enCours}
            className="w-full border border-enp-border px-3 py-2.5 text-sm font-semibold text-enp-black bg-white focus:border-enp-blue-primary outline-none min-h-[42px] disabled:bg-enp-bg"
          >
            {ues.map((u) => (
              <option key={u.ueId} value={u.ueId}>
                {u.code} : {u.intitule}
              </option>
            ))}
          </select>
        </div>

        {/* 2. TYPE & STATUT EN BOUTONS 1-CLIC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-enp-border">
          <div className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-enp-blue-deep">
              2. Format de séance
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {TYPES.map((t) => {
                const actif = form.type === t.valeur;
                return (
                  <button
                    key={t.valeur}
                    type="button"
                    disabled={enLectureSeule || enCours}
                    onClick={() => update('type', t.valeur)}
                    className={`py-2 px-2 text-xs font-bold border transition-colors ${
                      actif
                        ? 'bg-enp-blue-deep text-white border-enp-blue-deep'
                        : 'bg-white text-enp-black border-enp-border hover:bg-enp-blue-ice/40'
                    }`}
                  >
                    {t.libelle}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="statut" className="block text-xs font-bold uppercase tracking-wider text-enp-blue-deep">
              Statut de la séance
            </label>
            <select
              id="statut"
              value={form.statut}
              onChange={(e) => update('statut', e.target.value as StatutSeance)}
              disabled={enLectureSeule || enCours}
              className="w-full border border-enp-border px-3 py-2 text-sm font-semibold text-enp-black bg-white focus:border-enp-blue-primary outline-none min-h-[38px] disabled:bg-enp-bg"
            >
              {STATUTS.map((s) => (
                <option key={s.valeur} value={s.valeur}>
                  {s.libelle}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. DATE & CRÉNEAU HORAIRE RAPIDE */}
        <div className="space-y-3 pt-2 border-t border-enp-border">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep">
              3. Date & Créneau horaire
            </span>
            {!enLectureSeule && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-enp-blue-primary" />
                {CRENEAUX_RAPIDES.map((c) => {
                  const actif = form.debut === c.debut && form.fin === c.fin;
                  return (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => {
                        update('debut', c.debut);
                        update('fin', c.fin);
                      }}
                      className={`text-[11px] font-bold px-2 py-1 border transition-colors ${
                        actif
                          ? 'bg-enp-blue-primary text-white border-enp-blue-primary'
                          : 'bg-enp-bg text-enp-blue-deep border-enp-border hover:border-enp-blue-primary'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="date" className="block text-xs font-semibold text-enp-gray-dark mb-1">
                Date
              </label>
              <input
                id="date"
                type="date"
                required
                min={form.statut === 'planifiee' ? aujourdISO() : undefined}
                max={form.statut === 'planifiee' ? undefined : aujourdISO()}
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                disabled={enLectureSeule || enCours}
                className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white focus:border-enp-blue-primary outline-none min-h-[40px] disabled:bg-enp-bg"
              />
            </div>
            <div>
              <label htmlFor="debut" className="block text-xs font-semibold text-enp-gray-dark mb-1">
                Heure de début
              </label>
              <input
                id="debut"
                type="time"
                required
                value={form.debut}
                onChange={(e) => update('debut', e.target.value)}
                disabled={enLectureSeule || enCours}
                className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white focus:border-enp-blue-primary outline-none min-h-[40px] disabled:bg-enp-bg"
              />
            </div>
            <div>
              <label htmlFor="fin" className="block text-xs font-semibold text-enp-gray-dark mb-1">
                Heure de fin
              </label>
              <input
                id="fin"
                type="time"
                required
                value={form.fin}
                onChange={(e) => update('fin', e.target.value)}
                disabled={enLectureSeule || enCours}
                className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white focus:border-enp-blue-primary outline-none min-h-[40px] disabled:bg-enp-bg"
              />
            </div>
          </div>
        </div>

        {/* 4. CONTENU DE LA SÉANCE (ADAPTATIF SELON LE STATUT) */}
        <div className="space-y-4 pt-2 border-t border-enp-border">
          <div>
            <label htmlFor="intitule" className="block text-xs font-bold uppercase tracking-wider text-enp-blue-deep mb-1">
              4. Intitulé du chapitre ou de la séance
              {form.statut === 'tenue' ? ' (obligatoire)' : ' (facultatif)'}
            </label>
            <input
              id="intitule"
              type="text"
              placeholder="Ex. Chapitre 3 : Équilibre des structures isostatiques"
              value={form.intitule ?? ''}
              onChange={(e) => update('intitule', e.target.value || undefined)}
              disabled={enLectureSeule || enCours}
              className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white focus:border-enp-blue-primary outline-none min-h-[40px] disabled:bg-enp-bg"
            />
          </div>

          {!seanceNonTenue ? (
            <div>
              <label htmlFor="contenu" className="block text-xs font-bold uppercase tracking-wider text-enp-blue-deep mb-1">
                Points abordés en séance{form.statut === 'tenue' ? ' (obligatoire)' : ''}
              </label>
              <textarea
                id="contenu"
                rows={3}
                placeholder="Résumez les notions traitées, exercices corrigés ou manipulations effectuées..."
                value={form.contenu ?? ''}
                onChange={(e) => update('contenu', e.target.value || undefined)}
                disabled={enLectureSeule || enCours}
                className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white focus:border-enp-blue-primary outline-none resize-y disabled:bg-enp-bg"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="observations-motif" className="block text-xs font-bold uppercase tracking-wider text-enp-blue-deep mb-1">
                Motif du report / de l'absence (facultatif)
              </label>
              <textarea
                id="observations-motif"
                rows={2}
                placeholder="Précisez le motif ou la date de rattrapage envisagée..."
                value={form.observations ?? ''}
                onChange={(e) => update('observations', e.target.value || undefined)}
                disabled={enLectureSeule || enCours}
                className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white focus:border-enp-blue-primary outline-none resize-y disabled:bg-enp-bg"
              />
            </div>
          )}
        </div>

        {/* 5. DÉTAILS COMPLÉMENTAIRES FACULTATIFS (ACCORDÉON LÉGER) */}
        {!seanceNonTenue && (
          <div className="pt-2 border-t border-enp-border">
            <button
              type="button"
              onClick={() => setAfficherOptions((v) => !v)}
              className="w-full flex items-center justify-between py-1.5 text-xs font-bold text-enp-blue-primary hover:text-enp-blue-deep"
            >
              <span>
                Options complémentaires (Travail à faire, Groupe, Effectif présent, Observations)
              </span>
              {afficherOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {afficherOptions && (
              <div className="mt-3 p-4 bg-enp-bg border border-enp-border space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="groupe" className="block text-xs font-semibold text-enp-black mb-1">
                      Groupe de TD/TP (facultatif)
                    </label>
                    <input
                      id="groupe"
                      type="text"
                      placeholder="Ex. Groupe A"
                      value={form.groupe ?? ''}
                      onChange={(e) => update('groupe', e.target.value || undefined)}
                      disabled={enLectureSeule || enCours}
                      className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white outline-none min-h-[38px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="effectif" className="block text-xs font-semibold text-enp-black mb-1">
                      Effectif présent (facultatif)
                    </label>
                    <input
                      id="effectif"
                      type="number"
                      min={0}
                      placeholder="Ex. 42"
                      value={form.effectif ?? ''}
                      onChange={(e) =>
                        update('effectif', e.target.value ? Number(e.target.value) : undefined)
                      }
                      disabled={enLectureSeule || enCours}
                      className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white outline-none min-h-[38px]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="travail" className="block text-xs font-semibold text-enp-black mb-1">
                    Travail à faire pour la prochaine séance (facultatif)
                  </label>
                  <textarea
                    id="travail"
                    rows={2}
                    placeholder="Exercices, lectures ou préparation de TP..."
                    value={form.travailAFaire ?? ''}
                    onChange={(e) => update('travailAFaire', e.target.value || undefined)}
                    disabled={enLectureSeule || enCours}
                    className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white outline-none resize-y"
                  />
                </div>

                <div>
                  <label htmlFor="observations" className="block text-xs font-semibold text-enp-black mb-1">
                    Observations particulières (facultatif)
                  </label>
                  <textarea
                    id="observations"
                    rows={2}
                    value={form.observations ?? ''}
                    onChange={(e) => update('observations', e.target.value || undefined)}
                    disabled={enLectureSeule || enCours}
                    className="w-full border border-enp-border px-3 py-2 text-sm text-enp-black bg-white outline-none resize-y"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {!enLectureSeule && (
          <div className="pt-3 border-t border-enp-border flex items-center justify-end gap-3">
            <Link to="/cahier-texte">
              <Button type="button" variant="outline" size="md">
                Annuler
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={enCours}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {modeModification ? 'Enregistrer les modifications' : 'Enregistrer la séance'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
