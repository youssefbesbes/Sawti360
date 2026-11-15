"""Console de démonstration Sawti 360 (interface en français).
Lancer : streamlit run app/streamlit_app.py"""
import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sawti import SLOGAN, energy, fidelity, guardrails, label, passport, runtime, synth  # noqa: E402
from sawti.models import REASONS_FR  # noqa: E402

st.set_page_config(page_title="Sawti 360 — Le doublage de confiance", layout="wide")
ICON_OK = ('<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>')
ICON_KO = ('<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/></svg>')
st.markdown(
    """<style>
    :root{--ok:#4ade9f;--ko:#ff6b81;--ink:#e8ecff;--muted:#a9b6e6;--line:#27336b;--accent:#3fd5f0}
    ::selection{background:#3fd5f0;color:#070b24}
    *:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
    [data-testid="stDataFrame"],code{font-variant-numeric:tabular-nums}
    .brand{font-weight:700;font-size:2rem;letter-spacing:.06em;margin:0 0 .15rem}
    .tag{color:var(--muted);font-size:.95rem;margin:0 0 1.2rem}
    .porte{display:block;color:var(--muted);font-size:.85rem;margin:-.4rem 0 1rem}
    .card{border:1px solid var(--line);border-radius:10px;padding:18px 20px;margin:6px 0 14px;max-width:70ch}
    .card.ok{border-color:var(--ok);background:rgba(74,222,159,.08)}
    .card.ko{border-color:var(--ko);background:rgba(255,107,129,.08)}
    .big{display:flex;align-items:center;gap:10px;font-size:1.45rem;font-weight:700;margin-bottom:6px}
    .ok .big{color:var(--ok)}.ko .big{color:var(--ko)}
    .card p{margin:0;color:var(--ink)}.card small{color:var(--muted)}
    .demo{color:var(--muted);font-size:.85rem}
    .foot{color:var(--muted);font-size:.85rem;margin-top:48px;padding-top:14px;border-top:1px solid var(--line)}
    </style>""",
    unsafe_allow_html=True,
)

store, audit = runtime.stores()
WER_PATH = ROOT / "results" / "wer.json"
A_MESURER = "[à mesurer]"


def wer_rows():
    return json.loads(WER_PATH.read_text(encoding="utf-8")) if WER_PATH.exists() else []


def decision_card(d, path=None):
    if d.allowed:
        st.markdown(f'<div class="card ok"><div class="big">{ICON_OK}Génération autorisée</div><p>{d.reason_fr}</p>'
                    f'<small>Licence {d.license_id or "non requise (voix neutre)"} · décision journalisée</small></div>',
                    unsafe_allow_html=True)
        if path:
            st.audio(str(path))
            st.caption("Dans cette version, le son produit est un bip de remplacement, pas une voix. "
                       "Ce qui est démontré ici, c’est l’autorisation.")
    else:
        st.markdown(f'<div class="card ko"><div class="big">{ICON_KO}Génération refusée</div><p>{d.reason_fr}</p>'
                    f'<small>Code <code>{d.reason_code}</code> · aucun audio produit · refus journalisé</small></div>',
                    unsafe_allow_html=True)


def run_generation(voice_id, project, use, lang, text, validated, who):
    def job():
        return synth.generate(voice_id=voice_id, project_id=project, use=use, language=lang, requested_by=who,
                              text=text, store=store, audit=audit, out_dir=runtime.EXPORT_DIR / "audio",
                              human_validated=validated)
    (d, path), rec = energy.measure(job, f"generation:{voice_id}")
    energy.save(rec)
    return d, path, rec


# ---------------------------------------------------------------- sidebar
st.sidebar.markdown('<p class="brand" style="font-size:1.25rem">Sawti 360</p><p class="tag" style="font-size:.85rem">Le doublage de confiance</p>',
                    unsafe_allow_html=True)
PAGES = ["Accueil", "Parcours de doublage", "Passeports de voix", "Demande de génération", "Journal d’audit",
         "Passeport 360°", "Qualité & énergie"]
