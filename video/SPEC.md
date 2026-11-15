# SPEC — Sawti 360, vidéo de première soumission

GOAL:    le jury retient « une voix ne voyage qu'avec son passeport » : problème réel (terrain), solution, place de l'IA, éthique à 360°.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps, français.
TIME:    118 s x 30 = 3540 frames (cahier : 1 à 2 min, on reste sous 2:00).
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
SHOTS:   (version 2, choisie scène par scène avec l'équipe)
  0–7     ouverture : « Ahla bik ! » rebondit contre une vitre (barrière de la langue) devant un public francophone.
  7–31    témoignage de M. K. Dahmouni dans un cadre incliné, citations en grand.
  31–42   trois portes (Studio, Sous-titres, IA générique) qui claquent.
  42–51   grille 2×2 (film, YouTube, Short, podcast) : DERJA → FRANÇAIS, même voix.
  51–61   globe : en derja (Tunisie) → + français (aujourd'hui) → + arabe, anglais, espagnol (demain).
  61–81   tampon SAWTI 360, puis une réplique réelle de bout en bout (15 → 50 repéré, corrigé, voix).
  81–97   le guichet de la voix : refusé, accordé (label), révoqué ; vraies captures en preuve.
  97–109  le livret Passeport 360° : six tampons éthiques, vrai QR « Vérifié ».
  109–118 « Ahla bik ! » passe avec son passeport → « Bienvenue ! » ; tampon et équipe.
BANNED:  vide bleu nuit avec petits éléments ; glow, particules ; dégradés violets ; cartes en verre ; trois cartes en ligne ;
         logo dans un coin ; chiffres inventés ; interface produit inventée ou inclinée ; « révolutionner », « sans effort ».
QA:      4.5, 8, 20, 36, 47, 55, 66, 70, 80, 86, 90, 97, 105, 115.
