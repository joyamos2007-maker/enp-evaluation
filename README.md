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

- [x] protections de routes par défaut activées
- [x] rôles d'accès codés et contrôlés par les garde-fous
- [x] séparation du registre / de l'urne / des résultats
- [x] secrets distincts pour access, refresh et vote
- [x] validation des variables d'environnement au démarrage
- [ ] configuration HTTPS / reverse proxy / DNS
- [ ] CORS et politique de sécurité production
- [ ] purge des sessions expirées et audit de connexion
- [ ] route d'administration pour journal d'audit
- [ ] rattachement chef de département / scolarité
- [ ] recette finale avec comptes de test et données ENP
- [ ] déploiement et validation de la campagne de production

## Documentation technique

- `docs/decisions.md` : historique des décisions architecturales et de sécurité
- `docs/deploiement-production.md` : checklist de mise en production et d’exploitation

## Points de vigilance avant livraison

- Le code est prêt pour un MVP solide, mais la production exige encore les éléments d'administration et de sécurité infra de dernier niveau.
- Les comptes d'administration doivent être strictement limités et ne jamais utiliser un rôle superutilisateur sur la base.
- Les logs doivent respecter le principe de confidentialité : aucun journal des contenus de vote ni des données sensibles.