page = st.sidebar.radio("Navigation", PAGES, label_visibility="collapsed")
st.sidebar.divider()
with st.sidebar.expander("Signaler un abus"):
    desc = st.text_area("Description", key="abus_desc", placeholder="Ex. : ma voix est utilisée sans mon accord")
    vid = st.text_input("Voix concernée (facultatif)", key="abus_voice")
    if st.button("Envoyer le signalement"):
        if desc.strip():
            e = guardrails.report_abuse(audit, "utilisateur_console", desc.strip(), vid or None)
            st.success(f"Signalement journalisé (entrée n° {e.index}) pour le référent éthique.")
        else:
            st.warning("Décrivez l’abus avant d’envoyer.")
if not store.list():
    st.sidebar.warning("Aucune licence. Lancez : `python scripts/seed_demo.py`")

# ---------------------------------------------------------------- pages
if page == "Accueil":
    st.markdown('<p class="brand">Sawti 360</p><p class="tag">Le doublage de confiance</p>', unsafe_allow_html=True)
    st.subheader("Chaque voix a un passeport. Chaque œuvre garde son identité.")
    st.write("Un cinéaste, un vidéaste ou un podcasteur tunisien fait doubler son œuvre **de la derja vers le français** "
             "sous contrôle humain : un film, une vidéo YouTube, un Short, un podcast. "
             "À chaque étape, une **couche de confiance** vérifie le consentement des voix, mesure la qualité par langue, "
             "étiquette ce que l’IA a fait, journalise chaque décision et affiche l’énergie consommée. "
             "À l’export, l’œuvre part avec un **Passeport 360°** signé et vérifiable par QR.")
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("#### Ce qui fonctionne dans cette V1")
        st.markdown("- Passeports de voix signés (Ed25519) : créer, vérifier, révoquer\n"
                    "- Moteur de règles : **refus** sans consentement, **accord** avec licence, **refus après révocation**\n"
                    "- Journal d’audit à chaîne de hachage, détection de falsification\n"
                    "- Label, manifeste de provenance, générique des voix\n"
                    "- Passeport 360° signé + QR + vérification hors ligne\n"
                    "- Panneau énergie (CodeCarbon), script de mesure WER")
    with c2:
        st.markdown("#### Ce qui arrive (demi-finale, finale)")
        st.markdown("- Séparation des pistes, transcription derja, traduction contextuelle + glossaire\n"
                    "- Vérificateur de fidélité complet (aperçu à règles déjà actif)\n"
                    "- Synthèse vocale réelle et mixage (V1 : signal neutre de remplacement)\n"
                    "- Shield (détection de clone), filigrane, équipe rouge")
        st.info("Démo en 60 s : **Demande de génération** → voix non enregistrée (refus) → voix consentie (accord) → "
                "**Passeport 360°** → révoquer la licence → nouvelle demande (refus).")

