# Seminaire App — Design Document

## Overview

Application de gestion de séminaires destinée à des utilisateurs non-techniques (organisateurs). Le système couvre l'ensemble du cycle de vie d'un séminaire : création, inscription, emailing, check-in le jour J, Q&A en direct, et suivi post-événement.

### Context

- **Utilisateurs finaux** : organisateurs non-techniques, modérateurs Q&A, participants
- **Volume** : 50-200 inscrits par séminaire, ~2000 contacts, ~100 participants Q&A simultanés
- **Fréquence** : 1 séminaire par mois à bimensuel, événements ponctuels (conférences avec 10 sessions sur un week-end, Q&A uniquement)
- **Budget** : 0 frais — hébergement, domaine et services entièrement gratuits
- **Objectif secondaire** : side project CV — code exemplaire, bonnes pratiques, stack moderne

### Rôles

| Rôle               | Accès                                                    |
| ------------------ | -------------------------------------------------------- |
| **Admin**          | Accès total, gestion des utilisateurs, configuration     |
| **Organisateur**   | Créer/gérer des séminaires, inscriptions, envoi de mails |
| **Modérateur Q&A** | Gérer les questions en live pendant un événement         |

---

## Section 1 : Architecture & Stack technique

### Backend — NestJS

- **Framework** : NestJS + TypeScript
- **ORM** : Prisma
- **Base de données** : PostgreSQL
  - Production : Supabase (tier gratuit, 500MB, 2 projets)
  - Développement : PostgreSQL local via Docker
  - Tests : PostgreSQL local via Docker (base séparée)
- **Authentification** : Passport.js + JWT (access token 15min + refresh token 7j en httpOnly cookie)
- **Temps réel** : Socket.io (Q&A en direct)
- **Documentation API** : Swagger/OpenAPI (auto-générée)
- **Jobs en arrière-plan** : Bull + Redis (relances automatiques, fermeture inscriptions, sync contacts)
  - Redis via Upstash (tier gratuit, 10k commandes/jour)
