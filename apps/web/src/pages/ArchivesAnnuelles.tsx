import { useEffect, useState } from 'react';
import {
  Archive,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  RefreshCw,
  FileJson,
  Eye,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { ArchiveAnnuelle } from '@/api/types';
import {
  PageHeader,
  SectionHeader,
  Button,
  Input,
  Alert,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Modal,
  ConfirmDialog,
} from '@/components/ui';

function anneeUniversitaireCourante(): string {
  const date = new Date();
  const debut = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  return `${debut}-${debut + 1}`;
}

export function ArchivesAnnuelles() {
  const [annee, setAnnee] = useState(anneeUniversitaireCourante());
  const [archives, setArchives] = useState<ArchiveAnnuelle[]>([]);
  const [archiveSelectionnee, setArchiveSelectionnee] = useState<ArchiveAnnuelle | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [confirmArchivage, setConfirmArchivage] = useState(false);

  async function charger() {
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.archivesAnnuelles();
      setArchives(data);
    } catch (cause) {
      setErreur(
        cause instanceof ApiError ? cause.messages.join(' ') : 'Impossible de charger les archives.'
      );
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    void charger();
  }, []);

  async function creerArchive() {
    setEnCours(true);
    setErreur(null);
    setMessage(null);
    try {
      await api.creerArchiveAnnuelle(annee);
      setMessage(`L’archive académique immuable pour l’année universitaire ${annee} a été scellée avec succès.`);
      setConfirmArchivage(false);
      await charger();
    } catch (cause) {
      setErreur(
        cause instanceof ApiError ? cause.messages.join(' ') : 'Erreur lors de la création du snapshot annuel.'
      );
    } finally {
      setEnCours(false);
    }
  }

  async function consulter(anneeArchivee: string) {
    setEnCours(true);
    setErreur(null);
    try {
      const data = await api.lireArchiveAnnuelle(anneeArchivee);
      setArchiveSelectionnee(data);
    } catch (cause) {
      setErreur(
        cause instanceof ApiError ? cause.messages.join(' ') : 'Lecture du snapshot impossible.'
      );
    } finally {
      setEnCours(false);
    }
  }

  function telechargerJson() {
    if (!archiveSelectionnee?.snapshot) return;
    const blob = new Blob([JSON.stringify(archiveSelectionnee, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `enp-archive-academique-${archiveSelectionnee.anneeUniversitaire}.json`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Archives annuelles & Snapshots immuables"
        subtitle="Scellement légal et consultation en lecture seule des référentiels, cours, notes et cahiers de texte."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Administration', href: '/administration' },
          { label: 'Archives annuelles' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${chargement ? 'animate-spin' : ''}`} />}
            onClick={() => void charger()}
            disabled={chargement}
          >
            Actualiser
          </Button>
        }
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {message && (
        <Alert variant="success" title="Archive scellée" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      {/* Notice de gouvernance des archives */}
      <div className="bg-enp-bg border-l-4 border-enp-blue-primary border-r border-t border-b border-enp-border p-4 text-xs text-enp-gray-medium leading-relaxed">
        <span className="font-bold text-enp-blue-deep block mb-0.5">
          Protocole de conservation décennale :
        </span>
        Les archives annuelles capturent un instantané complet et cryptographiquement intègre de
        l'ensemble des inscriptions étudiantes, des cours, des délibérations de jurys et des séances
        du cahier de texte visées. Une fois créée, une archive annuelle est strictly read-only et ne peut
        être ni modifiée ni supprimée.
      </div>

      {/* Formulaire de création d'archive */}
      <div className="bg-white border border-enp-border p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-enp-blue-deep font-serif uppercase tracking-wider">
          Sceller une nouvelle archive annuelle
        </h3>
        <p className="text-xs text-enp-gray-medium">
          Indiquez l'année universitaire à archiver au format <code className="font-mono bg-enp-bg px-1">AAAA-AAAA</code>.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-lg">
          <div className="flex-1">
            <Input
              label="Année universitaire"
              value={annee}
              onChange={(e) => setAnnee(e.target.value)}
              placeholder="Ex: 2024-2025"
              pattern="\d{4}-\d{4}"
            />
          </div>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Archive className="w-4 h-4" />}
            onClick={() => setConfirmArchivage(true)}
            disabled={enCours || !/^\d{4}-\d{4}$/.test(annee)}
          >
            Créer l'archive
          </Button>
        </div>
      </div>

      {/* Répertoire des années archivées */}
      <div className="bg-white border border-enp-border shadow-sm">
        <div className="p-4 border-b border-enp-border flex items-center justify-between">
          <h3 className="font-bold text-enp-blue-deep font-serif text-sm">
            Années universitaires archivées ({archives.length})
          </h3>
          <span className="text-xs text-enp-gray-medium font-mono">
            Conservation immuable
          </span>
        </div>

        {chargement ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-enp-blue-ice border-t-enp-blue-primary animate-spin mb-2" />
            <p className="text-sm text-enp-gray-medium">Chargement des registres d'archives…</p>
          </div>
        ) : archives.length === 0 ? (
          <div className="p-12 text-center text-enp-gray-medium text-xs">
            Aucune archive annuelle n’a encore été scellée.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Année universitaire</TableHead>
                  <TableHead>Date et heure du scellement</TableHead>
                  <TableHead className="text-center">Statut légal</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archives.map((item) => (
                  <TableRow key={item.anneeUniversitaire}>
                    <TableCell className="font-mono font-bold text-sm text-enp-blue-deep">
                      {item.anneeUniversitaire}
                    </TableCell>
                    <TableCell className="text-xs text-enp-gray-medium font-mono">
                      {new Date(item.archiveLe).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="success">Scellé & Conforme</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => void consulter(item.anneeUniversitaire)}
                        disabled={enCours}
                      >
                        Consulter le snapshot
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modal d'inspection du snapshot */}
      <Modal
        isOpen={archiveSelectionnee !== null}
        onClose={() => setArchiveSelectionnee(null)}
        title={`Instantané académique : ${archiveSelectionnee?.anneeUniversitaire}`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-enp-bg border border-enp-border text-xs">
            <div>
              <span className="font-bold text-enp-blue-deep">
                Archive scellée le {archiveSelectionnee && new Date(archiveSelectionnee.archiveLe).toLocaleString('fr-FR')}
              </span>
              <p className="text-enp-gray-medium mt-0.5">
                Format d'intégrité JSON certifié conforme aux référentiels ENP.
              </p>
            </div>
            <Button
              variant="outline"
              size="xs"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={telechargerJson}
            >
              Télécharger le fichier JSON
            </Button>
          </div>

          <div className="max-h-96 overflow-auto border border-enp-border bg-[#0f172a] text-slate-100 p-4 font-mono text-xs leading-relaxed select-all">
            <pre>{JSON.stringify(archiveSelectionnee?.snapshot, null, 2)}</pre>
          </div>

          <div className="pt-3 border-t border-enp-border flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setArchiveSelectionnee(null)}>
              Fermer l'inspecteur
            </Button>
          </div>
        </div>
      </Modal>

      {/* Boîte de confirmation d'archivage */}
      <ConfirmDialog
        isOpen={confirmArchivage}
        onClose={() => setConfirmArchivage(false)}
        onConfirm={() => void creerArchive()}
        title="Créer l'archive annuelle immuable"
        description={`Confirmez-vous le scellement définitif de l'année universitaire ${annee} ? Cette opération crée un snapshot figé de l'ensemble des données pédagogiques et administratives.`}
        confirmText="Sceller l'archive"
        cancelText="Annuler"
        variant="primary"
        isLoading={enCours}
      />
    </div>
  );
}
