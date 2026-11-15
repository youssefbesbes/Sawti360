# SPEC — Sawti 360, vidéo de première soumission

GOAL:    le jury retient « une voix ne voyage qu'avec son passeport » : problème réel (terrain), solution, place de l'IA, éthique à 360°.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps, français.
TIME:    119 s x 30 = 3570 frames (cahier : 1 à 2 min, on reste sous 2:00).
LOOK:    monde « papier » : fond #EEE6D3 avec guilloche fine (lignes #12302E à 7 %), grain 0 ; encre #12302E ;
         accent rouge tampon #C8102E (l'onde, les tampons, un mot par plan) ;
         titres Archivo Black 96–150 px, tracking -2 % ; texte Inter 400/700 34–44 px ; arabe Noto Sans Arabic 700.
         monde « console » : la vraie interface Streamlit, bleu nuit #0B1030, cyan #22B8CF, rouge #FF6B81, vert #3DDC97,
         recomposée à 1,8x à partir des captures, jamais inclinée.
         monde « salle de projection » (témoignage) : fond encre #12302E, cadre papier 14 px, ombre 0 40px 80px rgba(0,0,0,.45).
         profondeur : perspective 1800 px ; cartes papier inclinées 6–14° ; ombres portées 0 30px 60px rgba(18,48,46,.28).
OBJECTS: l'onde (tracé SVG rouge 6 px) ; le Passeport de voix (carte papier, champs réels de la démo) ;
         les tampons (anneau double, texte capitales, rotation -8°) ; les cadres de média (film 2,39:1, lecteur 16:9, téléphone 9:16, micro, clip IA).
MOTION:  arrivée expo.out 0.6–0.9 s ; caméra power2.inOut 0.8–1.2 s ; sortie power3.in 0.3 s ;
         tampon : scale 1.6 → 1 en 0.18 s (power4.out), rotation -14° → -8° ; cartes 3D : rotationY 90° → 8° en 0.9 s expo.out ;
         titres : mot à mot, blur 6 px → 0, 0.067 s d'écart, sans translation.
SHOTS:   (version 3 : fusion choisie par l'équipe)
  0–7     ouverture : « Ahla bik ! » rebondit contre la vitre (barrière de la langue).
  7–31    témoignage de M. K. Dahmouni (sa vidéo seule, avec ses propres sous-titres).
  31–42   problème : phrase + page de passeport, trois obstacles barrés, VISA REFUSÉ.
  42–50   « Pas seulement le cinéma » : films, YouTube, Shorts, podcasts, vidéos IA.
  50–60   globe des langues : derja → + français (aujourd'hui) → + arabe, anglais, espagnol (demain).
  60–77   tampon SAWTI 360, puis une réplique réelle de bout en bout.
  77–96   consentement : vraie console, curseur, tampons sur le Passeport de voix.
  96–104  Passeport 360° : vraie capture, QR, cercles à l'encre.
  104–111 éthique : prisme à six faces, 34/34 tests, 18/18 attaques.
  111–119 globe final : la voix rejoint les villes francophones, tampon, équipe.
BANNED:  vide bleu nuit avec petits éléments ; glow, particules ; dégradés violets ; cartes en verre ; trois cartes en ligne ;
         logo dans un coin ; chiffres inventés ; interface produit inventée ou inclinée ; « révolutionner », « sans effort ».
QA:      4.5, 8, 20, 36, 47, 55, 66, 70, 80, 86, 90, 97, 105, 115.