- **Intégrations** :
  - API Brevo (envoi de mails + synchronisation bidirectionnelle des contacts)
  - API Google Drive (sync ressources + export listes d'accueil)

### Frontend — Next.js

- **Framework** : Next.js 14 App Router + TypeScript
- **Styling** : Tailwind CSS + shadcn/ui (composants accessibles)
- **Data fetching** : React Query (TanStack Query)
- **Temps réel** : Socket.io-client
- **Internationalisation** : next-intl (français par défaut, prêt pour le multi-langue)
- **QR Code** : bibliothèque `qrcode`
- **Approche** : Mobile-first sur toutes les interfaces

### Hébergement (tout gratuit)

| Service         | Plateforme          | Tier                   |
| --------------- | ------------------- | ---------------------- |
| Frontend        | Vercel              | Gratuit                |
| Backend         | Render              | Gratuit (750h/mois)    |
| Base de données | Supabase PostgreSQL | Gratuit (500MB)        |
| Redis           | Upstash             | Gratuit (10k cmd/jour) |
| Domaine         | eu.org              | Gratuit                |

### Monorepo

- **Outil** : Turborepo
- **Apps** : `apps/api` (NestJS) + `apps/web` (Next.js)
- **Packages partagés** : types TypeScript, schémas de validation Zod, config ESLint

### Environnement de développement

- **Développement multi-OS** : Mac et Ubuntu
- **Services locaux** : Docker Compose pour PostgreSQL + Redis
- **Code applicatif** : exécuté nativement avec Node.js (hot reload rapide)
- **Dockerfiles** : disponibles pour CI (GitHub Actions) et déploiement production
- **Makefile** : commandes unifiées (`make dev`, `make test`, etc.)

---

## Section 2 : Modèle de données

### Entités

#### User

| Champ     | Type     | Contraintes                   |
| --------- | -------- | ----------------------------- |
| id        | UUID     | PK                            |
| email     | String   | Unique                        |
| password  | String   | Hashé bcrypt                  |
| firstName | String   |                               |
| lastName  | String   |                               |
| role      | Enum     | ADMIN / ORGANIZER / MODERATOR |
| createdAt | DateTime |                               |
| updatedAt | DateTime |                               |

#### Seminar

| Champ                | Type     | Contraintes                            |
| -------------------- | -------- | -------------------------------------- |
| id                   | UUID     | PK                                     |
| title                | String   |                                        |
| description          | Text     |                                        |
| speaker              | String   | Intervenant                            |
| price                | Decimal  |                                        |
| date                 | DateTime |                                        |
| location             | String   | Lieu                                   |
| image                | String   | Nullable, URL de l'image du séminaire  |
| registrationDeadline | Int      | Heures avant fermeture auto            |
| reminderDays         | Int      | Jours avant relance auto               |
| status               | Enum     | DRAFT / PUBLISHED / CLOSED / COMPLETED |
| driveFolder          | String   | Nullable, ID dossier Google Drive      |
| createdBy            | UUID     | FK → User                              |
| createdAt            | DateTime |                                        |
| updatedAt            | DateTime |                                        |

#### Contact

| Champ     | Type     | Contraintes                        |
| --------- | -------- | ---------------------------------- |
| id        | UUID     | PK                                 |
| email     | String   | Unique                             |
| firstName | String   |                                    |
| lastName  | String   |                                    |
| city      | String   |                                    |
| phone     | String   | Nullable, optionnel                |
| brevoId   | String   | Nullable, ID Brevo                 |
| source    | Enum     | BREVO_SYNC / MANUAL / REGISTRATION |
| createdAt | DateTime |                                    |
| updatedAt | DateTime |                                    |

#### Registration

| Champ        | Type     | Contraintes                   |
| ------------ | -------- | ----------------------------- |
| id           | UUID     | PK                            |
| seminarId    | UUID     | FK → Seminar                  |
| contactId    | UUID     | FK → Contact                  |
| status       | Enum     | REGISTERED / PRESENT / ABSENT |
| isWalkIn     | Boolean  | Default false                 |
| registeredAt | DateTime |                               |

**Contrainte d'unicité** : (seminarId + contactId) — empêche les doublons.

#### EmailTemplate

| Champ       | Type     | Contraintes                        |
| ----------- | -------- | ---------------------------------- |
| id          | UUID     | PK                                 |
| name        | String   |                                    |
| subject     | String   |                                    |
| htmlContent | Text     |                                    |
| type        | Enum     | INVITATION / REMINDER / POST_EVENT |
| createdAt   | DateTime |                                    |
| updatedAt   | DateTime |                                    |

#### EmailCampaign

| Champ           | Type     | Contraintes                                               |
| --------------- | -------- | --------------------------------------------------------- |
| id              | UUID     | PK                                                        |
| seminarId       | UUID     | FK → Seminar                                              |
| templateId      | UUID     | FK → EmailTemplate                                        |
| type            | Enum     | INVITATION / AUTO_REMINDER / MANUAL_REMINDER / POST_EVENT |
| recipientTarget | Enum     | ALL_CONTACTS / ALL_REGISTERED / PRESENT_ONLY              |
| status          | Enum     | DRAFT / SENT / SCHEDULED                                  |
| sentAt          | DateTime | Nullable                                                  |
| recipientCount  | Int      |                                                           |

#### QASession

| Champ     | Type     | Contraintes            |
| --------- | -------- | ---------------------- |
| id        | UUID     | PK                     |
| seminarId | UUID     | Nullable, FK → Seminar |
| title     | String   |                        |
| status    | Enum     | OPEN / CLOSED          |
| qrCodeUrl | String   |                        |
| createdAt | DateTime |                        |

#### Question

| Champ       | Type     | Contraintes                              |
| ----------- | -------- | ---------------------------------------- |
| id          | UUID     | PK                                       |
| sessionId   | UUID     | FK → QASession                           |
| authorName  | String   | Nullable, anonyme par défaut             |
| gender      | Enum     | MALE / FEMALE                            |
| content     | Text     |                                          |
| status      | Enum     | PENDING / APPROVED / REJECTED / ANSWERED |
| order       | Int      | Position dans la file                    |
| submittedAt | DateTime |                                          |

#### DriveSync

| Champ     | Type     | Contraintes                               |
| --------- | -------- | ----------------------------------------- |
| id        | UUID     | PK                                        |
| seminarId | UUID     | FK → Seminar                              |
| fileId    | String   | ID fichier Google Drive                   |
| fileName  | String   |                                           |
| type      | Enum     | PRESENTATION / RESOURCE / ATTENDANCE_LIST |
| syncedAt  | DateTime |                                           |

### Relations

- Un Seminar a plusieurs Registrations
- Un Contact a plusieurs Registrations
- Un Seminar a une QASession (optionnelle)
- Une QASession a plusieurs Questions
- Un Seminar a plusieurs DriveSync
- Suppression en cascade : supprimer un Seminar supprime ses Registrations, QASession, Questions

---

## Section 3 : Modules & fonctionnalités

### Module 1 — Authentification & Rôles

- Inscription/connexion (email + mot de passe)
- JWT (access token + refresh token)
- Réinitialisation de mot de passe (envoi d'un lien par email via Brevo, token temporaire avec expiration)
- 3 rôles : Admin, Organisateur, Modérateur Q&A
- L'Admin peut créer/modifier/supprimer des utilisateurs et assigner des rôles
- Guards NestJS pour protéger chaque route selon le rôle

### Module 2 — Gestion des séminaires

- CRUD séminaire (titre, description, intervenant, prix, date, lieu, image)
- Statuts : Brouillon → Publié → Inscriptions fermées → Terminé
- Configuration par séminaire : délai de fermeture (Y heures), relance auto (X jours)
- Page publique du séminaire avec formulaire d'inscription intégré
- Fermeture automatique des inscriptions (Bull job)
- Dashboard : vue d'ensemble de tous les séminaires avec statistiques

### Module 3 — Inscriptions

- Formulaire public : nom, prénom, ville, email, téléphone (optionnel)
- Détection de doublons en temps réel (par email)
- Confirmation d'inscription par mail automatique
- Walk-in : ajout de personnes non-inscrites le jour J depuis le back-office

### Module 4 — Liste d'accueil (Check-in)

- Liste triée par ordre alphabétique
- Formatage : NOM en majuscules, Prénom première lettre en majuscule
- Marquage présent/absent d'un clic
- Compteurs en temps réel : total inscrits, présents, absents, doublons
- Onglet walk-in (personnes ajoutées sur place)
- Export vers Google Drive automatique
- Interface mobile-first (usage principal sur téléphone)

### Module 5 — Emailing

- Éditeur de templates de mail dans l'app (WYSIWYG — adapté aux utilisateurs non-techniques)
- Variables dynamiques : `{titre}`, `{date}`, `{lieu}`, `{intervenant}`, `{prix}`, `{nomParticipant}`...
- Types de campagnes : invitation, relance auto, relance manuelle, post-événement
- Envoi via API Brevo
- Historique des envois par séminaire
- Relance manuelle déclenchable depuis le dashboard

### Module 6 — Contacts & Sync Brevo

- Liste de contacts dans l'app (source de vérité : PostgreSQL)
- Import/export CSV
- Synchronisation bidirectionnelle avec Brevo (job périodique Bull)
- Les nouvelles inscriptions créent automatiquement un contact
- Gestion des désabonnements

### Module 7 — Q&A en direct

- Création d'une session Q&A (liée à un séminaire ou indépendante pour les conférences)
- Génération de QR code → lien vers la page de soumission de questions
- Page publique : soumettre une question (anonyme, pas besoin de compte, sélection Homme/Femme obligatoire)
- Back-office modérateur (mobile-first) : voir les questions en temps réel (Socket.io)
  - Approuver / Rejeter / Modifier une question
  - Réordonner les questions
  - Le participant ne voit pas si sa question est rejetée
- Écran de présentation : affiche les questions approuvées (projetable en salle)
- Ouvrir/Fermer la session

### Module 8 — Google Drive

- Création automatique d'un dossier Drive à la publication d'un séminaire
  - Structure : `Séminaire - {titre} - {date}/` avec sous-dossiers `Présentation/`, `Ressources/`, `Liste d'accueil/`
- Upload des documents de présentation et ressources
- Export automatique de la liste d'accueil vers le Drive
- Envoi des ressources du Drive aux présents après l'événement
- Drive lié au compte `seminaire.mf.idf@gmail.com`

### Module 9 — Dashboard Admin

- Vue globale : séminaires à venir, en cours, passés
- Statistiques : nombre d'inscrits, taux de présence, évolution des contacts
- Gestion des utilisateurs et rôles
- Logs d'activité
- Mobile-first

---

## Section 4 : Sécurité & bonnes pratiques

### Authentification & Autorisation

- Mots de passe hashés avec bcrypt (salt rounds 12)
- JWT access token (15 min) + refresh token (7 jours, httpOnly cookie)
- Refresh token rotation (usage unique)
- Guards NestJS par rôle sur chaque route
- Rate limiting sur les endpoints publics (login, inscription, soumission Q&A)

### Protection des données

- Validation de toutes les entrées avec Zod (partagé frontend/backend)
- Sanitisation des inputs (protection XSS)
- Requêtes Prisma paramétrées (protection injection SQL native)
- CORS configuré strictement (seul le domaine frontend autorisé)
- Helmet.js (headers de sécurité HTTP)
- CSRF protection sur les formulaires

### Données personnelles (RGPD)

- Emails, téléphones, noms = données personnelles
- Consentement explicite à l'inscription (checkbox)
- Possibilité de suppression des données d'un contact (droit à l'oubli)
- Pas de stockage de données sensibles en clair dans les logs

### Infrastructure

- Variables d'environnement pour tous les secrets (jamais en dur)
- `.env` dans le `.gitignore`
- Fichier `.env.example` documenté
- HTTPS obligatoire (fourni par Vercel et Render)

### Qualité de code

- ESLint + Prettier (config stricte, partagée dans le monorepo)
- Husky + lint-staged (vérification avant chaque commit)
- Tests unitaires (Jest) + tests e2e (Supertest pour l'API)
- CI/CD : GitHub Actions (lint, tests, build à chaque PR)
- Conventional Commits (format de messages de commit standardisé)

---

## Section 5 : Pages & Navigation

### Pages publiques (sans authentification)

| Route                | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `/`                  | Landing page de présentation                            |
| `/seminaires/{slug}` | Page publique d'un séminaire + formulaire d'inscription |
| `/qa/{code}`         | Page de soumission de questions (via QR code)           |
| `/qa/{code}/screen`  | Écran de projection des questions approuvées            |

### Pages authentifiées (back-office)

| Route                                | Description                       | Rôle minimum |
| ------------------------------------ | --------------------------------- | ------------ |
| `/login`                             | Connexion                         | —            |
| `/dashboard`                         | Vue d'ensemble, stats             | Organisateur |
| `/dashboard/seminaires`              | Liste des séminaires              | Organisateur |
| `/dashboard/seminaires/nouveau`      | Créer un séminaire                | Organisateur |
| `/dashboard/seminaires/{id}`         | Détail d'un séminaire             | Organisateur |
| `/dashboard/seminaires/{id}/accueil` | Liste d'accueil / check-in        | Organisateur |
| `/dashboard/seminaires/{id}/emails`  | Gestion des envois de mails       | Organisateur |
| `/dashboard/seminaires/{id}/qa`      | Modération Q&A temps réel         | Modérateur   |
| `/dashboard/contacts`                | Liste de contacts + sync Brevo    | Organisateur |
| `/dashboard/templates`               | Éditeur de templates de mails     | Organisateur |
| `/dashboard/utilisateurs`            | Gestion des utilisateurs et rôles | Admin        |
| `/dashboard/parametres`              | Configuration (clés API, etc.)    | Admin        |

### Navigation

- Sidebar gauche avec sections principales
- Breadcrumb en haut de page
- Mobile-first : menu hamburger, navigation tactile optimisée
- Toutes les interfaces conçues pour une utilisation principale sur mobile

---

## Section 6 : Flux utilisateurs

### Flux 1 — Créer et publier un séminaire

1. L'organisateur crée un séminaire (brouillon) avec toutes les infos
2. Il configure le délai de fermeture des inscriptions et la relance auto
3. Il choisit ou crée un template de mail d'invitation
4. Il publie le séminaire :
   - Le formulaire d'inscription devient accessible publiquement
   - Un dossier Google Drive est créé automatiquement (`Séminaire - {titre} - {date}/` avec sous-dossiers `Présentation/`, `Ressources/`, `Liste d'accueil/`)
5. Il déclenche l'envoi de l'invitation à la liste de contacts

### Flux 2 — Inscription d'un participant

1. Le participant accède au lien du séminaire (mobile-first)
2. Il remplit le formulaire (nom, prénom, ville, email, téléphone optionnel)
3. Le système vérifie les doublons par email
4. Si doublon → message "Vous êtes déjà inscrit"
5. Si OK → inscription enregistrée + contact créé/mis à jour + mail de confirmation envoyé
6. Si inscriptions fermées → message "Les inscriptions sont closes"

### Flux 3 — Relances

1. **Auto** : X jours avant, Bull déclenche l'envoi du mail de relance à tous les inscrits
2. **Manuelle** : l'organisateur clique "Envoyer une relance" depuis le dashboard → mail envoyé à tous les inscrits

### Flux 4 — Jour J : Check-in

1. L'organisateur ouvre la liste d'accueil sur son téléphone (mobile-first)
2. Les participants arrivent → il coche "Présent" d'un clic
3. Un non-inscrit se présente → il l'ajoute via l'onglet Walk-in (nom, prénom, email)
4. Les compteurs se mettent à jour en temps réel (total, présents, absents)

### Flux 5 — Q&A en direct

1. L'organisateur/modérateur ouvre la session Q&A
2. Un QR code est généré → projeté en salle ou partagé
3. Les participants scannent → page de soumission de question (anonyme, pas de compte requis)
4. Les questions arrivent en temps réel sur l'écran du modérateur (mobile-first)
5. Le modérateur approuve, modifie ou rejette chaque question (le participant ne voit pas le rejet)
6. Les questions approuvées s'affichent sur l'écran de projection
7. Le modérateur ferme la session quand c'est terminé

### Flux 6 — Post-événement

1. L'organisateur marque le séminaire comme "Terminé"
2. Il upload les documents de présentation + ressources sur le Drive lié
3. Il déclenche l'envoi du mail post-événement → envoyé uniquement aux présents
4. La liste d'accueil finale est exportée automatiquement vers le Drive

---

## Section 7 : Structure du monorepo

```
seminaire-app/
├── apps/
│   ├── api/                        # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/           # Passport.js, JWT, guards
│   │   │   │   ├── users/          # CRUD utilisateurs, rôles
│   │   │   │   ├── seminars/       # CRUD séminaires, statuts
│   │   │   │   ├── registrations/  # Inscriptions, doublons, walk-in
│   │   │   │   ├── contacts/       # Contacts, sync Brevo
│   │   │   │   ├── emails/         # Templates, campagnes, envoi Brevo
│   │   │   │   ├── qa/             # Sessions Q&A, questions, Socket.io
│   │   │   │   └── drive/          # Sync Google Drive
│   │   │   ├── common/             # Filters, interceptors, decorators
│   │   │   ├── config/             # Configuration, variables d'env
│   │   │   └── jobs/               # Bull queues (relances, fermeture, sync)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── Dockerfile
│   │   └── test/                   # Tests e2e
│   │
│   └── web/                        # Next.js frontend
│       ├── src/
│       │   ├── app/                # App Router (pages)
│       │   │   ├── (public)/       # Pages publiques (inscription, Q&A)
│       │   │   ├── (auth)/         # Login
│       │   │   └── dashboard/      # Back-office
│       │   ├── components/         # Composants UI réutilisables
│       │   ├── hooks/              # Custom hooks
│       │   ├── lib/                # API client, utils
│       │   ├── messages/           # Fichiers de traduction (next-intl)
│       │   │   └── fr.json
│       │   └── styles/             # Styles globaux
│       ├── Dockerfile
│       └── public/                 # Assets statiques
│
├── packages/
│   ├── shared-types/               # Types TypeScript partagés
│   ├── validation/                 # Schémas Zod partagés
│   └── eslint-config/              # Config ESLint partagée
│
├── docker-compose.yml              # PostgreSQL + Redis (dev)
├── docker-compose.prod.yml         # Tout dockerisé (CI/prod)
├── Makefile                        # Commandes unifiées (make dev, make test...)
├── turbo.json                      # Config Turborepo
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions (lint, test, build)
├── .env.example
└── README.md
```

### Stratégie Docker

- **Développement** : Docker Compose pour PostgreSQL + Redis uniquement. Code applicatif exécuté nativement avec Node.js pour un hot reload rapide.
- **CI/Production** : Dockerfiles pour le frontend et le backend, tout conteneurisé.
- **Multi-OS** : fonctionne de manière identique sur Mac et Ubuntu.
