import { useEffect, useState, useMemo } from 'react';
import {
  ClipboardList,
  Printer,
  Award,
  BookOpen,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
  InfoBubble,
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
    const notesDispos = notes.filter((n) => n.note !== null);

    const notesSur20 = notesDispos.map((n) => ((n.note as number) / n.bareme) * 20);
    const moyenne = notesSur20.length > 0
      ? notesSur20.reduce((acc, curr) => acc + curr, 0) / notesSur20.length
      : null;

    return {
      total: notes.length,
      notesSaisies: notesDispos.length,
      moyenneSur20: moyenne === null ? '-' : (Math.round(moyenne * 100) / 100).toFixed(2),
    };
  }, [notes]);

  const progressions = useMemo(() => {
    const parCours = new Map<
      number,
      {
        code: string;
        intitule: string;
        evaluations: {
          date: string;
          libelle: string;
          noteSur20: number;
        }[];
      }
    >();
    for (const note of notes) {
      if (note.note === null) continue;
      const cours = parCours.get(note.coursId) ?? {
        code: note.code,
        intitule: note.intitule,
        evaluations: [],
      };
      cours.evaluations.push({
        date: note.createdAt,
        libelle: note.libelle,
        noteSur20: (note.note / note.bareme) * 20,
      });
      parCours.set(note.coursId, cours);
    }
    return [...parCours.entries()].map(([coursId, cours]) => ({
      coursId,
      ...cours,
      evaluations: cours.evaluations
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((evaluation) => ({
          ...evaluation,
          dateLabel: `${new Date(evaluation.date).toLocaleDateString('fr-FR')} · ${evaluation.libelle}`,
        })),
    }));
  }, [notes]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-4">
      <PageHeader
        title="Relevé individuel de notes"
        subtitle="Consultation des notes de devoir saisies par vos enseignants."
        badge={
          <InfoBubble
            triggerVariant="pill"
            triggerLabel="Notice des jurys"
            title="Consultation des notes de devoir"
            badge="NOTES DE DEVOIR"
            icon="info"
            duration={7000}
            content={
              <div className="space-y-2 text-xs leading-relaxed font-sans">
                <p>
                  Les notes de devoir apparaissent ici après leur saisie par votre enseignant. Ce relevé est à usage personnel et ne se substitue pas à une attestation officielle.
                </p>
              </div>
            }
          />
        }
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Mes notes académiques' },
        ]}
        actions={
          notes.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto font-semibold justify-center min-h-[38px] whitespace-nowrap"
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

      {/* Notice de confidentialité (masquée sur mobile car disponible via la bulle 'i' ci-dessus) */}
      <div className="hidden sm:block bg-enp-bg border-l-4 border-enp-blue-primary border-r border-t border-b border-enp-border p-4 text-xs text-enp-gray-medium leading-relaxed font-sans">
        <span className="font-bold text-enp-blue-deep block mb-0.5 font-sans">
          Information :
        </span>
        Les notes de devoir sont consultables après leur saisie par votre enseignant. Ce relevé est à usage personnel et ne se substitue pas à une attestation officielle.
      </div>

      {chargement ? (
        <div className="p-12 text-center bg-white border border-enp-border">
          <div className="inline-block w-8 h-8 border-2 border-enp-blue-ice border-t-enp-blue-primary animate-spin mb-2" />
          <p className="text-sm text-enp-gray-medium font-sans">Chargement de votre dossier académique…</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-white border border-enp-border p-8 sm:p-12 text-center shadow-sm">
          <ClipboardList className="w-12 h-12 text-enp-gray-medium mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-enp-blue-deep font-sans">
            Aucune note renseignée pour le moment
          </h3>
          <p className="text-xs text-enp-gray-medium max-w-sm mx-auto mt-1 font-sans">
            Les évaluations saisies par vos enseignants apparaîtront automatiquement sur ce relevé.
          </p>
        </div>
      ) : (
        <>
          {/* Statistiques des devoirs */}
          {stats && (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              <StatCard
                title="Moyenne"
                value={`${stats.moyenneSur20} / 20`}
                icon={<Award className="w-4 h-4 sm:w-5 sm:h-5 text-enp-blue-primary" />}
                description="Sur les notes saisies"
                variant="primary"
                className="p-3 sm:p-5"
              />
              <StatCard
                title="Inscrites"
                value={stats.total}
                icon={<BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-enp-gray-medium" />}
                description={`${stats.notesSaisies} note(s) saisie(s)`}
                className="p-3 sm:p-5"
              />
            </div>
          )}

          {progressions.length > 0 && (
            <section className="space-y-4 rounded-lg border border-enp-border bg-white p-4">
              <div>
                <h3 className="font-bold text-enp-blue-deep">Évolution par UE</h3>
                <p className="text-xs text-enp-gray-medium">
                  Notes normalisées sur 20, dans l’ordre des devoirs.
                </p>
              </div>
              {progressions.map((progression) => (
                <article
                  key={progression.coursId}
                  className="space-y-2 border-t border-enp-border pt-3"
                >
                  <h4 className="text-sm font-semibold text-enp-ink">
                    {progression.code} — {progression.intitule}
                  </h4>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={progression.evaluations}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="dateLabel" minTickGap={20} />
                        <YAxis domain={[0, 20]} />
                        <Tooltip
                          formatter={(value) => [
                            `${Number(value).toFixed(2)} / 20`,
                            'Note',
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="noteSur20"
                          name="Note / 20"
                          stroke="#1d4ed8"
                          strokeWidth={2}
                          dot
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              ))}
            </section>
          )}

          {/* Tableau des notes */}
          <div className="bg-white border border-enp-border shadow-sm">
            <div className="p-3.5 sm:p-4 border-b border-enp-border flex items-center justify-between">
              <h3 className="font-bold text-enp-blue-deep font-sans text-xs sm:text-sm">
                Bordereau officiel des évaluations ({notes.length})
              </h3>
              <span className="text-xs text-enp-gray-medium font-mono">
                Harmattan
              </span>
            </div>

            {/* VUE MOBILE : Cartes de notes claires et lisibles sur téléphone */}
            <div className="block sm:hidden p-2.5 space-y-2.5 bg-enp-bg">
              {notes.map((ligne) => {
                const sansNote = ligne.note === null;
                const noteValide = ligne.note !== null && ligne.note >= ligne.bareme / 2;

                const bordureNote = sansNote
                  ? 'border-l-4 border-l-enp-border'
                  : noteValide
                  ? 'border-l-4 border-l-enp-green-valid'
                  : 'border-l-4 border-l-enp-red-error';

                return (
                  <div
                    key={`${ligne.evaluationId}-${ligne.coursId}`}
                    className={`p-3.5 space-y-2 bg-white border border-enp-border ${bordureNote}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold bg-enp-blue-light text-enp-blue-deep border border-enp-blue-primary/20 px-1.5 py-0.2">
                            {ligne.code}
                          </span>
                          <Badge variant="default">Devoir</Badge>
                        </div>
                        <p className="font-bold text-sm text-enp-black font-sans truncate">
                          {ligne.intitule}
                        </p>
                        <p className="text-xs text-enp-gray-medium font-sans truncate">
                          {ligne.libelle}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {sansNote ? (
                          <div className="space-y-1">
                            <span className="text-[11px] text-enp-gray-medium italic block font-sans">
                              Non renseignée
                            </span>
                            <Badge variant="outline">Non noté</Badge>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className={`font-mono font-bold text-base sm:text-lg ${
                              noteValide ? 'text-enp-blue-deep' : 'text-enp-red-error'
                            }`}>
                              {ligne.note} <span className="text-xs font-normal text-enp-gray-medium">/{ligne.bareme}</span>
                            </div>
                            <Badge variant={noteValide ? 'success' : 'danger'}>
                              {noteValide ? 'Validé' : 'Non validé'}
                            </Badge>
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
                    <TableHead className="text-right">Note obtenue</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notes.map((ligne) => {
                    const sansNote = ligne.note === null;

                    return (
                      <TableRow key={`${ligne.evaluationId}-${ligne.coursId}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-enp-blue-light text-enp-blue-deep border border-enp-blue-primary/20 px-2 py-0.5">
                              {ligne.code}
                            </span>
                            <span className="font-semibold text-enp-black text-sm font-sans">
                              {ligne.intitule}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-enp-blue-deep font-sans">
                          {ligne.libelle}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-base">
                          {sansNote ? (
                            <span className="text-xs text-enp-gray-medium font-sans font-normal italic">
                              Non renseignée
                            </span>
                          ) : (
                            <span className={ligne.note !== null && ligne.note >= ligne.bareme / 2 ? 'text-enp-blue-deep' : 'text-enp-red-error'}>
                              {ligne.note} <span className="text-xs font-normal text-enp-gray-medium">/ {ligne.bareme}</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {sansNote ? (
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
