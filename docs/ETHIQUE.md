# Démarche éthique à 360°

> Alignement avec les textes cités, pas de certification ; relecture juridique prévue.

Chaque angle du cahier des charges : **risque → notre réponse → limite résiduelle**.

| Angle | Risque | Notre réponse (où dans le code) | Limite résiduelle |
|---|---|---|---|
| **1 · Les créateurs** | Une voix de comédien ou de créateur en ligne clonée sans accord, un cinéaste ou un vidéaste dépossédé de ses choix | Passeport de voix signé : usages, projets, langues, durée, rémunération, interdiction d’entraînement (`licenses.py`) ; refus par défaut (`rules.py`) ; validation humaine exigée avant génération | La licence est signée par la clé de la plateforme en V1, pas encore par le titulaire ; rémunération `[à définir]` |
| **2 · Les droits** | Réutilisation d’une voix hors contrat, voix de personnalités | Révocation immédiate ; usages interdits explicites ; liste de blocage (`guardrails.py`) ; bouton « Signaler un abus » | **La révocation n’efface pas un audio déjà diffusé** ; la liste de blocage est déclarative |
| **3 · Les données** | Fuite d’un film ou d’une vidéo inédits, ou d’une empreinte vocale | Traitement 100 % local, coffre chiffré, rôles, empreintes supprimables (`vault.py`) ; seule l’empreinte SHA-256 du consentement est stockée | Gestion de clés minimale (fichier local) ; pas d’audit de sécurité externe |
| **4 · Cultures et langues** | Une IA qui comprend mal la derja et aplatit les références culturelles | Score de qualité **par langue** publié même s’il est mauvais (`bench.py`, `run_wer.py`) ; glossaire culturel et validation par le cinéaste | Sawti-Bench très petit ; WER derja `[à mesurer]` ; accents régionaux non couverts |
| **5 · Transparence** | Le public ne sait pas ce que l’IA a fait | Label visible, manifeste de provenance, générique des voix (`label.py`) ; journal d’audit vérifiable ; Passeport 360° signé + QR | Manifeste inspiré de C2PA, **sans conformité C2PA** ; un label peut être retiré d’une copie |
| **6 · La planète** | Modèles lourds utilisés sans compter | Énergie mesurée par tâche (`energy.py`, CodeCarbon), affichée et inscrite au passeport ; choix du plus petit modèle suffisant | CodeCarbon **estime** (CPU/RAM, mix du pays) ; mesures V1 non représentatives d’une vraie synthèse |

## Principes directeurs

| Principe | Statut de la source | Traduction dans le prototype |
|---|---|---|
| Contrôle humain | **hypothèse** (fiche du mentor non fournie) | `VALIDATION_HUMAINE_MANQUANTE`, validation de la transcription et de chaque réplique |
| Équité | **hypothèse** (fiche du mentor non fournie) | scores par langue et accent, publication des mauvais résultats |
| Consentement, transparence, responsabilité, robustesse, sécurité, durabilité, diversité | dossier de l’équipe | voir tableau ci-dessus |

## Limites assumées

- La révocation bloque les générations futures ; elle ne retire pas un audio déjà diffusé.
- La détection de clone (Shield, prévue) ne sera jamais présentée comme infaillible.
- Le jeu de test est petit ; aucune généralisation n’est revendiquée.
- Un filigrane est retirable ; le manifeste et le label restent la preuve principale.
- Aucune certification juridique.
- En V1, la « voix générée » est un signal neutre : seule la porte d’autorisation est démontrée.
- Le passeport embarque sa clé publique : un vérificateur doit comparer cette clé à la clé publiée par la plateforme (`verify_passport.py <fichier> <clé attendue>`).

## Rôle du référent éthique

`[prénom]` — tient ce document, traite les signalements d’abus du journal (`SIGNALEMENT_ABUS`), valide chaque Passeport 360° avant export, vérifie les consentements de `data/consents/`.

## La vidéo de présentation applique les mêmes règles

- Le témoignage de Mohamed Karim Dahmouni n'est utilisé qu'avec son accord écrit d'image et de voix (`[à obtenir]` avant toute diffusion publique) ; le fichier n'est pas versionné dans le dépôt.
- La voix off est générée par IA en local (Kokoro, voix `ff_siwis` sous licence ouverte, aucune voix réelle clonée) et le générique l'indique : « Voix off générée par IA ».
- Les écrans montrés sont des captures réelles de la console ; aucun chiffre d'audience n'est affiché sur le globe des langues.
- Pour les vidéos générées par IA publiées par des créateurs en ligne, la règle est la même : une voix sans Passeport de voix n'est pas générée.
