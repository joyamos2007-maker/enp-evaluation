# Guide de déploiement production – ENP

Ce guide est écrit pour un utilisateur novice. Il explique simplement comment mettre le projet ENP en production sur un serveur Linux avec Docker.

## 1. Ce que tu as déjà dans le projet

Le dépôt contient déjà une base de configuration de production :

- [infra/docker-compose.prod.yml](./infra/docker-compose.prod.yml)
- [apps/api/Dockerfile](./apps/api/Dockerfile)
- [apps/web/Dockerfile](./apps/web/Dockerfile)
- [infra/nginx/default.conf](./infra/nginx/default.conf)
- [docs/deploiement-production.md](./docs/deploiement-production.md)

Cela veut dire que le projet est déjà prêt à être packagé dans des conteneurs :

- le backend NestJS
- le frontend React / Vite
- le serveur Nginx
- PostgreSQL

Tu n’as pas besoin de réécrire tout le projet : il faut surtout configurer le vrai environnement de production et lancer les conteneurs.

## 2. Ce qu’il faut avoir avant de déployer

Avant de lancer le projet en production, il faut avoir :

- un serveur Linux (VPS ou serveur de l’ENP)
- un nom de domaine pour la plateforme
- un accès SSH au serveur
- Docker et Docker Compose installés
- des certificats HTTPS valides
- un fichier `.env` réel et sécurisé

Exemple de domaine :

- https://enp.example.org

## 3. Ce qu’est un .env de production

Le fichier `.env` contient les variables de configuration du projet.

Il doit être différent du `.env.example` et ne jamais être publié dans GitHub.

Voici un exemple correct :

```env
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://enp_user:MotDePasseTrèsFort@db:5432/enp_evaluation
DATABASE_URL_BALLOT=postgresql://enp_user:MotDePasseTrèsFort@db:5432/enp_ballot
DATABASE_URL_RESULTS=postgresql://enp_user:MotDePasseTrèsFort@db:5432/enp_results

JWT_ACCESS_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_REFRESH_SECRET=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
BALLOT_TOKEN_SECRET=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz

APP_URL=https://enp.example.org
ALLOWED_ORIGINS=https://enp.example.org
COOKIE_SECURE=true
```

### À retenir

- les 3 bases doivent être différentes
- les secrets JWT doivent être différents
- les secrets doivent être longs et aléatoires
- `COOKIE_SECURE=true` doit être utilisé en production
- `ALLOWED_ORIGINS` doit contenir uniquement le vrai domaine du front

## 4. Pourquoi la base ne doit pas être appelée avec localhost

Dans Docker, le backend ne doit pas utiliser :

```text
localhost:5432
```

Il doit utiliser :

```text
db:5432
```

Pourquoi ?

- `localhost` dans un conteneur représente le conteneur lui-même
- `db` est le nom du service PostgreSQL dans Docker Compose

Donc dans le contexte Docker, le bon nom pour la base est :

```text
db:5432
```

## 5. Installer Docker sur le serveur

Sur un serveur Ubuntu/Debian, les commandes classiques sont :

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Puis vérifier :

```bash
docker --version
docker compose version
```

## 6. Copier le projet sur le serveur

Tu dois téléverser le projet sur le serveur, par exemple dans :

```bash
/home/tonuser/enp
```

Ensuite :

```bash
cd /home/tonuser/enp
```

## 7. Générer les certificats HTTPS

Le fichier Nginx attend les certificats dans :

```text
infra/certs/
```

Donc il faut générer ou obtenir des certificats pour ton domaine, par exemple :

```text
enp.example.org
```

### Option simple : Let’s Encrypt

```bash
sudo apt update
sudo apt install -y certbot
sudo certbot certonly --standalone -d enp.example.org
```

Ensuite les certificats sont généralement disponibles ici :

```text
/etc/letsencrypt/live/enp.example.org/fullchain.pem
/etc/letsencrypt/live/enp.example.org/privkey.pem
```

Tu dois les copier dans le projet :

```bash
mkdir -p /home/tonuser/enp/infra/certs
cp /etc/letsencrypt/live/enp.example.org/fullchain.pem /home/tonuser/enp/infra/certs/fullchain.pem
cp /etc/letsencrypt/live/enp.example.org/privkey.pem /home/tonuser/enp/infra/certs/privkey.pem
```

## 8. Créer le vrai fichier .env

À la racine du projet, crée un fichier `.env` avec les vraies valeurs du serveur.

Exemple :

```env
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://enp_user:MotDePasseTrèsFort@db:5432/enp_evaluation
DATABASE_URL_BALLOT=postgresql://enp_user:MotDePasseTrèsFort@db:5432/enp_ballot
DATABASE_URL_RESULTS=postgresql://enp_user:MotDePasseTrèsFort@db:5432/enp_results

JWT_ACCESS_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_REFRESH_SECRET=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
BALLOT_TOKEN_SECRET=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz

APP_URL=https://enp.example.org
ALLOWED_ORIGINS=https://enp.example.org
COOKIE_SECURE=true
```

