# Azzouz Location — Guide d’exploitation

Application PWA 100% offline (IndexedDB) pour gestion d’articles et réservations.

## Fonctionnalités
- Articles: CRUD, catégories, seuils d’alerte, import/export CSV.
- Réservations: création avec calcul de disponibilité live, brouillon → confirmation, transitions de statut (en_cours, clôture), blocage si indispo.
- Calendrier: vue mensuelle, filtres client/statut, détails au clic.
- Casse: saisie rapide, impact immédiat sur disponibilité, historique local.
- Inventaire: totaux et disponibilité du jour, export/import JSON global, reset base.
- PWA: installation mobile, fonctionnement mode avion.

## Sauvegardes (recommandé)
- Menu Inventaire → “Exporter JSON” → conservez `dump.json` régulièrement.
- Restauration: Inventaire → “Importer JSON” (merge par id, collisions conservées en local).

## Formats
- `articles.csv`: `id;nom;categorie;prixJour;qteTotale;qteCasse;seuilAlerte;cautionUnit;actif`
- `reservations.csv`: `id;dateDebut;dateFin;clientNom;clientTel;note;statut;acompte;createdAt;updatedAt`
- `reservation_items.csv`: `id;reservationId;articleId;qte;prixJourSnapshot`
- `dump.json`: `{ articles: Article[], reservations: Reservation[], reservationItems: ReservationItem[] }`

## Installation PWA (Android)
1. Ouvrir l’URL déployée dans Chrome.
2. “Ajouter à l’écran d’accueil” (bannière ou menu ⋮ → Installer app).
3. La PWA fonctionne hors-ligne; vérifiez en mode Avion.

## Jeu de test
- Dossier `test-data/` (dump.json + CSV) pour démarrer rapidement.
- Scénario: 50 chaises confirmées (10–12/09). Stock 100, casse 5 → Réserver 60 chaises le 11/09 → confirmation refusée.

## Réglages
- Paramètres → Catégories (ajout/suppression) et devise.

## Sécurité/Conseils
- Aucune synchronisation automatique: pensez à exporter `dump.json`.
- L’export CSV ne couvre pas les réservations: utilisez l’export JSON global pour sauvegardes complètes.

## Déploiement
- Vercel: `vercel.json` (build `pnpm build`, out `out/`).
- Netlify: `netlify.toml` (build `pnpm build`, publish `out`).

## Générer un QR Code
- Commande: `pnpm qr -- --url=https://votre-domaine --out=public/qr-install.png`
- Le fichier peut être imprimé et scanné pour installer la PWA.
