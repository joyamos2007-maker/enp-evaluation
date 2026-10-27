import { useState } from 'react';
import { AlertCircle, Download, FileCheck, Upload } from 'lucide-react';
import { api, ApiError } from '@/api';
import type {
  RapportImport,
  ResultatImport,
  ResultatImportUtilisateurs,
  TypeImport,
} from '@/api/types';
import { InfoCard } from '@/components/InfoCard';

const TAILLE_MAX = 2 * 1024 * 1024;
const MODELE_CSV = 'matricule,email,nom,prenom,role,campusId,departmentId\n';
const TYPES_ACADEMIQUES: { valeur: TypeImport; libelle: string; modele: string }[] = [
  { valeur: 'etudiants', libelle: 'Étudiants', modele: 'matricule,email,nom,prenom\n' },
  { valeur: 'enseignants', libelle: 'Enseignants', modele: 'matricule,email,nom,prenom\n' },
  { valeur: 'ue', libelle: 'Unités d’enseignement', modele: 'code,intitule,credits\n' },
  { valeur: 'offres', libelle: 'Offres de cours', modele: 'ueCode,programId,anneeUniversitaire,semestre\n' },
  { valeur: 'affectations', libelle: 'Affectations enseignants', modele: 'courseId,matricule\n' },
  { valeur: 'inscriptions', libelle: 'Inscriptions aux cours', modele: 'courseId,matricule\n' },
  { valeur: 'delegues', libelle: 'Mandats des délégués', modele: 'programId,matricule,anneeUniversitaire,type,debut,fin\n' },
];

