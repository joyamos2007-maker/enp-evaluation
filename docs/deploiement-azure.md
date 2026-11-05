# Preparation du deploiement Azure

Ce guide prepare une mise en ligne sur Azure sans creer de ressources ni publier
de secrets. L'architecture recommandee garde l'interface et l'API sous une seule
origine HTTPS afin de conserver le fonctionnement des cookies de session stricts.

## Architecture cible

- **Azure Container Apps** : une Container App avec deux conteneurs dans la meme
  application :
  - `web` : Nginx et les fichiers React, ingress externe sur le port 8080 ;
  - `api` : NestJS sur le port 3000, conteneur sidecar sans ingress public.
- **Azure Database for PostgreSQL Flexible Server** : un serveur gere et une
  base logique `enp_evaluation`, accessible depuis Container Apps de preference
  par un reseau prive.
- **Azure Container Registry** : stockage des images versionnees de l'API et du
  frontend.
- **Azure Key Vault** : stockage recommande des mots de passe PostgreSQL, secrets
  JWT/MFA et identifiants SMTP ; les valeurs sont injectees comme secrets dans
  Container Apps, jamais dans Git ou dans les images.

Le proxy Nginx sert le frontend et transmet `/api/*` au sidecar API sur
`127.0.0.1:3000`. Le navigateur ne contacte donc qu'une origine. Cela est
important : le client web utilise des requetes de meme origine et les cookies
de session `HttpOnly`, `Secure` et `SameSite=Strict` restent utilisables. Ne pas
publier le port 3000 de l'API ni configurer une URL API sur un domaine distinct
sans concevoir explicitement une nouvelle politique de cookies et CORS.

L'ingress Azure doit forcer HTTPS (HTTP non securise desactive). Le certificat
TLS est termine par Azure ; Nginx ecoute en HTTP interne sur le port 8080.
Configurer au moins une replique pour eviter le demarrage a froid lors de
l'utilisation de la plateforme.

## Comment la base est geree

Le code ouvre trois pools PostgreSQL distincts, mais ils doivent viser la meme
base logique et partager le meme schema de donnees :

| Variable | Role PostgreSQL | Droits attendus |
|---|---|---|
| `DATABASE_URL` | `app_main` | donnees applicatives ; aucun acces au schema `ballot` |
| `DATABASE_URL_BALLOT` | `ballot_app` | depot de bulletins ; pas d'acces aux identites ni au registre |
| `DATABASE_URL_RESULTS` | `results_app` | lecture seule des bulletins melanges ; pas d'identites, de registre ou d'ecriture dans l'urne |

Cette separation porte sur les **comptes et privileges**, pas sur trois serveurs
ou trois bases physiques. Les requetes d'evaluation et de resultats referencent
des schemas PostgreSQL communs (`evaluation`, `ballot`, `identity`, etc.) ; des
bases distinctes ne peuvent pas satisfaire ces requetes telles qu'elles sont
codees actuellement.

