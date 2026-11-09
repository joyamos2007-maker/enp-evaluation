import { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  BookOpen,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type {
  ResultatImportUtilisateurs,
  ResultatImport,
  TypeImport,
} from '@/api/types';

const TAILLE_MAX = 2 * 1024 * 1024; // 2 Mo

// Modèles CSV simples et prêts à l'emploi
const MODELE_COMPTES = `matricule,email,nom,prenom,role,campusId,departmentId
TEST-2026-001,student1@enp.tg,KOUDASSE,Joy,etudiant,1,1
TEST-2026-002,delegue1@enp.tg,CHEF,Lina,delegue,1,1
TEST-2026-003,prof.dupont@enp.tg,DUPONT,Jean,enseignant,1,1
`;

const MODELES_ACADEMIQUES: Record<TypeImport, { label: string; colonnes: string; csv: string }> = {
  ue: {
    label: "Unités d'enseignement (UE)",
    colonnes: 'code, intitule, credits',
    csv: 'code,intitule,credits\nINF501,Algorithmique avancée,4\nMAT502,Probabilités et statistiques,3\n',
  },
  offres: {
    label: 'Offres de cours semestrielles',
    colonnes: 'ueCode, programId, anneeUniversitaire, semestre',
    csv: 'ueCode,programId,anneeUniversitaire,semestre\nINF501,1,2026-2027,5\nMAT502,1,2026-2027,5\n',
  },
  inscriptions: {
    label: 'Inscriptions des étudiants',
    colonnes: 'courseId, matricule',
    csv: 'courseId,matricule\n1,TEST-2026-001\n1,TEST-2026-002\n',
  },
  affectations: {
    label: 'Affectations enseignants',
    colonnes: 'courseId, matricule',
    csv: 'courseId,matricule\n1,TEST-1001\n2,TEST-1002\n',
  },
  delegues: {
    label: 'Mandats des délégués',
    colonnes: 'programId, matricule, anneeUniversitaire, type, debut, fin',
    csv: 'programId,matricule,anneeUniversitaire,type,debut,fin\n1,TEST-0002,2026-2027,titulaire,2026-09-01,2027-06-30\n',
  },
  etudiants: {
    label: 'Référentiel étudiants',
    colonnes: 'matricule, email, nom, prenom',
    csv: 'matricule,email,nom,prenom\nTEST-0001,kodjo.adjei@exemple.test,ADJEI,Kodjo\n',
  },
  enseignants: {
    label: 'Référentiel enseignants',
    colonnes: 'matricule, email, nom, prenom',
    csv: 'matricule,email,nom,prenom\nTEST-1001,mawuli.attiogbe@exemple.test,ATTIOGBE,Mawuli\n',
  },
};

export function ScolariteImports() {
  const [categorie, setCategorie] = useState<'comptes' | 'academique'>('comptes');
  const [typeAcademique, setTypeAcademique] = useState<TypeImport>('ue');
  const [fichier, setFichier] = useState<File | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succesMessage, setSuccesMessage] = useState<string | null>(null);
  const [erreursLignes, setErreursLignes] = useState<{ ligne: number; message: string }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Télécharger le modèle CSV adapté
  function telechargerModele() {
    const contenu =
      categorie === 'comptes'
        ? MODELE_COMPTES
        : MODELES_ACADEMIQUES[typeAcademique].csv;
    const nomFichier =
      categorie === 'comptes'
        ? 'modele-comptes-utilisateurs.csv'
        : `modele-${typeAcademique}.csv`;

    const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier;
    lien.click();
    URL.revokeObjectURL(url);
  }

  // Sélection de fichier
  function handleFile(f: File) {
    setErreur(null);
    setSuccesMessage(null);
    setErreursLignes([]);

    if (!f.name.toLowerCase().endsWith('.csv')) {
      setErreur('Veuillez sélectionner un fichier au format .csv uniquement.');
      return;
    }
    if (f.size > TAILLE_MAX) {
      setErreur('Le fichier est trop volumineux (maximum 2 Mo).');
      return;
    }
    setFichier(f);
  }

  // Traitement du drop
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  // Déclencher l'importation
  async function lancerImport() {
    if (!fichier) return;

    setEnCours(true);
    setErreur(null);
    setSuccesMessage(null);
    setErreursLignes([]);

    try {
      if (categorie === 'comptes') {
        const res: ResultatImportUtilisateurs = await api.scolariteImporterUtilisateurs(fichier);
        if (res.errorCount === 0) {
          setSuccesMessage(
            `Importation réussie ! ${res.successCount} compte(s) créé(s) ou mis à jour.`
          );
        } else {
          setSuccesMessage(
            `${res.successCount} compte(s) créé(s) avec succès. ${res.errorCount} ligne(s) rejetée(s).`
          );
          setErreursLignes(res.errors.map((e) => ({ ligne: e.ligne, message: e.erreur })));
        }
      } else {
        // Données académiques : vérification puis application
        const rapport = await api.scolariteVerifierImport(typeAcademique, fichier);

        if (rapport.lignesValides === 0) {
          setErreur(
            rapport.erreurs[0]?.message ?? 'Aucune ligne valide trouvée dans le fichier.'
          );
          setErreursLignes(rapport.erreurs);
          return;
        }

        const res: ResultatImport = await api.scolariteValiderImport(typeAcademique, rapport.importId);
        setSuccesMessage(
          `Importation réussie : ${res.crees} entrée(s) créée(s), ${res.misAJour} mise(s) à jour.`
        );

        if (rapport.erreurs.length > 0) {
          setErreursLignes(rapport.erreurs);
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErreur(err.messages.join(' '));
      } else {
        setErreur("Une erreur est survenue lors de l'importation du fichier.");
      }
    } finally {
      setEnCours(false);
    }
  }

  // Réinitialiser le formulaire
  function reinitialiser() {
    setFichier(null);
    setErreur(null);
    setSuccesMessage(null);
    setErreursLignes([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* En-tête simple et direct */}
      <div className="border-b border-enp-border pb-4">
        <h1 className="text-xl font-bold text-enp-blue-deep font-sans">
          Importation de fichiers
        </h1>
        <p className="text-xs text-enp-gray-medium mt-1">
          Chargez rapidement vos données via un fichier CSV (séparateur virgule, encodé en UTF-8).
        </p>
      </div>

      {/* Carte principale épurée */}
      <div className="bg-white border border-enp-border p-6 shadow-subtle space-y-6">
        {/* Étape 1 : Choix de la catégorie */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-enp-blue-deep uppercase tracking-wider">
            1. Que souhaitez-vous importer ?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setCategorie('comptes');
                reinitialiser();
              }}
              className={`p-3 text-left border flex items-center gap-3 transition-colors ${
                categorie === 'comptes'
                  ? 'border-enp-blue-primary bg-enp-blue-ice text-enp-blue-deep font-bold'
                  : 'border-enp-border bg-white text-enp-black hover:bg-slate-50'
              }`}
            >
              <Users className="w-5 h-5 text-enp-blue-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold">Comptes utilisateurs</p>
                <p className="text-[11px] text-enp-gray-medium font-normal">Étudiants, profs, etc.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setCategorie('academique');
                reinitialiser();
              }}
              className={`p-3 text-left border flex items-center gap-3 transition-colors ${
                categorie === 'academique'
                  ? 'border-enp-blue-primary bg-enp-blue-ice text-enp-blue-deep font-bold'
                  : 'border-enp-border bg-white text-enp-black hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-5 h-5 text-enp-blue-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold">Données académiques</p>
                <p className="text-[11px] text-enp-gray-medium font-normal">UE, cours, inscriptions...</p>
              </div>
            </button>
          </div>
        </div>

        {/* Sous-choix si données académiques */}
        {categorie === 'academique' && (
          <div className="space-y-1.5 p-3.5 bg-enp-blue-ice/50 border border-enp-border animate-fade-in">
            <label htmlFor="select-type" className="block text-xs font-bold text-enp-blue-deep">
              Type d'élément académique :
            </label>
            <select
              id="select-type"
              value={typeAcademique}
              onChange={(e) => {
                setTypeAcademique(e.target.value as TypeImport);
                reinitialiser();
              }}
              className="w-full text-xs p-2 bg-white border border-enp-border text-enp-black focus:border-enp-blue-primary focus:outline-none"
            >
              {Object.entries(MODELES_ACADEMIQUES).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label} ({info.colonnes})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Étape 2 : Zone de dépôt du fichier */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-enp-blue-deep uppercase tracking-wider">
              2. Fichier CSV
            </label>
            <button
              type="button"
              onClick={telechargerModele}
              className="text-xs text-enp-blue-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger le modèle CSV
            </button>
          </div>

          {fichier ? (
            <div className="p-3.5 bg-enp-blue-ice/60 border border-enp-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-6 h-6 text-enp-blue-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-enp-blue-deep truncate">{fichier.name}</p>
                  <p className="text-[11px] text-enp-gray-medium">
                    {(fichier.size / 1024).toFixed(1)} Ko • Prêt pour import
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={reinitialiser}
                className="text-enp-gray-medium hover:text-enp-red-error p-1 transition-colors"
                title="Retirer le fichier"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-enp-blue-ice/30 ${
                isDragOver ? 'border-enp-blue-primary bg-enp-blue-ice' : 'border-enp-border'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              <Upload className="w-7 h-7 text-enp-gray-medium mx-auto mb-2 opacity-70" />
              <p className="text-xs font-semibold text-enp-blue-deep">
                Glissez votre fichier CSV ici
              </p>
              <p className="text-[11px] text-enp-gray-medium mt-0.5">
                ou <span className="text-enp-blue-primary underline">parcourez votre ordinateur</span>
              </p>
            </div>
          )}
        </div>

        {/* Message d'erreur global */}
        {erreur && (
          <div className="p-3 bg-enp-red-light border-l-4 border-enp-red-error text-xs text-enp-red-error flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{erreur}</p>
          </div>
        )}

        {/* Message de succès */}
        {succesMessage && (
          <div className="p-3 bg-enp-green-light border-l-4 border-enp-green-valid text-xs text-enp-green-valid flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-bold leading-relaxed">{succesMessage}</p>
          </div>
        )}

        {/* Tableau épuré des lignes en erreur si présent */}
        {erreursLignes.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-enp-border">
            <p className="text-xs font-bold text-enp-red-error">
              Lignes rejetées ({erreursLignes.length}) :
            </p>
            <div className="border border-enp-border text-xs max-h-40 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-enp-red-light/60 border-b border-enp-border text-left">
                  <tr>
                    <th className="px-2.5 py-1.5 w-16">Ligne</th>
                    <th className="px-2.5 py-1.5">Problème</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-enp-border">
                  {erreursLignes.map((err, i) => (
                    <tr key={i}>
                      <td className="px-2.5 py-1 font-mono font-bold text-enp-red-error">
                        #{err.ligne}
                      </td>
                      <td className="px-2.5 py-1 text-enp-black">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bouton d'action principal */}
        <div className="pt-2">
          <button
            type="button"
            disabled={!fichier || enCours}
            onClick={() => void lancerImport()}
            className="w-full py-2.5 px-4 bg-enp-blue-primary hover:bg-enp-blue-dark text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {enCours ? (
              <span>Importation en cours…</span>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Importer le fichier</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
