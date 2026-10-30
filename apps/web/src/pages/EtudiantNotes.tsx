import { useEffect, useState, useMemo } from 'react';
import {
  ClipboardList,
  AlertCircle,
  Clock,
  CheckCircle2,
  Printer,
  Award,
  BookOpen,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { NoteEtudiant } from '@/api/types';
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
} from '@/components/ui';

export function EtudiantNotes() {
  const [notes, setNotes] = useState<NoteEtudiant[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    api
      .dossierMesNotes()
      .then((data) => {
        if (actif) setNotes(data);
      })
      .catch((err: unknown) => {
        if (actif)
          setErreur(
            err instanceof ApiError
              ? err.messages.join(' ')
              : 'Impossible de charger vos notes personnelles.'
          );
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, []);

  const stats = useMemo(() => {
    if (notes.length === 0) return null;
    const notesDispos = notes.filter((n) => n.deliberee && n.note !== null);
    if (notesDispos.length === 0) {
      return {
        total: notes.length,
        notesSaisies: 0,
        enAttente: notes.filter((n) => !n.deliberee).length,
        moyenneSur20: '-',
      };
    }

    // Normalisation sur 20 pour chaque note
    const notesSur20 = notesDispos.map((n) => ((n.note as number) / n.bareme) * 20);
    const moyenne = notesSur20.reduce((acc, curr) => acc + curr, 0) / notesSur20.length;

    return {
      total: notes.length,
      notesSaisies: notesDispos.length,
      enAttente: notes.filter((n) => !n.deliberee).length,
      moyenneSur20: (Math.round(moyenne * 100) / 100).toFixed(2),
    };
  }, [notes]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relevé individuel de notes"
        subtitle="Consultation de vos résultats aux devoirs continus et examens délibérés."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Mes notes académiques' },
        ]}
        actions={
          notes.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => window.print()}
            >
              Imprimer le relevé
            </Button>
          ) : undefined
        }
      />

      {erreur && (
        <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      )}

      {/* Notice de confidentialité et délibération */}
      <div className="bg-enp-bg border-l-4 border-enp-blue-primary border-r border-t border-b border-enp-border p-4 text-xs text-enp-gray-medium leading-relaxed">
        <span className="font-bold text-enp-blue-deep block mb-0.5">
          Information officielle de la Scolarité :
        </span>
        Les notes de devoirs et contrôles continus sont consultables dès publication par votre enseignant.
        Les notes d'examens terminaux font l'objet d'une délibération en jury avant d'être rendues
        visibles. Ce document est à usage personnel et ne se substitue pas à une attestation officielle.
      </div>

      {chargement ? (
        <div className="p-12 text-center bg-white border border-enp-border">
          <div className="inline-block w-8 h-8 border-2 border-enp-blue-ice border-t-enp-blue-primary animate-spin mb-2" />
          <p className="text-sm text-enp-gray-medium">Chargement de votre dossier académique…</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-white border border-enp-border p-12 text-center shadow-sm">
          <ClipboardList className="w-12 h-12 text-enp-gray-medium mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-enp-blue-deep font-serif">
            Aucune note renseignée pour le moment
          </h3>
          <p className="text-xs text-enp-gray-medium max-w-sm mx-auto mt-1">
            Les évaluations saisies par vos enseignants apparaîtront automatiquement sur ce relevé.
          </p>
        </div>
      ) : (
        <>
          {/* Statistiques synthétiques */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <StatCard
                title="Moyenne indicative"
                value={`${stats.moyenneSur20} / 20`}
                icon={<Award className="w-5 h-5 text-enp-blue-primary" />}
                description="Moyenne simple sur notes publiées"
              />
              <StatCard
                title="Évaluations inscrites"
                value={stats.total}
                icon={<BookOpen className="w-5 h-5 text-enp-gray-medium" />}
                description="Devoirs et examens prévus"
              />
              <StatCard
                title="Notes publiées"
                value={stats.notesSaisies}
                icon={<CheckCircle2 className="w-5 h-5 text-enp-green-valid" />}
                description="Renseignées et délibérées"
              />
              <StatCard
                title="En attente jury"
                value={stats.enAttente}
                icon={<Clock className="w-5 h-5 text-enp-gold" />}
                description="Examens en cours de délibération"
              />
            </div>
          )}

          {/* Tableau des notes */}
          <div className="bg-white border border-enp-border shadow-sm">
            <div className="p-4 border-b border-enp-border flex items-center justify-between">
              <h3 className="font-bold text-enp-blue-deep font-serif text-sm">
                Bordereau officiel des évaluations ({notes.length})
              </h3>
              <span className="text-xs text-enp-gray-medium font-mono">
                Année courante
              </span>
            </div>

            {/* VUE MOBILE : Cartes de notes claires et lisibles sur téléphone */}
            <div className="block sm:hidden divide-y divide-enp-border">
              {notes.map((ligne) => {
                const estExamenNonDelibere = !ligne.deliberee;
                const sansNote = ligne.note === null;

                return (
                  <div key={`${ligne.evaluationId}-${ligne.coursId}`} className="p-4 space-y-2.5 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold bg-enp-blue-deep text-white px-2 py-0.5">
                            {ligne.code}
                          </span>
                          <Badge variant={ligne.type === 'devoir' ? 'default' : 'institutional'}>
                            {ligne.type === 'devoir' ? 'Devoir' : 'Examen'}
                          </Badge>
                        </div>
                        <p className="font-bold text-sm text-enp-black">
                          {ligne.intitule}
                        </p>
                        <p className="text-xs text-enp-gray-medium font-medium">
                          {ligne.libelle}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {estExamenNonDelibere ? (
                          <div className="space-y-1">
                            <span className="text-xs text-enp-gold font-bold block">
                              En délibération
                            </span>
                            <Badge variant="warning">En attente jury</Badge>
                          </div>
                        ) : sansNote ? (
                          <div className="space-y-1">
                            <span className="text-xs text-enp-gray-medium italic block">
                              Non renseignée
                            </span>
                            <Badge variant="outline">Non noté</Badge>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className={`font-mono font-bold text-lg ${
                              ligne.note !== null && ligne.note >= ligne.bareme / 2 ? 'text-enp-blue-deep' : 'text-enp-red-dark'
                            }`}>
                              {ligne.note} <span className="text-xs font-normal text-enp-gray-medium">/{ligne.bareme}</span>
                            </div>
                            <Badge variant="success">Publié</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VUE TABLETTE ET DESKTOP */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unité d'Enseignement (UE)</TableHead>
                    <TableHead>Évaluation</TableHead>
                    <TableHead className="text-center">Nature</TableHead>
                    <TableHead className="text-right">Note obtenue</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notes.map((ligne) => {
                    const estExamenNonDelibere = !ligne.deliberee;
                    const sansNote = ligne.note === null;

                    return (
                      <TableRow key={`${ligne.evaluationId}-${ligne.coursId}`}>
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
                        <TableCell className="text-sm font-medium text-enp-blue-deep">
                          {ligne.libelle}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={ligne.type === 'devoir' ? 'default' : 'institutional'}>
                            {ligne.type === 'devoir' ? 'Devoir continu' : 'Examen terminal'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-base">
                          {estExamenNonDelibere ? (
                            <span className="text-xs text-enp-gold font-sans font-medium">
                              En délibération
                            </span>
                          ) : sansNote ? (
                            <span className="text-xs text-enp-gray-medium font-sans font-normal italic">
                              Non renseignée
                            </span>
                          ) : (
                            <span className={ligne.note !== null && ligne.note >= ligne.bareme / 2 ? 'text-enp-blue-deep' : 'text-enp-red-dark'}>
                              {ligne.note} <span className="text-xs font-normal text-enp-gray-medium">/ {ligne.bareme}</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {estExamenNonDelibere ? (
                            <Badge variant="warning">En attente jury</Badge>
                          ) : sansNote ? (
                            <Badge variant="outline">Non noté</Badge>
                          ) : (
                            <Badge variant="success">Publié</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
