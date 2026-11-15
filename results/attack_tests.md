# Tests d’attaque — résultats générés automatiquement

Généré par `pytest` le 2026-11-15T18:51:00+00:00. Ne pas éditer à la main.

| Scénario | Attendu | Observé | Test |
|---|---|---|---|
| Modification d’une entrée du journal d’audit | Vérification en échec à l’index modifié | ✅ conforme à l’attendu | `tests/test_audit.py::test_tamper_detected` |
| Génération demandée pour une voix refusée | Aucun fichier audio produit, refus journalisé | ✅ conforme à l’attendu | `tests/test_guardrails.py::test_refusal_generates_nothing` |
| Voix de la liste de blocage (personnalité publique) | Refusé (PERSONNALITE_BLOQUEE) | ✅ conforme à l’attendu | `tests/test_guardrails.py::test_blocklist_from_config` |
| Modification d’un champ du Passeport 360° après signature | INVALIDE (signature) | ✅ conforme à l’attendu | `tests/test_passport.py::test_edit_one_field_fails` |
| Journal réécrit dans le passeport puis re-signé avec une autre clé | INVALIDE (chaîne + clé) | ✅ conforme à l’attendu | `tests/test_passport.py::test_rewritten_journal_fails` |
| Voix consentie, licence valide | Autorisé (OK) | ✅ conforme à l’attendu | `tests/test_rules.py::test_valid` |
| Voix sans Passeport de voix | Refusé (VOIX_NON_ENREGISTREE) | ✅ conforme à l’attendu | `tests/test_rules.py::test_unregistered` |
| Réutilisation d’une licence révoquée | Refusé (LICENCE_REVOQUEE) | ✅ conforme à l’attendu | `tests/test_rules.py::test_revoked` |
| Réutilisation d’une licence expirée | Refusé (LICENCE_EXPIREE) | ✅ conforme à l’attendu | `tests/test_rules.py::test_expired` |
| Licence utilisée avant sa date de début | Refusé (LICENCE_PAS_ENCORE_VALIDE) | ✅ conforme à l’attendu | `tests/test_rules.py::test_not_yet_valid` |
| Usage hors licence (jeu vidéo) | Refusé (USAGE_NON_AUTORISE) | ✅ conforme à l’attendu | `tests/test_rules.py::test_wrong_use` |
| Usage explicitement interdit (publicité) | Refusé (USAGE_INTERDIT) | ✅ conforme à l’attendu | `tests/test_rules.py::test_forbidden_use` |
| Voix réutilisée sur un autre projet | Refusé (PROJET_NON_AUTORISE) | ✅ conforme à l’attendu | `tests/test_rules.py::test_wrong_project` |
| Langue hors licence | Refusé (LANGUE_NON_AUTORISEE) | ✅ conforme à l’attendu | `tests/test_rules.py::test_wrong_language` |
| Licence modifiée en base (usages élargis) | Refusé (SIGNATURE_INVALIDE) | ✅ conforme à l’attendu | `tests/test_rules.py::test_bad_signature` |
| Voix d’une personnalité publique | Refusé (PERSONNALITE_BLOQUEE) | ✅ conforme à l’attendu | `tests/test_rules.py::test_blocked_personality` |
| Texte non validé par un humain | Refusé (VALIDATION_HUMAINE_MANQUANTE) | ✅ conforme à l’attendu | `tests/test_rules.py::test_missing_human_validation` |
| Bascule de révocation : même demande avant / après | Autorisé puis refusé | ✅ conforme à l’attendu | `tests/test_rules.py::test_revocation_flip` |
