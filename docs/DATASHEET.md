# Fiche données et modèles

Règle : la licence de chaque modèle et jeu de données est vérifiée **avant** usage et consignée ici.
« À vérifier » signifie que la vérification doit être refaite sur la page source au moment de l’intégration.

## Utilisé dans la V1

| Nom | Version | Rôle | Licence | Usage commercial | Source |
|---|---|---|---|---|---|
| *Aucun modèle d’IA n’est exécuté dans le parcours de démonstration V1* | — | La « génération » est un signal sinusoïdal de remplacement (`sawti-placeholder-tone` 0.1) | — | — | `sawti/synth.py` |
| cryptography | 50.0.2 | Ed25519, Fernet | Apache-2.0 / BSD-3 | oui | https://github.com/pyca/cryptography |
| qrcode | 8.2 | QR de vérification | BSD | oui | https://github.com/lincolnloop/python-qrcode |
| jiwer | 4.0.0 | WER / CER | Apache-2.0 | oui | https://github.com/jitsi/jiwer |
| codecarbon | 3.3.2 | Mesure d’énergie | MIT | oui | https://github.com/mlco2/codecarbon |
| streamlit | 1.67.0 | Console | Apache-2.0 | oui | https://github.com/streamlit/streamlit |
| faster-whisper (optionnel) + poids Whisper `small` | à figer à l’installation | Transcription pour `scripts/run_wer.py` | MIT (code et poids) — à vérifier | oui | https://github.com/SYSTRAN/faster-whisper · https://github.com/openai/whisper |

## Prévu (demi-finale / finale) — licences à confirmer à l’intégration

| Nom | Rôle | Licence annoncée | Point de vigilance |
|---|---|---|---|
| Modèle ASR tunisien (Hugging Face) | Transcription derja | [à vérifier] | plusieurs modèles sont **CC-BY-NC** : acceptable pour la démo, à lister comme limite |
| Demucs (htdemucs) | Séparation des pistes | MIT — à vérifier | données d’entraînement des poids |
| Opus-MT / Marian | Traduction | variable selon le modèle (souvent CC-BY 4.0) — à vérifier par modèle | qualité derja → français inconnue : [à mesurer] |
| Piper | Synthèse voix neutre | code MIT ; **chaque voix a sa propre licence** — à vérifier | n’utiliser qu’une voix à licence claire |
| SpeechBrain ECAPA-TDNN | Shield (empreintes vocales) | Apache-2.0 — à vérifier | entraîné sur VoxCeleb (conditions de recherche) : limite à déclarer |
| Filigrane audio open source | Marquage | [à vérifier] | retirable par compression : jamais présenté comme preuve unique |

## Jeux de données

| Nom | Contenu | Consentement | Statut |
|---|---|---|---|
| Sawti-Bench (`data/bench/`) | ~2 min de derja + transcription manuelle (cible : 20–30 min) | enregistrement d’un membre de l’équipe ou du cinéaste, **accord écrit obligatoire** dans `data/consents/` | **[à fournir par l’équipe]** |
| Données de démonstration (`scripts/seed_demo.py`) | licences fictives étiquetées « données de démonstration » | sans objet (aucune voix réelle) | ✅ |

## Vidéo de présentation (`video/`)

| Élément | Rôle | Licence | Remarque |
|---|---|---|---|
| HyperFrames 0.9.52 | rendu HTML → MP4 | Apache-2.0 | https://github.com/heygen-com/hyperframes ; télémétrie désactivée |
| GSAP 3.15.0 | animations | licence standard GSAP (gratuite) | https://gsap.com |
| world-atlas 2 (Natural Earth) | contours des pays du globe | ISC ; données Natural Earth du domaine public | https://github.com/topojson/world-atlas |
| Polices Archivo Black, Inter, Noto Sans Arabic | typographie | SIL Open Font License | Noto Sans Arabic via `@fontsource` |
| Effets sonores (whoosh, impacts, clics) | habillage sonore | licence Pixabay (sans attribution obligatoire) | `video/assets/audio/CREDITS.md` |
| Captures de la console | preuves à l'écran | œuvre de l'équipe | `docs/captures/` |
| Témoignage de M. K. Dahmouni | problème observé | **accord écrit d'image et de voix à obtenir** | non versionné ; release `media-v1` |
| Kokoro-82M (`hexgrad/Kokoro-82M`), voix française `ff_siwis` | voix off de la vidéo, générée en local (CPU) | modèle Apache-2.0 ; la voix `ff_siwis` vient du corpus SIWIS (CC BY 4.0, à vérifier) | moteur repris du projet `automated-vids` ; mention « voix off générée par IA » au générique ; fichiers dans `video/assets/voix/` |

Aucun audio de personne réelle n’est versionné dans ce dépôt.
