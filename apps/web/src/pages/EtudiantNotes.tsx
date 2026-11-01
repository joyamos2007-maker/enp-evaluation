import { useEffect, useState } from 'react';
import { AlertCircle, ClipboardList } from 'lucide-react';
import { api, ApiError } from '@/api';
import type { NoteEtudiant } from '@/api/types';

export function EtudiantNotes() {
  const [notes, setNotes] = useState<NoteEtudiant[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    api.dossierMesNotes()
      .then((data) => { if (actif) setNotes(data); })
      .catch((err: unknown) => {
        if (actif) setErreur(err instanceof ApiError ? err.messages.join(' ') : 'Impossible de charger vos notes.');
      })
      .finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-enp-ink tracking-tight">Mes notes</h1>
        <p className="text-sm text-enp-ink-soft mt-1">Notes des devoirs et examens de vos UE. Ces données sont personnelles.</p>
      </header>
      {erreur && <Alerte texte={erreur} />}
      {chargement ? <p className="text-enp-ink-soft">Chargement…</p> : notes.length === 0 ? (
        <div className="rounded-xl border border-enp-border bg-white p-8 text-center">
          <ClipboardList size={28} className="mx-auto mb-3 text-enp-primary" aria-hidden="true" />
          <p className="text-enp-ink-soft">Aucune note n’est disponible pour le moment.</p>
        </div>
      ) : (
<<<<<<< Updated upstream
        <div className="overflow-x-auto rounded-xl border border-enp-border bg-white">
          <table className="w-full text-sm">
            <thead><tr className="bg-enp-primary text-left text-white"><th className="px-4 py-3">UE</th><th className="px-4 py-3">Évaluation</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Note</th></tr></thead>
            <tbody>{notes.map((ligne) => (
              <tr key={`${ligne.evaluationId}-${ligne.coursId}`} className="border-t border-enp-border">
                <td className="px-4 py-3"><span className="font-semibold text-enp-ink">{ligne.code}</span><span className="block text-xs text-enp-ink-soft">{ligne.intitule}</span></td>
                <td className="px-4 py-3">{ligne.libelle}</td>
                <td className="px-4 py-3">{ligne.type === 'devoir' ? 'Devoir' : 'Examen'}</td>
                <td className="px-4 py-3 text-right font-semibold text-enp-ink">
                  {!ligne.deliberee
                    ? <span className="font-normal text-amber-800">En attente de délibération</span>
                    : ligne.note === null
                      ? <span className="font-normal text-enp-ink-soft">Non renseignée</span>
                      : `${ligne.note} / ${ligne.bareme}`}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
=======
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
                icon={<Clock className="w-5 h-5 text-enp-violet" />}
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
                            <span className="text-xs text-enp-violet font-bold block">
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
                            <span className="text-xs text-enp-violet font-sans font-medium">
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
>>>>>>> Stashed changes
      )}
    </div>
  );
}

function Alerte({ texte }: { texte: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-enp-bordeaux/15 bg-enp-bordeaux-light p-4 text-enp-bordeaux" role="alert">
      <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{texte}</span>
    </div>
  );
}
