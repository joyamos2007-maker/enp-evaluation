import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  UserCog,
  MessageSquare,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  ArrowRight,
  RefreshCw,
  Award,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { TableauDeBordScolarite } from '@/api/types';
import {
  PageHeader,
  SectionHeader,
  StatCard,
  Alert,
  Button,
  StatusBadge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  ProgressBar,
} from '@/components/ui';

export function TableauDeBordScolaritePage() {
  const [data, setData] = useState<TableauDeBordScolarite | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const d = await api.scolariteTableauDeBord();
      setData(d);
    } catch (err) {
      if (err instanceof ApiError) setErreur(err.messages.join(' '));
      else setErreur('Erreur réseau lors du chargement des indicateurs de scolarité.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const tauxParticipation =
    data && data.participation.inscriptions > 0
      ? Math.round((data.participation.participations / data.participation.inscriptions) * 100)
      : 0;

  const campagnesACloturer =
    data?.campagnes.filter((c) => c.statut === 'ouverte' && new Date(c.fin) < new Date()) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scolarité centrale"
        subtitle="Pilotage des campagnes d'évaluation, gestion des comptes étudiants, modération et délibérations."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Scolarité centrale' },
        ]}
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto justify-center"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${chargement ? 'animate-spin' : ''}`} />}
              onClick={() => void charger()}
              disabled={chargement}
            >
              Actualiser
            </Button>
            <Link to="/scolarite/campagnes" className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full sm:w-auto justify-center" leftIcon={<Megaphone className="w-3.5 h-3.5" />}>
                Gérer les campagnes
              </Button>
            </Link>
          </div>
        }
      />

      {erreur && (
        <Alert variant="danger" title="Erreur de chargement" onClose={() => setErreur(null)}>
          {erreur}
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={() => void charger()}>
              Réessayer
            </Button>
          </div>
        </Alert>
      )}

      {chargement && !erreur && (
        <div className="p-8 text-center bg-white border border-enp-border">
          <div className="inline-block w-8 h-8 border-2 border-enp-blue-ice border-t-enp-blue-primary animate-spin mb-2" />
          <p className="text-sm text-enp-gray-medium">Chargement des indicateurs de la scolarité…</p>
        </div>
      )}

      {!chargement && data && !erreur && (
        <>
          {/* Cartes d'indicateurs institutionnels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Campagnes ouvertes"
              value={data.campagnesOuvertes}
              icon={<Megaphone className="w-5 h-5 text-enp-blue-primary" />}
              description="Actuellement en phase de vote"
            />
            <StatCard
              title="Comptes à activer"
              value={data.comptesSansMotDePasse}
              icon={<UserCog className="w-5 h-5 text-enp-gold" />}
              description="Sans mot de passe initialisé"
            />
            <StatCard
              title="Commentaires à modérer"
              value={data.commentairesAModerer}
              icon={<MessageSquare className="w-5 h-5 text-enp-red-dark" />}
              description="En attente de relecture"
            />
            <StatCard
              title="Participation globale"
              value={`${tauxParticipation}%`}
              icon={<TrendingUp className="w-5 h-5 text-enp-green-valid" />}
              description={`${data.participation.participations} / ${data.participation.inscriptions} inscrits`}
            />
          </div>

          {/* Participation et Quorum de représentativité */}
          <div className="bg-white border border-enp-border p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-enp-border pb-3">
              <div>
                <h2 className="text-base font-bold text-enp-blue-deep font-serif">
                  Indice de participation institutionnelle
                </h2>
                <p className="text-xs text-enp-gray-medium mt-0.5">
                  Calculé sur l’ensemble des jetons anonymes délivrés pour les campagnes de l’année courante.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-enp-blue-primary">
                  {data.participation.participations} / {data.participation.inscriptions}
                </span>
                <span className="text-xs text-enp-gray-medium block">
                  {data.participation.bulletins} bulletins anonymes déposés
                </span>
              </div>
            </div>

            <ProgressBar
              value={tauxParticipation}
              max={100}
              variant={tauxParticipation >= 60 ? 'success' : tauxParticipation >= 35 ? 'primary' : 'warning'}
              showValue={true}
              label="Taux effectif de mobilisation étudiante"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs text-enp-gray-medium">
              <div className="p-2.5 bg-enp-bg border border-enp-border">
                <span className="font-semibold text-enp-black block mb-0.5">Quorum légal</span>
                Les résultats ne sont débloqués que si au moins 5 étudiants ont répondu pour l'UE concernée.
              </div>
              <div className="p-2.5 bg-enp-bg border border-enp-border">
                <span className="font-semibold text-enp-black block mb-0.5">Anonymat inviolable</span>
                Le jeton de vote est définitivement dissocié de l'identité lors du dépôt du bulletin.
              </div>
              <div className="p-2.5 bg-enp-bg border border-enp-border">
                <span className="font-semibold text-enp-black block mb-0.5">Restitution (Art. 77)</span>
                Après clôture, la synthèse des axes d'amélioration est transmise aux étudiants.
              </div>
            </div>
          </div>

          {/* Actions prioritaires requises */}
          <div className="bg-white border border-enp-border p-6 shadow-sm">
            <SectionHeader
              title="Actions requises de la Scolarité"
              description="Tâches administratives prioritaires en attente de traitement."
            />

            <div className="mt-4 space-y-2">
              {data.comptesSansMotDePasse > 0 && (
                <div className="flex items-center justify-between p-3.5 bg-enp-bg border-l-4 border-enp-gold border-r border-t border-b border-enp-border text-sm">
                  <div className="flex items-center gap-3">
                    <UserCog className="w-5 h-5 text-enp-gold shrink-0" />
                    <div>
                      <p className="font-semibold text-enp-blue-deep">
                        {data.comptesSansMotDePasse} compte(s) sans mot de passe
                      </p>
                      <p className="text-xs text-enp-gray-medium">
                        Générez et distribuez les fiches d'activation individuelle pour les nouveaux inscrits.
                      </p>
                    </div>
                  </div>
                  <Link to="/scolarite/comptes">
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Gérer
                    </Button>
                  </Link>
                </div>
              )}

              {data.commentairesAModerer > 0 && (
                <div className="flex items-center justify-between p-3.5 bg-enp-bg border-l-4 border-enp-red-dark border-r border-t border-b border-enp-border text-sm">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-enp-red-dark shrink-0" />
                    <div>
                      <p className="font-semibold text-enp-blue-deep">
                        {data.commentairesAModerer} commentaire(s) étudiant(s) à modérer
                      </p>
                      <p className="text-xs text-enp-gray-medium">
                        Contrôle de conformité selon la charte déontologique avant transmission aux enseignants.
                      </p>
                    </div>
                  </div>
                  <Link to="/scolarite/moderation">
                    <Button variant="danger" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Modérer
                    </Button>
                  </Link>
                </div>
              )}

              {campagnesACloturer.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3.5 bg-enp-bg border-l-4 border-enp-blue-primary border-r border-t border-b border-enp-border text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-enp-blue-primary shrink-0" />
                    <div>
                      <p className="font-semibold text-enp-blue-deep">
                        Campagne arrivée à échéance : « {c.libelle} »
                      </p>
                      <p className="text-xs text-enp-gray-medium">
                        La date limite ({new Date(c.fin).toLocaleDateString('fr-FR')}) est dépassée. Clôturez la campagne pour calculer les résultats officiels.
                      </p>
                    </div>
                  </div>
                  <Link to="/scolarite/campagnes">
                    <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Clôturer
                    </Button>
                  </Link>
                </div>
              ))}

              {data.comptesSansMotDePasse === 0 &&
                data.commentairesAModerer === 0 &&
                campagnesACloturer.length === 0 && (
                  <div className="p-4 bg-enp-green-light border border-enp-green-valid/30 text-enp-green-valid flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>Toutes les opérations courantes de scolarité sont à jour. Aucun blocage en cours.</span>
                  </div>
                )}
            </div>
          </div>

          {/* Tableau institutionnel des campagnes récentes */}
          <div className="bg-white border border-enp-border shadow-sm">
            <div className="p-4 sm:p-5 border-b border-enp-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-enp-blue-deep font-serif">
                  Campagnes récentes d’évaluation
                </h3>
                <p className="text-xs text-enp-gray-medium mt-0.5">
                  Récapitulatif des campagnes créées pour les différents départements.
                </p>
              </div>
              <Link to="/scolarite/campagnes">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Voir toutes les campagnes
                </Button>
              </Link>
            </div>

            {/* Vue mobile en cartes tactiles (< 768px) */}
            <div className="block md:hidden divide-y divide-enp-border">
              {data.campagnes.slice(0, 8).map((c) => (
                <div key={c.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm text-enp-blue-deep">{c.libelle}</span>
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
                    <div>{c.departement} • S{c.semestre} ({c.anneeUniversitaire})</div>
                    <div className="font-mono">{new Date(c.debut).toLocaleDateString('fr-FR')} → {new Date(c.fin).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <div className="pt-1">
                    <Link to="/scolarite/campagnes" className="block w-full">
                      <Button variant="outline" size="xs" className="w-full justify-center">
                        Consulter
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {data.campagnes.length === 0 && (
                <div className="p-6 text-center text-xs text-enp-gray-medium">
                  Aucune campagne enregistrée.
                </div>
              )}
            </div>

            {/* Tableau desktop (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Libellé officiel</TableHead>
                    <TableHead>Département</TableHead>
                    <TableHead className="text-center">Année</TableHead>
                    <TableHead className="text-center">Semestre</TableHead>
                    <TableHead>Période d'ouverture</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.campagnes.slice(0, 8).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold text-enp-blue-deep">
                        {c.libelle}
                      </TableCell>
                      <TableCell className="text-enp-gray-medium">{c.departement}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{c.anneeUniversitaire}</TableCell>
                      <TableCell className="text-center font-mono">S{c.semestre}</TableCell>
                      <TableCell className="text-xs font-mono text-enp-gray-medium whitespace-nowrap">
                        {new Date(c.debut).toLocaleDateString('fr-FR')} → {new Date(c.fin).toLocaleDateString('fr-FR')}
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
                      <TableCell className="text-right">
                        <Link to="/scolarite/campagnes">
                          <Button variant="ghost" size="xs">
                            Consulter
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.campagnes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-enp-gray-medium">
                        Aucune campagne enregistrée.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Raccourcis métier de la scolarité */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/scolarite/imports"
              className="bg-white border border-enp-border p-5 hover:border-enp-blue-primary transition-colors block"
            >
              <div className="flex items-center gap-3 mb-2">
                <FileSpreadsheet className="w-5 h-5 text-enp-blue-primary" />
                <h4 className="font-bold text-enp-blue-deep text-sm">Imports académiques CSV</h4>
              </div>
              <p className="text-xs text-enp-gray-medium leading-relaxed">
                Importation des cohortes d'étudiants, unités d'enseignement, inscriptions et enseignants.
              </p>
            </Link>

            <Link
              to="/scolarite/deliberations"
              className="bg-white border border-enp-border p-5 hover:border-enp-blue-primary transition-colors block"
            >
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-5 h-5 text-enp-gold" />
                <h4 className="font-bold text-enp-blue-deep text-sm">Délibération des examens</h4>
              </div>
              <p className="text-xs text-enp-gray-medium leading-relaxed">
                Contrôle et publication officielle des notes d'examen après validation par le jury.
              </p>
            </Link>

            <Link
              to="/scolarite/restitution"
              className="bg-white border border-enp-border p-5 hover:border-enp-blue-primary transition-colors block"
            >
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-5 h-5 text-enp-green-valid" />
                <h4 className="font-bold text-enp-blue-deep text-sm">Restitution (Art. 77)</h4>
              </div>
              <p className="text-xs text-enp-gray-medium leading-relaxed">
                Rédaction et publication de la synthèse globale des résultats et des engagements d'amélioration.
              </p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
