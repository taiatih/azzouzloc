Déploiement (Vercel ou Netlify)

Prérequis
- Compte Vercel ou Netlify
- Repo Git (GitHub/GitLab/Bitbucket) ou upload du dossier

Build local (optionnel)
- pnpm install
- pnpm build
- Le site statique est dans out/

Vercel
1) Nouveau projet → Importer le repo
2) Framework: Next.js
3) Variables:
   - Build Command: pnpm build
   - Output Directory: out
   - Install Command: pnpm install
4) Déployer. Vercel servira out/ statiquement. Le service worker (sw.js) et manifest.json sont inclus.

Netlify
1) New site → Importer depuis Git
2) Build command: pnpm build
3) Publish directory: out
4) Déployer. Alternativement, déposer le dossier out/ via Netlify Drop.

Tests PWA offline
- Sur l’URL déployée, ouvrir dans Chrome
- Ouvrir DevTools → Application → Service Workers: vérifier sw.js contrôlant la page
- Installer (Add to Home Screen) puis activer le mode Avion: la navigation interne doit fonctionner

Jeu de données de démo
- Fichiers: test-data/dump.json, test-data/articles.csv, test-data/reservations.csv, test-data/reservation_items.csv
- Importer dump.json: Page Inventaire → Importer JSON
- Scénario: 50 chaises (10–12/09/2025) déjà confirmées, stock total 100, casse 5 → Essayer de créer une réservation de 60 chaises le 11/09/2025 → bouton Confirmer désactivé (indisponible)
- Export CSV/JSON: depuis Articles (CSV) et Inventaire (JSON global)

Notes
- Aucune API/SSR: output: export
- IndexedDB (Dexie) pour les données locales
- Sync manuelle par Export/Import
