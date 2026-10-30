# Plateforme Officielle de l'École Nationale Polytechnique (ENP)
> République Togolaise : *« Travail - Liberté - Patrie »*

Portail institutionnel de gouvernance académique, d'évaluation collégiale des enseignements, de tenue du cahier de texte officiel, de gestion de l'assiduité et des délibérations d'examens.

---

## 1. Vue d'ensemble du Produit

La plateforme académique de l'ENP est conçue pour répondre aux plus hauts standards des institutions universitaires nationales et internationales d'ingénierie :

- **Étudiants :** Évaluation confidentielle et anonyme des unités d'enseignement (questionnaire officiel de 19 critères, sections A à E, sauvegarde automatique, respect du seuil de quorum ≥ 5 répondants), consultation des notes délibérées, historique d'assiduité et accès aux synthèses institutionnelles (Article 77).
- **Délégués de promotion :** Renseignement contradictoire et daté du cahier de texte (CM, TD, TP), déclaration des cours non dispensés ou des séances de rattrapage, suivi de la participation de cohorte.
- **Enseignants-Chercheurs :** Consultation des bilans d'évaluation pédagogique de leurs UE (avec masquage automatique sous le seuil d'anonymat), visa ou contestation formelle des séances du cahier de texte, carnet de notes interactif (devoirs continus et examens), registre d'émargement et d'assiduité.
- **Chefs de Département :** Pilotage en temps réel du taux de participation par promotion, synthèse départementale, formalisation des plans d'actions correctives et visas académiques.
- **Scolarité Centrale :** Gestion des campagnes d'évaluation (ouverture, surveillance, clôture), génération et distribution des fiches d'activation de comptes avec codes provisoires, imports massifs de référentiels par CSV (étudiants, UE, affectations, inscriptions) avec rapport de conformité ligne à ligne, modération déontologique des commentaires libres et organisation des délibérations de jurys d'examen.
- **Direction des Études :** Indicateurs consolidés multi-campus, contrôle automatisé de cohérence des référentiels, graphiques comparatifs institutionnels et publication officielle des rapports.
- **Administrateurs Techniques :** Gestion des référentiels (campus, départements, programmes), scellement des archives annuelles immuables en lecture seule et inspection du journal d'audit sécurisé.

---

## 2. Principes d'Identité Visuelle & Direction Artistique

L'interface adopte une esthétique rigoureuse, sobre et pérenne, reflétant l'autorité scientifique et l'excellence républicaine de l'École :

### Esthétique Rectiligne Stricte
- **Angles droits :** Rayon de bordure nul (`0px`) ou très faible (`rounded-sm` / maximum 2 à 4 px pour les modales).
- **Bannissement des tendances éphémères :** Aucun effet *glassmorphism*, aucun dégradé criard, aucune carte flottante arrondie ou style "bubble/gaming".
- **Hiérarchie et séparateurs nets :** Tableaux structurés à fort contraste, séparateurs horizontaux et verticaux précis (`#D8DEE5`), ombres très discrètes (`shadow-subtle` / `shadow-card`).
- **Animations discrètes et rapides :** Durée des transitions limitée entre 150 et 250 ms, respect strict de la directive `prefers-reduced-motion`.

