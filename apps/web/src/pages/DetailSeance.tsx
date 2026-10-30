import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  Pencil,
  Paperclip,
  History,
  Download,
  Stamp,
  Clock,
  Calendar,
  Lock,
  MessageSquare,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { PieceJointe, Seance, VersionSeance } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import {
  PageHeader,
  Button,
  Badge,
  Alert,
  Modal,
  Textarea,
  FileUpload,
} from '@/components/ui';

const LIBELLES_VISA: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' }> = {
  en_attente: { label: 'En attente de visa', variant: 'warning' },
  vise: { label: 'Visée par l’enseignant', variant: 'success' },
  conteste: { label: 'Contestée par l’enseignant', variant: 'danger' },
};

const LIBELLES_STATUT: Record<string, string> = {
  tenue: 'Séance tenue',
  reportee: 'Séance reportée',
  annulee: 'Séance annulée',
  enseignant_absent: 'Enseignant absent',
  planifiee: 'Planifiée',
};

export function DetailSeance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { aRole, utilisateur } = useAuth();

  const [seance, setSeance] = useState<Seance | null>(null);
  const [versions, setVersions] = useState<VersionSeance[]>([]);
  const [pieces, setPieces] = useState<PieceJointe[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Modale de contestation pour enseignant
  const [modaleContestation, setModaleContestation] = useState(false);
  const [commentaireContestation, setCommentaireContestation] = useState('');
  const [actionEnCours, setActionEnCours] = useState(false);

  // Upload pièce jointe
  const [fichierUpload, setFichierUpload] = useState<File | null>(null);

  const charger = useCallback(async () => {
    if (!id) return;
    setChargement(true);
    setErreur(null);
    try {
      const seanceId = Number(id);
      const [seances, vers, pcs] = await Promise.all([
        api.cahierSeances(),
        api.historiqueSeance(seanceId).catch(() => []),
        api.piecesSeance(seanceId).catch(() => []),
      ]);

      const trouv = seances.find((s) => s.id === seanceId);
      if (!trouv) {
        setErreur('Séance introuvable.');
      } else {
        setSeance(trouv);
        setVersions(vers);
        setPieces(pcs);
      }
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur lors du chargement des détails de la séance.');
    } finally {
      setChargement(false);
    }
  }, [id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function handleVisa(decision: 'vise' | 'conteste') {
    if (!id) return;
    setActionEnCours(true);
    try {
      await api.visaSeance(Number(id), {
        decision,
        commentaire: decision === 'conteste' ? commentaireContestation.trim() : undefined,
      });
      setModaleContestation(false);
      setCommentaireContestation('');
      await charger();
    } catch (err) {
      alert(err instanceof ApiError ? err.messages.join(' ') : "L'opération de visa a échoué.");
    } finally {
      setActionEnCours(false);
    }
  }

  async function handleTelechargerPiece(pieceId: number, nomFichier: string) {
    try {
      const blob = await api.telechargerPiece(pieceId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomFichier;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Impossible de télécharger la pièce jointe.');
    }
  }

  async function handleAjouterPiece() {
    if (!id || !fichierUpload) return;
    setActionEnCours(true);
    try {
      await api.ajouterPieceSeance(Number(id), fichierUpload);
      setFichierUpload(null);
      await charger();
    } catch {
      alert("Échec de l'ajout de la pièce jointe.");
    } finally {
      setActionEnCours(false);
    }
  }

  if (chargement) {
    return (
      <div className="py-12 text-center text-enp-gray-medium text-sm">
        Chargement des détails officiels de la séance…
      </div>
    );
  }

  if (erreur || !seance) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Alert variant="danger" title="Séance introuvable">{erreur}</Alert>
        <Link to="/cahier-texte">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Retour au cahier de texte
          </Button>
        </Link>
      </div>
    );
  }

  const estVisee = seance.visa.statut === 'vise';
  const estContestee = seance.visa.statut === 'conteste';
  const visaConf = LIBELLES_VISA[seance.visa.statut] ?? { label: seance.visa.statut, variant: 'neutral' };
  const peutModifier = aRole('delegue') && !estVisee;
  const peutViser = aRole('enseignant') && seance.visa.statut === 'en_attente';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Link
        to="/cahier-texte"
        className="inline-flex items-center gap-1.5 text-xs text-enp-blue-primary hover:text-enp-blue-deep font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour au cahier de texte
      </Link>

      <PageHeader
        title={`Séance #${seance.id} • ${seance.intitule}`}
        description={`UE ${seance.ueCode} (${seance.type}) • Enregistrée au registre numérique officiel`}
        badge={<Badge variant={visaConf.variant}>{visaConf.label}</Badge>}
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {peutModifier && (
              <Link to={`/cahier-texte/${seance.id}/modifier`} className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full sm:w-auto justify-center" leftIcon={<Pencil className="w-4 h-4" />}>
                  Modifier la séance
                </Button>
              </Link>
            )}
            {estVisee && (
              <span className="text-xs px-2.5 py-1.5 bg-enp-bg text-enp-gray-medium border border-enp-border flex items-center justify-center gap-1 w-full sm:w-auto">
                <Lock className="w-3.5 h-3.5" />
                Verrouillée après visa
              </span>
            )}
            {peutViser && (
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full sm:w-auto justify-center"
                  onClick={() => setModaleContestation(true)}
                  leftIcon={<AlertTriangle className="w-4 h-4" />}
                >
                  Contester
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  className="w-full sm:w-auto justify-center"
                  isLoading={actionEnCours}
                  onClick={() => void handleVisa('vise')}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Viser la séance
                </Button>
              </div>
            )}
          </div>
        }
      />

      {/* Alerte si séance contestée avec motif officiel */}
      {estContestee && (
        <Alert
          variant="danger"
          title="Séance contestée par l'enseignant-chercheur"
          icon={<AlertTriangle className="w-5 h-5 text-enp-red-error shrink-0 mt-0.5" />}
        >
          <div className="space-y-1 mt-1 text-xs sm:text-sm">
            <p>
              <strong>Motif de contestation :</strong>{' '}
              {seance.visa.commentaire || "Aucun commentaire spécifié."}
            </p>
            <p className="text-xs text-enp-gray-dark">
              Le délégué de promotion est invité à corriger la saisie conformément aux indications de l'enseignant.
            </p>
          </div>
        </Alert>
      )}

      {/* Grille des caractéristiques de la séance */}
      <div className="bg-white border border-enp-border p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-enp-border text-xs sm:text-sm">
          <div>
            <span className="text-enp-gray-medium block text-xs uppercase font-semibold">Date</span>
            <span className="font-bold text-enp-black">{seance.date}</span>
          </div>
          <div>
            <span className="text-enp-gray-medium block text-xs uppercase font-semibold">Horaires</span>
            <span className="font-bold text-enp-black">{seance.debut} - {seance.fin}</span>
          </div>
          <div>
            <span className="text-enp-gray-medium block text-xs uppercase font-semibold">Type</span>
            <span className="font-bold text-enp-black">{seance.type}</span>
          </div>
          <div>
            <span className="text-enp-gray-medium block text-xs uppercase font-semibold">Statut</span>
            <span className="font-bold text-enp-black">{LIBELLES_STATUT[seance.statut] || seance.statut}</span>
          </div>
        </div>

        {/* Contenu pédagogique traité */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep">
            Contenu pédagogique traité en séance
          </h2>
          <div className="p-4 bg-enp-blue-ice/30 border border-enp-border text-xs sm:text-sm text-enp-black whitespace-pre-line leading-relaxed">
            {seance.contenu}
          </div>
        </div>

        {/* Travail à faire */}
        {seance.travailAFaire && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep">
              Travail à faire & Préparation
            </h2>
            <div className="p-4 bg-enp-bg border border-enp-border text-xs sm:text-sm text-enp-black whitespace-pre-line leading-relaxed">
              {seance.travailAFaire}
            </div>
          </div>
        )}

        {/* Observations */}
        {seance.observations && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep">
              Observations particulières
            </h2>
            <p className="text-xs sm:text-sm text-enp-gray-dark italic">
              {seance.observations}
            </p>
          </div>
        )}

        {/* Pièces jointes officielles */}
        <div className="pt-4 border-t border-enp-border space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Documents & Pièces jointes ({pieces.length})
          </h2>

          {pieces.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pieces.map((p) => (
                <div
                  key={p.id}
                  className="p-3 border border-enp-border bg-white flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-enp-black truncate">{p.nom}</p>
                    <p className="text-[11px] text-enp-gray-medium">{p.mime}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleTelechargerPiece(p.id, p.nom)}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Télécharger
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-enp-gray-medium italic">
              Aucun document joint à cette séance.
            </p>
          )}

          {/* Formulaire ajout de pièce pour le délégué si séance non verrouillée */}
          {peutModifier && (
            <div className="pt-3 flex items-center gap-3">
              <input
                type="file"
                id="ajout-piece"
                onChange={(e) => e.target.files && setFichierUpload(e.target.files[0])}
                className="text-xs file:mr-2 file:py-1 file:px-2 file:border file:border-enp-border file:text-xs file:bg-white hover:file:bg-enp-blue-ice"
              />
              {fichierUpload && (
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={actionEnCours}
                  onClick={() => void handleAjouterPiece()}
                >
                  Téléverser
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Historique des versions et traçabilité */}
        <div className="pt-4 border-t border-enp-border space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-enp-blue-deep flex items-center gap-2">
            <History className="w-4 h-4" />
            Historique des révisions & Horodatage
          </h2>
          {versions.length > 0 ? (
            <div className="border border-enp-border overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-enp-blue-ice border-b border-enp-border text-enp-blue-deep">
                  <tr>
                    <th className="p-2.5 font-bold">Version</th>
                    <th className="p-2.5 font-bold">Modifiée le</th>
                    <th className="p-2.5 font-bold">Intitulé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-enp-border">
                  {versions.map((v, idx) => (
                    <tr key={v.id} className="hover:bg-enp-blue-ice/30">
                      <td className="p-2.5 font-bold">v{idx + 1}.0</td>
                      <td className="p-2.5 text-enp-gray-medium">{new Date(v.creeLe).toLocaleDateString('fr-FR')}</td>
                      <td className="p-2.5 text-enp-black truncate max-w-xs">{String(v.seance?.intitule ?? 'Révision')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-enp-gray-medium italic">
              Version initiale (1.0). Aucune révision ultérieure.
            </p>
          )}
        </div>
      </div>

      {/* Modale de contestation pour l'enseignant */}
      <Modal
        isOpen={modaleContestation}
        onClose={() => setModaleContestation(false)}
        title="Contester la séance de cours"
        subtitle="Un commentaire d'explication est légalement requis pour contester une saisie de délégué."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setModaleContestation(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!commentaireContestation.trim()}
              isLoading={actionEnCours}
              onClick={() => void handleVisa('conteste')}
            >
              Enregistrer la contestation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Textarea
            label="Commentaire de contestation obligatoire"
            required
            rows={4}
            value={commentaireContestation}
            onChange={(e) => setCommentaireContestation(e.target.value)}
            placeholder="Indiquez avec précision les éléments erronés (horaire incorrect, notion non abordée, groupe inexact...)"
          />
        </div>
      </Modal>
    </div>
  );
}
