# Déploiement de production – ENP

Ce document détaille la checklist minimale avant mise en ligne de la plateforme ENP.

## Exemple de configuration de production

Une configuration Docker de base est fournie dans [`infra/docker-compose.prod.yml`](../infra/docker-compose.prod.yml), avec :

- la base PostgreSQL
- le backend NestJS
- le frontend servi par Nginx
- le reverse proxy avec TLS prêt à recevoir les certificats dans [`infra/certs`](../infra/certs)

## 1. Pré-requis infra

- Domaine public dédié à la plateforme ENP
- Serveur Linux avec accès root ou sudo
- HTTPS activé via reverse proxy (Nginx ou Caddy)
- Certificats TLS gérés par Let’s Encrypt ou un équivalent institutionnel
- Base PostgreSQL distincte pour chaque rôle : application, urne, résultats
- Accès SSH restreint aux administrateurs techniques

## 2. Variables d’environnement de production

Copier `.env.example` vers `.env` puis remplacer les valeurs par les vraies valeurs de production.

À vérifier avant lancement :

- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL` est unique et différente de `DATABASE_URL_BALLOT` et `DATABASE_URL_RESULTS`
- `DATABASE_URL_BALLOT` est unique et distincte
- `DATABASE_URL_RESULTS` est unique et distincte
- `JWT_ACCESS_SECRET` est long et unique
- `JWT_REFRESH_SECRET` est long et distinct du secret d’accès
- `BALLOT_TOKEN_SECRET` est distinct des secrets JWT
- `ALLOWED_ORIGINS` contient uniquement le domaine front de production
- `COOKIE_SECURE=true`

## 3. Sécurité du reverse proxy

Le reverse proxy doit :

- écouter uniquement sur le port 443 et rediriger le port 80 vers HTTPS
- servir le frontend derrière un domaine propre
- proxy vers l’API NestJS sur localhost:3000
- appliquer des en-têtes de sécurité de base :
  - HSTS
  - X-Frame-Options
  - X-Content-Type-Options
  - Referrer-Policy
  - Content-Security-Policy

## 4. Sécurité applicative

Avant toute mise en production :

- vérifier que toutes les routes sont protégées par défaut
- garder les endpoints publics strictement limités à `/auth/login`, `/auth/refresh`, `/auth/logout`, `/health` et services publics explicites
- garder les rôles d’accès centralisés et tester chaque route sensible
- empêcher toute fuite d’informations dans les réponses d’erreur
- s’assurer qu’aucun candidat de vote n’est exposé dans les logs
- verrouiller les comptes en cas de répétition d’échecs de connexion

## 5. Données et base

- migrer les schémas SQL dans l’environnement de prod
- valider que le rôle application ne peut pas écrire dans la base urne ou résultat
- vérifier les permissions PostgreSQL par compte utilisateur
- mettre en place un plan de backup journalier
- conserver une procédure de restauration de la base déjà testée

## 6. Comptes d’administration

- ne créer que des comptes admin de confiance
- limiter l’accès administrateur à une liste strictement définie
- exiger une authentification forte et des sessions courtes
- tenir un journal d’audit des actions sensibles (modération, restitution, campagne, CSV)

## 7. Journal d’audit

À prévoir avant mise en ligne :

- un endpoint d’administration pour consulter les actions sensibles
- journalisation sans contenu de réponse ou de données de vote
- identifiant utilisateur + action + ressource + horodatage
- filtrage par campagne / département / type d’action

## 8. Rattachement organisations / département

À confirmer avec l’ENP avant ouverture officielle :

- référent scolarité
- responsables de département
- règle de rattachement étudiant / formation / UE / campagne
- droits de consultation résultats selon rôle
- procédure d’assignation de délégues et de gestion des campagnes

## 9. Validation finale

Checklist avant mise en ligne :

- [ ] .env de production renseigné et distinct de l’environnement local
- [ ] secrets JWT générés aléatoirement
- [ ] base de données séparée pour chaque rôle
- [ ] CORS restreint à l’origine front
- [ ] cookies sécurisés en production
- [ ] API accessible uniquement via HTTPS
- [ ] reverse proxy configuré et TLS actif
- [ ] tests backend passés
- [ ] build frontend validé
- [ ] comptes de test retirés ou isolés
- [ ] journalisation des actions administratives prévue
- [ ] recette avec comptes test de scolarité / enseignant / étudiant
- [ ] validation de la campagne en mode réel avec données ENP

## 10. Déploiement recommandé

1. Préparer l’environnement serveur et le domaine
2. Configurer PostgreSQL et les rôles
3. Générer les secrets de production
4. Déployer l’API et le frontend
5. Vérifier HTTPS et CORS
6. Exécuter une passe de tests de recette fonctionnelle
7. Restreindre les accès admin
8. Ouvrir la campagne en production

## 11. Point de vigilance

La base applicative est actuellement solide pour un MVP sécurisé. La partie “production complète” dépend surtout de la mise en place des procédures d’administration, de l’audit, et des éléments métiers ENP validés par la scolarité.
