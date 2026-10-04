\# Plateforme d'évaluation des enseignements et cahier de texte (ENP)



Plateforme web permettant aux étudiants d'évaluer anonymement les enseignements

(article 77 du Règlement des Études de l'ENP), aux délégués de renseigner le

cahier de texte et aux enseignants de consulter leurs résultats.



\## Statut



Projet en cours de démarrage (MVP en préparation).



\## Structure du dépôt



\- `apps/api` : backend (NestJS)

\- `apps/web` : frontend (React + Vite)

\- `docs` : documentation et journal des décisions

\- `infra` : fichiers de déploiement



\## Lancer en local



Backend : `cd apps/api` puis `npm run start:dev` (http://localhost:3000)

Frontend : `cd apps/web` puis `npm run dev` (http://localhost:5173)



\## Documentation



Voir `docs/decisions.md` pour les choix techniques et leurs raisons.

