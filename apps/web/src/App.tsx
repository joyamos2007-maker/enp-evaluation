import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { RequireAuth } from "@/auth/RequireAuth";
import { RequireRole } from "@/auth/RequireRole";
import { AppLayout } from "@/components/AppLayout";
import { Connexion } from "@/pages/Connexion";
import { Activation } from "@/pages/Activation";
import { Accueil } from "@/pages/Accueil";
import { Administration } from "@/pages/Administration";
import { DirectionStatistiques } from "@/pages/DirectionStatistiques";
import { AccesRefuse } from "@/pages/AccesRefuse";
import { PageIntrouvable } from "@/pages/PageIntrouvable";
import { ListeEvaluations } from "@/pages/ListeEvaluations";
import { EvaluationUE } from "@/pages/EvaluationUE";
import { MesResultats } from "@/pages/MesResultats";
import { FicheResultatUE } from "@/pages/FicheResultatUE";
import { CahierTexte } from "@/pages/CahierTexte";
import { FormSeance } from "@/pages/FormSeance";
import { DetailSeance } from "@/pages/DetailSeance";
import { Visas } from "@/pages/Visas";
import { Participation } from "@/pages/Participation";
import { SynthesePage } from "@/pages/SynthesePage";
import { TableauDeBordScolaritePage as ScolariteTableauDeBord } from "@/pages/ScolariteTableauDeBord";
import { ScolariteCampagnes } from "@/pages/ScolariteCampagnes";
import { ScolariteComptes } from "@/pages/ScolariteComptes";
import { ScolariteImports } from "@/pages/ScolariteImports";
import { ScolariteModeration } from "@/pages/ScolariteModeration";
import { ScolariteRestitution } from "@/pages/ScolariteRestitution";
import { ScolariteDeliberations } from "@/pages/ScolariteDeliberations";
import { RestitutionEtudiant } from "@/pages/RestitutionEtudiant";
import { EnseignantNotes } from "@/pages/EnseignantNotes";
import { EnseignantPresences } from "@/pages/EnseignantPresences";
import { EtudiantNotes } from "@/pages/EtudiantNotes";
import { EtudiantPresences } from "@/pages/EtudiantPresences";
import { SecuriteCompte } from "@/pages/SecuriteCompte";
import { ArchivesAnnuelles } from "@/pages/ArchivesAnnuelles";
import { Notifications } from "@/pages/Notifications";
import { JournalAudit } from "@/pages/JournalAudit";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Routes publiques */}
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/activation" element={<Activation />} />

          {/* Routes protégées — authentification requise */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Accueil />} />
            <Route path="/securite" element={<SecuriteCompte />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route
              path="/journal-audit"
              element={
                <RequireRole role="admin">
                  <JournalAudit />
                </RequireRole>
              }
            />
            <Route
              path="/archives-annuelles"
              element={
                <RequireRole role="admin">
                  <ArchivesAnnuelles />
                </RequireRole>
              }
            />

            {/* Étudiant & Délégué */}
            <Route
              path="/mes-notes"
              element={
                <RequireRole roles={["etudiant", "delegue"]}>
                  <EtudiantNotes />
                </RequireRole>
              }
            />
            <Route
              path="/mes-presences"
              element={
                <RequireRole roles={["etudiant", "delegue"]}>
                  <EtudiantPresences />
                </RequireRole>
              }
            />
            <Route
              path="/evaluations"
              element={
                <RequireRole roles={["etudiant", "delegue"]}>
                  <ListeEvaluations />
                </RequireRole>
              }
            />
            <Route
              path="/evaluations/:ueId"
              element={
                <RequireRole roles={["etudiant", "delegue"]}>
                  <EvaluationUE />
                </RequireRole>
              }
            />
            <Route
              path="/mes-evaluations"
              element={<Navigate to="/evaluations" replace />}
            />

            {/* Étudiant & Délégué — Restitution */}
            <Route
              path="/restitution"
              element={
                <RequireRole roles={["etudiant", "delegue"]}>
                  <RestitutionEtudiant />
                </RequireRole>
              }
            />

            {/* Délégué pour la saisie, enseignant pour la consultation et le visa */}
            <Route
              path="/cahier-texte"
              element={
                <RequireRole roles={["delegue", "enseignant", "etudiant"]}>
                  <CahierTexte />
                </RequireRole>
              }
            />
            <Route
              path="/cahier-texte/nouvelle"
              element={
                <RequireRole role="delegue">
                  <FormSeance />
                </RequireRole>
              }
            />
            <Route
              path="/cahier-texte/:id"
              element={
                <RequireRole roles={["delegue", "enseignant", "etudiant"]}>
                  <DetailSeance />
                </RequireRole>
              }
            />
            <Route
              path="/cahier-texte/:id/modifier"
              element={
                <RequireRole role="delegue">
                  <FormSeance />
                </RequireRole>
              }
            />

            {/* Enseignant */}
            <Route
              path="/enseignant/notes"
              element={
                <RequireRole role="enseignant">
                  <EnseignantNotes />
                </RequireRole>
              }
            />
            <Route
              path="/enseignant/presences"
              element={
                <RequireRole role="enseignant">
                  <EnseignantPresences />
                </RequireRole>
              }
            />
            <Route
              path="/resultats"
              element={
                <RequireRole role="enseignant">
                  <MesResultats />
                </RequireRole>
              }
            />
            <Route
              path="/resultats/:ueId"
              element={
                <RequireRole role="enseignant">
                  <FicheResultatUE />
                </RequireRole>
              }
            />
            <Route
              path="/mes-resultats"
              element={<Navigate to="/resultats" replace />}
            />
            <Route
              path="/visas"
              element={
                <RequireRole role="enseignant">
                  <Visas />
                </RequireRole>
              }
            />
            <Route
              path="/seances-a-viser"
              element={<Navigate to="/visas" replace />}
            />

            {/* Chef de département */}
            <Route
              path="/participation"
              element={
                <RequireRole role="chef_departement">
                  <Participation />
                </RequireRole>
              }
            />
            <Route
              path="/synthese"
              element={
                <RequireRole role="chef_departement">
                  <SynthesePage />
                </RequireRole>
              }
            />

            {/* Scolarité & Admin */}
            <Route
              path="/scolarite"
              element={
                <RequireRole roles={["scolarite", "admin"]}>
                  <ScolariteTableauDeBord />
                </RequireRole>
              }
            />
            <Route
              path="/scolarite/campagnes"
              element={
                <RequireRole roles={["scolarite", "admin"]}>
                  <ScolariteCampagnes />
                </RequireRole>
              }
            />
            <Route
              path="/scolarite/comptes"
              element={
                <RequireRole roles={["scolarite", "admin"]}>
                  <ScolariteComptes />
                </RequireRole>
              }
            />
            <Route
              path="/scolarite/imports"
              element={
                <RequireRole roles={["scolarite", "admin"]}>
                  <ScolariteImports />
                </RequireRole>
              }
            />
            <Route
              path="/scolarite/moderation"
              element={
                <RequireRole roles={["scolarite", "admin"]}>
                  <ScolariteModeration />
                </RequireRole>
              }
            />
            <Route
              path="/scolarite/deliberations"
              element={
                <RequireRole roles={["scolarite", "admin"]}>
                  <ScolariteDeliberations />
                </RequireRole>
              }
            />
            <Route
              path="/scolarite/restitution"
              element={
                <RequireRole roles={["scolarite", "admin"]}>
                  <ScolariteRestitution />
                </RequireRole>
              }
            />
            <Route
              path="/campagnes"
              element={<Navigate to="/scolarite/campagnes" replace />}
            />

            {/* Admin */}
            <Route
              path="/direction/statistiques"
              element={
                <RequireRole role="direction_etudes">
                  <DirectionStatistiques />
                </RequireRole>
              }
            />
            <Route
              path="/administration"
              element={
                <RequireRole roles={["admin", "direction_etudes"]}>
                  <Administration />
                </RequireRole>
              }
            />
          </Route>

          {/* Pages d'erreur */}
          <Route path="/acces-refuse" element={<AccesRefuse />} />
          <Route path="/404" element={<PageIntrouvable />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
