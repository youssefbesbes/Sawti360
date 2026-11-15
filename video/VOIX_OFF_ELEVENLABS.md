# Sawti 360 — Voice-over with ElevenLabs (complete guide)

Video: `sawti360` · 1:59 · 1920×1080 · French · deadline 15 Nov 2026, 23:59 (GMT+1).
This file has everything needed to produce a voice-over that drops into the video with no editing: the voice to pick, the model and settings, the exact text of every clip (spelled so the AI pronounces it right), the maximum length of each clip, the file names, and how to send them back.

**No voice during the testimonial (0:07 → 0:31): Dahmouni speaks there.**

---

## 0. Before you start (5 min)

| Item | What to do |
|---|---|
| Plan | Free plan: OK for testing, but the output is **non-commercial and needs attribution** ("Made with ElevenLabs" / elevenlabs.io). A hackathon video shown publicly by JEI and the OIF is safest on **Starter** (cheapest paid plan, commercial licence). Check the current terms on ElevenLabs' pricing page before you generate the final files. |
| Credits | The whole script is about 1,000 characters. Even with 3 takes per clip you need ~3,500 characters. |
| Ethics | Use a **Voice Library voice** (licensed for this) or a **clone of a team member's own voice, with that person's written OK**. Never clone Dahmouni or anyone else without written consent: that is exactly what Sawti 360 forbids. We will add one line on the end card: "Voix off : synthèse vocale ElevenLabs". |

---

## 1. Choose the voice (10 min)

ElevenLabs → **Voices → Voice Library** → filters:
- **Language:** French
- **Accent:** standard French, or North-African French (a Tunisian/Maghreb accent in French is a nice, authentic touch)
- **Use case:** Narrative & Story, or Informative & Educational
- **Age:** young or middle-aged
- **Tone we want:** warm, calm, confident, documentary narrator. Not "advertising", not "news anchor", not whispery.

Audition 3–4 voices with this test line (paste it in Text to Speech):

> Elle parle en derja. En face, un public francophone… qui ne comprend pas. Saouti trois-cent-soixante : l'I.A. propose, l'humain décide.

Keep the voice that says **"Saouti"** and **"I.A."** most naturally and sounds the most human. Then use **only that voice** for every clip.

---

## 2. Model and settings (same for every clip)

**Recommended model: Eleven Multilingual v2.** It's the most stable and consistent from one clip to the next, has good French, and supports pause tags.

| Setting | Value | Why |
|---|---|---|
| Model | Eleven Multilingual v2 | consistency across 15 clips |
| Stability | **55 %** | lower = more emotion but more random; higher = flat |
| Similarity | **75 %** | close to the chosen voice without artefacts |
| Style exaggeration | **10 %** | a little warmth; higher becomes theatrical |
| Speaker boost | **On** | clearer voice |
| Speed | **1.00** (allowed 0.95 → 1.10 to fit a clip) | only change it to fit a time limit |
| Output format | **WAV / PCM 44.1 kHz** if your plan allows, otherwise **MP3 44.1 kHz 192 kbps** | best quality for the mix |

**Pauses (Multilingual v2):** write `<break time="0.6s" />` in the text where a pause is marked below (the scripts already contain them). Keep each pause ≤ 1.5 s.

