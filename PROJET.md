# Amoné Nice — Documentation du projet

État du code au 2026-10-08. Ce document décrit ce qui existe aujourd'hui dans l'application (stack, fonctionnalités, modèles de données). Il sert de base pour le futur cahier des charges (évolutions à venir : migration PostgreSQL, sauvegardes automatiques, application desktop, intégrations externes...).

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

**Session** : le JWT de session porte un `activeRestaurantId` (le restaurant actuellement affiché/édité), auto-sélectionné parmi les restaurants accessibles si aucun choix valide n'est fourni. `POST /api/session/switch-restaurant` change ce contexte sans reconnexion. Ordre de vérification dans le middleware et dans chaque route API : `isSuperAdmin` → `ModulePermission` (locale ou globale) → rôle/permission local sur `activeRestaurantId`.

**Données métier** : toutes les tables listées/créées indépendamment (Ingredient, Product, Menu, Supplier, Employee, CrmCompany, CrmContact, CrmOpportunity, MeasureUnit, PackagingUnit) portent un `restaurantId` obligatoire. Les tables enfants/jonction (IngredientPriceHistory, ProductIngredient, MenuItem, SupplierItem, Shift, Absence, ScheduleTemplateEntry) héritent du scope via leur parent.

Migration des données existantes (SQLite mono-restaurant → multi-tenant) faite dans une seule migration Prisma auto-suffisante (`prisma/migrations/20260714110740_multi_tenant_restaurants`) : crée le restaurant "Amoné Nice", y rattache toutes les données préexistantes, convertit l'ancien `User.role`/`canAccessXxx` en `UserRestaurant`/`ModulePermission`. Un simple `prisma migrate deploy` suffit (pas d'étape manuelle), vérifié en la rejouant sur une copie de la base pré-migration.

Gestion des comptes d'un restaurant dans Réglages → Utilisateurs (scopée au restaurant actif).

**Usage restaurant uniquement (7 octobre 2026)** : la vue groupe a été retirée. Les anciennes URL `/reseau` et `/reseau/utilisateurs` redirigent vers `/dashboard` ; leurs interfaces ont été supprimées. La navigation affiche uniquement les modules restaurant, sans bascule « Mode gérant » ni entrée « Vue réseau ». Le sélecteur ne s'affiche que si plusieurs restaurants sont accessibles et propose uniquement des restaurants. À la connexion, le premier restaurant accessible est sélectionné si aucun choix valide n'est fourni ; les anciennes sessions sans restaurant actif sont résolues côté serveur. `POST /api/session/switch-restaurant` exige désormais un identifiant non nul.

La structure multi-restaurants, les rôles et les données existantes restent conservés en base pour éviter une migration destructive. Les routes techniques d'administration réseau restent présentes, mais n'ont plus d'écran de gestion. Les tickets et le marketing utilisent désormais une portée limitée au restaurant actif, y compris pour le super administrateur. Les anciennes campagnes/publications nationales restent consultables selon leur ciblage ; la création de nouvelles ressources nationales n'est plus proposée ni autorisée par le contrôle d'accès marketing.

## Navigation et design system

**Refonte visuelle (4 octobre 2026)** : fond ivoire, sidebar bordeaux profond avec navigation active blanche, identité Amoné et avatar du compte. Tableau de bord avec titre hiérarchisé, cartes bordées et chiffres mis en avant ; connexion harmonisée avec la marque. Page Carte organisée en cartes de catégories avec tarifs cliquables, compteurs de produits/formules et onglets Marges harmonisés. Styles communs pour les formulaires, tables, focus clavier et transitions respectant la préférence de mouvement réduit. Navigation responsive et règles de permissions conservées.

**Identité (7 octobre 2026)** : signature typographique « amonē. » à la place des couverts dans la sidebar, sur téléphone et à la connexion ; favicon SVG avec monogramme.

**Sidebar verticale** (`Sidebar.tsx`) remplace l'ancienne nav horizontale : colonne fixe à gauche sur desktop (256px, sticky), top bar + drawer réutilisant le même contenu sur mobile. Sélecteur de restaurant et bascule "vue gérant" en haut, Réglages/Déconnexion en bas. Logique de permissions inchangée (`visibleTabs`, `canAccessXxx`).

