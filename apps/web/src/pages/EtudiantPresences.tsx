import { useEffect, useState, useMemo } from 'react';
import {
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { PresencesEtudiant, StatutPresenceEtudiant } from '@/api/types';
import {
  PageHeader,
  Button,
  Alert,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  StatCard,
  ProgressBar,
  Select,
} from '@/components/ui';

const LIBELLES_STATUT: Record<StatutPresenceEtudiant, string> = {
  present: 'Présent',
  absent: 'Absent',
  retard: 'En retard',
};

export function EtudiantPresences() {
  const [donnees, setDonnees] = useState<PresencesEtudiant | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtreStatut, setFiltreStatut] = useState<string>('all');

  useEffect(() => {
    let actif = true;
    api
      .dossierMesPresences()
      .then((data) => {
        if (actif) setDonnees(data);
      })
      .catch((err: unknown) => {
        if (actif)
          setErreur(
            err instanceof ApiError
              ? err.messages.join(' ')
              : 'Impossible de charger votre état de présence.'
          );
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, []);

  const presences = donnees?.presences ?? [];
  const stats = donnees?.statistiques;

  const presencesFiltrees = useMemo(() => {
    if (filtreStatut === 'all') return presences;
    return presences.filter((p) => p.statut === filtreStatut);
  }, [presences, filtreStatut]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feuille de présence académique"
        subtitle="Historique des présences, absences et retards enregistrés lors des séances d'enseignement."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Mes présences' },
        ]}
        actions={
          presences.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => window.print()}
            >
              Imprimer l'état
            </Button>
          ) : undefined
        }
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {/* Règle d'assiduité */}
      <div className="bg-enp-bg border-l-4 border-enp-blue-primary border-r border-t border-b border-enp-border p-4 text-xs text-enp-gray-medium leading-relaxed">
        <span className="font-bold text-enp-blue-deep block mb-0.5">
          Règlement pédagogique de l'assiduité :
        </span>
        La présence aux séances de cours magistraux, travaux dirigés et travaux pratiques est obligatoire.
        Un taux d'assiduité inférieur à 80% peut entraîner la déchéance du droit de présentation aux examens
        terminaux de l'UE selon les dispositions de la Direction des Études.
      </div>

      {chargement ? (
        <div className="p-12 text-center bg-white border border-enp-border">
          <div className="inline-block w-8 h-8 border-2 border-enp-blue-ice border-t-enp-blue-primary animate-spin mb-2" />
          <p className="text-sm text-enp-gray-medium">Chargement des données d'assiduité…</p>
        </div>
      ) : (
        <>
          {stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCard
                  title="Taux d'assiduité"
                  value={stats.tauxPresence === null ? '-' : `${stats.tauxPresence}%`}
                  icon={<CalendarCheck className="w-5 h-5 text-enp-blue-primary" />}
                  description="Présences et retards / Total"
                />
                <StatCard
                  title="Séances émargées"
                  value={`${stats.seancesMarquees} / ${stats.seancesTotal}`}
                  icon={<BookOpen className="w-5 h-5 text-enp-gray-medium" />}
                  description="Séances avec statut saisi"
                />
                <StatCard
                  title="Présences"
                  value={stats.presents}
                  icon={<CheckCircle2 className="w-5 h-5 text-enp-green-valid" />}
                  description="À l'heure au cours"
                />
                <StatCard
                  title="Absences"
                  value={stats.absents}
                  icon={<XCircle className="w-5 h-5 text-enp-red-dark" />}
                  description="Non justifiées"
                />
                <StatCard
                  title="Retards"
                  value={stats.retards}
                  icon={<Clock className="w-5 h-5 text-enp-gold" />}
                  description="Arrivées tardives"
                />
              </div>

              {stats.tauxPresence !== null && (
                <div className="bg-white border border-enp-border p-4">
                  <ProgressBar
                    value={stats.tauxPresence}
                    max={100}
                    variant={stats.tauxPresence >= 80 ? 'success' : stats.tauxPresence >= 65 ? 'warning' : 'danger'}
                    label="Seuil d'assiduité réglementaire (Seuil éliminatoire : 80%)"
                    showValue={true}
                  />
                </div>
              )}
            </div>
          )}

          {/* Tableau des présences */}
          <div className="bg-white border border-enp-border shadow-sm">
            <div className="p-4 border-b border-enp-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-enp-blue-deep font-serif text-sm">
                  Registre des séances ({presencesFiltrees.length} émargement{presencesFiltrees.length > 1 ? 's' : ''})
                </h3>
                <p className="text-xs text-enp-gray-medium mt-0.5">
                  Pointage séance par séance effectué par les enseignants responsables.
                </p>
              </div>

              <div className="w-48">
                <Select
                  value={filtreStatut}
                  onChange={(e) => setFiltreStatut(e.target.value)}
                  options={[
                    { value: 'all', label: 'Tous les statuts' },
                    { value: 'present', label: 'Présents uniquement' },
                    { value: 'absent', label: 'Absents uniquement' },
                    { value: 'retard', label: 'Retards uniquement' },
                  ]}
                />
              </div>
            </div>

            {presencesFiltrees.length === 0 ? (
              <div className="p-12 text-center text-enp-gray-medium text-xs">
                Aucune séance ne correspond aux critères de filtre sélectionnés.
              </div>
            ) : (
              <>
                {/* VUE MOBILE : Cartes de présence séance par séance */}
                <div className="block sm:hidden divide-y divide-enp-border">
                  {presencesFiltrees.map((ligne) => (
                    <div key={ligne.seanceId} className="p-3.5 space-y-2 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-enp-blue-deep text-white px-2 py-0.5">
                              {ligne.code}
                            </span>
                            <span className="font-bold text-sm text-enp-black">
                              {ligne.intitule}
                            </span>
                          </div>
                          <p className="text-xs text-enp-blue-deep font-medium">
                            {ligne.libelle}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {ligne.statut === 'present' ? (
                            <Badge variant="success">Présent</Badge>
                          ) : ligne.statut === 'retard' ? (
                            <Badge variant="warning">En retard</Badge>
                          ) : (
                            <Badge variant="danger">Absent</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-enp-gray-medium pt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-enp-gray-medium" />
                        <span>{new Date(ligne.date).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* VUE TABLETTE ET DESKTOP */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date de la séance</TableHead>
                        <TableHead>Unité d'Enseignement (UE)</TableHead>
                        <TableHead>Séance / Intitulé</TableHead>
                        <TableHead className="text-center">Statut d'émargement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {presencesFiltrees.map((ligne) => (
                        <TableRow key={ligne.seanceId}>
                          <TableCell className="font-mono text-xs text-enp-gray-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-enp-gray-medium" />
                              <span>{new Date(ligne.date).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold bg-enp-blue-deep text-white px-2 py-0.5">
                                {ligne.code}
                              </span>
                              <span className="font-semibold text-enp-black text-sm">
                                {ligne.intitule}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-enp-blue-deep">
                            {ligne.libelle}
                          </TableCell>
                          <TableCell className="text-center">
                            {ligne.statut === 'present' ? (
                              <Badge variant="success">Présent</Badge>
                            ) : ligne.statut === 'retard' ? (
                              <Badge variant="warning">En retard</Badge>
                            ) : (
                              <Badge variant="danger">Absent</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