Exemple de forme pour Azure (remplacer les valeurs et encoder les caracteres
speciaux du mot de passe dans l'URL) :

```text
postgresql://app_main:<mot-de-passe>@<serveur>.postgres.database.azure.com:5432/enp_evaluation?sslmode=require
postgresql://ballot_app:<mot-de-passe>@<serveur>.postgres.database.azure.com:5432/enp_evaluation?sslmode=require
postgresql://results_app:<mot-de-passe>@<serveur>.postgres.database.azure.com:5432/enp_evaluation?sslmode=require
```

Les scripts de base et migrations SQL sont conserves dans `infra/sql`. Les
appliquer dans l'ordre documente dans le README, avec un compte proprietaire/
administrateur de migration, jamais avec `app_main`. Les scripts `06-urne.sql`
et `07-resultats.sql` creent les roles `ballot_app` et `results_app` s'ils
n'existent pas ; definir ensuite un mot de passe distinct pour chaque role et
injecter les trois URLs dans les parametres/secrets de l'API. Ne pas charger en
production les fichiers `dev-donnees-*.sql`.

Activer les sauvegardes automatisees et la restauration a un instant donne de
PostgreSQL Flexible Server. Choisir la retention et la haute disponibilite selon
les exigences ENP et le budget ; tester une restauration avant l'ouverture.

## Images de conteneur

Depuis la racine du depot, construire les images en utilisant un tag immuable
(par exemple le SHA du commit), puis les pousser dans ACR :

```powershell
az acr build --registry <NOM_ACR> --image enp-api:<TAG> --file apps/api/Dockerfile .
az acr build --registry <NOM_ACR> --image enp-web:<TAG> --file apps/web/Dockerfile.azure .
```

Pour une base Azure de test deja migree jusqu'a `016`, la migration MFA `017`
doit etre executee seule, jamais via l'image qui rejoue toute la chaine :

```powershell
az acr build --registry <NOM_ACR> --image enp-mfa-migration:<TAG> --file infra/sql/Dockerfile.mfa-017 .
az containerapp job update --resource-group <RESOURCE_GROUP> --name db-migration-job --image <NOM_ACR>.azurecr.io/enp-mfa-migration:<TAG>
az containerapp job start --resource-group <RESOURCE_GROUP> --name db-migration-job
```

Verifier que l'execution du job finit avec le statut `Succeeded` avant de
deployer l'API et le frontend. Cette image n'execute que `017_mfa_trusted_devices.sql`.
Ne pas lancer `Dockerfile.migrations` sur une base deja migree.

Pour activer le changement d'adresse e-mail, construire et executer la migration
018 separement, apres la migration 017 :

```powershell
az acr build --registry <NOM_ACR> --image enp-email-migration:<TAG> --file infra/sql/Dockerfile.mfa-018 .
az containerapp job update --resource-group <RESOURCE_GROUP> --name db-migration-job --image <NOM_ACR>.azurecr.io/enp-email-migration:<TAG>
az containerapp job start --resource-group <RESOURCE_GROUP> --name db-migration-job
```

Attendre le statut `Succeeded` avant de deployer l'API qui utilise la table
`identity.email_change_requests`.

Pour remplacer le role global de direction par les roles campus et general,
construire puis executer la migration 019 apres une sauvegarde de la base :

```powershell
az acr build --registry <NOM_ACR> --image enp-directions-migration:<TAG> --file infra/sql/Dockerfile.directions-019 .
az containerapp job update --resource-group <RESOURCE_GROUP> --name db-migration-job --image <NOM_ACR>.azurecr.io/enp-directions-migration:<TAG>
az containerapp job start --resource-group <RESOURCE_GROUP> --name db-migration-job
```

La migration convertit les anciens comptes `direction_etudes` en
`directeur_general`. Attendre le statut `Succeeded` avant de mettre a jour l'API.

`Dockerfile.azure` construit le frontend avec `VITE_USE_MOCK=false` et
`VITE_API_BASE_URL=/api/v1` : le mode maquette n'est donc pas embarque en
production ; le module contenant les comptes de demonstration est remplace
pendant un build sans maquette. Les Dockerfiles utilisent `npm ci` et le
lockfile pour rendre les builds reproductibles. Le `.dockerignore` exclut les
fichiers `.env`, les dependances locales et les sorties de build du contexte
envoye a ACR.

Dans Container Apps, configurer les deux images dans la meme application :

- conteneur `web` : image `enp-web:<TAG>`, port 8080 ; seule cible de l'ingress
  externe ;
- conteneur `api` : image `enp-api:<TAG>`, `PORT=3000` ; aucun ingress externe ;
- l'ingress externe dirige le trafic HTTPS vers le port 8080 ;
- les conteneurs partagent le reseau local ; Nginx proxy `/api/` vers
  `127.0.0.1:3000` ;
- configurer une sonde de disponibilite API sur `GET /api/v1/health` port 3000
  et une sonde web sur le port 8080.

Apres validation de la migration, mettre a jour les deux conteneurs avec les
images construites :

```powershell
az containerapp update --resource-group <RESOURCE_GROUP> --name <CONTAINER_APP> --container-name api --image <NOM_ACR>.azurecr.io/enp-api:<TAG>
az containerapp update --resource-group <RESOURCE_GROUP> --name <CONTAINER_APP> --container-name web --image <NOM_ACR>.azurecr.io/enp-web:<TAG>
```

Le workflow GitHub Actions `ci.yml` execute les builds et tests, mais ne publie
pas d'image et ne met pas a jour Azure : un push GitHub seul ne redeploie pas
l'application.

## Configuration de l'API

Definir les parametres non secrets dans la configuration de la Container App :

```text
NODE_ENV=production
PORT=3000
COOKIE_SECURE=true
APP_URL=https://<URL-PUBLIQUE-CONTAINER-APP>
ALLOWED_ORIGINS=https://<URL-PUBLIQUE-CONTAINER-APP>
SESSION_TTL_MINUTES=30
ACCESS_TOKEN_TTL_MINUTES=15
```

Injecter par Key Vault/Container Apps secrets, avec des valeurs aleatoires et
independantes : `DATABASE_URL`, `DATABASE_URL_BALLOT`, `DATABASE_URL_RESULTS`,
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `BALLOT_TOKEN_SECRET`,
`MFA_CHALLENGE_SECRET`, `MFA_ENCRYPTION_KEY`, `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` et `SMTP_FROM`. La cle
`MFA_ENCRYPTION_KEY` doit etre de 64 caracteres hexadecimaux. Garder une copie
securisee des secrets MFA : leur perte peut rendre les secrets TOTP existants
illisibles.

Le serveur PostgreSQL doit autoriser uniquement l'acces reseau requis par
Container Apps. Activer TLS PostgreSQL, utiliser `sslmode=require` dans les
URLs et ne pas ouvrir le port 5432 a Internet. Ne pas placer les secrets dans
une image, un fichier versionne ou une commande shell conservee dans
l'historique.

## Verification avant ouverture

1. Appliquer les scripts SQL et verifier les privileges avec chacun des trois
   roles.
2. Verifier que le health check renvoie HTTP 200 et
   `{"statut":"ok","bases":{"application":"ok","urne":"ok","resultats":"ok"}}`.
   Il renvoie HTTP 503 si l'une des connexions PostgreSQL est indisponible.
3. Tester le chargement du frontend et l'acces direct/actualisation d'une route
   React.
4. Tester connexion, renouvellement de session par cookie, deconnexion, MFA et
   les parcours de roles avec des comptes de recette non administrateurs.
5. Verifier qu'aucun compte ou jeu de donnees de demonstration n'est expose.
6. Tester la sauvegarde et la restauration PostgreSQL et examiner les journaux
   sans y inscrire de contenu de bulletin.
7. Examiner et corriger les avis de vulnerabilites de dependances avant la
   publication des images.

## Ce qui reste a fournir pour la production

La procedure de test ci-dessus ne configure pas un deploiement automatique. Pour
la production, l'ENP devra valider la region et les niveaux de service, le domaine,
les acces Azure securises, le niveau de disponibilite, le budget et la politique
de sauvegarde avant la mise en production.
