import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Megaphone,
  Plus,
  Lock,
  Unlock,
  AlertCircle,
  Calendar,
  Building,
  RefreshCw,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { CampagneGestion, CampagneEntreeGestion, DepartementOption } from '@/api/types';
import {
  PageHeader,
  SectionHeader,
  Button,
  Input,
  Select,
  Alert,
  StatusBadge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Modal,
  ConfirmDialog,
} from '@/components/ui';

function anneeParDefaut(): string {
  const now = new Date();
  const annee = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${annee}-${annee + 1}`;
}

function toLocalInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoUTC(local: string): string {
  const d = new Date(local);
  return d.toISOString();
}

export function ScolariteCampagnes() {
  const [campagnes, setCampagnes] = useState<CampagneGestion[]>([]);
  const [departements, setDepartements] = useState<DepartementOption[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Filtres
  const [recherche, setRecherche] = useState('');
  const [deptFiltre, setDeptFiltre] = useState<string>('all');
  const [statutFiltre, setStatutFiltre] = useState<string>('all');

  // Modal création
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CampagneEntreeGestion>({
    libelle: '',
    departmentId: 0,
    anneeUniversitaire: anneeParDefaut(),
    semestre: 1,
    debut: '',
    fin: '',
  });
  const [formErreur, setFormErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  // Confirmation ouverture / clôture
  const [confirmAction, setConfirmAction] = useState<{
    type: 'ouvrir' | 'cloturer';
    id: number;
    libelle: string;
  } | null>(null);
  const [actionErreur, setActionErreur] = useState<string | null>(null);
  const [actionEnCours, setActionEnCours] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [cs, ds] = await Promise.all([api.scolariteCampagnes(), api.scolariteDepartements()]);
      setCampagnes(cs);
      setDepartements(ds);
      if (ds.length > 0 && form.departmentId === 0) {
        setForm((f) => ({ ...f, departmentId: ds[0].id }));
      }
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur lors du chargement des campagnes d’évaluation.');
    } finally {
      setChargement(false);
    }
  }, [form.departmentId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function creerCampagne() {
    if (!form.libelle.trim() || !form.debut || !form.fin) {
      setFormErreur('Veuillez renseigner tous les champs obligatoires.');
      return;
    }
    if (new Date(form.fin) <= new Date(form.debut)) {
      setFormErreur('La date de clôture doit être strictement postérieure à la date d’ouverture.');
      return;
    }

    setEnCours(true);
    setFormErreur(null);
    try {
      const corps: CampagneEntreeGestion = {
        ...form,
        debut: toIsoUTC(form.debut),
        fin: toIsoUTC(form.fin),
      };
      const nouvelle = await api.scolariteCreerCampagne(corps);
      setCampagnes((prev) => [nouvelle, ...prev]);
      setShowModal(false);
      setForm({
        libelle: '',
        departmentId: departements[0]?.id ?? 0,
        anneeUniversitaire: anneeParDefaut(),
        semestre: 1,
        debut: '',
        fin: '',
      });
    } catch (err) {
      if (err instanceof ApiError) setFormErreur(err.messages.join(' '));
      else setFormErreur('Erreur lors de la création de la campagne.');
    } finally {
      setEnCours(false);
    }
  }

  async function confirmerAction() {
    if (!confirmAction) return;
    setActionEnCours(true);
    setActionErreur(null);
    try {
      if (confirmAction.type === 'ouvrir') {
        const c = await api.scolariteOuvrirCampagne(confirmAction.id);
        setCampagnes((prev) => prev.map((x) => (x.id === c.id ? c : x)));
      } else {
        const c = await api.scolariteCloturerCampagne(confirmAction.id);
        setCampagnes((prev) => prev.map((x) => (x.id === c.id ? c : x)));
      }
      setConfirmAction(null);
    } catch (err) {
      if (err instanceof ApiError) setActionErreur(err.messages.join(' '));
      else setActionErreur('Erreur lors de la mise à jour du statut de la campagne.');
    } finally {
      setActionEnCours(false);
    }
  }

  const campagnesFiltrees = useMemo(() => {
    return campagnes.filter((c) => {
      const matchRecherche =
        !recherche ||
        c.libelle.toLowerCase().includes(recherche.toLowerCase()) ||
        c.departement.toLowerCase().includes(recherche.toLowerCase()) ||
        c.anneeUniversitaire.includes(recherche);

      const matchDept = deptFiltre === 'all' || c.departement === deptFiltre;
      const matchStatut = statutFiltre === 'all' || c.statut === statutFiltre;

      return matchRecherche && matchDept && matchStatut;
    });
  }, [campagnes, recherche, deptFiltre, statutFiltre]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des campagnes d’évaluation"
        subtitle="Création, ouverture officielle et clôture des campagnes par semestre et département."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Scolarité', href: '/scolarite' },
          { label: 'Campagnes d’évaluation' },
        ]}
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="justify-center"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${chargement ? 'animate-spin' : ''}`} />}
              onClick={() => void charger()}
              disabled={chargement}
            >
              Actualiser
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="justify-center"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setShowModal(true);
                setFormErreur(null);
              }}
            >
              Nouvelle campagne
            </Button>
          </div>
        }
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {/* Barre de filtres institutionnelle */}
      <div className="bg-white border border-enp-border p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Rechercher par libellé, département ou année..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            startIcon={<Search className="w-4 h-4 text-enp-gray-medium" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={deptFiltre}
            onChange={(e) => setDeptFiltre(e.target.value)}
            options={[
              { value: 'all', label: 'Tous les départements' },
              ...departements.map((d) => ({ value: d.nom, label: d.nom })),
            ]}
          />

          <Select
            value={statutFiltre}
            onChange={(e) => setStatutFiltre(e.target.value)}
            options={[
              { value: 'all', label: 'Tous les statuts' },
              { value: 'brouillon', label: 'Brouillon' },
              { value: 'ouverte', label: 'Ouverte' },
              { value: 'close', label: 'Close' },
              { value: 'restituee', label: 'Restituée' },
            ]}
          />
        </div>
      </div>

      {chargement && !erreur && (
        <div className="p-12 text-center bg-white border border-enp-border">
          <div className="inline-block w-8 h-8 border-2 border-enp-blue-ice border-t-enp-blue-primary animate-spin mb-2" />
          <p className="text-sm text-enp-gray-medium">Chargement des campagnes officielles…</p>
        </div>
      )}

      {!chargement && !erreur && (
        <div className="bg-white border border-enp-border shadow-sm">
          <div className="p-4 border-b border-enp-border flex items-center justify-between">
            <h3 className="font-bold text-enp-blue-deep font-serif text-sm">
              Répertoire officiel ({campagnesFiltrees.length} campagne{campagnesFiltrees.length > 1 ? 's' : ''})
            </h3>
            <span className="text-xs text-enp-gray-medium font-mono">
              Année de référence : {anneeParDefaut()}
            </span>
          </div>

          {/* Vue en cartes tactiles pour mobile (< 768px) */}
          <div className="block md:hidden divide-y divide-enp-border">
            {campagnesFiltrees.map((c) => (
              <div key={c.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-sm text-enp-blue-deep">{c.libelle}</h4>
                  <StatusBadge
                    status={
                      c.statut === 'ouverte'
                        ? 'ouverte'
                        : c.statut === 'close'
                        ? 'cloturee'
                        : c.statut === 'restituee'
                        ? 'publie'
                        : 'brouillon'
                    }
                    label={
                      c.statut === 'ouverte'
                        ? 'Ouverte'
                        : c.statut === 'close'
                        ? 'Close'
                        : c.statut === 'restituee'
                        ? 'Restituée'
                        : 'Brouillon'
                    }
                  />
                </div>
                <div className="text-xs text-enp-gray-medium space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-enp-gray-medium shrink-0" />
                    <span>{c.departement} • Semestre {c.semestre} ({c.anneeUniversitaire})</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-enp-gray-medium shrink-0" />
                    <span>{new Date(c.debut).toLocaleDateString('fr-FR')} → {new Date(c.fin).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                <div className="pt-1">
                  {c.statut === 'brouillon' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center"
                      leftIcon={<Unlock className="w-3.5 h-3.5 text-enp-green-valid" />}
                      onClick={() => {
                        setConfirmAction({ type: 'ouvrir', id: c.id, libelle: c.libelle });
                        setActionErreur(null);
                      }}
                    >
                      Ouvrir au vote
                    </Button>
                  )}
                  {c.statut === 'ouverte' && (
                    <Button
                      variant="danger"
                      size="sm"
                      className="w-full justify-center"
                      leftIcon={<Lock className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setConfirmAction({ type: 'cloturer', id: c.id, libelle: c.libelle });
                        setActionErreur(null);
                      }}
                    >
                      Clôturer la campagne
                    </Button>
                  )}
                  {(c.statut === 'close' || c.statut === 'restituee') && (
                    <span className="text-xs text-enp-gray-medium italic block text-center py-1">
                      {c.statut === 'restituee' ? 'Restitution publiée' : 'Prête pour restitution'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {campagnesFiltrees.length === 0 && (
              <div className="text-center py-8 text-sm text-enp-gray-medium">
                Aucune campagne ne correspond aux critères de filtre.
              </div>
            )}
          </div>

          {/* Tableau complet pour tablettes et ordinateurs (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Libellé officiel</TableHead>
                  <TableHead>Département & Campus</TableHead>
                  <TableHead className="text-center">Année</TableHead>
                  <TableHead className="text-center">Semestre</TableHead>
                  <TableHead>Période de déroulement</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campagnesFiltrees.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold text-enp-blue-deep">
                      {c.libelle}
                    </TableCell>
                    <TableCell className="text-enp-gray-medium">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-enp-gray-medium shrink-0" />
                        <span>{c.departement}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">{c.anneeUniversitaire}</TableCell>
                    <TableCell className="text-center font-mono font-bold">S{c.semestre}</TableCell>
                    <TableCell className="text-xs font-mono text-enp-gray-medium whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-enp-gray-medium" />
                        <span>{new Date(c.debut).toLocaleDateString('fr-FR')} → {new Date(c.fin).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge
                        status={
                          c.statut === 'ouverte'
                            ? 'ouverte'
                            : c.statut === 'close'
                            ? 'cloturee'
                            : c.statut === 'restituee'
                            ? 'publie'
                            : 'brouillon'
                        }
                        label={
                          c.statut === 'ouverte'
                            ? 'Ouverte'
                            : c.statut === 'close'
                            ? 'Close'
                            : c.statut === 'restituee'
                            ? 'Restituée'
                            : 'Brouillon'
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {c.statut === 'brouillon' && (
                        <Button
                          variant="outline"
                          size="xs"
                          leftIcon={<Unlock className="w-3.5 h-3.5 text-enp-green-valid" />}
                          onClick={() => {
                            setConfirmAction({ type: 'ouvrir', id: c.id, libelle: c.libelle });
                            setActionErreur(null);
                          }}
                        >
                          Ouvrir au vote
                        </Button>
                      )}
                      {c.statut === 'ouverte' && (
                        <Button
                          variant="danger"
                          size="xs"
                          leftIcon={<Lock className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setConfirmAction({ type: 'cloturer', id: c.id, libelle: c.libelle });
                            setActionErreur(null);
                          }}
                        >
                          Clôturer
                        </Button>
                      )}
                      {(c.statut === 'close' || c.statut === 'restituee') && (
                        <span className="text-xs text-enp-gray-medium italic">
                          {c.statut === 'restituee' ? 'Restitution publiée' : 'Prête pour restitution'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {campagnesFiltrees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-enp-gray-medium">
                      Aucune campagne ne correspond aux critères de filtre sélectionnés.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Modal institutionnel de création de campagne */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Créer une nouvelle campagne d'évaluation"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-enp-gray-medium leading-relaxed">
            Configurez les paramètres officiels de la campagne. Les étudiants inscrits aux cours associés
            recevront automatiquement un jeton de vote anonyme à l'ouverture.
          </p>

          {formErreur && (
            <Alert variant="danger" title="Formulaire incomplet">
              {formErreur}
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Libellé officiel de la campagne *"
                required
                maxLength={200}
                value={form.libelle}
                onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
                placeholder="Ex: Évaluation des enseignements S1 : Génie Civil 2025-2026"
              />
            </div>

            <div>
              <label htmlFor="modal-dept" className="block text-xs font-semibold text-enp-black uppercase tracking-wider mb-1">
                Département concerné *
              </label>
              <select
                id="modal-dept"
                value={form.departmentId}
                onChange={(e) => setForm((f) => ({ ...f, departmentId: Number(e.target.value) }))}
                className="w-full border border-enp-border bg-white px-3 py-2 text-sm text-enp-black focus:outline-none focus:border-enp-blue-primary rounded-none"
              >
                {departements.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom} ({d.campus})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Input
                label="Année universitaire *"
                required
                value={form.anneeUniversitaire}
                onChange={(e) => setForm((f) => ({ ...f, anneeUniversitaire: e.target.value }))}
                placeholder="AAAA-AAAA"
              />
            </div>

            <div>
              <Input
                label="Semestre académique (1 à 10) *"
                type="number"
                min={1}
                max={10}
                required
                value={form.semestre}
                onChange={(e) => setForm((f) => ({ ...f, semestre: Number(e.target.value) }))}
              />
            </div>

            <div />

            <div>
              <label htmlFor="modal-debut" className="block text-xs font-semibold text-enp-black uppercase tracking-wider mb-1">
                Date et heure d'ouverture *
              </label>
              <input
                id="modal-debut"
                type="datetime-local"
                value={form.debut}
                onChange={(e) => setForm((f) => ({ ...f, debut: e.target.value }))}
                className="w-full border border-enp-border bg-white px-3 py-2 text-sm text-enp-black focus:outline-none focus:border-enp-blue-primary rounded-none"
              />
            </div>

            <div>
              <label htmlFor="modal-fin" className="block text-xs font-semibold text-enp-black uppercase tracking-wider mb-1">
                Date et heure de clôture *
              </label>
              <input
                id="modal-fin"
                type="datetime-local"
                value={form.fin}
                onChange={(e) => setForm((f) => ({ ...f, fin: e.target.value }))}
                className="w-full border border-enp-border bg-white px-3 py-2 text-sm text-enp-black focus:outline-none focus:border-enp-blue-primary rounded-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-enp-border flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)} disabled={enCours}>
              Annuler
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void creerCampagne()}
              isLoading={enCours}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Enregistrer la campagne
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation d'action (Ouvrir / Clôturer) */}
      <ConfirmDialog
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => void confirmerAction()}
        title={confirmAction?.type === 'ouvrir' ? 'Ouvrir officiellement la campagne' : 'Clôturer définitivement la campagne'}
        description={
          confirmAction?.type === 'ouvrir'
            ? `Voulez-vous autoriser les étudiants à voter pour la campagne « ${confirmAction?.libelle} » ? Les jetons anonymes seront utilisables dès confirmation.`
            : `Attention : la clôture de « ${confirmAction?.libelle} » est irréversible. Les étudiants ne pourront plus déposer de réponses et les scores finaux seront calculés.`
        }
        confirmText={confirmAction?.type === 'ouvrir' ? 'Ouvrir la campagne' : 'Confirmer la clôture'}
        cancelText="Annuler"
        variant={confirmAction?.type === 'ouvrir' ? 'primary' : 'danger'}
        isLoading={actionEnCours}
      />
    </div>
  );
}