elif page == "Parcours de doublage":
    st.markdown("### Parcours de doublage, de la derja au français")
    st.markdown('<span class="demo">Exemple de démonstration, pas un extrait de film réel.</span>', unsafe_allow_html=True)
    steps = ["1 · Import", "2 · Pistes", "3 · Transcription", "4 · Validation", "5 · Traduction", "6 · Fidélité", "7 · Adaptation", "8 · Voix"]
    tabs = st.tabs(steps)
    src_default, tr_default = "Nlaqawk fil café, rendez-vous à 15 h.", "On se retrouve au café à 50 h."
    with tabs[0]:
        st.markdown('#### Import local')
        st.markdown('<span class="porte">Porte « Sécurité » : chiffrement, accès par rôle</span>', unsafe_allow_html=True)
        st.write("Le film inédit reste sur la machine du cinéaste, dans le **coffre local** chiffré (`sawti/vault.py`, Fernet/AES, rôles cinéaste / adaptateur / référent).")
        st.info("Fait dans cette version : coffre chiffré et contrôle de rôle, testés. L’import vidéo dans l’interface est prévu pour la demi-finale.")
    with tabs[1]:
        st.markdown('#### Séparation des pistes')
        st.markdown('<span class="porte">Porte « Durabilité » : énergie mesurée</span>', unsafe_allow_html=True)
        st.info("Prévu pour la demi-finale : séparation dialogue / musique avec Demucs, énergie mesurée. Pas encore implémenté.")
    with tabs[2]:
        st.markdown('#### Transcription')
        st.markdown('<span class="porte">Porte « Diversité » : score par langue et accent</span>', unsafe_allow_html=True)
        rows = wer_rows()
        if rows:
            st.dataframe(pd.DataFrame(rows), hide_index=True)
        else:
            st.warning(f"WER derja : **{A_MESURER}** — script prêt : `python scripts/run_wer.py` (attend `data/bench/derja_01.wav` + `.txt`).")
    with tabs[3]:
        st.markdown('#### Validation de la transcription')
        st.markdown('<span class="porte">Porte : Contrôle humain</span>', unsafe_allow_html=True)
        src = st.text_input("Transcription proposée par l’IA (modifiable)", src_default, key="src_txt")
        who = st.text_input("Validé par", "Cinéaste (démo)", key="src_who")
        if st.button("Valider la transcription"):
            audit.append(who, "TRANSCRIPTION_VALIDEE", {"texte": src, "modifie": src != src_default}, "VALIDE")
            st.session_state["src_valid"] = src
            st.success("Validé par le cinéaste — le texte corrigé fait foi. Décision journalisée.")
        st.caption("L’IA propose · l’humain décide")
    with tabs[4]:
        st.markdown('#### Traduction contextuelle + glossaire')
        st.markdown('<span class="porte">Porte : Cultures et langues</span>', unsafe_allow_html=True)
        st.info("Prévu pour la demi-finale : modèle local de traduction (licence à vérifier) et glossaire culturel. Pour l’instant, la traduction se saisit à la main à l’étape 6.")
    with tabs[5]:
        st.markdown('#### Vérification de fidélité')
        st.markdown('<span class="porte">Porte « Robustesse » : erreurs signalées</span>', unsafe_allow_html=True)
        s = st.text_input("Source", st.session_state.get("src_valid", src_default), key="fid_s")
        t = st.text_input("Traduction", tr_default, key="fid_t")
        alerts = fidelity.check(s, t)
        if alerts:
            for a in alerts:
                st.error(a["message"])
        else:
            st.success("Aucune alerte (chiffres, noms, négations). Ce n’est pas une preuve de fidélité : la relecture humaine reste requise.")
        st.caption("Ce contrôle est un aperçu à règles simples, réellement exécuté. La rétro-traduction et l’évaluation sur 100 erreurs injectées sont prévues pour la demi-finale ; précision et rappel : [à mesurer].")
    with tabs[6]:
        st.markdown('#### Adaptation et validation réplique par réplique')
        st.markdown('<span class="porte">Porte : Responsabilité</span>', unsafe_allow_html=True)
        line = st.text_input("Réplique finale", "On se retrouve au café à 15 h.", key="ad_line")
        choice = st.radio("Décision de l’adaptateur", ["Accepter", "Réécrire", "Rejeter"], horizontal=True)
        if st.button("Enregistrer la décision"):
            audit.append("Adaptateur (démo)", "REPLIQUE_" + choice.upper(), {"replique": line}, choice.upper())
            st.session_state["line_valid"] = choice != "Rejeter"
            st.success("Décision journalisée.")
    with tabs[7]:
        st.markdown('#### Synthèse vocale')
        st.markdown('<span class="porte">Porte « Consentement » : refus si hors licence</span>', unsafe_allow_html=True)
        st.write("Deux choix seulement : **voix neutre** (générique, sans titulaire) ou **voix consentie** (licence valide, Passeport de voix).")
        st.info("Rendez-vous dans **Demande de génération** pour tester la porte d’autorisation.")