### Palette Institutionnelle Officielle
- **Bleu institutionnel profond :** `#123B63` (En-tête, navigation principale, sceau officiel)
- **Bleu principal :** `#1F5A91` (Boutons d'action prioritaires, liens actifs, focus)
- **Bleu clair & Bleu très clair :** `#EAF2F8` / `#F5F9FC` (Fonds de tableau, sélections)
- **Vert de validation :** `#16845B` / `#0F766E` (Approbation, présence, publication officielle)
- **Vert clair :** `#E8F5EF` (Surfaces de confirmation et d'état validé)
- **Rouge institutionnel & Erreur :** `#A3262A` / `#C62828` (Refus, contestation, danger, suppression)
- **Rouge clair :** `#FCEBEC` (Surfaces d'alerte et de contestation)
- **Or institutionnel :** `#B08D35` (Sceau de l'École, mentions d'honneur et délibérations)
- **Gris de fond de travail :** `#F4F6F8` (Fond neutre limitant la fatigue visuelle)
- **Gris de bordure :** `#D8DEE5` (Lignes de séparation et champs institutionnels)
- **Noir d'encre institutionnel :** `#17212B` / `#263238` (Texte principal haute lisibilité)

### Accessibilité (WCAG 2.1 AA)
- Ratios de contraste texte/fond supérieurs à 4.5:1 sur l'ensemble des éléments.
- Indicateurs de focus au clavier visibles (`ring-2 ring-[#1F5A91] ring-offset-1`).
- Navigation complète au clavier (Tab, Échap, Entrée, flèches directionnelles).
- Support des lecteurs d'écran (attributs ARIA, `role="alert"`, `aria-expanded`, `aria-label`).
- Feuilles de style optimisées pour l'impression officielle (`print:`).

---

## 3. Architecture Technique Frontend

Le projet s'appuie sur une pile moderne, robuste et sans dépendances superflues :

```
apps/web/
├── src/
│   ├── api/                 # Client API REST (/api/v1), types TypeScript, mock mémoire
│   │   ├── client.ts        # Client fetch avec intercepteur 401 et mutex de rafraîchissement
│   │   ├── mock.ts          # Simulation complète et étanche des 7 espaces utilisateurs
│   │   └── types.ts         # Contrats TypeScript stricts
│   ├── auth/                # Contexte d'authentification, gardes RequireAuth et RequireRole
│   │   ├── AuthContext.tsx  # Gestion des rôles, session utilisateur et déconnexion
│   │   ├── RequireAuth.tsx  # Protection des routes authentifiées
│   │   └── RequireRole.tsx  # Filtrage strict selon le rôle actif en session
│   ├── components/          # Composants transverses et identité visuelle
│   │   ├── AppLayout.tsx    # Header bleu profond, sélecteur de rôle, sidebar, footer Togo
│   │   ├── ENPLogo.tsx      # Sceau géométrique officiel (compas, octogone, flambeau, or)
│   │   ├── menuConfig.ts    # Définition des entrées de menu par rôle et catégorie
│   │   └── ui/              # Bibliothèque de composants rectilignes réutilisables
│   │       ├── Alert.tsx        # Alertes institutionnelles avec bordure gauche
│   │       ├── Badge.tsx        # Badges de statut et de rôle
│   │       ├── Button.tsx       # Boutons primaires, secondaires, outline, danger, ghost
│   │       ├── ConfirmDialog.tsx# Boîtes modales de confirmation d'action irréversible
│   │       ├── DataFilters.tsx  # Barre de recherche et de filtrage
│   │       ├── Modal.tsx        # Modales accessibles avec piège de focus
│   │       ├── PageHeader.tsx   # En-têtes officiels avec fil d'Ariane
│   │       ├── ProgressBar.tsx  # Barres de progression d'avancement horaire et quorum
│   │       ├── StatCard.tsx     # Cartes d'indicateurs clés et statistiques
│   │       ├── Table.tsx        # Tableaux de données structurés (data-driven et JSX)
│   │       ├── Tabs.tsx         # Navigation par onglets rectilignes
│   │       └── Toast.tsx        # Système de notifications contextuelles
│   ├── pages/               # Écrans applicatifs par espace utilisateur
│   │   ├── Connexion.tsx            # Portail d'accès avec presets de test et MFA
│   │   ├── Activation.tsx           # Activation sécurisée par fiche individuelle
│   │   ├── MotDePasseOublie.tsx     # Récupération sans fuite d'information
│   │   ├── Reinitialisation.tsx     # Code de réinitialisation temporaire
│   │   ├── MfaPage.tsx              # Page explicative de l'authentification renforcée
│   │   ├── Accueil.tsx              # Tableau de bord adaptatif selon le rôle actif
│   │   ├── Profil.tsx               # Fiche usager, changement de profil et coordonnées
│   │   ├── SecuriteCompte.tsx       # Configuration MFA TOTP et mot de passe
│   │   ├── ListeEvaluations.tsx     # Liste des cours à évaluer par l'étudiant
│   │   ├── EvaluationUE.tsx         # Questionnaire officiel (19 critères A à E)
│   │   ├── RestitutionEtudiant.tsx  # Restitutions publiques (Article 77)
│   │   ├── EtudiantNotes.tsx        # Relevé personnel des devoirs et examens
│   │   ├── EtudiantPresences.tsx    # Feuille individuelle d'émargement
│   │   ├── CahierTexte.tsx          # Cahier de texte officiel (timeline, tableau, calendrier)
│   │   ├── FormSeance.tsx           # Saisie et révision des séances (CM/TD/TP)
│   │   ├── DetailSeance.tsx         # Consultation, visa, contestation et pièces jointes
│   │   ├── Visas.tsx                # Espace enseignant de visa des séances
│   │   ├── MesResultats.tsx         # Répertoire des résultats d'évaluation enseignant
│   │   ├── FicheResultatUE.tsx      # Rapport statistique détaillé (Recharts, masquage <5)
│   │   ├── EnseignantNotes.tsx      # Carnet de notes enseignant et export PDF/Excel
│   │   ├── EnseignantPresences.tsx  # Registre d'assiduité séance par séance
│   │   ├── Participation.tsx        # Suivi de mobilisation par département
│   │   ├── SynthesePage.tsx         # Synthèse départementale et plan d'actions
│   │   ├── ScolariteTableauDeBord.tsx # Vue consolidée et alertes scolarité
│   │   ├── ScolariteCampagnes.tsx   # Création, ouverture et clôture des campagnes
│   │   ├── ScolariteComptes.tsx     # Gestion des comptes et fiches d'activation
│   │   ├── ScolariteImports.tsx     # Wizard d'import CSV en 5 étapes avec validation
│   │   ├── ScolariteModeration.tsx  # Modération déontologique des commentaires
│   │   ├── ScolariteDeliberations.tsx # Délibération et publication des notes d'examen
│   │   ├── ScolariteRestitution.tsx # Rédaction et diffusion de la restitution officielle
│   │   ├── DirectionStatistiques.tsx# Supervision nationale et contrôles de cohérence
│   │   ├── Administration.tsx       # Référentiels (Campus, Départements, Programmes)
│   │   ├── ArchivesAnnuelles.tsx    # Snapshots décennaux immuables
│   │   ├── JournalAudit.tsx         # Journal d'audit et traçabilité horodatée
│   │   ├── Notifications.tsx        # Centre de notifications officielles
│   │   ├── AccesRefuse.tsx          # Écran 403 institutionnel
│   │   └── PageIntrouvable.tsx      # Écran 404 institutionnel
│   ├── App.tsx              # Déclaration exhaustive des routes
│   └── main.tsx             # Point d'entrée React 18
```

---

## 4. Sécurité & Intégration Backend

L'application communique nativement avec le backend NestJS sous le préfixe `/api/v1` selon les règles d'intégrité suivantes :

1. **Jeton d'accès court en mémoire vive uniquement :** L'access token JWT n'est jamais stocké dans `localStorage` ni `sessionStorage` pour prévenir toute attaque XSS.
2. **Refresh Token sécurisé :** Le jeton de renouvellement transite exclusivement via un cookie `HttpOnly`, `SameSite=Strict` et `Secure`.
3. **Intercepteur 401 avec promesse mutualisée :** En cas d'expiration du token court, les requêtes concurrentes partagent un appel unique à `/auth/refresh`. La requête d'origine est rejouée une seule fois. En cas d'échec du refresh, la session est invalidée et l'usager est redirigé vers `/connexion`.
4. **Dissociation stricte de l'anonymat étudiant :**
   - Le vote d'évaluation s'effectue via `POST /ballots` sans authentification nominative.
   - Le jeton anonyme à usage unique est définitivement invalidé après dépôt.
   - Les résultats d'une UE ne sont consultables que si le quorum de **5 répondants distincts** est atteint (`detailDisponible: false` sinon).
5. **Défense en profondeur :** Même si les routes sont protégées côté client via `RequireAuth` et `RequireRole`, le serveur NestJS demeure l'autorité finale de contrôle des autorisations.

---

## 5. Guide de Démarrage et Commandes

### Prérequis
- Node.js (version 18 ou supérieure)
- npm ou pnpm

### Installation des Dépendances
```bash
cd apps/web
npm install
```

### Configuration de l'Environnement
Créez ou adaptez votre fichier `.env` :
```env
# Mettre "true" pour le mode démonstration autonome avec données fictives
# Mettre "false" pour dialoguer avec l'API NestJS locale sur http://localhost:3000/api/v1
VITE_USE_MOCK=true
VITE_API_BASE_URL=/api/v1
```

### Lancement en Mode Développement
```bash
npm run dev
```
L'application démarre sur `http://localhost:5173`. En mode mock (`VITE_USE_MOCK=true`), l'écran de connexion propose des raccourcis à 1 clic pour endosser chacun des 7 rôles institutionnels (Étudiant, Délégué, Enseignant, Chef de Département, Scolarité, Direction des Études, Administrateur).

### Vérification Stricte des Types (TypeScript)
```bash
npm run typecheck
```

### Compilation de Production
```bash
npm run build
```
Les fichiers statiques optimisés sont générés dans le dossier `dist/`.

---

## 6. Conformité Institutionnelle

Plateforme développée dans le respect des directives de la Direction Générale de l'École Nationale Polytechnique (ENP), du Règlement Général des Études (notamment l'article 77 relatif à la restitution aux étudiants) et des standards d'accessibilité du Référentiel Général d'Amélioration de l'Accessibilité (RGAA / WCAG 2.1 AA).
