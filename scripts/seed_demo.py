"""Crée les données de démonstration : licences fictives (active, révoquée, expirée,
pas encore valide). Tout est étiqueté « données de démonstration »."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sawti import runtime  # noqa: E402
from sawti.models import sha256_hex  # noqa: E402


def main(reset: bool = True) -> None:
    if reset:
        for name in ("sawti.db", "audit.db"):
            (runtime.DB_DIR / name).unlink(missing_ok=True)
    store, audit = runtime.stores()
    evidence = sha256_hex("formulaire de consentement de démonstration — [à obtenir : formulaire signé réel]")
    common = dict(consent_evidence_sha256=evidence, demo=True, projects=[runtime.DEMO_PROJECT])
    demo = [
        dict(voice_id="voice_amine", holder_name="Amine B. (démo)", allowed_uses=["doublage_film", "doublage_video_en_ligne", "bande_annonce"],
             valid_from="2026-11-01", valid_until="2027-05-15", **common),
        dict(voice_id="voice_sarra", holder_name="Sarra K. (démo)", valid_from="2026-11-01", valid_until="2027-05-15", **common),
        dict(voice_id="voice_ancienne", holder_name="Comédien C. (démo)", valid_from="2025-01-01", valid_until="2025-12-31",
             status="expired", **common),
        dict(voice_id="voice_future", holder_name="Comédienne D. (démo)", valid_from="2027-01-01", valid_until="2027-12-31", **common),
    ]
    for d in demo:
        lic = store.create(**d)
        audit.append("seed_demo", "LICENCE_CREEE", lic.to_dict(), "DEMO")
    revoked = store.revoke(store.list()[1].license_id)
    audit.append("seed_demo", "LICENCE_REVOQUEE", {"license_id": revoked.license_id}, "DEMO")
    print("Données de démonstration créées :")
    for lic in store.list():
        print(f"  {lic.license_id}  {lic.voice_id:16s} {lic.status:8s} {lic.valid_from} → {lic.valid_until}")
    print("Lancer la console : streamlit run app/streamlit_app.py")


if __name__ == "__main__":
    main()