## 9. Lancer le projet en production

Dans le dossier du projet :

```bash
cd /home/tonuser/enp
docker compose -f infra/docker-compose.prod.yml up -d --build
```

Cette commande va :

- créer la base PostgreSQL
- construire le backend
- construire le frontend
- démarrer l’API
- démarrer le site web nginx

## 10. Vérifier si tout tourne

### Voir les conteneurs

```bash
docker compose -f infra/docker-compose.prod.yml ps
```

Tu dois voir au moins :

- db
- api
- web

### Vérifier le frontend

```bash
curl -I https://enp.example.org
```

### Vérifier l’API

```bash
curl -I https://enp.example.org/api/health
```

## 11. Ce que fait Nginx dans ce projet

Le fichier [infra/nginx/default.conf](./infra/nginx/default.conf) est configuré pour :

- rediriger HTTP vers HTTPS
- servir le frontend React
- rediriger les requêtes `/api` vers le backend NestJS
- ajouter des en-têtes de sécurité

Autrement dit :

- le site est accessible via HTTPS
- l’API est accessible sous `/api`
- le frontend est servi par Nginx, pas directement par Vite

## 12. Les erreurs les plus fréquentes

### Problème 1 : base non accessible

Cause : tu as utilisé `localhost` au lieu de `db` dans les URLs PostgreSQL.

✅ Bon :

```text
postgresql://user:password@db:5432/enp_evaluation
```

❌ Mauvais :

```text
postgresql://user:password@localhost:5432/enp_evaluation
```

### Problème 2 : les secrets sont faibles

Cause : tu as mis des secrets trop courts, ou le même secret plusieurs fois.

✅ Bon :

- 32 caractères minimum
- différent pour l’accès, le refresh et les votes

### Problème 3 : le navigateur bloque la requête

Cause : la configuration CORS ne autorise pas le bon domaine.

✅ Bon :

```env
ALLOWED_ORIGINS=https://enp.example.org
```

### Problème 4 : pas de certificat HTTPS

Cause : les certificats ne sont pas présents dans `infra/certs`.

### Problème 5 : le site ne répond pas

Cause : les conteneurs ne démarrent pas correctement ou le fichier `.env` est invalide.

Commande utile :

```bash
docker compose -f infra/docker-compose.prod.yml logs
```

## 13. Checklist finale avant mise en ligne

Avant d’ouvrir le site au public, vérifie :

- [ ] le fichier `.env` contient les vraies valeurs
- [ ] les trois bases sont différentes
- [ ] les secrets sont différents
- [ ] le domaine est bien configuré
- [ ] le certificat HTTPS est installé
- [ ] Docker tourne sans erreur
- [ ] l’application backend démarre correctement
- [ ] le frontend est mis en ligne
- [ ] le login fonctionne
- [ ] les routes protégées exigent un token
- [ ] CORS est limité au bon domaine
- [ ] le cookie de session est en `secure: true`
- [ ] les comptes de test sont retirés ou isolés

## 14. Ce que tu dois retenir absolument

La production ne consiste pas à faire “un site qui marche”.

La production consiste à avoir :

- un vrai serveur
- des vrais secrets
- des vraies bases distinctes
- des certificats HTTPS
- une configuration sûre
- des comptes administrateurs bien maîtrisés

## 15. Prochaine étape recommandée

Après avoir suivi ce guide, la prochaine étape logique est :

1. mettre un vrai `.env` de production
2. installer Docker sur le serveur
3. copier le projet
4. mettre les certificats HTTPS
5. lancer le déploiement
6. tester le login et l’API

## 16. En résumé simple

Si tu veux la version ultra-simple :

```bash
# 1. sur le serveur
sudo apt-get install docker.io docker-compose-plugin

# 2. copier le projet
cd /home/tonuser/enp

# 3. créer le vrai .env

# 4. copier les certificats HTTPS dans infra/certs

# 5. lancer
docker compose -f infra/docker-compose.prod.yml up -d --build
```

Et ensuite tu vérifies :

```bash
curl -I https://enp.example.org
curl -I https://enp.example.org/api/health
```

## 17. Important

Ce guide est une base de travail très pratique. Pour un vrai lancement institutionnel, il faudra confirmer avec la scolarité :

- le domaine officiel
- les comptes admin
- les rôles de département
- les règles de publication des résultats
- la gestion de l’audit

---

Si tu veux, je peux aussi te préparer un second fichier `guide-deploiement-vps.md` avec la version “commandes exactes à copier sur un VPS Ubuntu”, prête à exécuter sans interprétation.
