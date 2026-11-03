# Preparation du deploiement Azure

Ce guide documente la recette Azure et ses prochaines etapes. L'architecture
garde l'interface et l'API sous une seule origine HTTPS afin de conserver le
fonctionnement des cookies de session stricts.

## Etat de la recette Azure

Les ressources suivantes ont ete creees dans l'abonnement de recette :

| Ressource | Nom / configuration | Etat |
|---|---|---|
| Groupe de ressources | `rg-enp-evaluation-test-sa` (South Africa North) | Pret |
| Azure Container Registry | `enpevaltest2026f4d55454` (Basic, Germany West Central) | Images API/web et migration publiees ; compte admin desactive |
| Key Vault | `kvenpeval2026f4d554` (Standard, RBAC, Italy North) | URL DB, secrets JWT/MFA et parametres SMTP stockes |
| VNet | `vnet-enp-eval-test-itn` (Italy North) | Pret ; sous-reseaux Container Apps et PostgreSQL |
| DNS prive PostgreSQL | `enp-evaluation-test.postgres.database.azure.com` | Lie au VNet |
| PostgreSQL Flexible Server | `enpevalpgitn2026f4d554` (B1ms, 32 GiB, retention 7 jours) | Pret ; acces public desactive |
| Container Apps | `cae-enp-eval-itn`, job `db-migration-job` et app `enp-evaluation-test` | Web/API publics en HTTPS ; app avec scale-to-zero et identite geree |
| Log Analytics | `law-enp-eval-diag` | Temporaire ; conserve pour la suite du diagnostic applicatif |

La base logique `enp_evaluation` existe. Le premier job de migration s'arretait
sur une option invalide a la ligne 2 de `run-migrations.sh`, a cause des fins de
ligne CRLF dans l'image Linux. Les fins de ligne sont maintenant forcees en LF
et nettoyees par le Dockerfile. L'image
`enp-migrations:20261102-fixed-crlf` a ete publiee et le job
`db-migration-job-pzvt0q6` a applique avec succes les scripts de schema et les
migrations `008` a `016`. Les connexions des roles `app_main`, `ballot_app` et
`results_app` ont ensuite ete testees ; leurs privileges de schema/urne
correspondent aux controles attendus. Aucun jeu de donnees de demonstration
n'a ete charge. Le job utilise une identite geree avec `AcrPull`, le compte
admin ACR est desactive et un test de connexion a reussi apres ce changement.
Les tarifs Azure sont variables ; le budget configure envoie des alertes mais
ne bloque pas automatiquement les depenses.

L'application de recette est accessible a
`https://enp-evaluation-test.bluebush-d73ab564.italynorth.azurecontainerapps.io`.
Le frontend et l'API sont dans la meme Container App ; seule l'interface web
est exposee. L'ingress n'autorise pas HTTP non chiffre, `COOKIE_SECURE=true`,
et la configuration des replicas est `minReplicas=0`, `maxReplicas=2`. Les
identites des conteneurs utilisent Key Vault pour les URL de base, secrets
jwt/MFA et parametres SMTP. Une identite geree dediee a `AcrPull` sur ACR et
`Key Vault Secrets User` limite aux 14 secrets necessaires. Les tests HTTPS du
frontend et de `/api/v1/health` ont renvoye HTTP 200 ; les trois connexions
PostgreSQL sont indiquees `ok`. HTTP redirige vers HTTPS. L'envoi d'un
courriel n'a pas encore ete teste, mais l'authentification SMTP a ete verifiee
sans envoyer de message. La base, initialement vide, contient maintenant un
premier compte administrateur provisionne par des jobs ponctuels ensuite
supprimes. Apres un echec de saisie, son mot de passe a ete remplace par un
nouveau secret aleatoire `bootstrap-admin-password-v2` dans Key Vault et le
compteur d'echecs a ete remis a zero. L'ancien secret `bootstrap-admin-password`
a ete supprime ; supprimer le secret v2 apres la premiere connexion et le
remplacement du mot de passe par la procedure de reinitialisation par courriel.

