# Vidéo de présentation Sawti 360 (HyperFrames)

Vidéo de 1 min 58, 1920×1080, en français, faite avec [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML → MP4).

- `index.html` : la timeline (10 scènes + effets sonores).
- `compositions/` : une scène par fichier.
- `lib/globe.js` : le globe 3D en points (données Natural Earth via `world-atlas`).
- `SPEC.md`, `STORYLINES.md` : intentions de réalisation. `VOIX_OFF.md` : texte et timing de la voix off.
- Effets sonores : bibliothèque HyperFrames (licence Pixabay, voir `assets/audio/CREDITS.md`).

Le témoignage n'est pas versionné (droit à l'image en attente d'accord écrit). Pour rendre la vidéo :

```bash
mkdir -p assets/video && curl -L -o /tmp/t.mp4 https://github.com/youssefbesbes/Sawti360/releases/download/media-v1/Temoignage_Dahmouni.mp4
ffmpeg -i /tmp/t.mp4 -r 30 -g 30 -c:v libx264 -crf 20 -c:a aac assets/video/temoignage.mp4
npx hyperframes render --quality looks -o sawti360.mp4
```
