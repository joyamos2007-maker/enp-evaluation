# Plateforme d'évaluation des enseignements et cahier de texte (ENP)

Plateforme web permettant aux étudiants d'évaluer anonymement les enseignements
(article 77 du Règlement des Études de l'ENP), aux délégués de renseigner le
cahier de texte et aux enseignants de consulter leurs résultats.

## Statut

Projet en phase de finalisation MVP. La base fonctionnelle est disponible et les
protections de sécurité essentielles sont en place.

## Structure du dépôt

- `apps/api` : backend NestJS
- `apps/web` : frontend React + Vite
- `docs` : décisions techniques et documentation de projet
- `infra` : scripts SQL et fichiers de déploiement

## Démarrage rapide

Backend :

```bash
cd apps/api
npm install
npm run start:dev
```

Frontend :

```bash
cd apps/web
npm install
npm run dev
```

### URLs localement

- API : http://localhost:3000
- Frontend : http://localhost:5173

## Variables d'environnement

Copier `.env.example` vers `.env` et remplir les valeurs de production.

Valeurs à garantir :

- `DATABASE_URL` : base principale pour l'application
- `DATABASE_URL_BALLOT` : base dédiée à l'urne, différente de `DATABASE_URL`
- `DATABASE_URL_RESULTS` : base dédiée aux résultats, différente des deux autres
- `JWT_ACCESS_SECRET` : secret HS256 pour les accès, au moins 32 caractères
- `JWT_REFRESH_SECRET` : secret distinct pour les refresh tokens, au moins 32 caractères
- `BALLOT_TOKEN_SECRET` : secret distinct pour les jetons de vote, au moins 32 caractères
- `APP_URL` : URL publique du frontend autorisé
- `ALLOWED_ORIGINS` : liste des origines front autorisées, séparées par des virgules
- `NODE_ENV` : `development` ou `production`

Règles de sécurité :

- les trois secrets doivent être distincts
- les URLs de base doivent être différentes entre `DATABASE_URL`, `DATABASE_URL_BALLOT` et `DATABASE_URL_RESULTS`
- en production, le cookie de session doit être servi avec `secure: true`
- `ALLOWED_ORIGINS` doit être restreint au seul domaine/port frontend approuvé
- ne jamais exposer de jeton de session côté JavaScript

## Checklist de finalisation de production

- [X] protections de routes par défaut activées
- [X] rôles d'accès codés et contrôlés par les garde-fous
- [X] séparation du registre / de l'urne / des résultats
- [X] secrets distincts pour access, refresh et vote
- [X] validation des variables d'environnement au démarrage
- [ ] configuration HTTPS / reverse proxy / DNS
- [ ] CORS et politique de sécurité production
- [ ] purge des sessions expirées et audit de connexion
- [ ] route d'administration pour journal d'audit
- [X] rattachement du Service Scolarité à un campus
- [ ] rattachement opérationnel du Chef de département à son département
- [ ] recette finale avec comptes de test et données ENP
- [ ] déploiement et validation de la campagne de production

## Documentation technique

- `docs/decisions.md` : historique des décisions architecturales et de sécurité
- `docs/deploiement-production.md` : checklist de mise en production et d’exploitation

## Rôles académiques et périmètres

- `direction_etudes` est un rôle global ENP : il consulte la synthèse multisite,
  publie les statistiques d'une période et consulte les contrôles académiques.
- `scolarite` est affecté à un seul campus. Ses listes, campagnes, imports,
  résultats, modérations et restitutions sont limités à ce campus.
- `chef_departement` reste un rôle distinct, rattaché à un département, avec
  consultation des résultats limitée à ce département, suivi de la participation,
  synthèse de campagne et saisie des suites données.
- Les statistiques publiées sont consultables par tout utilisateur authentifié ;
  les contrôles et la publication restent réservés à la Direction des Études.

Routes principales :

- `GET /api/v1/direction/statistiques?anneeUniversitaire=2026-2027&semestre=5`
- `POST /api/v1/direction/statistiques/publications` avec ces champs de période
- `GET /api/v1/direction/controles-academiques` (filtres de période facultatifs)
- `GET /api/v1/statistiques-enp`
- Le Chef de département utilise `GET /api/v1/pilotage/campagnes`, les routes
  `/api/v1/pilotage/campagnes/:id/participation` et `/synthese`, et
  `PUT /api/v1/pilotage/campagnes/:id/suites`. Ces routes limitent les données à
  son département. Appliquer `infra/sql/011_chef_departement_pilotage.sql`.
- `GET /api/v1/administration/scolarites` et `POST /api/v1/administration/scolarites`
  avec `{ "userId": 12, "campusId": 3 }` pour affecter un compte à un campus.
- Le cycle d’activation et de réinitialisation utilise `POST /api/v1/auth/activate`,
  `POST /api/v1/auth/password-reset/request` et
  `POST /api/v1/auth/password-reset/confirm`. Les codes sont expirables, à usage
  unique et stockés hachés. Le changement de mot de passe révoque les sessions.
- Les profils privilégiés passent par `POST /api/v1/auth/mfa/verify` après le
  mot de passe. Le code e-mail est obligatoire ; TOTP peut être configuré dans
  l’espace **Sécurité du compte**. `POST /api/v1/auth/profil-actif` met à jour
  le rôle effectif et le conserve à la prochaine rotation du cookie.
- Les imports académiques suivent le cycle
  `POST /api/v1/imports/:type/verification` (multipart `fichier`), puis
  `POST /api/v1/imports/:type/valider` avec `{ "importId": "..." }`.
  Types pris en charge : `etudiants`, `enseignants`, `ue`, `offres`,
  `affectations`, `inscriptions` et `delegues`. Les fichiers comptes existants
  restent aussi importables via `POST /api/v1/imports/users`. Les lignes
  invalides sont rapportées et exclues du lot appliqué.
- Les affectations enseignants et les mandats titulaire/suppléant se gèrent via
  `/api/v1/affectations`. Les imports et mutations refusent une année déjà
  archivée. L’administration peut créer/lire les snapshots en lecture seule
  via `/api/v1/archives/annuelles`.
- `direction_etudes` peut consulter la liste des campus et en ajouter via
  `GET /api/v1/administration/referentiels` et `POST /api/v1/administration/campus`.
- Le délégué peut renseigner le cahier de texte de sa classe et participer aux
  évaluations des cours de sa délégation. Les enseignants voient leurs séances,
  visent les cours qui leur sont affectés et peuvent consulter le cahier.
- Le cahier de texte et les visas utilisent les routes `/api/v1/cahier-texte`.
  Appliquer `infra/sql/010_cahier_texte.sql` avant de déployer cette fonctionnalité.
  Les heures prévues peuvent être renseignées par cours dans `ref.course`
  (`heures_cm_prevues`, `heures_td_prevues`, `heures_tp_prevues`).
- Les enseignants saisissent les notes et présences via `/api/v1/dossier-academique`.
  Appliquer `infra/sql/012_notes_presences.sql` pour créer les colonnes d’évaluation,
  les notes et les séances/émargements. Les droits sont limités aux UE affectées
  à l’enseignant ; l’étudiant ne consulte que ses propres notes et présences.
- Les notes d’examen restent masquées aux étudiants jusqu’à la délibération de
  chaque évaluation par la Scolarité dans `/scolarite/deliberations`. Une
  délibération n’est possible que lorsque chaque étudiant inscrit a une note ;
  après publication, l’enseignant ne peut plus modifier ces notes.
- L'import CSV accepte les colonnes facultatives `campusId` et `departmentId`
  pour rattacher respectivement un Service Scolarité et un Chef de département.

Les contrôles académiques rapportent les campagnes ouvertes échues ou sans cours
ou critère, les campagnes clôturées sans date de clôture et les campagnes
restituées sans publication. Les règles académiques supplémentaires propres à
l'ENP devront être précisées avant de les ajouter à ce rapport.

### Migrations PostgreSQL

Appliquer les migrations dans l'ordre, depuis la racine du dépôt et avec un
compte propriétaire du schéma (pas le rôle applicatif `app_main`) :

1. `infra/sql/008_step_a_multi_campus_imports.sql` : périmètres campus /
   département et affectations des Chefs de département.
2. `infra/sql/009_direction_etudes.sql` : rôle global de Direction des Études
   et publications statistiques.
3. `infra/sql/010_cahier_texte.sql` : séances du cahier de texte et heures
   prévues des cours.
4. `infra/sql/011_chef_departement_pilotage.sql` : notes de synthèse et suites
   données par les Chefs de département.
5. `infra/sql/012_notes_presences.sql` : notes configurables et présences par séance.
6. `infra/sql/013_deliberation_examens.sql` : registre des délibérations des examens.
7. `infra/sql/014_auth_lifecycle.sql` : codes à usage unique d’activation/réinitialisation,
   MFA TOTP et profil actif de session.
8. `infra/sql/015_imports_affectations_archives.sql` : imports en deux phases,
   mandats de délégués et snapshots annuels immuables.
9. `infra/sql/016_notifications_exports_cahier_audit.sql` : planification de
   séances, rappels, boîte d’envoi, pièces jointes et historique immuable.

Avec `psql`, lancer chaque fichier séparément et attendre sa réussite avant de
passer au suivant. `-W` demande le mot de passe sans l'inscrire dans la commande :

```powershell
psql -h <serveur> -p <port> -U <proprietaire> -d enp_evaluation -W -v ON_ERROR_STOP=1 -f infra/sql/008_step_a_multi_campus_imports.sql
psql -h <serveur> -p <port> -U <proprietaire> -d enp_evaluation -W -v ON_ERROR_STOP=1 -f infra/sql/009_direction_etudes.sql
psql -h <serveur> -p <port> -U <proprietaire> -d enp_evaluation -W -v ON_ERROR_STOP=1 -f infra/sql/010_cahier_texte.sql
psql -h <serveur> -p <port> -U <proprietaire> -d enp_evaluation -W -v ON_ERROR_STOP=1 -f infra/sql/011_chef_departement_pilotage.sql
psql -h <serveur> -p <port> -U <proprietaire> -d enp_evaluation -W -v ON_ERROR_STOP=1 -f infra/sql/012_notes_presences.sql
psql -h <serveur> -p <port> -U <proprietaire> -d enp_evaluation -W -v ON_ERROR_STOP=1 -f infra/sql/013_deliberation_examens.sql
psql -h <serveur> -p <port> -U <proprietaire> -d enp_evaluation -W -v ON_ERROR_STOP=1 -f infra/sql/014_auth_lifecycle.sql
psql -h <serveur> -p <port> -U <proprietaire> -d enp_evaluation -W -v ON_ERROR_STOP=1 -f infra/sql/015_imports_affectations_archives.sql
psql -h <serveur> -p <port> -U <proprietaire> -d enp_evaluation -W -v ON_ERROR_STOP=1 -f infra/sql/016_notifications_exports_cahier_audit.sql
```

Après `014_auth_lifecycle.sql`, configurer les variables SMTP dans `.env`.
Générer une clé de chiffrement aléatoire distincte par environnement avec
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` puis
la placer dans `MFA_ENCRYPTION_KEY`. Conserver cette clé sauvegardée : sa perte
empêche la validation des secrets TOTP existants. Définir aussi une valeur
aléatoire distincte d’au moins 32 caractères dans `MFA_CHALLENGE_SECRET`.

Les comptes `admin`, `scolarite`, `direction_etudes` et `chef_departement`
doivent avoir une adresse e-mail renseignée et confirmée : la connexion exige
une validation MFA par code e-mail. Ils peuvent ajouter une application TOTP
dans **Sécurité du compte**. Les comptes multi-rôles disposent d’un sélecteur
de profil actif ; l’API conserve ce choix lors du renouvellement de session.

Après application de `016`, les délégués peuvent planifier une séance future ;
les étudiants inscrits reçoivent un rappel intégré et un courriel dans les
24 heures précédant son début. Les campagnes d’évaluation ouvertes font l’objet
d’un rappel dans les 48 heures précédant leur clôture, uniquement aux étudiants
inscrits qui n’ont pas encore participé selon le registre de participation.
Les courriels en échec sont réessayés avec délai croissant, jusqu’à huit essais.
Les pièces jointes du cahier sont limitées aux PDF/PNG/JPEG valides de 10 Mo
maximum. Les exports PDF, Excel et Word respectent les mêmes périmètres d’accès
que la consultation du cahier. La MFA et la réinitialisation du mot de passe
placent leurs courriels dans la même boîte d’envoi avec une date d’expiration ;
les données destinataire et contenu sont effacées après livraison ou abandon.
L’administration consulte les événements récents via **Journal d’audit**.

On peut aussi ouvrir chaque fichier dans pgAdmin et l'exécuter connecté avec le
même compte propriétaire. Ne pas utiliser `app_main` pour les migrations : il
n'est pas propriétaire des objets nécessaires. Les migrations 008 à 011 ont été
appliquées dans la base Docker locale utilisée pour la recette de ce projet.

### Données académiques de démonstration

`infra/sql/dev-donnees-academiques.sql` ajoute des campus, départements,
programmes, UE, cours et campagnes de démonstration. Le script est relançable,
conserve les données existantes et crée les nouvelles campagnes en brouillon.
Lancer ce fichier dans pgAdmin ou avec `psql` connecté à `enp_evaluation` après
la création des référentiels et du questionnaire actif. Il ne remplace pas
`infra/sql/dev-donnees-test.sql`, qui concerne les comptes fictifs.

Après les migrations 010 et 012, exécuter `infra/sql/dev-donnees-test.sql`,
puis `infra/sql/dev-donnees-notes-presences.sql`. Ce dernier ajoute des colonnes
de devoir/examen, des notes, trois séances et les statuts présent/absent/retard
pour les comptes `TEST-1001` (enseignant), `TEST-1002` (enseignante) et les
étudiants `TEST-0001` à `TEST-0005`. Les scripts sont réservés au développement;
ils ne remplacent pas les mots de passe des comptes de test.

Pour appliquer la migration et les données à la base Docker locale depuis
PowerShell, à la racine du dépôt :

```powershell
Get-Content -Raw infra\sql\012_notes_presences.sql | docker compose -f infra\docker-compose.yml exec -T db psql -U enp -d enp_evaluation -v ON_ERROR_STOP=1
Get-Content -Raw infra\sql\013_deliberation_examens.sql | docker compose -f infra\docker-compose.yml exec -T db psql -U enp -d enp_evaluation -v ON_ERROR_STOP=1
Get-Content -Raw infra\sql\dev-donnees-test.sql | docker compose -f infra\docker-compose.yml exec -T db psql -U enp -d enp_evaluation -v ON_ERROR_STOP=1
Get-Content -Raw infra\sql\dev-donnees-notes-presences.sql | docker compose -f infra\docker-compose.yml exec -T db psql -U enp -d enp_evaluation -v ON_ERROR_STOP=1
```

La migration 012 et le jeu de données notes/présences ont été appliqués et
vérifiés dans la base Docker locale du projet.

## Points de vigilance avant livraison

- Le code est prêt pour un MVP solide, mais la production exige encore les éléments d'administration et de sécurité infra de dernier niveau.
- Les comptes d'administration doivent être strictement limités et ne jamais utiliser un rôle superutilisateur sur la base.
- Les logs doivent respecter le principe de confidentialité : aucun journal des contenus de vote ni des données sensibles.
