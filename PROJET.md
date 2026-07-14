# Amoné Nice — Documentation du projet

État du code au 2026-07-14. Ce document décrit ce qui existe aujourd'hui dans l'application (stack, fonctionnalités, modèles de données). Il sert de base pour le futur cahier des charges (évolutions à venir : migration PostgreSQL, sauvegardes automatiques, application desktop, intégrations externes...).

## Stack technique

- **Next.js 14** (App Router) + TypeScript
- **Prisma** + **SQLite** (`prisma/dev.db`) pour le stockage
- **Authentification maison** : mots de passe hashés (bcrypt) + session par cookie signé (JWT via `jose`), pas de service tiers
- **Tailwind CSS** pour l'interface
- Déployé sur un **VPS Hostinger** via PM2 + Nginx + Certbot (voir `README.md` pour les commandes de déploiement)

## Comptes et permissions

Un utilisateur (`User`) a un rôle (`ADMIN` ou `EMPLOYEE`) et des permissions par page :

- `role = ADMIN` : accès complet à tout, quelles que soient les cases cochées.
- `role = EMPLOYEE` : accès au Planning uniquement par défaut, plus les pages activées individuellement :
  - `canAccessMarges` — onglet Marges
  - `canAccessMercuriale` — onglet Mercuriale
  - `canAccessCrm` — onglet Clients

Ces permissions sont vérifiées à la fois côté middleware (blocage des routes) et côté API (chaque route appelle `requireXxxAccess()`). Gestion des comptes dans Réglages → Utilisateurs.

## Fonctionnalités par section

### Marges (`/marges`)

- **Ingrédients** — liste des ingrédients avec prix d'achat, unité (kg/L/pièce ou unité personnalisée), fournisseur, catégorie libre (regroupement du tableau par catégorie). Historique des prix conservé à chaque changement. Unités personnalisées réutilisables, éditables/supprimables (Réglages → Unités).
- **Produits & marges** — fiches produits avec recette (liste d'ingrédients + quantités), prix de vente sur place / à emporter, calcul automatique du coût de revient et de la marge (TTC, TVA différenciée sur place vs à emporter). Une même recette peut varier selon le canal de vente (emballages différents à emporter).
- **Menus** — bundles de plusieurs produits à prix fixe, avec calcul de marge agrégé.
- **Carte** — présentation "menu de vente" à deux colonnes, édition inline des prix directement depuis cette vue.

Ingrédients, Produits et Menus partagent : tri par colonne, ordre personnalisé par glisser-déposer, regroupement par catégorie (si des catégories sont renseignées).

### Mercuriale (`/mercuriale`)

Catalogue de prix multi-fournisseurs.

- Chaque **fournisseur** (`Supplier`) a ses coordonnées (email, tél., code client), son calendrier de commande/livraison, un minimum de commande, et une catégorie libre optionnelle.
- Si au moins un fournisseur a une catégorie, l'affichage bascule en **mode catégorie** : la catégorie devient l'onglet principal, avec un tableau empilé par fournisseur de cette catégorie. Les catégories sont renommables (✏️ à côté de l'onglet), le renommage se répercute sur tous les fournisseurs concernés.
- Chaque **article** (`SupplierItem`) a une référence, désignation, conditionnement, prix unitaire HT / prix carton HT, une sous-catégorie libre, et un statut **commandé / reçu** avec dates.
- Page **"À commander"** (`/mercuriale/a-commander`) : liste consolidée de tous les articles à commander (quantité > 0, pas encore commandé) tous fournisseurs confondus, avec cases à cocher. Bouton "Supprimer toutes les commandes" (avec confirmation) pour marquer en une fois tous les articles listés comme commandés — ils rejoignent alors le suivi de réception dans la Mercuriale.
- Glisser-déposer pour réordonner fournisseurs et articles ; unités/conditionnements réutilisables partagés avec la création d'articles.

### Clients / CRM (`/clients`)

CRM léger pour les clients **entreprises et événements** (séminaires, privatisations, groupes) — distinct des clients du quotidien qui ne sont pas suivis nommément.

- **Entreprises** (`CrmCompany`) — fiches société (secteur, adresse, contact, notes).
- **Contacts** (`CrmContact`) — personnes, rattachées ou non à une entreprise.
- **Événements** (`CrmOpportunity`) — pipeline en Kanban avec 5 étapes (`Prospect` → `Devis envoyé` → `Confirmé` → `Réalisé` / `Perdu`), glisser-déposer entre colonnes et au sein d'une colonne, montant estimé, date d'événement, nombre d'invités.

### Planning (`/planning`)

- **Employés** — liste (`/planning/employes`) avec poste, taux horaire, et badge de nombre de jours configurés dans le planning de base. Chaque employé a une fiche dédiée (`/planning/employes/[id]`) où se gèrent ses informations (nom, poste, taux horaire, identifiants) et son **planning de base** (grille des 7 jours, horaires récurrents), rattachable à un compte utilisateur.
- **Créneaux** — planning hebdomadaire par employé, navigation semaine par semaine.
- **Modèle hebdomadaire** — créneaux récurrents édités depuis la fiche employé, applicables en un clic (bouton "Appliquer le planning de base" dans `/planning`) pour générer la semaine.
- **Absences** — congés/maladie avec statut (en attente / approuvé / refusé), workflow de validation pour les demandes des employés.

## Modèles de données (Prisma)

| Modèle | Rôle |
|---|---|
| `User` | Comptes + rôle + permissions par page |
| `Employee` | Fiche employé, éventuellement liée à un `User` |
| `ScheduleTemplateEntry` | Créneau récurrent du planning de base |
| `Ingredient` / `MeasureUnit` / `IngredientPriceHistory` | Ingrédients, unités personnalisées, historique de prix |
| `Product` / `ProductIngredient` | Produits vendus + composition en ingrédients |
| `Menu` / `MenuItem` | Bundles de produits |
| `Supplier` / `SupplierItem` / `PackagingUnit` | Mercuriale (fournisseurs, articles, conditionnements) |
| `Shift` / `Absence` | Planning et congés |
| `CrmCompany` / `CrmContact` / `CrmOpportunity` | CRM entreprises/événements |

## Ce qui n'existe pas encore (identifié dans les échanges précédents)

- Migration **SQLite → PostgreSQL**, nécessaire avant une montée en charge significative (SQLite gère mal les écritures concurrentes).
- **Sauvegardes automatiques** de la base de données — aucune protection contre une perte de données aujourd'hui.
- **Surveillance/alertes** du VPS (CPU, erreurs de verrouillage base de données).
- **Application desktop** (Mac/Windows) via Tauri — coquille native pointant vers le site en ligne, pas de store requis.
- **Intégrations externes** (caisse, Shine pour la facturation, avis clients, réservations) — à cadrer dans un cahier des charges dédié, en conservant les logiciels existants plutôt qu'en les recréant.
- **Espace de stockage de documents interne** (façon Drive) — évoqué mais non spécifié.
