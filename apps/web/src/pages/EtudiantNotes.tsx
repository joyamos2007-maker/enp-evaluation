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
