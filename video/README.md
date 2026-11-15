# Vidéo de présentation Sawti 360 (HyperFrames)

Vidéo de 1 min 59, 1920×1080, 30 i/s, en français, faite avec [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML → MP4).

## Les scènes (`compositions/`)

| Temps | Fichier | Scène |
|---|---|---|
| 0:00 | `ouverture.html` | « Ahla bik ! » rebondit contre la vitre : la barrière de la langue |
| 0:07 | `terrain.html` | Témoignage de M. K. Dahmouni (sa vidéo seule, avec ses propres sous-titres) |
| 0:31 | `probleme.html` | Le problème en une phrase, trois obstacles barrés, « VISA REFUSÉ » |
| 0:42 | `createurs.html` | Pas seulement le cinéma : films, YouTube, Shorts, podcasts, vidéos IA |
| 0:50 | `monde.html` | Globe des langues : derja → français (aujourd'hui) → arabe, anglais, espagnol (demain) |
| 1:00 | `solution.html` | Tampon SAWTI 360, puis une réplique réelle de bout en bout |
| 1:17 | `consent.html` | Vraie console : refus, accord, révocation ; tampons sur le Passeport de voix |
| 1:36 | `passeport.html` | Passeport 360° : vraie capture, QR, « Vérifié » |
| 1:44 | `ethique.html` | Prisme des six angles, 34/34 tests, 18/18 scénarios d'attaque |
| 1:51 | `fin.html` | Globe final : la voix rejoint l'espace francophone ; tampon et équipe |

`index.html` place les scènes et les effets sonores. `lib/globe.js` dessine le globe 3D en points ; `lib/land-dots.js` contient les points des terres, avec les groupes de langues (Natural Earth via `world-atlas`).

## Voix off

La voix off est générée en local avec **Kokoro-82M** (le moteur du projet `automated-vids`), voix française `ff_siwis`, sur CPU. Les 15 clips sont dans `assets/voix/` et placés par `index.html` (`vo-A` … `vo-I2`). Le texte, les temps de départ et les durées maximales sont dans `voix_off_clips.json` (la prononciation y est déjà corrigée : « Saouti », « IA » sans points). Chaque clip a été vérifié par transcription (Whisper) et ramené à −16 LUFS.

Pour régénérer : `KPipeline(lang_code="f", repo_id="hexgrad/Kokoro-82M")`, voix `ff_siwis`, un fichier par clip, silences de début et de fin coupés.

Autre option, plus expressive : ElevenLabs (`ELEVENLABS_A_COLLER.md`, `VOIX_OFF_ELEVENLABS.md`).

## Rendre la vidéo

Le témoignage n'est pas versionné (droit à l'image en attente d'accord écrit). Il est dans la release `media-v1`.

```bash
mkdir -p assets/video && curl -L -o /tmp/t.mp4 https://github.com/youssefbesbes/Sawti360/releases/download/media-v1/Temoignage_Dahmouni.mp4
ffmpeg -i /tmp/t.mp4 -r 30 -g 30 -c:v libx264 -crf 20 -af "loudnorm=I=-16:TP=-1.5:LRA=9" -c:a aac -b:a 192k assets/video/temoignage.mp4
npm install
npx hyperframes render --quality looks -o sawti360.mp4
```

Effets sonores : bibliothèque HyperFrames, licence Pixabay (voir `assets/audio/CREDITS.md`). `SPEC.md` et `STORYLINES.md` gardent les intentions de réalisation.
