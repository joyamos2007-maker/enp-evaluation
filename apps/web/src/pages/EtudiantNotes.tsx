import { useEffect, useState, useMemo } from 'react';
import {
  ClipboardList,
  Printer,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { api, ApiError } from '@/api';
import type { NoteEtudiant } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import {
  PageHeader,
  Button,
  Alert,
  InfoBubble,
} from '@/components/ui';

export function EtudiantNotes() {
  const { utilisateur } = useAuth();
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

    const notesSur20 = notesDispos.map((n) => ((n.note as number) / n.bareme) * 20);
    const moyenne = notesSur20.reduce((acc, curr) => acc + curr, 0) / notesSur20.length;

    return {
      total: notes.length,
      notesSaisies: notesDispos.length,
      enAttente: notes.filter((n) => !n.deliberee).length,
      moyenneSur20: (Math.round(moyenne * 100) / 100).toFixed(2),
    };
  }, [notes]);

  // Calcul des crédits ECTS acquis (base 30 ECTS par semestre)
  const totalCreditsSemestre = 30;
  const creditsParUE = notes.length > 0 ? Number((totalCreditsSemestre / notes.length).toFixed(1)) : 0;
  const creditsValides = notes.reduce((acc, curr) => {
    if (curr.deliberee && curr.note !== null && curr.note >= curr.bareme / 2) {
      return acc + creditsParUE;
    }
    return acc;
  }, 0);

  // Mention indicative selon moyenne
  const moyenneNum = stats && stats.moyenneSur20 !== '-' ? parseFloat(stats.moyenneSur20) : null;
  let mention = 'En cours';
  if (moyenneNum !== null) {
    if (moyenneNum >= 16) mention = 'Très Bien';
    else if (moyenneNum >= 14) mention = 'Bien';
    else if (moyenneNum >= 12) mention = 'Assez Bien';
    else if (moyenneNum >= 10) mention = 'Passable';
    else mention = 'Ajourné';
  }

  const dateDuJour = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const nomComplet = utilisateur
    ? `${utilisateur.nom} ${utilisateur.prenom}`.trim()
    : 'BENALI Amine';

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-8">
      {/* Barre d'en-tête de la page (masquée à l'impression) */}
      <div className="no-print">
        <PageHeader
          title="Relevé officiel de notes"
          subtitle="Consultation directe et impression conforme de votre dossier académique officiel."
          badge={
            <InfoBubble
              triggerVariant="pill"
              triggerLabel="Notice des jurys"
              title="Modalités d'affichage des notes et délibérations"
              badge="DÉLIBÉRATIONS OFFICIELLES"
              icon="info"
              duration={7000}
              content={
                <div className="space-y-2 text-xs leading-relaxed font-sans">
                  <p>
                    Les notes de devoirs et contrôles continus sont consultables dès publication par votre enseignant.
                  </p>
                  <p>
                    Les notes d'examens terminaux font l'objet d'une délibération en jury avant d'être rendues visibles. Ce document certifié est conforme pour impression et archivage.
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
                variant="primary"
                size="sm"
                className="w-full sm:w-auto font-semibold justify-center min-h-[38px] whitespace-nowrap bg-[#0d3b66] hover:bg-[#082642] text-white"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => window.print()}
              >
                Imprimer le relevé
              </Button>
            ) : undefined
          }
        />
      </div>

      {erreur && (
        <div className="no-print">
          <Alert variant="danger" title="Erreur" onClose={() => setErreur(null)}>
            {erreur}
          </Alert>
        </div>
      )}

      {chargement ? (
        <div className="p-12 text-center bg-white border border-enp-border">
          <div className="inline-block w-8 h-8 border-2 border-enp-blue-ice border-t-enp-blue-primary animate-spin mb-2" />
          <p className="text-sm text-enp-gray-medium font-sans">Chargement de votre relevé officiel…</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-white border border-enp-border p-8 sm:p-12 text-center shadow-sm">
          <ClipboardList className="w-12 h-12 text-enp-gray-medium mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-enp-blue-deep font-sans">
            Aucune note renseignée pour le moment
          </h3>
          <p className="text-xs text-enp-gray-medium max-w-sm mx-auto mt-1 font-sans">
            Les évaluations saisies par vos enseignants apparaîtront automatiquement sur ce relevé officiel.
          </p>
        </div>
      ) : (
        /* ================================================================= */
        /*  NOUVEAU FORMAT : LE RELEVÉ OFFICIEL INSTITUTIONNEL DIRECTEMENT   */
        /* ================================================================= */
        <div className="releve-document print-area bg-white border border-slate-300 shadow-md p-5 sm:p-8 md:p-10 max-w-4xl mx-auto font-sans text-slate-900 print:shadow-none print:border-none print:p-0 print:max-w-none">
          
          {/* EN-TÊTE INSTITUTIONNEL OFFICIEL */}
          {/* Logo ENP en haut à gauche | Nom de l'école en milieu en haut | Armoiries Togo en haut à droite */}
          <div className="grid grid-cols-12 gap-3 sm:gap-4 items-center border-b-2 border-[#0d3b66] pb-4 sm:pb-5">
            {/* En haut à gauche : Logo ENP */}
            <div className="col-span-12 sm:col-span-3 print:col-span-3 flex flex-col items-center sm:items-start print:items-start justify-center">
              <img
                src="/logo-enp-transparent.png"
                alt="Logo École Nationale Polytechnique"
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </div>

            {/* En milieu en haut : Nom de l'école */}
            <div className="col-span-12 sm:col-span-6 print:col-span-6 flex flex-col items-center justify-center text-center">
              <h2 className="text-base sm:text-lg md:text-xl font-bold uppercase tracking-wider text-[#0d3b66] font-sans">
                ÉCOLE NATIONALE POLYTECHNIQUE
              </h2>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-700 font-sans mt-0.5">
                Direction des Affaires Académiques & de la Scolarité Centrale
              </p>
              <p className="text-[10px] text-slate-600 font-sans">
                Bureau des Examens, Concours & Délibérations
              </p>
              <p className="text-[9px] text-slate-500 font-sans">
                BP 1515 Lomé • Lomé - Togo
              </p>
            </div>

            {/* En haut à droite : Armoiries et devise de la République Togolaise */}
            <div className="col-span-12 sm:col-span-3 print:col-span-3 flex flex-col items-center sm:items-end print:items-end justify-center text-center sm:text-right print:text-right">
              <img
                src="/armoiries-togo.svg"
                alt="Armoiries de la République Togolaise"
                className="w-12 h-14 object-contain mb-1"
              />
              <div className="text-[10px] leading-tight text-slate-700 uppercase font-sans">
                <p className="font-bold text-[#0d3b66]">RÉPUBLIQUE TOGOLAISE</p>
                <p className="italic text-[9px] text-slate-600">Travail - Liberté - Patrie</p>
                <p className="text-[8px] text-slate-500 mt-0.5">Ministère de l'Enseignement Supérieur & de la Recherche</p>
              </div>
            </div>
          </div>

          {/* TITRE PRINCIPAL DU RELEVÉ */}
          <div className="text-center my-4 sm:my-5 py-2 sm:py-2.5 bg-[#f0f5ff] border-y border-[#d8dee5]">
            <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-[#0d3b66] font-sans">
              RELEVÉ OFFICIEL DE NOTES & RÉSULTATS ACADÉMIQUES
            </h1>
            <p className="text-xs text-slate-700 font-sans mt-0.5">
              Année Universitaire <strong>2026-2027</strong> • Semestre 1 (Harmattan) • Session Ordinaire
            </p>
          </div>

          {/* CARTOUCHE D'IDENTIFICATION DE L'ÉTUDIANT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 p-3.5 bg-slate-50 print:bg-slate-50/50 border border-slate-300 text-xs mb-5 font-sans">
            <div className="space-y-1">
              <div className="flex">
                <span className="w-32 text-slate-500">Nom & Prénoms :</span>
                <span className="font-bold text-[#0d3b66] uppercase">
                  {nomComplet}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-500">Numéro Matricule :</span>
                <span className="font-mono font-bold text-slate-800">
                  {utilisateur ? `#${utilisateur.id}` : '#1001'}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-500">Régime d'études :</span>
                <span className="text-slate-800">Formation Initiale Sous Statut Étudiant</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex">
                <span className="w-32 text-slate-500">Cursus :</span>
                <span className="font-semibold text-slate-800">Cycle Ingénieur de l'ENP</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-500">Département :</span>
                <span className="font-semibold text-slate-800">Génie Civil & Aménagement</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-500">Date d'édition :</span>
                <span className="text-slate-800">{dateDuJour}</span>
              </div>
            </div>
          </div>

          {/* TABLEAU DES NOTES ET ÉVALUATIONS */}
          <div className="overflow-x-auto print:overflow-visible mb-5">
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-[#0d3b66] text-white">
                  <th className="p-2 border border-slate-400 font-semibold text-[11px] w-20">Code UE</th>
                  <th className="p-2 border border-slate-400 font-semibold text-[11px]">Intitulé de l'Enseignement</th>
                  <th className="p-2 border border-slate-400 font-semibold text-[11px] w-28">Nature</th>
                  <th className="p-2 border border-slate-400 font-semibold text-[11px] text-right w-20">Barème</th>
                  <th className="p-2 border border-slate-400 font-semibold text-[11px] text-right w-24">Note Obtenue</th>
                  <th className="p-2 border border-slate-400 font-semibold text-[11px] text-right w-24">Note / 20</th>
                  <th className="p-2 border border-slate-400 font-semibold text-[11px] text-center w-28">Décision Jury</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {notes.map((ligne, idx) => {
                  const sansNote = ligne.note === null;
                  const enDeliberation = !ligne.deliberee;
                  const noteSur20 = ligne.note !== null ? ((ligne.note / ligne.bareme) * 20).toFixed(2) : '-';
                  const estValide = ligne.note !== null && ligne.note >= ligne.bareme / 2;

                  return (
                    <tr
                      key={`${ligne.evaluationId}-${ligne.coursId}`}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                    >
                      <td className="p-2 border border-slate-300 font-mono font-bold text-[#0d3b66]">
                        {ligne.code}
                      </td>
                      <td className="p-2 border border-slate-300">
                        <p className="font-semibold text-slate-800">{ligne.intitule}</p>
                        <p className="text-[10px] text-slate-500">{ligne.libelle}</p>
                      </td>
                      <td className="p-2 border border-slate-300 uppercase text-[10px] font-medium text-slate-600">
                        {ligne.type === 'devoir' ? 'Contrôle Continu' : 'Examen Terminal'}
                      </td>
                      <td className="p-2 border border-slate-300 text-right font-mono text-slate-600">
                        /{ligne.bareme}
                      </td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-bold text-slate-800">
                        {enDeliberation ? (
                          <span className="text-[11px] text-amber-600 font-medium italic">En délibération</span>
                        ) : sansNote ? (
                          <span className="text-[11px] text-slate-400 italic">Non noté</span>
                        ) : (
                          ligne.note
                        )}
                      </td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-bold">
                        {enDeliberation || sansNote ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span className={estValide ? 'text-emerald-700' : 'text-rose-700'}>
                            {noteSur20}
                          </span>
                        )}
                      </td>
                      <td className="p-2 border border-slate-300 text-center text-[10px]">
                        {enDeliberation ? (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-semibold inline-block">
                            Attente Jury
                          </span>
                        ) : sansNote ? (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 inline-block">
                            Non noté
                          </span>
                        ) : estValide ? (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-semibold inline-block">
                            Validé
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 font-semibold inline-block">
                            Non validé
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* BILAN ACADÉMIQUE DE LA SESSION */}
          <div className="border border-slate-300 bg-slate-50 print:bg-slate-50/50 p-4 mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d3b66] mb-3 pb-1 border-b border-slate-200">
              Bilan & Délibération du Semestre
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 text-center">
              <div className="p-2 bg-white border border-slate-200">
                <p className="text-[10px] text-slate-500 uppercase">Moyenne Indicative</p>
                <p className="text-base font-bold font-mono text-[#0d3b66]">
                  {stats ? `${stats.moyenneSur20} / 20` : '-'}
                </p>
              </div>

              <div className="p-2 bg-white border border-slate-200">
                <p className="text-[10px] text-slate-500 uppercase">Mention Provisoire</p>
                <p className="text-base font-bold text-emerald-700">
                  {mention}
                </p>
              </div>

              <div className="p-2 bg-white border border-slate-200">
                <p className="text-[10px] text-slate-500 uppercase">Crédits ECTS Acquis</p>
                <p className="text-base font-bold font-mono text-slate-800">
                  {Math.round(creditsValides)} / {totalCreditsSemestre} ECTS
                </p>
              </div>

              <div className="p-2 bg-white border border-slate-200">
                <p className="text-[10px] text-slate-500 uppercase">Décision Jurys</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {stats && stats.enAttente > 0 ? 'Sous réserve' : 'Session Clôturée'}
                </p>
              </div>
            </div>
          </div>

          {/* SÉCURITÉ & SIGNATURES OFFICIELLES */}
          <div className="pt-2 text-[10px] text-slate-600 space-y-4">
            <p className="italic text-center text-[9px] text-slate-500">
              Le présent relevé officiel est délivré par le Système Pédagogique Intégré de l'École Nationale Polytechnique.
              Toute falsification ou rature entraîne de plein droit l'annulation du document et des poursuites disciplinaires.
            </p>

            <div className="grid grid-cols-2 print:grid-cols-2 gap-8 pt-4">
              {/* Visa Chef de Département */}
              <div className="border border-slate-300 p-3 text-center h-28 flex flex-col justify-between">
                <p className="font-bold text-[10px] text-[#0d3b66] uppercase">
                  Le Chef de Département
                </p>
                <p className="text-[9px] text-slate-400 italic">Visa & Signature</p>
              </div>

              {/* Sceau Direction des Études */}
              <div className="border border-slate-300 p-3 text-center h-28 flex flex-col justify-between">
                <p className="font-bold text-[10px] text-[#0d3b66] uppercase">
                  Pour le Directeur des Études & Examens
                </p>
                <p className="text-[9px] text-slate-400 italic">Sceau officiel de l'ENP & Signature</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-2 border-t border-slate-200">
              <span>Identifiant de certification numérique : ENP-RELEVE-2026-S1-{utilisateur?.id ?? '1001'}</span>
              <span>Fait à Lomé, le {dateDuJour}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
