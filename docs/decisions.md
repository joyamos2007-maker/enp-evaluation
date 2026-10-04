\# Journal des décisions



\## 2026-10-04 — Architecture : monolithe modulaire

\- Décision : un seul backend NestJS découpé en modules, une seule base PostgreSQL.

\- Raison : projet mené seul, charge faible en moyenne ; les microservices

&#x20; ajouteraient de la complexité inutile.



\## 2026-10-04 — Technologies

\- Frontend : React + TypeScript + Vite.

\- Backend : NestJS, système de modules CJS (CommonJS) avec Jest.

\- Base de données : PostgreSQL, lancée avec Docker Compose en local.

\- Raison pour CJS : plus de documentation et d'exemples, et le code proposé par

&#x20; les assistants d'IA y est plus souvent compatible.



\## 2026-10-04 — Pas de module de suivi externe (@nestjs/observe)

\- Décision : ne pas utiliser @nestjs/observe, installé automatiquement par le

&#x20; générateur de projet puis retiré.

\- Raison : il envoie des données de suivi vers un service tiers ; la plateforme

&#x20; doit garder la maîtrise de ce qui sort du serveur.



\## 2026-10-04 — Anonymat des évaluations

\- Décision : deux espaces de stockage séparés, sans clé commune.

&#x20; - Registre de participation : qui a voté (sans la réponse).

&#x20; - Urne : ce qui a été voté (sans l'identité).

\- Un jeton à usage unique, sans identité, autorise le dépôt dans l'urne.

\- Rôles de base de données distincts pour l'écriture dans chaque espace.

\- Résultats affichés seulement à partir de 5 répondants et après la clôture.

\- Raison : l'anonymat doit être vérifiable, pas seulement promis.



\## 2026-10-04 — Périmètre du MVP

\- Inclus : comptes et imports CSV, évaluation anonyme, cahier de texte,

&#x20; résultats enseignant, synthèse à l'écran.

\- Reporté en version 2 : double authentification, exports Word et Excel,

&#x20; rappels automatiques, SMS, comparaisons entre semestres.



\## 2026-10-04 — Hébergement

\- Décision : serveur et domaine ouverts au nom de l'ENP (crédits du pack

&#x20; étudiant utilisés pendant la phase de test).

\- Raison : la plateforme doit survivre à mon statut d'étudiant.

\- À confirmer avec l'ENP.



\## 2026-10-04 — Outils d'IA

\- Figma : maquettes. Bolt.new : écrans de l'interface. Jules : tâches ciblées,

&#x20; dépôt privé, relecture de chaque pull request.

\- Anonymat, authentification et droits d'accès : écrits par moi, avec relecture.

\- Aucune vraie donnée d'étudiant dans les outils d'IA.



\## À valider avec l'ENP

\- Référent à la Scolarité et accord écrit de la Direction.

\- Authentification des étudiants (matricule + mot de passe).

\- Données de test disponibles (UE, inscriptions, affectations).

\- Département pilote et date de la campagne.

