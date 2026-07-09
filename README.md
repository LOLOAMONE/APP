# Gestion Restaurant

Application web de gestion pour restaurant : marges (ingrédients, recettes, rentabilité) et planning d'équipe (créneaux, congés). Next.js + SQLite (Prisma) + authentification maison par rôles.

## Stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Prisma](https://www.prisma.io/) + SQLite pour le stockage local
- Authentification maison : mots de passe hashés (bcrypt) + session par cookie signé (JWT)
- Tailwind CSS pour une interface responsive

## Comptes

- **Direction (admin)** : accès complet (Marges + Planning), gère les comptes employés.
- **Employé** : accès à l'onglet Planning uniquement (lecture du planning d'équipe, gestion de ses propres congés). L'onglet Marges est bloqué aussi bien côté interface que côté API.

Un compte direction est créé automatiquement au premier démarrage à partir des variables d'environnement `ADMIN_USERNAME` / `ADMIN_PASSWORD` (voir `.env.example`). **Changez ce mot de passe dès la première connexion** (aucun écran de changement de mot de passe pour l'admin n'existe encore : modifiez-le en relançant le seed avec un nouveau `ADMIN_PASSWORD`, ou ajoutez cette fonctionnalité si besoin).

## Développement local

```bash
npm install
cp .env.example .env      # puis ajustez les valeurs si besoin
npm run migrate           # crée la base SQLite locale et applique le schéma
npm run seed               # crée le compte direction
npm run dev
```

L'application est disponible sur http://localhost:3000.

## Déploiement

⚠️ **Ne déployez pas sur un hébergeur serverless sans disque persistant (ex: Vercel en configuration par défaut)** : le fichier SQLite serait réinitialisé à chaque déploiement ou redémarrage, et toutes les données seraient perdues.

### 1. Pousser le code sur GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <url-de-votre-repo-github>
git push -u origin main
```

### 2. Option A — VPS Hostinger (recommandé si vous en avez déjà un)

Un VPS a un disque persistant par nature : pas besoin de volume spécial, la base SQLite survit aux redémarrages et aux mises à jour tant qu'elle reste sur le disque du serveur.

1. **Connectez-vous en SSH** à votre VPS :
   ```bash
   ssh root@<ip-de-votre-vps>
   ```
2. **Installez Node.js 20** (via NodeSource) et **git** si ce n'est pas déjà fait :
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt-get install -y nodejs git
   ```
3. **Clonez le dépôt** et installez les dépendances :
   ```bash
   git clone <url-de-votre-repo-github> resto-manager
   cd resto-manager
   npm install
   ```
4. **Configurez l'environnement** :
   ```bash
   cp .env.example .env
   nano .env
   ```
   Réglez notamment `DATABASE_URL="file:/root/resto-manager/data/prod.db"` (un chemin sur le disque du VPS, en dehors du dossier de build), et générez un `SESSION_SECRET` avec `openssl rand -base64 32`.
   ```bash
   mkdir -p data
   ```
5. **Build puis premier lancement + création du compte direction** :
   ```bash
   npm run build
   npm run seed
   ```
6. **Lancez l'application en continu avec PM2** (garde le serveur actif, le redémarre en cas de crash ou de reboot du VPS) :
   ```bash
   npm install -g pm2
   PORT=3000 pm2 start npm --name resto-manager -- start
   pm2 save
   pm2 startup   # puis exécutez la commande qu'affiche pm2
   ```
7. **Exposez l'application sur le port 80/443** avec Nginx en reverse proxy (permet aussi d'ajouter HTTPS avec Certbot) :
   ```bash
   apt-get install -y nginx certbot python3-certbot-nginx
   ```
   Créez `/etc/nginx/sites-available/resto-manager` :
   ```nginx
   server {
       listen 80;
       server_name votre-domaine.fr;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   Puis activez-le et ajoutez le HTTPS :
   ```bash
   ln -s /etc/nginx/sites-available/resto-manager /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   certbot --nginx -d votre-domaine.fr
   ```

**Mises à jour ultérieures** : sur le VPS, dans le dossier du projet —
```bash
git pull
npm install
npm run build
pm2 restart resto-manager
```
Le script `start` applique automatiquement les migrations Prisma en attente avant de redémarrer le serveur, donc les évolutions de schéma passent sans perte de données.

### 2. Option B — Railway

1. Sur [railway.app](https://railway.app), créez un nouveau projet **"Deploy from GitHub repo"** et sélectionnez ce dépôt.
2. Dans l'onglet **Variables** du service, ajoutez :
   - `DATABASE_URL` = `file:/data/prod.db`
   - `SESSION_SECRET` = une chaîne aléatoire longue (générez-la avec `openssl rand -base64 32`)
   - `ADMIN_USERNAME` et `ADMIN_PASSWORD`
3. Dans l'onglet **Settings > Volumes**, ajoutez un volume monté sur `/data`. C'est ce volume qui rend la base SQLite persistante entre les redéploiements.
4. Railway détecte automatiquement Next.js et utilise les scripts `build` / `start` du `package.json` (build : compile l'app ; start : applique les migrations puis lance le serveur, qui écoute automatiquement sur le port fourni par Railway).
5. Une fois le premier déploiement terminé, créez le compte direction en exécutant une fois, via le CLI Railway :
   ```bash
   railway run npm run seed
   ```

### 2. Option C — Render

1. Sur [render.com](https://render.com), créez un **Web Service** à partir de ce dépôt GitHub.
2. **Build Command** : `npm install && npm run build`
   **Start Command** : `npm start`
3. Dans **Environment**, ajoutez les mêmes variables que ci-dessus, avec `DATABASE_URL=file:/data/prod.db`.
4. Dans **Disks**, ajoutez un disque persistant monté sur `/data` (quelques centaines de Mo suffisent largement pour du SQLite).
5. Après le premier déploiement, ouvrez un **Shell** depuis le dashboard Render sur ce service et lancez :
   ```bash
   npm run seed
   ```

### Mises à jour ultérieures

À chaque nouveau `git push` sur la branche connectée, l'hébergeur reconstruit et redéploie automatiquement l'application. Le script `start` applique les migrations Prisma en attente avant de démarrer le serveur, donc les évolutions de schéma sont appliquées automatiquement sans perte de données (le disque persistant conserve `prod.db` d'un déploiement à l'autre).

## Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complète et leur description.
