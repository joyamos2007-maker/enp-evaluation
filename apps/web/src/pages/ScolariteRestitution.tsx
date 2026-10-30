import { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
  Building,
  Calendar,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CampagneGestion } from '@/api/types';
import {
  PageHeader,
  SectionHeader,
  Button,
  Textarea,
  Select,
  Alert,
  StatusBadge,
  Badge,
  ConfirmDialog,
} from '@/components/ui';

const MAX_CHARS = 3000;

export function ScolariteRestitution() {
  const [campagnes, setCampagnes] = useState<CampagneGestion[]>([]);
  const [campagneId, setCampagneId] = useState<number | ''>('');
  const [resultats, setResultats] = useState('');
  const [suites, setSuites] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [confirmPub, setConfirmPub] = useState(false);
  const [publiee, setPubliee] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const cs = await api.scolariteCampagnes();
      const eligibles = cs.filter((c) => c.statut === 'close' || c.statut === 'restituee');
      setCampagnes(eligibles);
      if (eligibles.length > 0 && campagneId === '') {
        setCampagneId(eligibles[0].id);
      }
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur lors du chargement des campagnes éligibles à la restitution.');
    } finally {
      setChargement(false);
    }
  }, [campagneId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const campagne = campagnes.find((c) => c.id === (campagneId !== '' ? Number(campagneId) : -1));
  const enLectureSeule = campagne?.statut === 'restituee' || publiee;

  // Pré-remplir si restitution déjà existante (mock ou API)
  useEffect(() => {
    if (campagne && campagne.statut === 'restituee') {
      setResultats(
        `Synthèse officielle des évaluations :\n- Taux de participation globale : 68% des effectifs inscrits.\n- Appréciation très favorable sur la clarté des objectifs pédagogiques et les supports de cours mis à disposition.\n- Points forts remarqués : disponibilité de l'équipe enseignante et pertinence des travaux pratiques en laboratoire.`
      );
      setSuites(
        `Engagements institutionnels et suites données :\n1. Réajustement des créneaux de travaux dirigés pour alléger les semaines de révision.\n2. Acquisition de 15 nouveaux bancs d'essais numériques pour le laboratoire de Génie Électrique.\n3. Harmonisation des critères d'évaluation des devoirs continus entre les sections.`
      );
    } else {
      setResultats('');
      setSuites('');
    }
    setPubliee(false);
  }, [campagne]);

  async function publier() {
    if (campagneId === '') return;
    if (!resultats.trim() || !suites.trim()) {
      setErreur('Veuillez renseigner à la fois les principaux résultats et les suites données.');
      setConfirmPub(false);
      return;
    }

    setEnCours(true);
    setErreur(null);
    setSucces(null);
    try {
      await api.scolariteRestitution(Number(campagneId), { resultats, suites });
      setPubliee(true);
      setConfirmPub(false);
      setSucces(`La restitution pour la campagne « ${campagne?.libelle} » a été publiée avec succès. Les étudiants peuvent désormais la consulter.`);
      void charger();
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur lors de la publication de la restitution.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restitution institutionnelle (Article 77)"
        subtitle="Publication des synthèses de résultats et des suites pédagogiques à destination des étudiants."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Scolarité', href: '/scolarite' },
          { label: 'Restitution officielle' },
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

      {/* Cadre légal Article 77 */}
      <div className="bg-enp-bg border-l-4 border-enp-blue-primary border-r border-t border-b border-enp-border p-4 text-xs text-enp-gray-medium leading-relaxed">
        <span className="font-bold text-enp-blue-deep block mb-0.5">
          Article 77 du Règlement des Études de l'ENP :
        </span>
        « À l’issue de chaque campagne d’évaluation et après concertation des conseils de département,
        une restitution des principaux résultats ainsi que des suites concrètes données est obligatoirement
        mise à la disposition des étudiants. Cette restitution garantit la transparence démocratique
        et l'amélioration continue de la formation. »
      </div>

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {succes && (
        <Alert variant="success" title="Publication validée" onClose={() => setSucces(null)}>
          {succes}
        </Alert>
      )}

      {chargement ? (
        <div className="p-12 text-center bg-white border border-enp-border">
          <div className="inline-block w-8 h-8 border-2 border-enp-blue-ice border-t-enp-blue-primary animate-spin mb-2" />
          <p className="text-sm text-enp-gray-medium">Chargement des campagnes éligibles…</p>
        </div>
      ) : campagnes.length === 0 ? (
        <div className="bg-white border border-enp-border p-8 text-center text-enp-gray-medium">
          <FileText className="w-10 h-10 text-enp-gray-medium mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-enp-black">Aucune campagne éligible à la restitution</p>
          <p className="text-xs mt-1">
            Seules les campagnes clôturées peuvent faire l'objet d'une publication de restitution officielle.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sélection de la campagne */}
          <div className="bg-white border border-enp-border p-5 shadow-sm space-y-3">
            <label htmlFor="campagne-select" className="block text-xs font-semibold text-enp-black uppercase tracking-wider">
              Sélectionnez la campagne concernée
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                id="campagne-select"
                value={campagneId}
                onChange={(e) => {
                  setCampagneId(e.target.value ? Number(e.target.value) : '');
                  setPubliee(false);
                  setErreur(null);
                  setSucces(null);
                }}
                className="flex-1 border border-enp-border bg-white px-3 py-2 text-sm text-enp-black font-semibold focus:outline-none focus:border-enp-blue-primary"
              >
                {campagnes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.libelle} : {c.departement} (S{c.semestre} · {c.anneeUniversitaire}) [{c.statut === 'restituee' ? 'Restitution publiée' : 'Campagne close'}]
                  </option>
                ))}
              </select>

              {campagne && (
                <StatusBadge
                  status={campagne.statut === 'restituee' ? 'publie' : 'cloturee'}
                  label={campagne.statut === 'restituee' ? 'Restitution publiée' : 'Campagne close'}
                />
              )}
            </div>
          </div>

          {campagne && (
            <div className="bg-white border border-enp-border shadow-sm p-6 space-y-6">
              <div className="border-b border-enp-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-enp-blue-deep font-serif">
                    Rédaction de la restitution officielle
                  </h3>
                  <p className="text-xs text-enp-gray-medium mt-0.5">
                    {campagne.libelle} · Département de {campagne.departement}
                  </p>
                </div>
                {enLectureSeule && (
                  <div className="bg-enp-bg border border-enp-border px-3 py-1 text-xs text-enp-gray-medium flex items-center gap-1.5 font-medium">
                    <Lock className="w-3.5 h-3.5" />
                    Lecture seule (Restitution déjà publiée)
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <div>
                  <Textarea
                    label="1. Principaux résultats constatés *"
                    helperText={`Synthèse générale des retours d'évaluation, appréciations d'ensemble et constats majeurs. (${resultats.length}/${MAX_CHARS} caractères)`}
                    rows={6}
                    maxLength={MAX_CHARS}
                    value={resultats}
                    onChange={(e) => setResultats(e.target.value)}
                    disabled={enLectureSeule}
                    placeholder="Ex: Taux de participation de 68%. Les étudiants ont particulièrement souligné la clarté pédagogique et la disponibilité des enseignants..."
                  />
                </div>

                <div>
                  <Textarea
                    label="2. Suites données & Engagements d'amélioration *"
                    helperText={`Mesures concrètes arrêtées par la Direction des Études et le Département. (${suites.length}/${MAX_CHARS} caractères)`}
                    rows={6}
                    maxLength={MAX_CHARS}
                    value={suites}
                    onChange={(e) => setSuites(e.target.value)}
                    disabled={enLectureSeule}
                    placeholder="Ex: 1. Aménagement des emplois du temps de TD. 2. Mise à niveau du matériel de TP..."
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-enp-border flex items-center justify-end">
                {enLectureSeule ? (
                  <span className="text-xs text-enp-gray-medium italic">
                    Cette restitution a été transmise aux étudiants et ne peut plus être modifiée.
                  </span>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto justify-center"
                    leftIcon={<Send className="w-4 h-4" />}
                    onClick={() => setConfirmPub(true)}
                    disabled={enCours || !resultats.trim() || !suites.trim()}
                  >
                    Publier la restitution aux étudiants
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation de publication */}
      <ConfirmDialog
        isOpen={confirmPub}
        onClose={() => setConfirmPub(false)}
        onConfirm={() => void publier()}
        title="Publication officielle de la restitution"
        description={`Confirmez-vous la publication de cette restitution pour la campagne « ${campagne?.libelle} » ? Cette action est définitive. Les étudiants pourront immédiatement consulter les résultats et les suites données sur leur portail.`}
        confirmText="Confirmer la publication"
        cancelText="Annuler"
        variant="primary"
        isLoading={enCours}
      />
    </div>
  );
}