**Design system Bento** — tokens Tailwind réutilisables pour tous les blocs/cartes : `rounded-bento` (20px, blocs), `rounded-bento-sm` (14px, items internes), `shadow-bento`/`shadow-bento-hover` (ombre douce, pas de bordure visible). Gutters sur l'échelle Tailwind standard (`gap-5`/`p-5`, `gap-6`/`p-6`), pas de token dédié. Appliqué à la sidebar et au tableau de bord ; les autres écrans seront migrés au fil des prochains chantiers.

## Fonctionnalités par section

### Tableau de bord (`/dashboard`)

Page d'accueil personnalisable, scopée au restaurant actif. Catalogue de widgets défini dans le code (`src/lib/dashboard.ts`) — résumé du jour (créneaux + absences en attente), chiffres clés (tâches à faire, articles à commander, actions marketing datées non terminées), raccourcis vers les sections accessibles. `DashboardWidget` ne stocke que ce qu'un utilisateur a personnalisé (ordre, visibilité) par utilisateur + restaurant ; un widget jamais touché utilise les valeurs par défaut du catalogue — ajouter un widget plus tard ne demande aucune migration. Réordonnancement par glisser-déposer (HTML5 natif, même pattern que Ingrédients/Produits), masquage individuel via le panneau "Personnaliser".

### Marges (`/marges`)

