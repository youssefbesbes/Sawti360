# Architecture — Sawti 360

## Vue d’ensemble

```mermaid
flowchart LR
    subgraph Parcours["Doublage supervisé (derja → français)"]
        I[1 Import local] --> P[2 Pistes] --> T[3 Transcription] --> V[4 Validation humaine]
        V --> TR[5 Traduction + glossaire] --> F[6 Fidélité] --> A[7 Adaptation] --> S[8 Voix]
    end
    subgraph Confiance["Couche de confiance"]
        L[(Passeports de voix<br/>SQLite + Ed25519)]
        R{{Moteur de règles<br/>authorize}}
        J[(Journal d’audit<br/>chaîne de hachage)]
        G[Garde-fous<br/>liste de blocage, signalement]
        E[Panneau énergie<br/>CodeCarbon]
        C[Coffre local<br/>chiffrement au repos]
    end
    I -.-> C
    S -->|demande de génération| R
    L --> R
    G --> R
    R -->|autorisé| SY[Synthèse]
    R -->|refusé : rien n’est généré| J
    SY --> J
    V -.-> J
    A -.-> J
    SY --> E
    J --> PS[Passeport 360°<br/>signé Ed25519 + QR]
    L --> PS
    E --> PS
    PS --> X[Export : piste doublée · sous-titres · passeport]
    PS --> VF[verify_passport.py<br/>VALIDE / INVALIDE]
```

## Flux d’une demande de génération

```mermaid
sequenceDiagram
    participant U as Adaptateur
    participant S as synth.generate
    participant R as rules.authorize (fonction pure)
    participant J as Journal d’audit
    U->>S: voix, projet, usage, langue, texte validé
    S->>R: GenerationRequest + licences + date + liste de blocage
    R-->>S: Decision (allowed, reason_code, reason_fr)
    S->>J: append(décision) — acceptée ou refusée
    alt refusée
        S-->>U: ⛔ motif en français, aucun audio
    else autorisée
        S-->>U: ✅ audio + label visible
    end
```

Ordre des contrôles dans `authorize` : personnalité bloquée → voix enregistrée → signature → révocation → dates → usage interdit → usage autorisé → projet → langue → validation humaine. **Refus par défaut.**

## Flux de données

| Donnée | Où elle vit | Protection |
|---|---|---|
| Film ou vidéo inédits, pistes audio | `data/private/` (ignoré par git) | coffre local chiffré (Fernet), accès par rôle, aucun envoi réseau |
| Empreintes vocales (biométrie) | coffre local | chiffrées, supprimables à la révocation |
| Passeports de voix | `data/private/sawti.db` | signature Ed25519 de chaque licence |
| Journal d’audit | `data/private/audit.db` | chaîne de hachage SHA-256 |
| Clés | `keys/` (ignoré par git) | générées à l’exécution, jamais versionnées |
| Formulaires de consentement | `data/consents/` | seule l’empreinte SHA-256 entre dans la licence |

## Construit vs réutilisé

| Brique | Construit par l’équipe | Réutilisé |
|---|---|---|
| Passeport de voix, moteur de règles, journal d’audit, Passeport 360°, label, garde-fous | ✅ `sawti/` | `cryptography` (Ed25519, Fernet), `hashlib`, `sqlite3` |
| QR | intégration | `qrcode` |
| Énergie | enveloppe `energy.measure` | `codecarbon` |
| WER / CER | normalisation, script, Sawti-Bench | `jiwer`, `faster-whisper` |
| Console | pages et parcours | `streamlit` |
| Séparation, traduction, synthèse, Shield (à venir) | intégration, évaluation | Demucs, Opus-MT, Piper, SpeechBrain — licences dans `DATASHEET.md` |
