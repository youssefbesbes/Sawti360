# Sawti 360 · prototype web

Studio de doublage derja → français, bibliothèque de voix avec Passeport de voix, licences et rémunération des titulaires en jetons, Passeport 360° signé et page de vérification publique.

## Deux modes

| | Avec le serveur (`VITE_BACKEND=1`) | Sans serveur (`npm run dev:demo`) |
|---|---|---|
| Comptes et données | Supabase (Auth, Postgres, Storage) | dans le navigateur |
| Analyse de la vidéo | Groq Whisper et Gemini (Claude en option) ; sans clé, repli explicite sur l’exemple simulé | exemple simulé |
| Moteur de règles, licences signées, filtre de contenu | réels, refaits par le serveur | réels, dans le navigateur |
| Synthèse vocale | ElevenLabs (ou audio silencieux signalé avec `SAWTI_TTS_MOCK=1`) | idem, via `api/tts.ts` |
| Passeport 360° | signé par le serveur, lien court `/verifier?id=…`, QR lisible | signé dans le navigateur, le lien contient tout le passeport : pas de QR, le lien se partage |
| Export MP4 | dans le navigateur ; l’audio des répliques est lu sur le serveur | dans le navigateur ; l’audio est gardé dans ce navigateur pour une vidéo déjà publique, pas pour une vidéo inédite |
| Paiements | sans argent réel | sans argent réel |
| E-mails | Gmail SMTP | simulés (lien affiché à l’écran) |

Les étiquettes Réel, Simulé et Exemple de l’interface disent, écran par écran, ce qui tourne vraiment.

Ce qui n’est pas branché dans les deux modes : le clonage d’une voix originale autorisée (ses répliques restent en voix originale, et l’écran le dit), la séparation des pistes et la synchronisation labiale.

## Lancer en local

Sans serveur, sans clé :

```bash
cd web
npm install
npm run dev:demo
```

Avec le serveur : copier `.env.example` en `.env.local`, le remplir (voir [`docs/backend/SETUP.md`](../docs/backend/SETUP.md)), puis `npm run seed` et `npm run dev`. Pour essayer le serveur sans compte Supabase : base Postgres locale et faux Supabase, [`SETUP.md` § 7 bis](../docs/backend/SETUP.md).

Les clés de signature (`SAWTI_SIGNING_SEED`, `VITE_SAWTI_PUBLIC_KEY`) viennent d’un même `npm run keys`. Lancez `npm run seed` après les avoir posées : des licences signées avec une autre clé sont refusées (`SIGNATURE_INVALIDE`). Vérification : `/api/health` doit répondre `"signing": true`.

## Tests

```bash
npm run typecheck
npm test
```

`npm test` lance les tests sans base de données. Les tests du serveur sur Postgres (le schéma `docs/backend/schema.sql` appliqué tel quel) demandent une base locale :

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm test
```

Ils couvrent le moteur de règles (avec les scénarios d’attaque de `tests/` en Python), le filtre de contenu, la fidélité, le journal, le Passeport 360°, et chaque route du serveur.

## Déployer sur Vercel

1. Importer le dépôt dans Vercel, avec `web` comme dossier racine (framework : Vite).
2. Settings → Environment Variables : toutes les variables de `.env.example`, dont `APP_URL` (l’adresse du site, utilisée par les e-mails et les QR codes).
3. Déployer, puis ouvrir `/api/health`. La page `/verifier` est publique : c’est elle qu’ouvre le QR du Passeport 360°.

Les comptes de démonstration s’ouvrent sans mot de passe : relancez `npm run seed` avant une présentation pour repartir de données propres.