- **Ingrédients** — liste des ingrédients avec prix d'achat, unité (kg/L/pièce ou unité personnalisée), fournisseur, catégorie libre (regroupement du tableau par catégorie). Historique des prix conservé à chaque changement. Unités personnalisées réutilisables, éditables/supprimables (Réglages → Unités).
- **Produits & marges** — fiches produits avec recette (liste d'ingrédients + quantités), prix de vente sur place / à emporter, calcul automatique du coût de revient et de la marge (TTC, TVA différenciée sur place vs à emporter). Une même recette peut varier selon le canal de vente (emballages différents à emporter).
- **Menus** — bundles de plusieurs produits à prix fixe, avec calcul de marge agrégé.
- **Carte** — présentation "menu de vente" à deux colonnes, édition inline des prix directement depuis cette vue.

Ingrédients, Produits et Menus partagent : tri par colonne, ordre personnalisé par glisser-déposer, regroupement par catégorie (si des catégories sont renseignées).

### Mercuriale (`/mercuriale`)

- Catalogue en cartes lisibles sur téléphone et ordinateur, regroupées par fournisseur/catégorie : désignation, conditionnement, référence/lien, prix unité/colis HT, quantité à commander et statut.
- Filtres Catalogue / À commander / À réceptionner ; recherche et tri par nom/prix/ordre personnalisé. Gestion fournisseurs, articles, catégories et conditionnements conservée.
- Quantité enregistrée à la sortie du champ, mises à jour ciblées via `PATCH /api/supplier-items/[id]` pour conserver les autres champs ; erreurs affichées. Suivi de réception avec date et bouton « Marquer comme reçu ».
- **Préparer une commande** (`/mercuriale/a-commander`) : sélection depuis tous les articles, quantités, recherche et filtre fournisseur. Sélection enregistrable (les articles retirés d'un panier existant sont remis à zéro) ; génération d'un texte de mail par fournisseur avec code client, références, conditionnements, livraison souhaitée et commentaire. Copier le mail ou l'ouvrir dans le client mail ; aucun envoi automatique.
- Bouton « Commande envoyée » après confirmation : mise à jour atomique de la sélection du fournisseur, puis suivi dans « À réceptionner ». `POST /api/supplier-orders` vérifie tous les articles dans le restaurant actif, refuse les doublons et les articles déjà en attente de réception. Les prix et catégories sont conservés.
- Le suivi existant stocke une seule commande courante par article ; un historique complet des commandes reste une évolution future.

### Clients / CRM (`/clients`)

Carnet clients simple pour les habitués, voisins et contacts d’entreprise. `/clients` affiche la liste et ouvre une fiche consultable/modifiable. Coordonnées, adresse postale, canal préféré, accords de communication, étiquettes, notes, relances et anniversaire jour/mois. Actions Mail, WhatsApp et copie de l’adresse ; aucun envoi automatique.

- **Entreprises historiques** (`CrmCompany`) — fiches société conservées et liens existants maintenus ; route `/clients/entreprises` toujours disponible.
- **Contacts** (`CrmContact`) — personnes, rattachées ou non à une entreprise.
- **Événements historiques** (`CrmOpportunity`, `/clients/evenements`) — pipeline en Kanban avec 5 étapes (`Prospect` → `Devis envoyé` → `Confirmé` → `Réalisé` / `Perdu`), glisser-déposer entre colonnes et au sein d'une colonne, montant estimé, date d'événement, nombre d'invités.

### Planning (`/planning`)

- **Employés** — liste (`/planning/employes`) avec poste, taux horaire, et badge de nombre de jours configurés dans le planning de base. Chaque employé a une fiche dédiée (`/planning/employes/[id]`) où se gèrent ses informations (nom, poste, taux horaire, identifiants) et son **planning de base** (grille des 7 jours, horaires récurrents), rattachable à un compte utilisateur.
- **Créneaux** — vue gérant en grille hebdomadaire (noms fixes, couleurs par employé, heures/coût estimé), recherche par nom/poste et accès direct aux horaires habituels. Sur mobile, sélection d’un employé puis cartes journalières. Vue employé ouverte sur « Mes horaires » avec sept cartes, heures et jours travaillés, bascule « Toute l’équipe ». Navigation précédente/suivante, retour à la semaine courante et choix de date. Les tarifs horaires sont renvoyés uniquement aux administrateurs par `GET /api/employees`.
- **Saisie groupée** — `POST /api/shifts/batch` (admin) ajoute jusqu’à trois services sur plusieurs jours sélectionnés (sept maximum) dans une transaction atomique. Édition/suppression depuis un créneau, messages de réussite/échec. Validation des dates/heures, chevauchements et absences approuvées, également appliquée aux créations/modifications unitaires ; changement d’employé limité au restaurant actif.
- **Modèle hebdomadaire** — horaires habituels édités en cartes par jour depuis la fiche employé, jusqu’à trois services par jour pour les coupures (sans migration du modèle existant). Le bouton « Remplir avec le planning de base » génère la semaine en conservant les jours déjà planifiés et en ignorant les absences approuvées. Le compteur de jours configurés compte les jours distincts.
- **Absences** — congés/maladie présentés en cartes adaptées au téléphone avec dates en français et statut (en attente / approuvé / refusé), workflow de validation pour les demandes des employés.

### Notes & tâches (`/notes`) et Canaux (`/canaux`)

**7 octobre 2026 : Tickets remplacé par Notes & tâches.** Les anciennes URL `/tickets` redirigent vers `/notes`. Les interfaces et routes API tickets ont été retirées ; les tables historiques restent intactes en base.

- Pages libres avec titre, texte, outils titre/liste/checklist et aperçu (syntaxe simple, affichage échappé, pas de HTML arbitraire).
- Favoris, recherche dans le titre et le contenu, archivage et restauration. Enregistrement explicite avec état visible ; confirmation avant de quitter une page modifiée.
- Onglet « À faire » : tâches à cocher, détails, échéance facultative, indicateur d'échéances dépassées. Les tâches ouvertes alimentent le tableau de bord.
- Modèle `WorkspaceItem`, isolé par restaurant : espace `NOTES` (`NOTE`/`TASK`) ou `MARKETING` (`IDEA`/`TASK`/`POST`), date civile facultative, terminé, favori, archive. `GET/POST /api/workspace` et `PUT /api/workspace/[id]` vérifient l'accès au restaurant ; le marketing exige en plus ses permissions existantes. Notes ouvert aux membres du restaurant comme l'ancien module Tickets.
- Canaux conservés pour les discussions d'équipe (`Channel`/`ChannelMessage`), polling existant.

### Marketing (`/marketing`)

**7 octobre 2026 : calendrier simple, idées et tâches**, à la place du workflow réseau de validation.

- Calendrier mensuel, navigation entre mois et retour à aujourd'hui ; clic sur un jour pour préparer une action. Sur téléphone, agenda du mois en liste.
- Réserve d'idées/actions sans date, vue « Idées & actions » en trois colonnes (idées, tâches, publications), recherche, favoris et archives restaurables.
- Formulaire simple : titre, contenu/étapes/liens, type, date facultative. Cocher une tâche ou marquer une publication comme publiée est manuel.
- Les publications locales préexistantes sont reprises par `scripts/import-marketing.ts` au démarrage après migration : date convertie en Europe/Paris, import idempotent, originaux conservés. `/marketing/calendrier` redirige vers `/marketing`.
- Les campagnes/coupons historiques et leurs API restent disponibles à `/marketing/campagnes`, sans onglet dans le nouvel espace. Pas de publication automatique sur les réseaux sociaux.
- Les actions datées non terminées alimentent les chiffres clés du tableau de bord.

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
| `CrmCompany` / `CrmContact` / `CrmOpportunity` | Carnet clients et données entreprises/événements conservées |
| `Ticket` / `TicketMessage` | Données historiques conservées, module retiré |
| `Channel` / `ChannelMessage` | Canaux internes par restaurant + fil de messages |
| `Campaign` / `CampaignRestaurant` / `Coupon` / `CouponRedemption` | Campagnes marketing national/local + coupons |
| `EditorialPost` | Publications historiques locales reprises dans WorkspaceItem |
| `WorkspaceItem` | Notes, tâches et calendrier marketing du restaurant |
| `Customer` / `CustomerVisit` / `LoyaltyLedgerEntry` | CRM fidélité réseau — posé, pas encore exposé par une API |
| `DashboardWidget` | Personnalisation du tableau de bord (ordre/visibilité par utilisateur) |
| `Page` | Notes hiérarchiques façon Notion — posé, pas encore exposé (prochaine étape) |
| `Project` / `Task` / `TaskDependency` | Suivi de projet léger, pensé pour un futur Gantt (dépendances fin-à-début) — posé, pas encore exposé (prochaine étape) |

## Ce qui n'existe pas encore (identifié dans les échanges précédents)

- **Projets / Gantt** — schéma historique posé (`Project`, `Task`, `TaskDependency`), pas encore exposé. Les notes et tâches simples utilisent désormais `WorkspaceItem`.
- Migration **SQLite → PostgreSQL**, nécessaire avant une montée en charge significative (SQLite gère mal les écritures concurrentes — d'autant plus critique maintenant que plusieurs restaurants partagent le même fichier).
- **Sauvegardes automatiques** de la base de données — aucune protection contre une perte de données aujourd'hui.
- **Surveillance/alertes** du VPS (CPU, erreurs de verrouillage base de données).
- **Application desktop** (Mac/Windows) via Tauri — coquille native pointant vers le site en ligne, pas de store requis.
- **Intégrations externes** (caisse, Shine pour la facturation, avis clients, réservations) — à cadrer dans un cahier des charges dédié, en conservant les logiciels existants plutôt qu'en les recréant.
- **Espace de stockage de documents interne** (façon Drive) — évoqué mais non spécifié.

### Employés et jours off (7 octobre 2026)
- Bouton Modifier explicite dans la liste des employés et accès à la fiche depuis le planning, y compris sur mobile. Nom, poste, taux horaire, identifiant et nouveau mot de passe sont modifiables ; l’identifiant actuel est affiché.
- Employee.restDays stocke les repos hebdomadaires (0=lundi), enregistrés avec les horaires habituels. Un repos exclut les services de base et le remplissage automatique ; les écritures de créneaux le contrôlent. Les horaires déjà existants sont conservés et signalés. Employee.weeklyHours sert de référence affichée dans le total hebdomadaire.
- Absence accepte REPOS pour les jours off ponctuels ; déclaration direction validée immédiatement, demandes employé soumises à validation. Dates civiles vérifiées.
- Réglages > Utilisateurs : cartes adaptées au mobile, édition nom lié, identifiant et nouveau mot de passe via PATCH /api/users/[id]. Les modifications nom/accès sont transactionnelles. Un admin local ne peut pas modifier les accès d’un compte global ou partagé avec un autre restaurant ; le compte courant passe par Mon profil.

### Carnet clients simplifié (7 octobre 2026)
- /clients ouvre directement une liste de clients, avec recherche nom/entreprise/email/téléphone/étiquette/ville, filtres canal préféré et relances échues (date Paris). Les anciens contacts, entreprises et opportunités restent conservés ; les anciennes routes restent accessibles.
- CrmContact conserve name pour compatibilité et ajoute prénom, nom, entreprise libre, adresse postale structurée, canal préféré, accords mail/WhatsApp/courrier (false par défaut), étiquettes, dernier contact, prochaine relance et anniversaire jour/mois sans année. Migration additive sans reconstruction ni suppression des données.
- Interface Clients organisée par structure : liste ou cartes, filtres entreprises / clubs / à recontacter, priorité A et statut, recherche par structure ou interlocuteur. Les fiches centrées proposent Résumé, Contacts et Suivi. Les sources et données d’origine sont repliées ; les notes importées restent conservées et sont présentées sans les métadonnées techniques. Les contacts sans structure restent accessibles. Actions Mail et WhatsApp manuelles ; aucun message envoyé automatiquement.
- Schéma de validation partagé entre POST et PUT contacts : limites de texte, email, dates réelles et anniversaire validés. Une entreprise liée doit appartenir au restaurant actif ; accès et isolation restaurant inchangés.

### Champs personnalisables du carnet clients

La fiche client s’ouvre dans une fenêtre centrée, avec les accents bordeaux. « Gérer les champs » permet de masquer ou afficher les groupes standards et d’ajouter des champs texte, date, nombre ou case à cocher, puis de renommer les champs personnalisés. La configuration `Restaurant.clientFieldConfig` est propre à chaque restaurant ; les valeurs `CrmContact.customValues` sont conservées quand un champ est masqué. Les routes GET/PUT `/api/crm/fields` et la validation des contacts contrôlent les identifiants, les types et le périmètre restaurant. Le type des champs existants est conservé pour protéger les données.

### Suivi des structures (8 octobre 2026)

`CrmCompany.profile` conserve une configuration JSON validée (type entreprise/club/autre, priorité, statut, potentiel, idée AMONĒ, notes et dates de suivi). Les API de création et modification d’entreprises acceptent ce profil, avec validation des dates et périmètre restaurant. Les champs importés du contact principal alimentent le résumé tant qu’ils ne sont pas remplacés explicitement dans la fiche structure. Les notes et sources d’import ne sont ni supprimées ni remplacées lors de l’édition des notes visibles d’un contact.

### Interface commune (8 octobre 2026)

Tous les modules partagent une interface claire : fond gris doux, navigation blanche avec sélection charbon, cartes et champs arrondis, ombres discrètes et accents rouge Amoné (#7D1431). Le bandeau contextualise la page, le restaurant actif et le compte. Navigation mobile, permissions et comportements des modules sont conservés.

Le logo officiel beige fourni est utilisé sans modification (`public/amone-logo-beige.png`) sur un cartouche rouge #7D1431.

## Partenaires marketing (8 octobre 2026)

- `/marketing/partenaires` regroupe les profils UGC et créateurs, séparés des prospects commerciaux. Accès depuis le calendrier Marketing.
- Modèle `MarketingPartner`, rattaché au restaurant, identifiant source unique par restaurant, informations d'origine en JSON, statut, dates de contact/relance, opposition et notes de suivi.
- `/api/marketing/partners` (GET) et `/api/marketing/partners/[id]` (PUT) exigent l'accès Marketing et isolent les restaurants. Les dates sont validées ; l'identifiant source reste stable.
- Recherche, filtres type/priorité/relance, fiches centrées Résumé / Qualification / Suivi et édition des informations. Les champs vides restent non renseignés et les données d'audience non vérifiées ne deviennent pas des métriques confirmées.
- Import contrôlé du JSON AMONÉ : 50 profils UGC et 20 créateurs/influenceurs ; les 150 structures et 265 contacts commerciaux identiques au précédent import sont conservés. L'import conserve les sources, les oppositions et le suivi existant et ne déclenche aucun message.

### Accès salariés — 8 octobre 2026
Les comptes EMPLOYEE accèdent uniquement à leur planning personnel, leurs demandes de congés et les réglages de leur compte. La navigation masque le tableau de bord, les canaux, les notes et tous les autres modules ; le middleware bloque leurs pages et API même avec des permissions de module anciennes. Les API employés, horaires et absences filtrent côté serveur sur la fiche liée à l’utilisateur dans le restaurant actif, résolue depuis la base. Un compte sans fiche ne reçoit aucune donnée de l’équipe. La direction conserve la vue complète.

### Application du planning de base — 8 octobre 2026
Une boîte de dialogue propose de conserver les jours déjà planifiés ou de remplacer les horaires de la semaine pour les salariés ayant un planning de base. Le remplacement est transactionnel, limité au restaurant actif et à la semaine sélectionnée ; les salariés sans modèle ne sont pas modifiés. Les jours off et absences validées excluent toujours la création de créneaux de base. Le mode par défaut de l’API reste la conservation.