## Architecture de recette et cible

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
La recette utilise le scale-to-zero et peut avoir un demarrage a froid ; tenir
compte de ce delai dans les sondes et les attentes client.

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

Pour la recette avec PostgreSQL prive, l'image de migration se construit depuis
la racine du depot avec `infra/sql/Dockerfile.migrations`. Elle contient les
scripts de schema puis les migrations `008` a `016`, dans l'ordre explicite de
`infra/sql/run-migrations.sh` ; les fichiers `dev-donnees-*` en sont exclus.
Executer ce conteneur comme un job ponctuel integre au VNet, avec le mot de
passe proprietaire et les trois mots de passe applicatifs injectes depuis
Key Vault au moyen d'une identite geree. Utiliser comme `PGHOST` le nom DNS
prive resolu dans la zone PostgreSQL liee au VNet, et verifier d'abord
`pg_isready` depuis le meme environnement : le FQDN standard peut ne pas
correspondre a l'enregistrement de la zone personnalisee. Le script s'arrete a
la premiere erreur SQL et ne doit pas etre relance automatiquement apres une
migration partielle : examiner d'abord les journaux et l'etat du schema.

Activer les sauvegardes automatisees et la restauration a un instant donne de
PostgreSQL Flexible Server. Choisir la retention et la haute disponibilite selon
les exigences ENP et le budget ; tester une restauration avant l'ouverture.

## Images de conteneur

ACR Tasks est bloque par la politique de l'abonnement. Depuis la racine du
depot, construire localement les images en utilisant un tag immuable (par
exemple le SHA du commit), puis les pousser dans ACR :

```powershell
docker build -t <NOM_ACR>.azurecr.io/enp-api:<TAG> -f apps/api/Dockerfile .
docker push <NOM_ACR>.azurecr.io/enp-api:<TAG>
docker build -t <NOM_ACR>.azurecr.io/enp-web:<TAG> -f apps/web/Dockerfile.azure .
docker push <NOM_ACR>.azurecr.io/enp-web:<TAG>
docker build -t <NOM_ACR>.azurecr.io/enp-migrations:<TAG> -f infra/sql/Dockerfile.migrations .
docker push <NOM_ACR>.azurecr.io/enp-migrations:<TAG>
```

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

## Configuration de l'API

Definir les parametres non secrets dans la configuration de la Container App :

```text
NODE_ENV=production
PORT=3000
COOKIE_SECURE=true
APP_URL=https://enp-evaluation-test.bluebush-d73ab564.italynorth.azurecontainerapps.io
ALLOWED_ORIGINS=https://enp-evaluation-test.bluebush-d73ab564.italynorth.azurecontainerapps.io
SESSION_TTL_MINUTES=30
ACCESS_TOKEN_TTL_MINUTES=15
```

Dans la recette, ces parametres sont deja injectes depuis Key Vault a l'aide
d'une identite geree. Pour tout autre environnement, injecter par Key
Vault/Container Apps secrets, avec des valeurs aleatoires et independantes :
`DATABASE_URL`, `DATABASE_URL_BALLOT`, `DATABASE_URL_RESULTS`,
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

## Ce qui reste a fournir pour le deploiement reel

L'application web/API de recette est publiee en HTTPS avec scale-to-zero. Les
migrations, les roles, le tirage ACR et le health check sont valides. Il reste
a tester les parcours fonctionnels de connexion, MFA, courriel, roles et
renouvellement de session avec des comptes de recette non administrateurs,
puis a verifier les sauvegardes/restaurations PostgreSQL et les journaux. Le
nom de domaine actuel est celui fourni par Azure ; aucun domaine ENP
personnalise n'est configure. Le sous-reseau temporaire `snet-diagnostic` a
ete supprime ; le workspace de diagnostic sera conserve jusqu'a validation de
l'application, puis pourra etre supprime ou remplace par la journalisation
retenue pour l'environnement.
