import { useEffect, useState } from 'react';
import { Download, Archive } from 'lucide-react';
import { ApiError, api } from '@/api';
import type { ArchiveAnnuelle } from '@/api/types';

function anneeUniversitaireCourante(): string {
  const date = new Date();
  const debut = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  return `${debut}-${debut + 1}`;
}

export function ArchivesAnnuelles() {
  const [annee, setAnnee] = useState(anneeUniversitaireCourante());
  const [archives, setArchives] = useState<ArchiveAnnuelle[]>([]);
  const [archive, setArchive] = useState<ArchiveAnnuelle | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);

  async function charger() {
    try {
      setArchives(await api.archivesAnnuelles());
    } catch (cause) {
      setErreur(cause instanceof ApiError ? cause.messages.join(' ') : 'Impossible de charger les archives.');
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    void charger();
  }, []);

  async function creer() {
    if (!window.confirm(`Créer l’archive annuelle en lecture seule ${annee} ?`)) return;
    setEnCours(true);
    setErreur(null);
    setMessage(null);
    try {
      await api.creerArchiveAnnuelle(annee);
      setMessage(`L’année ${annee} a été archivée.`);
      await charger();
    } catch (cause) {
      setErreur(cause instanceof ApiError ? cause.messages.join(' ') : 'Création de l’archive impossible.');
    } finally {
      setEnCours(false);
    }
  }

  async function consulter(anneeArchivee: string) {
    setEnCours(true);
    setErreur(null);
    try {
      setArchive(await api.lireArchiveAnnuelle(anneeArchivee));
    } catch (cause) {
      setErreur(cause instanceof ApiError ? cause.messages.join(' ') : 'Lecture de l’archive impossible.');
    } finally {
      setEnCours(false);
    }
  }

  function telecharger() {
    if (!archive?.snapshot) return;
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `archive-academique-${archive.anneeUniversitaire}.json`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-enp-ink">Archives annuelles</h1>
        <p className="mt-2 text-sm text-enp-ink-soft">
          Les archives figent les cours, affectations, inscriptions, mandats, notes, présences et cahiers visés. Elles sont consultables sans modification.
        </p>
      </header>

      {erreur && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{erreur}</p>}
      {message && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</p>}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-enp-border bg-white p-4">
        <div>
          <label htmlFor="annee-archive" className="mb-1 block text-sm font-medium">Année universitaire</label>
          <input
            id="annee-archive"
            value={annee}
            onChange={(event) => setAnnee(event.target.value)}
            pattern="\d{4}-\d{4}"
            placeholder="2025-2026"
            className="min-h-[44px] rounded-md border border-enp-border px-3"
          />
        </div>
        <button
          type="button"
          disabled={enCours || !/^\d{4}-\d{4}$/.test(annee)}
          onClick={() => void creer()}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-enp-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          <Archive size={18} aria-hidden="true" /> Créer une archive
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-enp-border bg-white">
        <h2 className="border-b border-enp-border px-4 py-3 font-semibold">Années archivées</h2>
        {chargement ? (
          <p className="p-4 text-sm text-enp-ink-soft" role="status">Chargement…</p>
        ) : archives.length === 0 ? (
          <p className="p-4 text-sm text-enp-ink-soft">Aucune archive annuelle.</p>
        ) : (
          <ul className="divide-y divide-enp-border">
            {archives.map((item) => (
              <li key={item.anneeUniversitaire} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{item.anneeUniversitaire}</p>
                  <p className="text-xs text-enp-ink-soft">
                    Archivée le {new Date(item.archiveLe).toLocaleString('fr-FR')}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => void consulter(item.anneeUniversitaire)}
                  className="min-h-[40px] rounded-md border border-enp-border px-3 text-sm font-medium hover:bg-enp-sky disabled:opacity-60"
                >
                  Consulter le snapshot
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {archive?.snapshot && (
        <div className="space-y-3 rounded-xl border border-enp-border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Snapshot {archive.anneeUniversitaire}</h2>
            <button
              type="button"
              onClick={telecharger}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-enp-border px-3 text-sm font-medium hover:bg-enp-sky"
            >
              <Download size={16} aria-hidden="true" /> Télécharger JSON
            </button>
          </div>
          <pre className="max-h-96 overflow-auto rounded bg-slate-50 p-3 text-xs">
            {JSON.stringify(archive.snapshot, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
