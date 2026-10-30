import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, Lock, BookOpen, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { SeanceEntree, TypeSeance, StatutSeance, UeCahier, Seance } from '@/api/types';
import { PageHeader, Button, Input, Select, Textarea, Alert, FileUpload } from '@/components/ui';

const TYPES: { valeur: TypeSeance; libelle: string }[] = [
  { valeur: 'CM', libelle: 'Cours Magistral (CM)' },
  { valeur: 'TD', libelle: 'Travaux Dirigés (TD)' },
  { valeur: 'TP', libelle: 'Travaux Pratiques (TP)' },
  { valeur: 'AUTRE', libelle: 'Autre enseignement' },
];

const STATUTS: { valeur: StatutSeance; libelle: string }[] = [
  { valeur: 'tenue', libelle: 'Séance effectivement tenue' },
  { valeur: 'reportee', libelle: 'Séance reportée' },
  { valeur: 'annulee', libelle: 'Séance annulée' },
  { valeur: 'enseignant_absent', libelle: 'Enseignant absent' },
  { valeur: 'planifiee', libelle: 'Planifiée à venir' },
];

function dateAujourdhui(): string {
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
    date: dateAujourdhui(),
    debut: '08:00',
    fin: '10:00',
    type: 'CM',
    statut: 'tenue',
    intitule: '',
    contenu: '',
    travailAFaire: '',
    observations: '',
    groupe: '',
  });

  const [pieceJointe, setPieceJointe] = useState<File | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreurGlobal(null);
    try {
      const uesData = await api.cahierMesUes();
      setUes(uesData);

      if (modeModification && id) {
        const seances = await api.cahierSeances();
        const trouv = seances.find((s) => s.id === Number(id));
        if (!trouv) {
          setErreurGlobal('Séance introuvable dans votre registre.');
          setChargement(false);
          return;
        }
        setSeanceExistante(trouv);
        setForm({
          ueId: trouv.ueId,
          date: trouv.date,
          debut: trouv.debut,
          fin: trouv.fin,
          type: trouv.type,
          groupe: trouv.groupe ?? '',
          statut: trouv.statut,
          intitule: trouv.intitule,
          contenu: trouv.contenu,
          travailAFaire: trouv.travailAFaire ?? '',
          effectif: trouv.effectif,
          observations: trouv.observations ?? '',
        });
      } else if (uesData.length > 0) {
        setForm((f) => ({ ...f, ueId: uesData[0].ueId }));
      }
    } catch (err) {
      if (err instanceof ApiError) setErreurGlobal(err.messages.join(' '));
      else setErreurGlobal('Erreur de communication lors du chargement des UE.');
    } finally {
      setChargement(false);
    }
  }, [id, modeModification]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const estVerrouillee = seanceExistante?.visa.statut === 'vise';

  function update<K extends keyof SeanceEntree>(cle: K, valeur: SeanceEntree[K]) {
    setForm((f) => ({ ...f, [cle]: valeur }));
    setErreurs([]);
  }

  function valider(): string[] {
    const errs: string[] = [];
    if (!form.ueId) errs.push("Sélectionnez l'unité d'enseignement.");
    if (!form.date) errs.push('La date de la séance est obligatoire.');
    if (!form.debut || !form.fin) errs.push('Les heures de début et fin sont obligatoires.');
    if (form.fin <= form.debut) errs.push("L'heure de fin doit être postérieure à l'heure de début.");
    if (!form.intitule?.trim()) errs.push("L'intitulé de la séance est obligatoire.");
    if (!form.contenu?.trim()) errs.push('Le contenu pédagogique traité est obligatoire.');
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (estVerrouillee) return;

    const errs = valider();
    if (errs.length > 0) {
      setErreurs(errs);
      return;
    }

    setEnCours(true);
    setErreurs([]);

    try {
      if (modeModification && id) {
        await api.modifierSeance(Number(id), form);
        if (pieceJointe) {
          try {
            await api.ajouterPieceSeance(Number(id), pieceJointe);
          } catch {
            // Ignorer si échec upload secondaire
          }
        }
        navigate(`/cahier-texte/${id}`, { replace: true });
      } else {
        const nouvelle = await api.creerSeance(form);
        if (pieceJointe && nouvelle.id) {
          try {
            await api.ajouterPieceSeance(nouvelle.id, pieceJointe);
          } catch {
            //
          }
        }
        navigate('/cahier-texte', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) setErreurs(err.messages);
      else setErreurs(["L'enregistrement de la séance a échoué."]);
    } finally {
      setEnCours(false);
    }
  }

  if (chargement) {
    return (
      <div className="py-12 text-center text-enp-gray-medium text-sm">
        Chargement du formulaire officiel…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <Link
        to="/cahier-texte"
        className="inline-flex items-center gap-1.5 text-xs text-enp-blue-primary hover:text-enp-blue-deep font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour au cahier de texte
      </Link>

      <PageHeader
        title={modeModification ? `Modifier la séance #${id}` : 'Renseigner une nouvelle séance'}
        description="Enregistrement officiel délégué au cahier de texte numérique de la promotion"
      />

      {/* Avertissement de verrouillage si visée */}
      {estVerrouillee && (
        <Alert
          variant="warning"
          title="Séance verrouillée après visa officiel"
          icon={<Lock className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />}
        >
          Cette séance a été formellement visée par l'enseignant-chercheur responsable.
          Elle ne peut plus faire l'objet de modifications directes afin d'assurer l'intégrité de l'audit.
        </Alert>
      )}

      {erreurGlobal && (
        <Alert variant="danger" title="Erreur">{erreurGlobal}</Alert>
      )}

      {erreurs.length > 0 && (
        <Alert variant="danger" title="Champs obligatoires manquants">
          <ul className="list-disc list-inside space-y-1">
            {erreurs.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-enp-border p-6 space-y-5" noValidate>
        {/* Unité d'enseignement & Type */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Select
              label="Unité d'Enseignement (UE)"
              required
              disabled={estVerrouillee || modeModification}
              value={form.ueId}
              onChange={(e) => update('ueId', Number(e.target.value))}
            >
              {ues.map((u) => (
                <option key={u.ueId} value={u.ueId}>
                  {u.code} : {u.intitule}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Select
              label="Type d'enseignement"
              required
              disabled={estVerrouillee}
              value={form.type}
              onChange={(e) => update('type', e.target.value as TypeSeance)}
            >
              {TYPES.map((t) => (
                <option key={t.valeur} value={t.valeur}>
                  {t.libelle}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Date, Horaires & Statut */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Date de la séance"
              type="date"
              required
              disabled={estVerrouillee}
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
              startIcon={<Calendar className="w-4 h-4" />}
            />
          </div>

          <div>
            <Input
              label="Heure de début"
              type="time"
              required
              disabled={estVerrouillee}
              value={form.debut}
              onChange={(e) => update('debut', e.target.value)}
              startIcon={<Clock className="w-4 h-4" />}
            />
          </div>

          <div>
            <Input
              label="Heure de fin"
              type="time"
              required
              disabled={estVerrouillee}
              value={form.fin}
              onChange={(e) => update('fin', e.target.value)}
              startIcon={<Clock className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Statut & Groupe */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Select
              label="Statut de la séance"
              required
              disabled={estVerrouillee}
              value={form.statut}
              onChange={(e) => update('statut', e.target.value as StatutSeance)}
            >
              {STATUTS.map((s) => (
                <option key={s.valeur} value={s.valeur}>
                  {s.libelle}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Input
              label="Groupe ou promotion (optionnel)"
              type="text"
              disabled={estVerrouillee}
              value={form.groupe ?? ''}
              onChange={(e) => update('groupe', e.target.value)}
              placeholder="Ex: Groupe 1, TP Binôme B, Promotion entière..."
            />
          </div>
        </div>

        {/* Intitulé & Contenu pédagogique */}
        <Input
          label="Intitulé ou thème du cours"
          type="text"
          required
          disabled={estVerrouillee}
          value={form.intitule}
          onChange={(e) => update('intitule', e.target.value)}
          placeholder="Ex : Chapitre 3 : Dimensionnement des poutres en béton armé"
        />

        <Textarea
          label="Contenu pédagogique détaillé et notions traitées"
          required
          disabled={estVerrouillee}
          value={form.contenu}
          onChange={(e) => update('contenu', e.target.value)}
          rows={4}
          placeholder="Détaillez les chapitres abordés, théorèmes démontrés, exercices corrigés ou manipulations de laboratoire effectuées..."
        />

        {/* Travail à faire & Références */}
        <Textarea
          label="Travail à faire & Préparation pour la prochaine séance"
          disabled={estVerrouillee}
          value={form.travailAFaire ?? ''}
          onChange={(e) => update('travailAFaire', e.target.value)}
          rows={2}
          placeholder="Exercices à préparer, chapitres du polycopié à lire, compte-rendu de TP..."
        />

        <Textarea
          label="Observations ou incidents éventuels (optionnel)"
          disabled={estVerrouillee}
          value={form.observations ?? ''}
          onChange={(e) => update('observations', e.target.value)}
          rows={2}
          placeholder="Remarques sur le matériel de laboratoire, retard, panne de projecteur..."
        />

        {/* Pièce jointe optionnelle (support, photo tableau, énoncé TD) */}
        {!estVerrouillee && (
          <div className="pt-2 border-t border-enp-border">
            <FileUpload
              label="Pièce jointe officielle (PDF, support ou compte-rendu)"
              accept=".pdf,.png,.jpg,.jpeg,.docx"
              selectedFile={pieceJointe}
              onFileSelect={(f) => setPieceJointe(f)}
              onClear={() => setPieceJointe(null)}
              helperText="Formats acceptés : PDF, JPG, PNG, DOCX jusqu'à 2 Mo"
            />
          </div>
        )}

        {/* Actions de validation */}
        <div className="pt-4 border-t border-enp-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Link to="/cahier-texte" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto justify-center">Annuler</Button>
          </Link>

          {!estVerrouillee && (
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto justify-center"
              isLoading={enCours}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {modeModification ? 'Enregistrer les modifications' : 'Consigner la séance'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
