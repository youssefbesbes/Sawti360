# SPEC — Sawti 360, vidéo de première soumission

GOAL:    le jury retient « une voix ne voyage qu'avec son passeport » : problème réel (terrain), solution, place de l'IA, éthique à 360°.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps, français.
TIME:    117 s x 30 = 3510 frames (cahier : 1 à 2 min, on reste sous 2:00).
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
SHOTS:
  0–9     accroche : l'onde se trace, « Une voix. » / « Une langue : la derja. » / frontière, l'onde s'aplatit.
  9–31    terrain : témoignage de M. K. Dahmouni dans un cadre incliné, carte « Entretien du 14 nov. 2026 », sous-titres FR.
  31–42   problème : phrase du cahier ; page de passeport avec trois obstacles barrés en rouge.
  42–52   « Pas seulement le cinéma » : cinq cadres en éventail 3D (films, YouTube, Shorts, podcasts, vidéos générées par IA).
  52–58   révélation : tampon SAWTI 360, « صوتي · ma voix », « Le doublage de confiance ».
  58–74   parcours : 8 étapes sur une bande en perspective, IA propose / humain décide ; zoom sur la vraie alerte de fidélité.
  74–93   consentement : Passeport de voix (flip 3D) ; refus → accord + label → révocation → refus (vrais panneaux) ; « Sans consentement, rien n'est généré. »
  93–101  Passeport 360° : vrai QR, « Vérifié ».
  101–110 éthique à 360° : prisme hexagonal des six angles ; 34/34 tests, 18/18 scénarios d'attaque.
  110–117 fin : « L'IA propose · L'humain décide » ; tampon SAWTI 360 ; équipe et dépôt.
BANNED:  vide bleu nuit avec petits éléments ; glow, particules ; dégradés violets ; cartes en verre ; trois cartes en ligne ;
         logo dans un coin ; chiffres inventés ; interface produit inventée ou inclinée ; « révolutionner », « sans effort ».
QA:      4.5, 8, 20, 36, 47, 55, 66, 70, 80, 86, 90, 97, 105, 115.
