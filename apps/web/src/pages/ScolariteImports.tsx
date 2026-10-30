import { useState } from 'react';
import {
  Upload,
  Download,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  FileText,
  Check,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { RapportImport, ResultatImport, TypeImport } from '@/api/types';
import {
  PageHeader,
  Button,
  Select,
  Alert,
  Stepper,
  FileUpload,
  Badge,
  ConfirmDialog,
  Table,
} from '@/components/ui';

const TYPES_ACADEMIQUES: { valeur: TypeImport; libelle: string; modele: string; description: string }[] = [
  {
    valeur: 'etudiants',
    libelle: 'Comptes & Inscriptions Étudiants',
    modele: 'matricule,email,nom,prenom\nTEST-2026-001,student1@enp.tg,KOUDASSE,Joy\n',
    description: 'Import de masse des effectifs étudiants par promotion.',
  },
  {
    valeur: 'enseignants',
    libelle: 'Corps Enseignant-Chercheur',
    modele: 'matricule,email,nom,prenom\nTEST-2026-002,chef.gc@enp.tg,ATTIPOU,Kodjo\n',
    description: 'Création et mise à jour du corps professoral.',
  },
  {
    valeur: 'ue',
    libelle: 'Catalogue des Unités d’Enseignement (UE)',
    modele: 'code,intitule,credits\nGC-301,Mécanique des Sols,4\n',
    description: 'Référentiel des cours dispensés à l’école.',
  },
  {
    valeur: 'offres',
    libelle: 'Offres de cours & Semestres',
    modele: 'ueCode,programId,anneeUniversitaire,semestre\nGC-301,1,2026-2027,1\n',
    description: 'Affectation des cours aux cursus et semestres académiques.',
  },
  {
    valeur: 'affectations',
    libelle: 'Affectations enseignants aux cours',
    modele: 'courseId,matricule\n1,TEST-2026-002\n',
    description: 'Liaison officielle des enseignants responsables des UE.',
  },
  {
    valeur: 'inscriptions',
    libelle: 'Inscriptions des étudiants aux cours',
    modele: 'courseId,matricule\n1,TEST-2026-001\n',
    description: 'Définition des listes d’appel et corps électoral des évaluations.',
  },
  {
    valeur: 'delegues',
    libelle: 'Mandats des délégués de promotion',
    modele: 'programId,matricule,anneeUniversitaire,type,debut,fin\n1,TEST-2026-001,2026-2027,titulaire,2026-09-01,2027-06-30\n',
    description: 'Attribution des prérogatives de tenue du cahier de texte.',
  },
];

export function ScolariteImports() {
  // Étape du parcours d'import : 0: Sélection, 1: Vérification & Analyse, 2: Prévisualisation & Erreurs, 3: Confirmation & Application, 4: Rapport final
  const [etapeIndex, setEtapeIndex] = useState(0);

  const [typeAcademique, setTypeAcademique] = useState<TypeImport>('etudiants');
  const [fichier, setFichier] = useState<File | null>(null);

  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rapport, setRapport] = useState<RapportImport | null>(null);
  const [resultatFinal, setResultatFinal] = useState<ResultatImport | null>(null);
  const [modaleConfirmation, setModaleConfirmation] = useState(false);

  const typeConfig = TYPES_ACADEMIQUES.find((t) => t.valeur === typeAcademique)!;

  function telechargerModele() {
    const blob = new Blob([typeConfig.modele], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modele-${typeAcademique}-enp.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ÉTAPE 1 -> 2 : Vérification du fichier CSV via /imports/:type/verification
  async function lancerVerification() {
    if (!fichier) return;
    setEnCours(true);
    setErreur(null);
    setRapport(null);

    try {
      const rep = await api.scolariteVerifierImport(typeAcademique, fichier);
      setRapport(rep);
      setEtapeIndex(2); // Passer à la prévisualisation des lignes valides et erreurs
    } catch (err) {
      if (err instanceof ApiError) {
        setErreur(err.messages.join(' '));
      } else {
        setErreur('Format de fichier CSV non conforme ou structure d’en-têtes invalide.');
      }
    } finally {
      setEnCours(false);
    }
  }

  // ÉTAPE 3 -> 4 : Application effective des lignes valides via /imports/:type/valider
  async function appliquerImport() {
    if (!rapport) return;
    setEnCours(true);
    setErreur(null);

    try {
      const res = await api.scolariteValiderImport(typeAcademique, rapport.importId);
      setResultatFinal(res);
      setModaleConfirmation(false);
      setEtapeIndex(4); // Rapport final
    } catch (err) {
      if (err instanceof ApiError) {
        setErreur(err.messages.join(' '));
      } else {
        setErreur("Erreur lors de l'application définitive des données en base.");
      }
    } finally {
      setEnCours(false);
    }
  }

  function reinitialiser() {
    setFichier(null);
    setRapport(null);
    setResultatFinal(null);
    setErreur(null);
    setEtapeIndex(0);
  }

  const steps = [
    { id: 'selection', title: '1. Sélection du fichier', subtitle: 'Type et fichier CSV' },
    { id: 'verification', title: '2. Vérification format', subtitle: 'Validation serveur' },
    { id: 'previsu', title: '3. Prévisualisation', subtitle: 'Lignes valides & erreurs' },
    { id: 'confirmation', title: '4. Confirmation', subtitle: 'Application en base' },
    { id: 'rapport', title: '5. Rapport final', subtitle: 'Bilan de synchronisation' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <PageHeader
        title="Imports & Synchronisation des Référentiels CSV"
        description="Parcours officiel sécurisé d'intégration des données académiques et comptes de l'ENP"
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Scolarité', href: '/scolarite' },
          { label: 'Imports CSV' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto justify-center text-center"
            onClick={telechargerModele}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Télécharger le modèle CSV officiel
          </Button>
        }
      />

      {/* Stepper officiel du parcours */}
      <Stepper steps={steps} currentStepIndex={etapeIndex} />

      {erreur && (
        <Alert variant="danger" title="Anomalie lors du traitement CSV">
          {erreur}
        </Alert>
      )}

      {/* ======================================================== */}
      {/* ÉTAPE 0 & 1 : SÉLECTION DU TYPE ET DU FICHIER CSV       */}
      {/* ======================================================== */}
      {etapeIndex <= 1 && (
        <div className="bg-white border border-enp-border p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Select
                label="Nature du référentiel à importer"
                value={typeAcademique}
                onChange={(e) => {
                  setTypeAcademique(e.target.value as TypeImport);
                  setFichier(null);
                  setErreur(null);
                }}
              >
                {TYPES_ACADEMIQUES.map((t) => (
                  <option key={t.valeur} value={t.valeur}>
                    {t.libelle}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-enp-gray-dark mb-1.5">
                Spécification
              </span>
              <p className="text-xs text-enp-gray-medium pt-2">{typeConfig.description}</p>
            </div>
          </div>

          <FileUpload
            label="Fichier CSV institutionnel (encodage UTF-8 obligatoire)"
            accept=".csv"
            selectedFile={fichier}
            onFileSelect={(f) => {
              setFichier(f);
              setErreur(null);
            }}
            onClear={() => setFichier(null)}
            helperText="Taille maximale : 2 Mo • Séparateur : virgule (,)"
          />

          <div className="pt-4 border-t border-enp-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <span className="text-xs text-enp-gray-medium text-center sm:text-left">
              Vérification stricte sans altération préalable de la base de données.
            </span>
            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-auto justify-center"
              disabled={!fichier}
              isLoading={enCours}
              onClick={() => void lancerVerification()}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Vérifier le fichier & Prévisualiser
            </Button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ÉTAPE 2 : PRÉVISUALISATION, LIGNES VALIDES & ERREURS     */}
      {/* ======================================================== */}
      {etapeIndex === 2 && rapport && (
        <div className="bg-white border border-enp-border p-6 space-y-6 animate-fade-in">
          <div className="border-b border-enp-border pb-4">
            <h2 className="text-base font-bold text-enp-blue-deep">
              Rapport d'analyse du fichier : {fichier?.name}
            </h2>
            <p className="text-xs text-enp-gray-medium mt-0.5">
              Identifiant d'analyse : <span className="font-mono">{rapport.importId}</span> • Taille : {((fichier?.size ?? 0) / 1024).toFixed(1)} Ko
            </p>
          </div>

          {/* Synthèse chiffrée des lignes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-enp-blue-ice/50 border border-enp-border">
              <span className="text-xs uppercase font-semibold text-enp-gray-medium block">
                Total des lignes analysées
              </span>
              <strong className="text-2xl font-bold text-enp-black">
                {rapport.lignesTotal}
              </strong>
            </div>

            <div className="p-4 bg-enp-green-light border border-enp-green-valid/30">
              <span className="text-xs uppercase font-semibold text-enp-green-valid block">
                Lignes valides prêtes à être intégrées
              </span>
              <strong className="text-2xl font-bold text-enp-green-valid">
                {rapport.lignesValides}
              </strong>
            </div>

            <div className="p-4 bg-enp-red-light border border-enp-red-error/30">
              <span className="text-xs uppercase font-semibold text-enp-red-error block">
                Lignes rejetées (avec anomalies)
              </span>
              <strong className="text-2xl font-bold text-enp-red-error">
                {rapport.erreurs.length}
              </strong>
            </div>
          </div>

          {/* Tableau détaillé des erreurs ligne par ligne (Ne jamais masquer silencieusement les erreurs) */}
          {rapport.erreurs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-enp-red-error font-bold text-xs uppercase tracking-wider">
                <AlertCircle className="w-4 h-4" />
                <span>Détail exhaustif des anomalies détectées ({rapport.erreurs.length}) :</span>
              </div>

              <div className="border border-enp-border max-h-60 overflow-y-auto scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#FAF0F0] text-enp-red-error font-bold border-b border-enp-border sticky top-0">
                    <tr>
                      <th className="p-2.5 w-24">Ligne CSV</th>
                      <th className="p-2.5 w-36">Colonne</th>
                      <th className="p-2.5">Motif du rejet / Règle enfreinte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-enp-border bg-white">
                    {rapport.erreurs.map((err, i) => (
                      <tr key={i} className="hover:bg-red-50/50">
                        <td className="p-2.5 font-mono font-bold text-enp-red-error">
                          Ligne {err.ligne}
                        </td>
                        <td className="p-2.5 font-mono text-enp-gray-dark">
                          {err.colonne || 'Général'}
                        </td>
                        <td className="p-2.5 text-enp-black leading-snug">
                          {err.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rapport.lignesValides === 0 && (
            <Alert variant="danger" title="Intégration impossible">
              Le fichier ne contient aucune ligne valide. Corrigez les anomalies indiquées dans le fichier source puis téléversez-le à nouveau.
            </Alert>
          )}

          <div className="pt-4 border-t border-enp-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Button
              variant="outline"
              size="md"
              className="w-full sm:w-auto justify-center"
              onClick={reinitialiser}
            >
              Annuler et choisir un autre fichier
            </Button>

            {rapport.lignesValides > 0 && (
              <Button
                variant="primary"
                size="md"
                className="w-full sm:w-auto justify-center"
                onClick={() => setModaleConfirmation(true)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Confirmer l'application ({rapport.lignesValides} ligne(s))
              </Button>
            )}
          </div>

          {/* Dialogue de confirmation solennelle avant application en base */}
          <ConfirmDialog
            isOpen={modaleConfirmation}
            onClose={() => setModaleConfirmation(false)}
            onConfirm={() => void appliquerImport()}
            title="Confirmer l'application de l'import"
            message={`Êtes-vous certain de vouloir appliquer les ${rapport.lignesValides} ligne(s) valides dans la base académique de l'ENP ? Cette opération modifiera les référentiels officiels.`}
            confirmLabel="Appliquer définitivement"
            variant="primary"
            isLoading={enCours}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* ÉTAPE 4 : RAPPORT FINAL D'APPLICATION                   */}
      {/* ======================================================== */}
      {etapeIndex === 4 && resultatFinal && (
        <div className="bg-white border border-enp-border p-8 space-y-6 text-center animate-fade-in">
          <div className="w-16 h-16 bg-enp-green-light border border-enp-green-valid mx-auto flex items-center justify-center text-enp-green-valid">
            <CheckCircle2 className="w-10 h-10 stroke-[2]" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-enp-green-valid">
              Opération terminée
            </span>
            <h2 className="text-2xl font-bold font-serif text-enp-blue-deep">
              Référentiel synchronisé avec succès
            </h2>
            <p className="text-xs sm:text-sm text-enp-gray-medium max-w-md mx-auto leading-relaxed">
              Les enregistrements ont été validés et intégrés au registre officiel de l'École Nationale Polytechnique.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
            <div className="p-3 bg-enp-blue-ice/50 border border-enp-border">
              <span className="text-xs text-enp-gray-medium block">Entités créées :</span>
              <strong className="text-xl font-bold text-enp-blue-deep">
                {resultatFinal.crees}
              </strong>
            </div>
            <div className="p-3 bg-enp-blue-ice/50 border border-enp-border">
              <span className="text-xs text-enp-gray-medium block">Entités mises à jour :</span>
              <strong className="text-xl font-bold text-enp-green-valid">
                {resultatFinal.misAJour}
              </strong>
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <Button variant="primary" size="md" onClick={reinitialiser}>
              Effectuer un autre import
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
