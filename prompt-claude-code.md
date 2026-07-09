# Prompt pour Claude Code

Crée une application web de gestion pour mon restaurant, avec sauvegarde locale des données (SQLite). Stack recommandée : Next.js (ou équivalent simple) + SQLite via Prisma ou better-sqlite3 + auth simple (NextAuth ou système maison avec mots de passe hashés). Interface en français, simple et claire. **L'application doit être responsive** (utilisable confortablement sur mobile, tablette et ordinateur).

## Authentification et rôles

Deux types de comptes :

- **Direction (admin)** : identifiant/mot de passe, accès complet à tous les onglets (Marges + Planning), peut créer/modifier les comptes employés.
- **Employé** : un compte individuel par employé (login + mot de passe), créé par la direction depuis l'appli. Après connexion, l'employé n'a accès **qu'à l'onglet Planning**, en lecture seule sauf pour :
  - Voir le planning de toute l'équipe (pour connaître ses horaires et ceux des collègues)
  - Voir ses propres congés/absences
  - Éventuellement faire une demande de congé/absence (à valider par la direction) — à inclure si simple à faire

L'onglet Marges n'est jamais visible ni accessible pour un compte employé (le protéger aussi côté serveur, pas seulement en cachant le bouton).

Prévoir un écran de connexion simple, et une déconnexion facile.

L'application a deux onglets principaux (pour la direction) : **Marges** et **Planning**.

## Onglet 1 : Marges

### Gestion des ingrédients
- Liste des ingrédients avec : nom, prix d'achat, unité (kg, L, pièce, etc.), fournisseur (optionnel)
- Possibilité d'ajouter/modifier/supprimer un ingrédient
- Historique du prix si possible (pour suivre l'évolution des coûts)

### Gestion des recettes/produits
- Créer un produit (ex: "Burger Maison") composé de plusieurs ingrédients avec une quantité pour chacun (ex: 150g steak, 1 pain, 20g sauce...)
- Calcul automatique du **coût de revient** de la recette à partir des prix d'achat des ingrédients
- Pour chaque produit, saisir :
  - Prix de vente **sur place**
  - Prix de vente **à emporter**
- Calcul automatique de la marge pour chaque mode de vente :
  - Marge en euros
  - Marge en pourcentage
  - Prends en compte la TVA française (10% sur place, 5.5% à emporter) pour calculer la marge nette réelle après TVA
- Vue tableau de tous les produits avec coût de revient / prix / marge, triable par marge (pour repérer vite les produits peu rentables)
- Recherche/filtre par nom de produit

## Onglet 2 : Planning employés

### Employés
- Liste des employés : nom, poste, taux horaire (optionnel, pour calcul du coût)
- Ajouter/modifier/supprimer un employé

### Planning
- Vue calendrier hebdomadaire (et navigation semaine par semaine)
- Ajouter un créneau de travail par employé (jour, heure de début, heure de fin)
- Calcul automatique des heures travaillées par employé sur la semaine
- Calcul du coût salarial total de la semaine (si taux horaire renseigné)
- Vue claire en grille (jours en colonnes, employés en lignes ou l'inverse)

### Congés / absences
- Possibilité de déclarer une absence ou un congé pour un employé sur une ou plusieurs dates
- Affichage visuel distinct des jours d'absence/congé dans le planning (couleur différente)
- Types d'absence : congé payé, maladie, autre (au choix)
- Vue simple listant les congés à venir

## Hébergement et déploiement
- Le code doit être poussé sur un dépôt **GitHub**
- L'application doit être déployée sur un **hébergeur payant si nécessaire** (ex: Railway ou Render), choisi pour offrir un **stockage persistant** : la base de données SQLite ne doit jamais être réinitialisée ou perdue entre les mises à jour ou redémarrages du serveur
- Éviter les hébergeurs "serverless" sans disque persistant (comme Vercel en config par défaut) qui feraient perdre les données SQLite
- Fournir un fichier de configuration ou des instructions claires (ex: `README.md`) pour connecter le dépôt GitHub à l'hébergeur choisi et déployer en quelques clics
- Prévoir les variables d'environnement nécessaires (secrets d'authentification, etc.) dans un fichier `.env.example`

## Général
- Design simple, propre, lisible rapidement (usage pendant le service, pas de temps à perdre)
- Toutes les données doivent être sauvegardées automatiquement (pas de bouton "enregistrer" à chercher)
- Navigation adaptée au rôle connecté : la direction voit les deux onglets (Marges + Planning), l'employé voit uniquement Planning
- Responsive : menu en haut sur mobile (ou menu burger), mise en page qui s'adapte à la taille d'écran, tableaux et calendrier lisibles sur petit écran