export function ScolariteImports() {
  const [fichier, setFichier] = useState<File | null>(null);
  const [resultat, setResultat] = useState<ResultatImportUtilisateurs | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [typeAcademique, setTypeAcademique] = useState<TypeImport>('offres');
  const [fichierAcademique, setFichierAcademique] = useState<File | null>(null);
  const [rapport, setRapport] = useState<RapportImport | null>(null);
  const [resultatAcademique, setResultatAcademique] = useState<ResultatImport | null>(null);

  function telechargerModele() {
    const blob = new Blob([MODELE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'modele-comptes-utilisateurs.csv';
    lien.click();
    URL.revokeObjectURL(url);
  }

  function choisirFichier(event: React.ChangeEvent<HTMLInputElement>) {
    const selection = event.target.files?.[0];
    setResultat(null);
    setErreur(null);
    if (!selection) {
      setFichier(null);
      return;
    }
    if (!selection.name.toLowerCase().endsWith('.csv')) {
      setFichier(null);
      setErreur('Le fichier doit avoir l’extension .csv.');
      return;
    }
    if (selection.size > TAILLE_MAX) {
      setFichier(null);
      setErreur('Le fichier dépasse la taille maximale de 2 Mo.');
      return;
    }
    setFichier(selection);
  }

  async function importer() {
    if (!fichier) return;
    if (!window.confirm(
      'L’import écrit immédiatement les comptes dans la base. Vérifie le fichier et confirme pour continuer.',
    )) return;

    setEnCours(true);
    setErreur(null);
    setResultat(null);
    try {
      setResultat(await api.scolariteImporterUtilisateurs(fichier));
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur réseau lors de l’import.');
    } finally {
      setEnCours(false);
    }
  }

  async function verifierImportAcademique() {
    if (!fichierAcademique) return;
    setEnCours(true);
    setErreur(null);
    setRapport(null);
    setResultatAcademique(null);
    try {
      setRapport(await api.scolariteVerifierImport(typeAcademique, fichierAcademique));
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Erreur réseau lors de la vérification.');
    } finally {
      setEnCours(false);
    }
  }

  async function appliquerImportAcademique() {
    if (!rapport) return;
    if (!window.confirm(
      `Appliquer ${rapport.lignesValides} ligne(s) valide(s) ? Les erreurs seront ignorées.`,
    )) return;
    setEnCours(true);
    setErreur(null);
    try {
      setResultatAcademique(await api.scolariteValiderImport(typeAcademique, rapport.importId));
      setRapport(null);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Erreur réseau lors de l’application.');
    } finally {
      setEnCours(false);
    }
  }

  function telechargerModeleAcademique() {
    const modele = TYPES_ACADEMIQUES.find((item) => item.valeur === typeAcademique)?.modele ?? '';
    const blob = new Blob([modele], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `modele-${typeAcademique}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Imports de comptes</h1>
        <p className="mt-1 text-sm text-enp-ink-soft">
          Importez les comptes utilisateur pris en charge par l’API.
        </p>
      </div>

      <InfoCard titre="Format pris en charge">
        <p>
          Cette route importe les utilisateurs et leurs rôles. Le CSV doit contenir, dans cet ordre,
          les colonnes <code>matricule,email,nom,prenom,role</code>. Les colonnes
          {' '}<code>campusId</code> et <code>departmentId</code> sont facultatives, mais requises
          respectivement pour créer un Service Scolarité ou rattacher un Chef de département.
          Rôles possibles :
          {' '}<code>etudiant</code>, <code>delegue</code>, <code>enseignant</code>,
          {' '}<code>chef_departement</code>, <code>scolarite</code>, <code>direction_etudes</code>
          {' '}ou <code>admin</code>. Le Service Scolarité reste limité à son campus et ne peut importer
          que des étudiants, délégués et enseignants. L’import est appliqué immédiatement, ligne
          par ligne; les lignes en erreur sont signalées.
        </p>
      </InfoCard>

      <button
        type="button"
        onClick={telechargerModele}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-enp-border bg-white px-4 py-2.5 text-sm font-medium text-enp-ink transition-colors hover:bg-enp-sky"
      >
        <Download size={18} aria-hidden="true" /> Télécharger le modèle CSV
      </button>

      <div className="space-y-2">
        <label htmlFor="fichier-comptes" className="block text-sm font-medium text-enp-ink">
          Fichier CSV (UTF-8, 2 Mo maximum)
        </label>
        <input
          id="fichier-comptes"
          type="file"
          accept=".csv,text/csv"
          onChange={choisirFichier}
          className="block min-h-[44px] w-full text-sm text-enp-ink file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-enp-primary file:px-4 file:py-2.5 file:font-medium file:text-white"
        />
        {fichier && <p className="text-xs text-enp-ink-soft">{fichier.name} ({Math.ceil(fichier.size / 1024)} Ko)</p>}
      </div>

      {erreur && (
        <div className="flex items-start gap-2 rounded-lg border border-enp-bordeaux/15 bg-enp-bordeaux-light p-4 text-enp-bordeaux" role="alert">
          <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{erreur}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => void importer()}
        disabled={!fichier || enCours}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-enp-primary px-5 py-3 font-semibold text-white transition-all hover:bg-enp-primary-dark disabled:opacity-60"
      >
        {enCours ? <Upload size={20} className="animate-pulse" aria-hidden="true" /> : <FileCheck size={20} aria-hidden="true" />}
        {enCours ? 'Import en cours…' : 'Importer les comptes'}
      </button>

      {resultat && (
        <section className="space-y-3 rounded-xl border border-enp-border bg-white p-4 shadow-card" aria-live="polite">
          <h2 className="font-semibold text-enp-ink">Résultat de l’import</h2>
          <p className="text-sm text-enp-ink-soft">
            {resultat.successCount} ligne(s) importée(s) sur {resultat.totalRows} ;
            {' '}{resultat.errorCount} erreur(s).
          </p>
          {resultat.errors.length > 0 && (
            <ul className="space-y-1 text-sm text-enp-bordeaux">
              {resultat.errors.map((item, index) => (
                <li key={`${item.ligne}-${index}`}>Ligne {item.ligne} : {item.erreur}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-5 border-t border-enp-border pt-6">
        <div>
          <h2 className="text-xl font-bold text-enp-ink">Imports académiques</h2>
          <p className="mt-1 text-sm text-enp-ink-soft">
            Vérifiez les références et les erreurs avant de confirmer l’écriture. Les lignes invalides ne seront pas appliquées.
          </p>
        </div>
        <label htmlFor="type-import" className="block text-sm font-medium text-enp-ink">
          Type de données
        </label>
        <select
          id="type-import"
          value={typeAcademique}
          onChange={(event) => {
            setTypeAcademique(event.target.value as TypeImport);
            setRapport(null);
            setResultatAcademique(null);
          }}
          className="min-h-[44px] rounded-md border border-enp-border bg-white px-3"
        >
          {TYPES_ACADEMIQUES.map((type) => (
            <option key={type.valeur} value={type.valeur}>{type.libelle}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={telechargerModeleAcademique}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-enp-border bg-white px-4 py-2.5 text-sm font-medium text-enp-ink"
        >
          <Download size={18} aria-hidden="true" /> Télécharger le modèle correspondant
        </button>
        <label htmlFor="fichier-academique" className="block text-sm font-medium text-enp-ink">
          Fichier CSV (UTF-8, 2 Mo maximum)
        </label>
        <input
          id="fichier-academique"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const selection = event.target.files?.[0] ?? null;
            setRapport(null);
            setResultatAcademique(null);
            if (selection && (!selection.name.toLowerCase().endsWith('.csv') || selection.size > TAILLE_MAX)) {
              setFichierAcademique(null);
              setErreur('Le fichier doit être un CSV de 2 Mo maximum.');
              return;
            }
            setFichierAcademique(selection);
            setErreur(null);
          }}
          className="block min-h-[44px] w-full text-sm text-enp-ink file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-enp-primary file:px-4 file:py-2.5 file:font-medium file:text-white"
        />
        <button
          type="button"
          onClick={() => void verifierImportAcademique()}
          disabled={!fichierAcademique || enCours}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-enp-primary px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          <FileCheck size={18} aria-hidden="true" />
          {enCours ? 'Vérification…' : 'Vérifier l’import'}
        </button>
        {rapport && (
          <div className="space-y-3 rounded-xl border border-enp-border bg-white p-4" aria-live="polite">
            <h3 className="font-semibold">Rapport de vérification</h3>
            <p className="text-sm text-enp-ink-soft">
              {rapport.lignesValides} ligne(s) valide(s) sur {rapport.lignesTotal}.
            </p>
            {rapport.erreurs.length > 0 && (
              <ul className="space-y-1 text-sm text-enp-bordeaux">
                {rapport.erreurs.map((item, index) => (
                  <li key={`${item.ligne}-${index}`}>Ligne {item.ligne} : {item.message}</li>
                ))}
              </ul>
            )}
            <button
              type="button"
              disabled={enCours || rapport.lignesValides === 0}
              onClick={() => void appliquerImportAcademique()}
              className="min-h-[44px] rounded-md bg-enp-teal px-4 py-2.5 font-semibold text-white disabled:opacity-60"
            >
              Confirmer et appliquer
            </button>
          </div>
        )}
        {resultatAcademique && (
          <p className="text-sm text-enp-teal" role="status">
            Import appliqué : {resultatAcademique.crees} création(s), {resultatAcademique.misAJour} mise(s) à jour.
          </p>
        )}
      </section>
    </div>
  );
}