elif page == "Passeports de voix":
    st.markdown("### Passeports de voix")
    lics = store.list()
    if lics:
        df = pd.DataFrame([{"Licence": l.license_id, "Voix": l.voice_id, "Titulaire": l.holder_name, "Statut": l.status,
                            "Usages autorisés": ", ".join(l.allowed_uses), "Projets": ", ".join(l.projects),
                            "Langues": ", ".join(l.languages), "Valide du": l.valid_from, "au": l.valid_until,
                            "Signature": "✔ valide" if store.verify(l) else "✘ invalide",
                            "Démo": "données de démonstration" if l.demo else ""} for l in lics])
        st.dataframe(df, hide_index=True)
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("#### Révoquer une licence")
        active = [l.license_id for l in lics if l.status == "active"]
        if active:
            lid = st.selectbox("Licence", active)
            if st.button("Révoquer", type="primary"):
                store.revoke(lid)
                audit.append("titulaire", "LICENCE_REVOQUEE", {"license_id": lid}, "REVOQUEE")
                st.success(f"{lid} révoquée. Toute nouvelle génération avec cette voix sera refusée.")
                st.rerun()
        st.caption("Limite assumée : la révocation bloque les générations futures ; elle ne retire pas un audio déjà diffusé.")
    with c2:
        st.markdown("#### Créer un Passeport de voix")
        with st.form("new_lic"):
            name = st.text_input("Titulaire de la voix")
            voice = st.text_input("Identifiant de voix", placeholder="voice_prenom")
            uses = st.multiselect("Usages autorisés", runtime.USES[:3], default=["doublage_film"])
            proj = st.text_input("Projet", runtime.DEMO_PROJECT)
            langs = st.multiselect("Langues", runtime.LANGS, default=["fr"])
            d1, d2 = st.columns(2)
            vf, vu = d1.date_input("Valide du", date.today()), d2.date_input("au", date(date.today().year + 1, date.today().month, 1))
            consent = st.file_uploader("Formulaire de consentement signé (son empreinte SHA-256 est conservée, pas le fichier)")
            if st.form_submit_button("Créer et signer"):
                if not (name and voice and consent and uses and langs):
                    st.error("Il manque un champ : titulaire, identifiant, usages, langues et preuve de consentement sont tous obligatoires.")
                elif guardrails.is_blocked_name(name) or voice in guardrails.blocked_voice_ids():
                    st.error(REASONS_FR["PERSONNALITE_BLOQUEE"])
                else:
                    import hashlib
                    lic = store.create(voice_id=voice, holder_name=name, allowed_uses=uses, projects=[proj], languages=langs,
                                       valid_from=str(vf), valid_until=str(vu),
                                       consent_evidence_sha256=hashlib.sha256(consent.getvalue()).hexdigest())
                    audit.append("console", "LICENCE_CREEE", lic.to_dict(), "CREEE")
                    st.success(f"Passeport de voix {lic.license_id} créé et signé.")
                    st.rerun()
        st.caption("V1 : la licence est signée par la clé de la plateforme (démo), pas encore par une clé détenue par le titulaire.")

elif page == "Demande de génération":
    st.markdown("### Demande de génération")
    st.caption("Moteur de règles : autorisation vérifiée avant toute génération. Refus par défaut.")
    known = sorted({l.voice_id for l in store.list()})
    options = [synth.NEUTRAL_VOICE_ID] + known + ["voice_inconnue (non enregistrée)"] + guardrails.blocked_voice_ids()[:1]
    c1, c2 = st.columns(2)
    voice = c1.selectbox("Voix", options, index=min(len(options) - 1, len(known) + 1))
    project = c2.text_input("Projet", runtime.DEMO_PROJECT)
    use = c1.selectbox("Usage", runtime.USES)
    lang = c2.selectbox("Langue", runtime.LANGS)
    text = st.text_area("Réplique à générer", "On se retrouve au café à 15 h.")
    validated = st.checkbox("Texte validé par un humain (adaptateur)", value=True)
    if st.button("Demander la génération", type="primary"):
        d, path, rec = run_generation(voice.split(" ")[0], project, use, lang, text, validated, "console_demo")
        decision_card(d, path)
        if d.allowed:
            kind = "neutre" if d.license_id is None else "consentie"
            st.markdown(f"**Label visible :** « {label.visible_label(kind, 'Adaptateur (démo)')} »")
        if rec.get("kwh") is not None:
            st.caption(f"Énergie mesurée pour cette demande : {rec['kwh']:.2e} kWh · {rec['gco2']:.2e} gCO₂ · {rec['duree_s']} s (CodeCarbon)")

