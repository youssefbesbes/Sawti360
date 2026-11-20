# Sawti 360 — Le doublage de confiance

*Faire voyager les œuvres tunisiennes en derja, avec un doublage éthique et supervisé par des humains.*

Sawti 360 double une œuvre de la derja vers le français : un film, mais aussi une vidéo YouTube, un Short ou un podcast. L'IA propose, le créateur décide. Chaque voix a un Passeport de voix : sans consentement, rien n'est généré. À l'export, l'œuvre part avec un Passeport 360° que chacun peut vérifier.

« L'IA propose · L'humain décide · La confiance accompagne chaque export. »

Hackathon IA Éthique 360, 5e édition (Junior Entreprise INSAT et OIF).

**Ce qui est nouveau :** les outils de doublage par IA produisent une voix. Sawti 360 produit une voix et la preuve qu'elle est légitime, mesurée et traçable.

## Sommaire

- [Le problème](#le-problème)
- [La solution](#la-solution)
- [Aperçu du prototype](#aperçu-du-prototype)
- [État d'avancement](#état-davancement)
- [Le Passeport 360° du film](#le-passeport-360-du-film)
- [Place de l&#39;IA : construit ou réutilisé](#place-de-lia--construit-ou-réutilisé)
- [Démarche éthique à 360°](#démarche-éthique-à-360)
- [En cohérence avec la Francophonie](#en-cohérence-avec-la-francophonie)
- [Modèle économique](#modèle-économique)
- [Équipe](#équipe)
- [Propriété intellectuelle](#propriété-intellectuelle)
- [Sources](#sources)

## Le problème

Un cinéaste tunisien indépendant rencontre une barrière de langue qui empêche ses films en derja d'être compris quand ils sont présentés à des festivals ou à des publics étrangers, ce qui entraîne des films primés mais invisibles. Les outils d'IA qui pourraient les doubler lui font courir un autre risque : voix clonées sans accord, contenus non étiquetés, aucune trace de qui a décidé quoi.

**Face 1 : le film ne voyage pas.** Le cinéaste amateur tunisien Mohamed Karim Dahmouni a expliqué que les sous-titres aident, mais que le doublage permet à un film de voyager. Toute utilisation de son image ou de sa voix dans le projet est conditionnée à un accord écrit.

> « Un film que le public ne comprend pas reste invisible, même s'il est extraordinaire. Les miens sont en dialecte tunisien, ils s'arrêtent à la barrière de la langue. Les sous-titres aident un peu, mais seul le doublage permet à un film de voyager. »
> Mohamed Karim Dahmouni, cinéaste amateur tunisien.

**Face 2 : le doublage par IA est un terrain de conflits.** Les fiches du programme AI Academy citent des cas réels : en France, la voix d'un doubleur décédé recréée par IA pour une bande-annonce alors que sa famille n'avait accepté qu'un essai, puis 25 doubleurs qui obtiennent le retrait de 47 modèles clonant leur voix ; des doublages d'anime par IA mis en ligne puis retirés en quelques jours ; une voix synthétique dans un documentaire sans mention à l'écran. La technique seule ne suffit pas : il faut du consentement, de la transparence et de la responsabilité.

**Notre démarche.** Le constat s'appuie sur l'entretien avec Mohamed Karim Dahmouni et sur les difficultés de consentement, de transparence et de traçabilité documentées dans le secteur. Le WER est l'indicateur retenu pour évaluer la transcription du derja ; aucun résultat chiffré n'est avancé dans ce README.

**Au-delà du cinéma.** Le même blocage touche les créateurs en ligne : une vidéo YouTube, un Short, un podcast ou une vidéo générée par IA en derja reste dans le public qui comprend la derja. Le parcours et la couche de confiance sont les mêmes ; seul l'usage déclaré dans le Passeport de voix change (`doublage_video_en_ligne` : YouTube, Shorts, Reels, podcasts).

## La solution

Sawti 360 est un doublage supervisé entouré d'une couche de confiance. Les outils de doublage par IA produisent une voix. Sawti 360 produit une voix et la preuve qu'elle est légitime, mesurée et traçable.

### Le parcours d'un film : dix étapes, dix portes de confiance

| #  | Étape                         | Ce qui se passe                                                                                | Porte de confiance |
| -- | ------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------ |
| 1  | Import local                   | Le cinéaste charge un extrait ; rien ne quitte sa machine                                     | Sécurité         |
| 2  | Séparation des pistes         | Dialogue séparé de la musique et de l'ambiance                                               | Durabilité        |
| 3  | Transcription                  | Derja, français et mélange, score de confiance par segment                                   | Diversité         |
| 4  | Validation de la transcription | Le cinéaste ou un transcripteur corrige                                                       | Contrôle humain   |
| 5  | Traduction contextuelle        | Propositions avec glossaire culturel, vérificateur de fidélité (chiffres, noms, négations) | Robustesse         |
| 6  | Adaptation et validation       | L'adaptateur accepte, réécrit ou rejette chaque réplique                                    | Responsabilité    |
| 7  | Choix de la voix               | Voix neutre ou consentie ; le moteur de règles vérifie le Passeport de voix                  | Consentement       |
| 8  | Synthèse et mixage            | Voix générée avec le plus petit modèle suffisant                                           | Durabilité        |
| 9  | Étiquetage                    | Label visible, métadonnées, générique des voix                                             | Transparence       |
| 10 | Export                         | Piste doublée, sous-titres et Passeport 360° signé                                          | Toutes les portes  |


### Les neuf modules de la couche de confiance

| Principe                | Module Sawti 360                       | Ce que fait le module                                                                                                                              |
| ----------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contrôle humain        | Validation et bouton d'arrêt          | Validation de chaque réplique ; rien ne sort sans validation                                                                                      |
| Consentement            | Passeport de voix et moteur de règles | Registre des consentements (qui, quel usage, combien de temps, quelle rémunération, droit de retrait) ; refus de toute génération hors licence |
| Équité d'accès       | Équité d'accès                      | Mesure des écarts par accent régional ; version gratuite pour étudiants et petites structures                                                   |
| Diversité              | Sawti-Bench                            | Test en français, derja, arabe, amazigh si des données existent ; publication des écarts, même mauvais                                         |
| Transparence            | Label et générique des voix          | Label visible, manifeste lisible par machine de type C2PA, générique, QR de vérification                                                        |
| Responsabilité         | Journal d'audit et référent éthique | Journal à chaîne de hachage, référent éthique nommé, voie de recours                                                                         |
| Robustesse              | Garde-fous et équipe rouge            | Blocage des voix non enregistrées et des personnalités, tests d'attaque, bouton de signalement                                                   |
| Sécurité des données | Coffre local                           | Traitement local, chiffrement, accès par rôle, jamais de film inédit envoyé à une IA publique                                                 |
| Durabilité             | Panneau énergie                       | kWh et gCO₂ par génération, mode éco avec le plus petit modèle suffisant                                                                      |


| Ce que fait l'IA                                                                       | Ce qu'elle ne décide pas                                                 |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Elle propose une transcription                                                         | L'utilisateur valide le texte qui fait foi                                 |
| Elle propose une traduction et signale les écarts de chiffres, de noms, de négations | L'utilisateur accepte, réécrit ou rejette chaque réplique               |
| Elle génère une voix si le moteur de règles l'autorise                              | L'utilisateur fixe les usages, les projets et la durée, et peut révoquer |
| Elle mesure sa consommation                                                            | L'utilisateur éthique valide le passeport avant l'export                 |

## Aperçu du prototype

Prototype en ligne : **[sawti360.vercel.app](https://sawti360.vercel.app/)**. Captures du site actuel, en mode démonstration : comptes, projets et voix sont fictifs. Chaque élément porte son étiquette **Réel**, **Simulé** ou **Exemple**.

### 1. Accueil

« Le doublage de confiance » : chaque voix a un passeport, chaque œuvre sort avec son Passeport 360°.

![Accueil](docs/prototype/00-accueil.png)

### 2. Tableau de bord du créateur

Vue d'ensemble des projets du créateur et accès à chaque étape du parcours.

![Tableau de bord](docs/prototype/01-tableau-de-bord.png)

### 3. Traduction validée réplique par réplique

Le LLM 1 traduit, le LLM 2 relit, le vérificateur de fidélité signale un chiffre qui change (300 dinars devenus 30). Rien n'est généré sans l'approbation du créateur.

![Traduction](docs/prototype/02-traduction.png)

### 4. Autorisations des voix

Pour garder une voix originale, on indique si la personne est vivante (consentement par lien sécurisé) ou décédée (autorisation signée par la famille). Tant que l'accord manque, la voix reste bloquée.

![Autorisations](docs/prototype/03-autorisations.png)

### 5. Génération

Toutes les conditions doivent être remplies avant de lancer la synthèse : personnages confirmés, voix autorisées, traduction approuvée, crédits suffisants.

![Génération](docs/prototype/04-generation.png)

### 6. Passeport 360°

Le dossier signé de l'œuvre, vérifié dans le navigateur, exportable en PDF, avec son QR d'accès public.

![Passeport 360°](docs/prototype/05-passeport-360.png)

### 7. Centre de confiance : journal d'audit

Chaque décision est inscrite dans un journal chaîné ; « Simuler une falsification » montre qu'une ligne modifiée casse toute la suite.

![Journal d'audit](docs/prototype/06-journal-audit.png)

### 8. Bibliothèque de voix

Des voix prêtées sous licence : échantillon, langues, tarif par projet et statut (disponible, licence révoquée).

![Bibliothèque de voix](docs/prototype/07-bibliotheque.png)

### 9. Vérification publique

N'importe qui peut vérifier un Passeport 360°, sans compte : il suffit de déposer le PDF exporté depuis Sawti 360. Le PDF contient le passeport signé ; sa signature est recalculée dans le navigateur, sans rien envoyer.

![Vérification publique](docs/prototype/08-verifier.png)

### 10. Business Model Canvas

La confiance au centre du modèle : l'offre, les parties prenantes, l'argent et la confiance, case par case.

![Business Model Canvas](docs/prototype/09-business-model-canvas.png)

**Réel aujourd'hui :** extraction audio dans le navigateur, découpage des répliques (Whisper via Groq), transcription derja, intervenants et traduction (Gemini), relecture par un second LLM et vérificateur de fidélité, voix françaises (ElevenLabs) après le moteur de règles, consentement par e-mail, Passeport 360° signé et vérification publique, journal d'audit chaîné, export MP4 avec label IA et QR.

**Encore simulé :** synchronisation labiale et mixage, paiements, mesure d'énergie par génération, vérification de la voix par lecture d'un paragraphe (en développement).

## Le Passeport 360° du film

À chaque export, Sawti 360 génère un dossier lisible par un humain et vérifiable par une machine. Un festival, un producteur ou un financeur peut le contrôler avec un QR, sans nous croire sur parole.

| Rubrique        | Contenu                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Identité       | Titre, version, date, hash du film exporté                                                                                         |
| Voix            | Pour chaque voix : humaine, consentie ou neutre ; identifiant de licence ; usages autorisés ; durée ; état (valide ou révoqué) |
| Langues         | Scores de qualité par langue et par accent testé ; écarts publiés                                                               |
| Transparence    | Label, manifeste de provenance, mention des passages générés par l'IA                                                            |
| Responsabilité | Référent éthique, validateur, empreinte de tête du journal d'audit, nombre de refus de génération                             |
| Sécurité      | Versions et empreintes des modèles utilisés, traitement local confirmé                                                           |
| Durabilité     | kWh et gCO₂ pour le film, modèles comparés                                                                                       |
| Signature       | Signature numérique et QR de vérification                                                                                         |

## Place de l'IA : construit ou réutilisé

| Composant                        | Réutilisé ou construit                                                   | Évaluation prévue                                |
| -------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- |
| Transcription derja et français | Réutilisé comme base ; adaptation légère si les données le permettent | WER avant et après, par langue, sur Sawti-Bench   |
| Traduction contextuelle          | Réutilisé, plus un glossaire construit avec des traducteurs              | Évaluation qualitative par des lecteurs bilingues |
| Vérificateur de fidélité      | Construit : règles, entités, rétro-traduction                           | Précision et rappel sur 100 erreurs injectées    |
| Moteur de consentement           | Construit : licences signées et règles                                   | Tests d'attaque, refus attendus                    |
| Détection de clone (Shield)     | À construire sur des empreintes vocales pré-entraînées                 | Taux d'erreur sur clones de test, publié          |
| Voix                             | Réutilisé (licence vérifiée), voix neutre ou consentie                 | Évaluation d'écoute de la qualité et du naturel |
| Filigrane et manifeste           | Filigrane open source réutilisé ; manifeste construit                    | Robustesse après compression et bruit             |
| Panneau énergie                 | CodeCarbon réutilisé                                                     | kWh et gCO₂ par minute de film                    |

La licence de chaque modèle et de chaque jeu de données est vérifiée avant utilisation. L'IA est au cœur de la solution, mais l'humain garde la décision à chaque étape.

## Démarche éthique à 360°

Chaque principe du programme devient une fonction concrète, testable et visible dans le produit.

| Principe                | Cas et textes cités                                                                                                   | Module Sawti 360                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Consentement            | Doubleur recréé par IA                                                                                                | Passeport de voix et moteur de règles |
| Diversité              | Common Voice et le kabyle ; Convention UNESCO 2005 ; AI Act art. 10                                                    | Sawti-Bench                            |
| Transparence            | Voix synthétique d'un documentaire sans mention (2021) ; AI Act art. 50(4) et 50(2)                                   | Label et générique des voix          |
| Responsabilité         | Doublages d'anime retirés (2025) ; AI Act art. 26 ; ISO/IEC 42001                                                     | Journal d'audit et référent éthique |
| Robustesse              | Fausse publicité avec un acteur (2023) ; AI Act art. 15                                                               | Garde-fous et équipe rouge            |
| Sécurité des données | Fuite de 1,1 To via un faux outil IA (2024) ; RGPD art. 32 et 33 ; loi 2004-63                                         | Coffre local                           |
| Durabilité             | Une vidéo IA de 5 s ≈ 3,4 MJ (MIT Technology Review, 2025) ; UNESCO 2021 ; AI Act annexe XI                          | Panneau énergie                       |

### Les six angles du cahier des charges

| Angle               | Où c'est traité                                        | Risque résiduel et mitigation                                                           |
| ------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Les créateurs      | Validation humaine, crédit, générique des voix        | Validation par habitude : alertes ciblées et taux de détection mesuré                 |
| Les droits          | Passeport de voix, licences des modèles et des données | Une voix déjà diffusée ne peut pas être retirée : le dossier le dit clairement      |
| Les données        | Coffre local, datasheet, jeu de test documenté          | Jeu de test petit : limites publiées                                                    |
| Cultures et langues | Sawti-Bench, glossaire culturel, derja de premier plan   | Expressions intraduisibles signalées pour un choix humain                               |
| La transparence     | Label, manifeste, générique, QR                        | Un filigrane peut être retiré : le manifeste et le label restent la preuve             |
| La planète         | Panneau énergie, plus petit modèle suffisant           | Les modèles de voix sont les plus coûteux : une seule synthèse par réplique validée |

### Limites assumées

- Le projet s'inspire des textes cités sans prétendre constituer une certification juridique.
- La détection de clone n'est pas infaillible.
- Le périmètre dépend de la taille de l'équipe.

## En cohérence avec la Francophonie

- **Diversité culturelle et linguistique** : le projet part de la derja, une langue à faibles ressources, et va vers le français. Nous mesurons la qualité langue par langue pour que l'écart soit visible. L'arabe est prévu pour la finale, puis l'amazigh, l'anglais et l'espagnol, pour que les créateurs touchent d'autres publics avec leur propre voix.
- **Jeunesse et entrepreneuriat** : rémunération par usage pour les comédiens de doublage et accès gratuit envisagé pour les étudiants et associations.
- **Inclusion et égalité** : l'outil vise les jeunes créateurs (cinéastes, vidéastes, podcasteurs) et les petites structures qui n'ont pas accès à un studio de doublage. L'export prévoit des sous-titres, utiles aux personnes sourdes ou malentendantes.
- **Un numérique au service de l'humain** : le consentement, les droits du titulaire et la liberté du cinéaste passent avant la génération : le moteur de règles refuse par défaut.

## Modèle économique


| Bloc                  | Contenu                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Segments              | Cinéastes et producteurs indépendants, festivals, ciné-clubs, chaînes locales, plateformes, comédiens de doublage                                             |
| Proposition de valeur | Faire voyager un film en derja avec contrôle humain et un Passeport 360° que festivals et financeurs peuvent vérifier ; protection des voix pour les comédiens |
| Canaux                | Festivals, écoles de cinéma, réseau INSAT, réseaux francophones, communauté en ligne                                                                          |
| Relation clients      | Accompagnement à la première utilisation, glossaire partagé, retours intégrés                                                                                 |
| Revenus               | Abonnement ou paiement à la minute de film ; offre festival ; offre gratuite pour étudiants et associations ; rémunération par usage reversée aux voix        |
| Ressources clés      | Modèles adaptés au derja, Sawti-Bench, glossaires, registre de voix consenties, équipe produit et ML                                                            |
| Activités clés      | Développement, annotation, évaluation, tests d'attaque, partenariats                                                                                             |
| Partenaires           | Adaptateurs, traducteurs, comédiens, festivals, studios, OIF, établissements d'enseignement                                                                      |
| Coûts                | Calcul, rémunération des humains qui valident, licences, hébergement sécurisé                                                                                 |

## Équipe

| Rôle                                 | Responsabilités                                                                  | Membre  |
| ------------------------------------- | --------------------------------------------------------------------------------- | ------- |
| Chef d'équipe et référent éthique | Entretiens de terrain, planning, livrables, journal d'audit, décisions éthiques | Ahmed   |
| IA parole                             | Transcription derja, Sawti-Bench, mesure du WER                                   | Youssef |
| IA langue                             | Traduction, glossaire, vérificateur de fidélité                                | Koussay |
| Back-end et sécurité                | Passeport de voix, moteur de règles, journal, coffre local, manifeste            | Amine   |
| Front-end, audio et communication     | Console, panneau énergie, voix et mixage, slides, vidéo, README                 | Ghayth  |

## Propriété intellectuelle

L'équipe reste titulaire de la propriété intellectuelle du projet. Elle garantit que ses contributions sont originales et respectent les droits d'auteur, les droits à l'image et à la voix, et les licences des données et des modèles d'IA utilisés. Aucune voix ni image de personne n'est utilisée sans consentement écrit. L'OIF dispose d'un droit de premier regard sur les prototypes et livrables, comme le prévoit le cahier des charges.

## Sources

- Fiches AI Academy / Novation AI Center of Excellence : consentement, diversité, transparence, responsabilité, robustesse, sécurité des données et durabilité. Textes de référence : RGPD art. 9, 32 et 33 ; AI Act art. 10, 15, 26, 50 et annexe XI ; ISO/IEC 42001 ; UNESCO 2005 et 2021.
- Entretien avec Mohamed Karim Dahmouni, cinéaste.