**Optional, Eleven v3** (more expressive, less predictable): it does **not** support `<break>` tags. Replace each one with `…` and you may add one English audio tag at the start of a clip, e.g. `[warmly]` or `[calmly]`. Use stability "Natural". Only use v3 if Multilingual v2 sounds too flat, and then use it for **all** clips (don't mix models).

---

## 3. Pronunciation (already handled in the scripts)

The scripts below are **spelled for the ear**, not for the eye. Paste them exactly.

| On screen | Written in the script | Why |
|---|---|---|
| Sawti 360 | `Saouti trois-cent-soixante` | "Sawti" is often read "Sôti"; numbers in words are read reliably |
| IA | `I.A.` | so it says "i-a", not "ia" in one syllable |
| 15 h / 50 h | `quinze heures` / `cinquante` | numbers in words |
| Passeport 360° | `Passeport trois-cent-soixante` | |
| derja | `derja` | read correctly; if it says "dèr-ya", try `dèrdja` |

If the voice still mispronounces "Saouti", try `Sa-outi` or `Saoutî` and keep the best.

---

## 4. The clips to generate (15 short files)

Generate **one clip per row**. Each has a hard **max length**: the clip must end before the next picture. After generating, check the length shown in the player. If it's too long, regenerate at speed 1.05–1.10; if it's still too long, use the shorter "plan B" text.

Generate each clip 2–3 times and keep the most natural take.

| File | Starts at (video time) | Max length | Text to paste | Plan B (shorter) |
|---|---|---|---|---|
| `A.wav` | 0:00.4 | **5.5 s** | `Elle parle en derja. <break time="0.5s" /> En face, un public francophone… qui ne comprend pas.` | `Elle parle en derja. En face… personne ne comprend.` |
| — | 0:07 → 0:31 | — | *(testimonial, no voice)* | |
| `B.wav` | 0:31.4 | **9.5 s** | `Nous l'avons entendu sur le terrain. <break time="0.4s" /> Le studio de doublage coûte trop cher. <break time="0.3s" /> Et l'I.A. générique ne dit pas à qui appartient la voix.` | `Sur le terrain, c'est clair : le studio coûte trop cher, et l'I.A. générique ne dit pas à qui appartient la voix.` |
| `C.wav` | 0:42.3 | **6.8 s** | `Et ce n'est pas que le cinéma : <break time="0.3s" /> YouTube, Shorts, podcasts, vidéos générées par I.A.` | `Et pas seulement le cinéma : YouTube, Shorts, podcasts.` |
| `D.wav` | 0:50.4 | **9.0 s** | `En derja, une vidéo reste en Tunisie. <break time="0.5s" /> En français, elle rejoint tout l'espace francophone. <break time="0.5s" /> Et demain… bien plus loin.` | `En derja, elle reste en Tunisie. En français, elle rejoint la francophonie. Et demain, bien plus loin.` |
| `E1.wav` | 1:00.3 | **2.3 s** | `Voici Saouti trois-cent-soixante.` | `Saouti trois-cent-soixante.` |
| `E2.wav` | 1:03.0 | **13.0 s** | `Suivons une réplique. <break time="0.4s" /> L'I.A. transcrit… puis traduit. <break time="0.4s" /> Elle repère une erreur : quinze heures, devenu cinquante. <break time="0.4s" /> Le créateur corrige. <break time="0.3s" /> Et la voix française est générée.` | `Une réplique : l'I.A. transcrit, traduit, et repère une erreur, quinze devenu cinquante. Le créateur corrige. La voix est générée.` |
| `F1.wav` | 1:17.4 | **3.0 s** | `Chaque voix a son passeport.` | |
| `F2.wav` | 1:22.7 | **2.2 s** | `Voix inconnue : refusée.` | |
| `F3.wav` | 1:26.2 | **1.8 s** | `Voix consentie : accordée.` | `Voix consentie : oui.` |
| `F4.wav` | 1:28.1 | **3.3 s** | `Puis le titulaire révoque sa licence : <break time="0.3s" /> refusée.` | `Licence révoquée : refusée.` |
| `F5.wav` | 1:32.5 | **3.0 s** | `Pas d'accord… pas de voix.` | |
| `G.wav` | 1:36.6 | **7.0 s** | `À chaque export, un Passeport trois-cent-soixante signé… <break time="0.3s" /> que chacun peut vérifier, sans avoir à nous croire.` | `À chaque export, un Passeport trois-cent-soixante, vérifiable par tous.` |
| `H.wav` | 1:44.4 | **6.0 s** | `Six angles éthiques, tous mesurés. <break time="0.4s" /> Et nos limites… écrites.` | `Six angles éthiques. Et nos limites, écrites.` |
| `I1.wav` | 1:51.4 | **3.0 s** | `Avec son passeport… la voix voyage.` | |
| `I2.wav` | 1:55.3 | **3.5 s** | `Saouti trois-cent-soixante : <break time="0.3s" /> l'I.A. propose, l'humain décide.` | `Saouti : l'I.A. propose, l'humain décide.` |

**Tone per clip:**
- A, D: soft, a bit of mystery
- B: factual
- C: lifting up
- E1, I2: proud, slow on the name
- E2: clear, like a guided demo
- F2 and F4: firm
- F3: warm
- F5, H: calm, with weight on the last word
- I1: warm, hopeful

If a clip sounds wrong, it is usually the punctuation. Add a comma or `…` where you want a breath, rather than raising the style.

---

## 5. Check before sending (2 min)

- [ ] Same voice, same model, same settings for all 15 clips
- [ ] Every clip is **shorter** than its max length
- [ ] "Saouti", "I.A." and "derja" sound right in every clip
- [ ] No breath, click or artefact at the start or end (regenerate if so)
- [ ] Files are named exactly `A.wav`, `B.wav`, `C.wav`, `D.wav`, `E1.wav`, `E2.wav`, `F1.wav` … `F5.wav`, `G.wav`, `H.wav`, `I1.wav`, `I2.wav` (or `.mp3`)
- [ ] Note the voice name, the model and the plan used (needed for the credit line)

---

## 6. Send them back

- **Easiest:** drop all 15 files into the Claude Code chat.
- **Or:** GitHub → Releases → `media-v1` → Edit → drag the files into "Attach binaries" → Update release.

Each clip is then placed at its start time, levelled to −16 LUFS, the sound effects lowered under the voice, the credit line added on the end card ("Voix off : synthèse vocale ElevenLabs, voix [nom], licence [plan]"), and the video re-rendered (~15 min).

---

## 7. Optional: API (for a developer on the team)

Same result through the API (`POST /v1/text-to-speech/{voice_id}`), one call per clip. Never paste the API key in a chat, a commit or a shared doc.

```json
{
  "text": "Voici Saouti trois-cent-soixante.",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": { "stability": 0.55, "similarity_boost": 0.75, "style": 0.1, "use_speaker_boost": true, "speed": 1.0 },
  "seed": 360
}
```

Use the same `seed` for every clip so the delivery stays consistent, and request `output_format=pcm_44100` (WAV) or `mp3_44100_192`.