elif page == "Journal d’audit":
    st.markdown("### Journal d’audit à chaîne de hachage")
    entries = audit.entries()
    if not entries:
        st.info("Journal vide.")
    else:
        df = pd.DataFrame([{"n°": e.index, "Horodatage": e.timestamp, "Acteur": e.actor, "Action": e.action, "Décision": e.decision,
                            "Empreinte": e.entry_hash[:12] + "…", "← Empreinte précédente": e.prev_hash[:12] + "…"} for e in entries])
        st.dataframe(df, hide_index=True, height=320)
        st.code(f"Empreinte de tête : {audit.head_hash()}")
        c1, c2, c3 = st.columns(3)
        if c1.button("Vérifier la chaîne", type="primary"):
            ok, bad = audit.verify_chain()
            (st.success if ok else st.error)(f"Chaîne intègre : {len(entries)} entrées vérifiées." if ok
                                             else f"Falsification détectée à l’entrée n° {bad}.")
        refus = [e for e in entries if e.action == "GENERATION_REFUSEE"]
        if c2.button("Démo : falsifier un refus") and refus:
            st.session_state["tampered"] = (refus[-1].index, refus[-1].decision)
            audit.tamper_for_demo(refus[-1].index, "OK")
            st.warning(f"Entrée n° {refus[-1].index} réécrite en « OK » directement en base. Cliquez sur « Vérifier la chaîne ».")
        if c3.button("Rétablir l’entrée") and st.session_state.get("tampered"):
            audit.restore_for_demo(*st.session_state.pop("tampered"))
            st.success("Entrée d’origine rétablie.")

