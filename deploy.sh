#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "→ git pull"
git pull

echo "→ npm install"
npm install

echo "→ npm run build"
npm run build

echo "→ pm2 restart resto-manager"
pm2 restart resto-manager

echo "✓ Déploiement terminé."
