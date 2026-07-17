# Amoné Nice — Documentation du projet

État du code au 2026-07-17. Ce document décrit ce qui existe aujourd'hui dans l'application (stack, fonctionnalités, modèles de données). Il sert de base pour le futur cahier des charges (évolutions à venir : migration PostgreSQL, sauvegardes automatiques, application desktop, intégrations externes...).

## Stack technique

- **Next.js 14** (App Router) + TypeScript
- **Prisma** + **SQLite** (`prisma/dev.db`) pour le stockage
- **Authentification maison** : mots de passe hashés (bcrypt) + session par cookie signé (JWT via `jose`), pas de service tiers
- **Tailwind CSS** pour l'interface
- Déployé sur un **VPS Hostinger** via PM2 + Nginx + Certbot (voir `README.md` pour les commandes de déploiement)

## Architecture multi-restaurants

L'application gère désormais plusieurs restaurants (marque Amoné avec maison mère + franchises), pas uniquement Amoné Nice. Trois niveaux d'accès :

1. **`User.isSuperAdmin`** — rôle global maison mère, indépendant de tout restaurant, outrepasse toutes les vérifications de permission. Bootstrap uniquement via `SUPER_ADMIN_USERNAME`/`SUPER_ADMIN_PASSWORD` au premier démarrage (jamais via l'UI pour le tout premier compte).
2. **`UserRestaurant(userId, restaurantId, role)`** — rattachement d'un utilisateur à un restaurant avec un rôle **local** (`ADMIN` ou `EMPLOYEE`). Un même utilisateur peut avoir des lignes différentes (donc des rôles différents) sur plusieurs restaurants. Un `ADMIN` local a accès à tous les modules de son restaurant sans permission dédiée.
3. **`ModulePermission(userId, module, restaurantId)`** — accès à un module précis (`"marges"` | `"mercuriale"` | `"crm"`, et futurs modules transverses comme `"marketing"`/`"ticketing"`), soit sur un restaurant précis, soit à portée **globale** (`restaurantId = null`) pour des comptes transverses réseau. Mécanisme générique et extensible : ajouter un futur module ne demande aucune migration de schéma, juste une nouvelle valeur de `module`.

**Session** : le JWT de session porte un `activeRestaurantId` (le restaurant actuellement affiché/édité), auto-sélectionné s'il n'y en a qu'un seul accessible. `POST /api/session/switch-restaurant` change ce contexte sans reconnexion. Ordre de vérification dans le middleware et dans chaque route API : `isSuperAdmin` → `ModulePermission` (locale ou globale) → rôle/permission local sur `activeRestaurantId`.

**Données métier** : toutes les tables listées/créées indépendamment (Ingredient, Product, Menu, Supplier, Employee, CrmCompany, CrmContact, CrmOpportunity, MeasureUnit, PackagingUnit) portent un `restaurantId` obligatoire. Les tables enfants/jonction (IngredientPriceHistory, ProductIngredient, MenuItem, SupplierItem, Shift, Absence, ScheduleTemplateEntry) héritent du scope via leur parent.

Migration des données existantes (SQLite mono-restaurant → multi-tenant) faite dans une seule migration Prisma auto-suffisante (`prisma/migrations/20260714110740_multi_tenant_restaurants`) : crée le restaurant "Amoné Nice", y rattache toutes les données préexistantes, convertit l'ancien `User.role`/`canAccessXxx` en `UserRestaurant`/`ModulePermission`. Un simple `prisma migrate deploy` suffit (pas d'étape manuelle), vérifié en la rejouant sur une copie de la base pré-migration.

Gestion des comptes d'un restaurant dans Réglages → Utilisateurs (scopée au restaurant actif). **Pas encore construit** : sélecteur de restaurant dans l'UI, vue "bascule gérant" pour le SUPER_ADMIN, flux de création d'un nouveau restaurant, dashboard consolidé réseau.

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
| `Restaurant` | Un établissement du réseau (nom, slug, statut) |
| `User` | Identité globale (login), plus `isSuperAdmin` |
| `UserRestaurant` | Rattachement d'un `User` à un `Restaurant` + rôle local |
| `ModulePermission` | Accès d'un `User` à un module, local ou à portée globale |
| `Employee` | Fiche employé d'**un** restaurant, éventuellement liée à un `User` |
| `ScheduleTemplateEntry` | Créneau récurrent du planning de base |
| `Ingredient` / `MeasureUnit` / `IngredientPriceHistory` | Ingrédients, unités personnalisées, historique de prix |
| `Product` / `ProductIngredient` | Produits vendus + composition en ingrédients |
| `Menu` / `MenuItem` | Bundles de produits |
| `Supplier` / `SupplierItem` / `PackagingUnit` | Mercuriale (fournisseurs, articles, conditionnements) |
| `Shift` / `Absence` | Planning et congés |
| `CrmCompany` / `CrmContact` / `CrmOpportunity` | CRM entreprises/événements |

## Ce qui n'existe pas encore (identifié dans les échanges précédents)

- **UI du multi-restaurants** : sélecteur de restaurant actif, vue "bascule gérant" pour le SUPER_ADMIN, écran de création d'un nouveau restaurant (schéma/API déjà en place, pas l'interface).
- Migration **SQLite → PostgreSQL**, nécessaire avant une montée en charge significative (SQLite gère mal les écritures concurrentes — d'autant plus critique maintenant que plusieurs restaurants partagent le même fichier).
- **Sauvegardes automatiques** de la base de données — aucune protection contre une perte de données aujourd'hui.
- **Surveillance/alertes** du VPS (CPU, erreurs de verrouillage base de données).
- **Application desktop** (Mac/Windows) via Tauri — coquille native pointant vers le site en ligne, pas de store requis.
- **Intégrations externes** (caisse, Shine pour la facturation, avis clients, réservations) — à cadrer dans un cahier des charges dédié, en conservant les logiciels existants plutôt qu'en les recréant.
- **Espace de stockage de documents interne** (façon Drive) — évoqué mais non spécifié.
