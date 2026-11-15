# What to paste into ElevenLabs (in this order)

## Step 1. Get a voice (pick ONE option)

**Option A: Voice Library (fastest).** Voices → Voice Library → filter Language: French, Use case: Narrative. Pick a warm, calm narrator.

**Option B: Voice Design (a voice made for you).** Voices → Create a voice → Voice Design. Paste this in the description box:

```
A warm, calm French narrator in their early thirties, with a light North African accent. Clear diction, medium pace, confident and sincere, like a cultural documentary. Studio quality, no background noise.
```

…and this as the preview text:

```
Elle parle en derja. En face, un public francophone qui ne comprend pas. Saouti trois-cent-soixante : l'I.A. propose, l'humain décide. Chaque voix a son passeport.
```

Generate, listen to the 3 proposals, and save the best one.

## Step 2. Settings (set once, never change)

Text to Speech → choose your voice → Model: **Eleven Multilingual v2** → settings icon:
Stability **55** · Similarity **75** · Style **10** · Speaker boost **ON** · Speed **1.0**

## Step 3. Paste each box, Generate, Download, rename

One box = one generation = one file. Rename each download exactly as written above the box.
The number in brackets is the **maximum length**. If the clip is longer, set Speed to 1.05 and generate again.

**A.wav** (max 5.5 s)
```
Elle parle en derja. <break time="0.5s" /> En face, un public francophone… qui ne comprend pas.
```

**B.wav** (max 9.5 s)
```
Nous l'avons entendu sur le terrain. <break time="0.4s" /> Le studio de doublage coûte trop cher. <break time="0.3s" /> Et l'I.A. générique ne dit pas à qui appartient la voix.
```

**C.wav** (max 6.8 s)
```
Et ce n'est pas que le cinéma : <break time="0.3s" /> YouTube, Shorts, podcasts, vidéos générées par I.A.
```

**D.wav** (max 9 s)
```
En derja, une vidéo reste en Tunisie. <break time="0.5s" /> En français, elle rejoint tout l'espace francophone. <break time="0.5s" /> Et demain… bien plus loin.
```

**E1.wav** (max 2.3 s)
```
Voici Saouti trois-cent-soixante.
```

**E2.wav** (max 13 s)
```
Suivons une réplique. <break time="0.4s" /> L'I.A. transcrit… puis traduit. <break time="0.4s" /> Elle repère une erreur : quinze heures, devenu cinquante. <break time="0.4s" /> Le créateur corrige. <break time="0.3s" /> Et la voix française est générée.
```

**F1.wav** (max 3 s)
```
Chaque voix a son passeport.
```

**F2.wav** (max 2.2 s)
```
Voix inconnue : refusée.
```

**F3.wav** (max 1.8 s)
```
Voix consentie : accordée.
```

**F4.wav** (max 3.3 s)
```
Puis le titulaire révoque sa licence : <break time="0.3s" /> refusée.
```

**F5.wav** (max 3 s)
```
Pas d'accord… pas de voix.
```

**G.wav** (max 7 s)
```
À chaque export, un Passeport trois-cent-soixante signé… <break time="0.3s" /> que chacun peut vérifier, sans avoir à nous croire.
```

**H.wav** (max 6 s)
```
Six angles éthiques, tous mesurés. <break time="0.4s" /> Et nos limites… écrites.
```

**I1.wav** (max 3 s)
```
Avec son passeport… la voix voyage.
```

**I2.wav** (max 3.5 s)
```
Saouti trois-cent-soixante : <break time="0.3s" /> l'I.A. propose, l'humain décide.
```

## Step 4. Send the 15 files back

Drop them in the Claude chat (or attach them to the GitHub release `media-v1`). They'll be placed in the video at the right second.