elif page == "Passeport 360°":
    st.markdown("### Passeport 360°")
    st.caption("Dossier vérifiable qui accompagne chaque export : festivals, producteurs et financeurs peuvent le contrôler sans nous faire confiance.")
    c1, c2 = st.columns(2)
    title = c1.text_input("Titre du film", "Court-métrage de démonstration")
    version = c2.text_input("Version", "VF-demo-0.1")
    validator = c1.text_input("Validateur humain", "Adaptateur (démo)")
    referent = c2.text_input("Référent éthique", "[prénom] — référent éthique")
    active = [l for l in store.list() if l.status == "active"]
    chosen = st.multiselect("Voix consenties utilisées", [l.license_id for l in active], default=[l.license_id for l in active[:1]])
    if st.button("Générer et signer le Passeport 360°", type="primary"):
        voices = [{"role": "Narration", "kind": "neutre"}]
        voices += [{"role": f"Personnage {i + 1}", "kind": "consentie", "holder_name": l.holder_name, "license_id": l.license_id}
                   for i, l in enumerate(l for l in active if l.license_id in chosen)]
        rows = wer_rows()
        wer = {r["langue"]: f"WER {r['wer']:.1%} · CER {r['cer']:.1%} ({r['modele']})" for r in rows} or None
        es = energy.summary(energy.load())
        p = passport.assemble(title=title, version=version, asset_sha256=None, licenses=store.list(), audit=audit,
                              validator=validator, referent=referent, voices=voices, models=[synth.PLACEHOLDER_MODEL],
                              energy=es, wer=wer, demo=True)
        p = passport.sign(p, store.key)
        audit.append(validator, "PASSEPORT_360_SIGNE", {"empreinte": passport.passport_hash(p)}, "SIGNE")
        passport.export(p, runtime.EXPORT_DIR)
        st.session_state["passport"] = p
    p = st.session_state.get("passport")
    if p:
        res = passport.verify(p, store.public_key)
        a, b = st.columns([1, 2])
        a.image(passport.qr_png(p), caption="QR de vérification (empreinte du passeport)", width=220)
        with b:
            icon, word = (ICON_OK, "Vérifié") if res["valide"] else (ICON_KO, "Invalide")
            st.markdown(f'<div class="card {"ok" if res["valide"] else "ko"}"><div class="big">{icon}{word}</div>'
                        f'<p>{" ; ".join(res["detail"]).capitalize()}.</p></div>', unsafe_allow_html=True)
            st.markdown("Le passeport contient : l’identité du film, les licences et le consentement des voix, "
                        "les scores de qualité par langue, le label de transparence, le manifeste de provenance, "
                        "le journal d’audit, les modèles utilisés, l’énergie consommée et les émissions.")
        d1, d2 = st.columns(2)
        d1.download_button("Télécharger le JSON", json.dumps(p, ensure_ascii=False, indent=2), "passeport_360.json", "application/json")
        d2.download_button("Télécharger la page HTML", passport.to_html(p), "passeport_360.html", "text/html")
        st.caption("Vérification hors ligne : `python scripts/verify_passport.py exports/passeport_360.json`")
        up = st.file_uploader("Vérifier un passeport reçu (JSON)", type="json")
        if up:
            r = passport.verify(json.loads(up.getvalue().decode("utf-8")), store.public_key)
            (st.success if r["valide"] else st.error)(("VALIDE — " if r["valide"] else "INVALIDE — ") + " ; ".join(r["detail"]))
        with st.expander("Voir le contenu complet (JSON)"):
            st.json(p)

elif page == "Qualité & énergie":
    st.markdown("### Qualité & énergie")
    st.markdown("#### Qualité par langue (Sawti-Bench)")
    rows = wer_rows()
    if rows:
        st.dataframe(pd.DataFrame(rows), hide_index=True)
        st.caption("Valeurs mesurées par `scripts/run_wer.py` (faster-whisper + jiwer, normalisation documentée).")
    else:
        st.dataframe(pd.DataFrame([{"Langue": "ar-TN (derja)", "WER": A_MESURER, "CER": A_MESURER},
                                   {"Langue": "fr", "WER": A_MESURER, "CER": A_MESURER}]), hide_index=True)
        st.warning("Aucune donnée Sawti-Bench trouvée — à fournir par l’équipe (`data/bench/derja_01.wav` + `derja_01.txt`), puis `python scripts/run_wer.py`.")
    st.markdown("#### Panneau énergie")
    recs = energy.load()
    s = energy.summary(recs)
    fmt = lambda v, f: v if isinstance(v, str) else f.format(v)  # noqa: E731
    st.dataframe(pd.DataFrame([{"Tâches mesurées": s["mesures"], "Énergie (kWh)": fmt(s["kwh"], "{:.2e}"),
                                "Émissions (gCO₂)": fmt(s["gco2"], "{:.2e}"), "Durée cumulée (s)": fmt(s["duree_s"], "{}")}]),
                 hide_index=True)
    if recs:
        st.dataframe(pd.DataFrame(recs)[["date", "tache", "kwh", "gco2", "duree_s"]], hide_index=True, height=240)
        st.caption("Mesures CodeCarbon (estimation CPU/RAM, mode hors ligne, mix électrique TUN). En V1 elles portent sur la porte d’autorisation "
                   "et un signal de remplacement : valeurs minuscules, non représentatives d’une vraie synthèse vocale.")
    else:
        st.info("Aucune mesure pour l’instant : faites une demande de génération.")

st.markdown(f'<div class="foot">{SLOGAN}</div>', unsafe_allow_html=True)
