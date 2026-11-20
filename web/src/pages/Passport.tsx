import { CircleCheck, CircleMinus, CircleX, FileDown, ExternalLink, FileBadge2, FileUp, RefreshCw, RotateCcw } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { messageOf } from "../api/client";
import { DEMO_PUBLIC_KEY, platformPublicKey } from "../core/crypto";
import { decodePassport, verifyPassport, type Passport360, type PassportFile } from "../core/passport";
import type { AuditEntry } from "../core/types";
import { BACKEND } from "../lib/backend";
import { loadJournal } from "../state/remote/journal";
import { fetchPublicPassport } from "../state/remote/passports";
import { accountOf, useStore } from "../state/store";
import { FORMAT_LABEL, transparencyPolicy, type VideoFormat } from "../state/workflow";
import { Brand, Seal } from "../ui/brand";
import { Callout, CopyField, Empty, frDate, Hash, KV, PageHead, Prov, Status, toast, Toasts, VoiceMark } from "../ui/kit";
import { useCrumbs } from "../ui/Shell";
import { ScrambleText, shortHex, useReducedMotion } from "../ui/motion";
import { passportUrl, qrReady, slug } from "./project/Result";

/* ------------------------------------------------------------------ the document */

function voiceKind(nature: string): "licensed" | "ai" | "original" {
  if (/originale/i.test(nature)) return "original";
  if (/licenci|consentie/i.test(nature)) return "licensed";
  return "ai";
}

function formatOf(p: Passport360): VideoFormat | null {
  const f = p.source?.format;
  if (!f) return null;
  return (Object.keys(FORMAT_LABEL) as VideoFormat[]).find((k) => FORMAT_LABEL[k] === f) ?? null;
}

function Sec({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <section className="pp-sec" aria-labelledby={`pp-${no}`}>
      <h2 id={`pp-${no}`}>{title}</h2>
      <div className="pp-sec-body">{children}</div>
    </section>
  );
}

/**
 * PDF export through the browser's print engine: a dedicated print stylesheet lays the passport out
 * as a light A4 document (QR included), and the browser saves it as PDF. The file name comes from the title.
 */
export function exportPassportPdf(p: Passport360) {
  const previous = document.title;
  document.title = `passeport-360-${slug(p.identite.titre)}-${p.identifiant ?? ""}`.replace(/-+$/, "");
  document.documentElement.classList.add("print-passport");
  const done = () => {
    document.documentElement.classList.remove("print-passport");
    document.title = previous;
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}

const VERIFY_START = 380;
const VERIFY_STEP = 640;

export function PassportDocument({ p, journal, publicView = false }: { p: Passport360; journal?: AuditEntry[]; publicView?: boolean }) {
  const result = useMemo(() => verifyPassport(p, journal), [p, journal]);
  const url = useMemo(() => passportUrl(p), [p]);
  const [qr, setQr] = useState("");
  useEffect(() => {
    if (qrReady(url)) void QRCode.toString(url, { type: "svg", errorCorrectionLevel: "L", margin: 0, color: { dark: "#0b0b0c", light: "#ffffff" } }).then(setQr);
    else setQr("");
  }, [url]);
  const fmt = formatOf(p);
  const policy = fmt ? transparencyPolicy(fmt) : null;
  const sigOk = result.checks.find((c) => c.id === "signature")?.state === "ok";
  // One h1 per page: the public page owns it, the internal page already has its own heading.
  const TitleTag = publicView ? "h1" : "h2";

  // The verification is computed for real, then played back: each check resolves in turn while the
  // signed values settle, and the seal stamps once the last check is in. Reduced motion shows it at once.
  const reduced = useReducedMotion();
  const [run, setRun] = useState(0);
  const [revealed, setRevealed] = useState(reduced ? result.checks.length : 0);
  useEffect(() => {
    if (reduced) {
      setRevealed(result.checks.length);
      return;
    }
    setRevealed(0);
    const timers = result.checks.map((_, i) => setTimeout(() => setRevealed(i + 1), VERIFY_START + (i + 1) * VERIFY_STEP));
    return () => timers.forEach(clearTimeout);
  }, [run, reduced, result.checks.length]);
  const done = revealed >= result.checks.length;
  const animate = !reduced;

  return (
    <div className="pp-doc">
      <article className="stack" style={{ gap: 0 }}>
        <header className="pp-head">
          <span className={`pp-seal ${done && animate ? "stamp" : ""}`} key={`${run}-${done}`}>
            <Seal size={112} state={done ? (result.valid ? "ok" : "bad") : "pending"} date={p.identite.date} label={done ? undefined : "PASSEPORT 360° · VÉRIFICATION EN COURS · "} />
          </span>
          <div className="stack-sm">
            <span className="pp-id">{p.identifiant ? <ScrambleText key={run} value={p.identifiant} run={animate} duration={900} alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789" /> : "Identifiant non attribué (schéma 0.1)"}</span>
            <TitleTag className="pp-title">{p.identite.titre}</TitleTag>
            <span className={`pp-verdict ${done ? (result.valid ? "ok" : "bad") : "pending"}`} aria-live="polite">
              {!done ? <span className="spinner" aria-hidden /> : result.valid ? <CircleCheck aria-hidden /> : <CircleX aria-hidden />}
              {!done ? "Vérification de la signature en cours…" : result.valid ? "Passeport authentique : aucune modification depuis la signature" : "Passeport invalide : contenu modifié ou signature absente"}
            </span>
            <span className="hint">
              Généré et signé le {frDate(p.identite.date, true)} · schéma {p.schema}
              {p.donnees_de_demonstration ? " · " : ""}
              {p.donnees_de_demonstration && <Prov kind="example">données de démonstration</Prov>}
            </span>
          </div>
        </header>

        <Sec no="01" title="Identité du contenu">
          <KV
            rows={[
              ["Identifiant unique", <span className="mono">{p.identifiant ?? "—"}</span>],
              ["Titre", p.identite.titre],
              ["Version", p.identite.version],
              ["Date de génération", frDate(p.identite.date, true)],
              ["Empreinte du texte approuvé", <Hash value={p.identite.empreinte_texte_valide} n={16} />],
            ]}
          />
        </Sec>

        <Sec no="02" title="Source et langues">
          <KV
            rows={[
              ["Source", p.source ? `${p.source.nom} · ${p.source.type}` : "Non renseignée"],
              ["Format", p.source?.format ?? "—"],
              ["Langue originale", p.source?.langue_originale ?? p.langues.source],
              ["Langue cible", p.source?.langue_cible ?? p.langues.cible],
              ["Empreinte de la source", p.source?.empreinte_sha256 ? <Hash value={p.source.empreinte_sha256} n={16} /> : <span className="muted">non calculée (projet d’exemple ou lien externe)</span>],
              ["Qualité par langue", <span className="muted">{p.langues.qualite}</span>],
            ]}
          />
        </Sec>

        <Sec no="03" title="Intervenants originaux et autorisations">
          {p.intervenants?.length ? (
            <div className="pp-people">
              {p.intervenants.map((it) => (
                <div key={it.personnage} className="pp-person">
                  <span>
                    <b>{it.personnage}</b>
                    <span className="sub">{it.voix_originale ? `Voix originale utilisée · personne ${it.statut_vie.toLowerCase()}` : "Voix originale non utilisée"}</span>
                  </span>
                  <span>
                    {it.autorisation}
                    {it.reference && (
                      <span className="sub">
                        Référence <span className="mono">{it.reference}</span>
                      </span>
                    )}
                    {it.controle_ia && <span className="sub">Contrôle IA : {it.controle_ia}</span>}
                  </span>
                  <Status tone={it.statut === "sans objet" ? "muted" : /valid|autoris/.test(it.statut) && !/non/.test(it.statut) ? "ok" : "bad"}>{it.statut}</Status>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Non renseigné dans ce passeport (schéma 0.1).</p>
          )}
          <p className="hint" style={{ marginTop: 10 }}>
            Le document d’autorisation familiale et les données personnelles qu’il contient ne sont jamais publiés : seuls la référence et le statut du contrôle figurent ici.
          </p>
        </Sec>

        <Sec no="04" title="Voix utilisées">
          <div className="pp-people">
            {p.voix.map((v) => (
              <div key={v.personnage} className="pp-person">
                <span className="row" style={{ flexWrap: "nowrap" }}>
                  <VoiceMark name={v.titulaire} kind={voiceKind(v.nature)} size={28} />
                  <span>
                    <b>{v.personnage}</b>
                    <span className="sub">{v.titulaire}</span>
                  </span>
                </span>
                <span>
                  {v.nature}
                  {v.licence && (
                    <span className="sub">
                      Passeport de voix <span className="mono">{v.licence.license_id}</span> · {v.licence.statut === "active" ? "valide" : "révoqué"} à la signature · entraînement interdit
                    </span>
                  )}
                  {v.licence_projet && (
                    <span className="sub">
                      Licence de projet <span className="mono">{v.licence_projet.reference}</span> · {v.licence_projet.statut}
                    </span>
                  )}
                </span>
                <Status tone={voiceKind(v.nature) === "ai" ? "plain" : "ok"}>{voiceKind(v.nature) === "ai" ? "Générée par IA" : voiceKind(v.nature) === "original" ? "Originale autorisée" : "Licenciée"}</Status>
              </div>
            ))}
          </div>
        </Sec>

        <Sec no="05" title="Doublage par IA">
          {p.doublage_ia ? (
            <KV
              rows={[
                ["Transcription", p.doublage_ia.transcription],
                ["Traduction", p.doublage_ia.traduction],
                ["Contrôle", p.doublage_ia.verification],
                ["Validation humaine", p.doublage_ia.validation_humaine],
                ["Synthèse vocale", p.doublage_ia.synthese],
                ["Répliques générées", String(p.transparence.repliques_generees)],
              ]}
            />
          ) : (
            <KV rows={[["Répliques générées", String(p.transparence.repliques_generees)], ["Validation humaine", p.responsabilite.validateur]]} />
          )}
        </Sec>

        <Sec no="06" title="Transparence">
          <div className="stack">
            <KV
              rows={[
                ["Label visible", p.transparence.label],
                ["Label IA dans la vidéo", p.doublage_ia?.label_ia ?? "—"],
                ["QR code dans la vidéo", p.doublage_ia?.qr ?? "—"],
                ["Générique des voix", p.transparence.generique.join(" ; ")],
              ]}
            />
            <div className="ai-label-demo" aria-label="Règle d’affichage par format">
              {(Object.keys(FORMAT_LABEL) as VideoFormat[]).map((f) => (
                <div key={f} className={f === fmt ? "on" : ""}>
                  <b>{FORMAT_LABEL[f]}</b>
                  <span>Label : {transparencyPolicy(f).label.toLowerCase()}</span>
                  <span>QR : {transparencyPolicy(f).qr.toLowerCase()}</span>
                </div>
              ))}
            </div>
            {policy?.pending && <p className="hint">Règle d’affichage sur Reels et Shorts encore à confirmer.</p>}
          </div>
        </Sec>

        <Sec no="07" title="Responsabilité et provenance">
          <KV
            rows={[
              ["Validation humaine", p.responsabilite.validateur],
              ["Référent éthique", p.responsabilite.referent_ethique],
              ["Journal d’audit", `${p.responsabilite.nombre_entrees} entrées chaînées par SHA-256, dont ${p.responsabilite.nombre_refus} refus de génération`],
              ["Empreinte de tête du journal", <Hash value={p.responsabilite.journal_empreinte_de_tete} n={16} />],
              ["Manifeste", "Ce dossier est un manifeste de provenance lisible par machine, inspiré de C2PA (non certifié C2PA)"],
            ]}
          />
        </Sec>

        <Sec no="08" title="Sécurité et durabilité">
          <KV
            rows={[
              ["Traitement", p.securite.traitement],
              ["Modèle de voix", p.securite.modele_voix],
              ["Caractères synthétisés", String(p.durabilite.caracteres_synthetises)],
              ["Énergie", <span className="muted">{p.durabilite.energie}</span>],
            ]}
          />
        </Sec>
      </article>

      <aside className="pp-aside">
        <div className="pp-card">
          <div className="pp-card-body">
            <div className="row-between">
              <b>Vérification</b>
              <Prov kind="real">dans votre navigateur</Prov>
            </div>
            <ul className="pp-checks">
              {result.checks.map((c, i) =>
                i < revealed ? (
                  <li key={`${run}-${c.id}`} className={animate ? "resolved" : ""}>
                    {c.state === "ok" ? <CircleCheck className="c-ok" aria-hidden /> : c.state === "fail" ? <CircleX className="c-bad" aria-hidden /> : <CircleMinus className="c-skip" aria-hidden />}
                    <span>
                      <b>{c.label}</b>
                      <p>{c.detail}</p>
                    </span>
                  </li>
                ) : (
                  <li key={`${run}-${c.id}-pending`} className="pending">
                    <span className="spinner" aria-hidden />
                    <span>
                      <b>{c.label}</b>
                      <p>{i === revealed ? "Vérification…" : "En attente"}</p>
                    </span>
                  </li>
                ),
              )}
            </ul>
            {p.signature && (
              <KV
                rows={[
                  ["Algorithme", p.signature.algorithme],
                  ["Signature", <ScrambleText key={`s${run}`} value={shortHex(p.signature.valeur, 10)} run={animate} duration={VERIFY_START + VERIFY_STEP} />],
                  ["Clé publique", <ScrambleText key={`k${run}`} value={shortHex(p.signature.cle_publique, 10)} run={animate} duration={VERIFY_START + 2 * VERIFY_STEP} />],
                ]}
              />
            )}
            <button className="btn btn-ghost btn-sm" style={{ justifySelf: "start" }} onClick={() => setRun((n) => n + 1)} disabled={!done}>
              <RotateCcw />
              Vérifier à nouveau
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-body stack">
            <div className="row-between">
              <b style={{ fontSize: 14 }}>Accès public</b>
              {sigOk && done && <Status tone="ok">Signé</Status>}
            </div>
            {qr ? (
              <div className="pp-qr" role="img" aria-label="QR code menant à cette page publique" dangerouslySetInnerHTML={{ __html: qr }} />
            ) : (
              <p className="hint">
                Pas de QR code ici : sans serveur, le lien contient tout le passeport et serait trop dense pour être lu par un téléphone. Partagez le lien ci-dessous ; avec le serveur, le lien est court et le QR code s’affiche.
              </p>
            )}
            <p className="hint">
              {qr ? "Le QR code n’est qu’un moyen d’accès : le" : "Le"} passeport est public à cette URL, sans compte.{" "}
              {BACKEND && p.identifiant ? "Le lien porte son identifiant : passeport et journal sont lus sur le serveur, la signature est vérifiée dans votre navigateur." : "Son contenu voyage dans le lien lui-même."}
            </p>
            <CopyField value={url} label="URL publique du passeport" />
            {!publicView && (
              <a href={url} className="btn btn-secondary btn-sm" target="_blank" rel="noreferrer">
                <ExternalLink />
                Ouvrir la page publique
              </a>
            )}
          </div>
        </div>
        <div className="card card-muted">
          <div className="card-body stack-sm">
            <b style={{ fontSize: 13 }}>Ce que ce passeport ne certifie pas</b>
            <ul className="pp-not">
              <li>L’authenticité des signatures d’un document familial, le lien familial ou la qualité juridique des signataires.</li>
              <li>L’identité réelle d’une personne à partir de sa seule voix.</li>
              <li>Le retrait d’un audio déjà diffusé si une licence est révoquée ensuite.</li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ internal pages */

export function VideoPassports() {
  useCrumbs([{ label: "Passeports vidéo" }]);
  const account = useStore(accountOf);
  const projects = useStore((s) => s.projects);
  const passports = useStore((s) => s.passports);
  const rows = Object.entries(passports).filter(([id]) => projects[id]?.accountId === account?.id);
  const navigate = useNavigate();
  return (
    <>
      <PageHead
        title="Passeports vidéo"
        lead="Le Passeport 360° accompagne chaque export : sources, autorisations, voix, licences, part de l’IA et signature. Chacun peut le vérifier, sans compte."
        actions={
          <Link to="/verifier" className="btn btn-secondary" target="_blank">
            <ExternalLink />
            Page de vérification publique
          </Link>
        }
      />
      {rows.length === 0 ? (
        <Empty title="Aucun passeport pour l’instant" icon={FileBadge2} action={<Link to="/projets?vue=en-cours" className="btn btn-primary btn-sm">Voir les projets en cours</Link>}>
          Un Passeport 360° est créé et signé à la fin de chaque génération.
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Identifiant</th>
                <th>Contenu</th>
                <th>Voix</th>
                <th>Signé le</th>
                <th>Signature</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([id, p]) => {
                const ok = verifyPassport(p).valid;
                return (
                  <tr key={id} className="click" tabIndex={0} onClick={() => navigate(`/passeports/${id}`)} onKeyDown={(e) => e.key === "Enter" && navigate(`/passeports/${id}`)}>
                    <td className="mono">{p.identifiant}</td>
                    <td>
                      <span className="cell-main">
                        <b>{p.identite.titre}</b>
                        <span>{p.source?.format}</span>
                      </span>
                    </td>
                    <td>
                      <span className="row" style={{ gap: 4 }}>
                        {p.voix.map((v) => (
                          <VoiceMark key={v.personnage} name={v.titulaire} kind={voiceKind(v.nature)} size={22} />
                        ))}
                      </span>
                    </td>
                    <td className="num">{frDate(p.identite.date, true)}</td>
                    <td>
                      <Status tone={ok ? "ok" : "bad"}>{ok ? "Vérifiée" : "Invalide"}</Status>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function PassportView() {
  const { id = "" } = useParams();
  const passport = useStore((s) => s.passports[id]);
  const project = useStore((s) => s.projects[id]);
  const journal = useStore((s) => s.journal);
  const exportPassport = useStore((s) => s.exportPassport);
  useCrumbs([{ label: "Passeports vidéo", to: "/passeports" }, { label: passport?.identifiant ?? "Passeport" }]);
  useEffect(() => {
    if (BACKEND) void loadJournal(useStore.setState, true);
  }, []);
  if (!passport) return <Navigate to="/passeports" replace />;
  return (
    <>
      <PageHead
        title="Passeport 360°"
        lead={`${project?.title ?? passport.identite.titre} · ${passport.identifiant ?? ""}`}
        actions={
          <>
            {project && (
              <Link to={`/projet/${project.id}/resultat`} className="btn btn-ghost">
                Résultat du projet
              </Link>
            )}
            <button className="btn btn-primary" onClick={() => exportPassportPdf(passport)}>
              <FileDown />
              Exporter en PDF
            </button>
            {project && (
              <button
                className="btn btn-secondary"
                onClick={() =>
                  void Promise.resolve(exportPassport(project.id)).then((signed) => signed && toast("Passeport signé à nouveau et inscrit au journal", "ok"))
                }
              >
                <RefreshCw />
                Signer à nouveau
              </button>
            )}
          </>
        }
      />
      {/* The passport commits to the journal as it was when signed; later entries extend the chain. */}
      <PassportDocument key={passport.signature?.valeur} p={passport} journal={journal.slice(0, passport.responsabilite.nombre_entrees)} />
    </>
  );
}

/* ------------------------------------------------------------------ public page */

export function Verify() {
  const { hash, search } = useLocation();
  const [p, setP] = useState<Passport360 | null>(null);
  const [journal, setJournal] = useState<AuditEntry[] | undefined>();
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);

  // /verifier?id=S360-… (QR of a passport signed by the server): passport and chain read from the server,
  // checked here. In simulated mode, the passports of this browser.
  useEffect(() => {
    const id = new URLSearchParams(search).get("id")?.trim().toUpperCase();
    if (!id) return;
    let alive = true;
    if (BACKEND) {
      fetchPublicPassport(id).then(
        (r) => {
          if (!alive) return;
          setP(r.passport);
          setJournal(r.journal);
          setError("");
        },
        (err) => alive && setError(messageOf(err)),
      );
    } else {
      const s = useStore.getState();
      const found = Object.values(s.passports).find((x) => x.identifiant === id);
      if (found) {
        setP(found);
        setJournal(s.journal.slice(0, found.responsabilite.nombre_entrees));
        setError("");
      } else setError("Passeport introuvable dans ce navigateur (mode démonstration) : ouvrez son lien complet ou déposez son fichier.");
    }
    return () => {
      alive = false;
    };
  }, [search]);

  useEffect(() => {
    document.title = "Vérifier un Passeport 360° · Sawti 360";
    const m = hash.match(/p=([\w-]+)/);
    if (!m) return;
    try {
      setP(decodePassport(m[1]));
      setJournal(undefined);
      setError("");
    } catch {
      setError("Le lien est incomplet ou altéré : impossible de lire le passeport.");
    }
  }, [hash]);

  const readFile = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as PassportFile | Passport360;
      if ("passeport" in data) {
        setP(data.passeport);
        setJournal(data.journal);
      } else {
        setP(data);
        setJournal(undefined);
      }
      setError("");
    } catch {
      setError("Ce fichier n’est pas un Passeport 360° lisible.");
    }
  };

  return (
    <div className="public">
      <header className="public-top">
        <Brand to="/" />
        <span className="muted">Vérification publique · Passeport 360°</span>
      </header>
      <main className="public-main">
        {p ? (
          <>
            <div className="pp-toolbar">
              <button className="btn btn-secondary btn-sm" onClick={() => exportPassportPdf(p)}>
                <FileDown />
                Exporter en PDF
              </button>
            </div>
            <PassportDocument p={p} journal={journal} publicView />
          </>
        ) : (
          <div className="stack-lg" style={{ maxWidth: 680 }}>
            <div className="stack-sm">
              <Seal size={88} state="pending" word="À VÉRIFIER" label="PASSEPORT 360° · VÉRIFICATION PUBLIQUE · " />
              <h1 style={{ fontSize: 30 }}>Vérifier un Passeport 360°</h1>
              <p className="lead muted">Ouvrez le lien d’un passeport, scannez son QR code, ou déposez son fichier. La vérification de la signature se fait entièrement dans votre navigateur.</p>
            </div>
            {error && (
              <Callout tone="bad" role="alert">
                {error}
              </Callout>
            )}
            <label
              className={`dropzone ${drag ? "drag" : ""}`}
              style={{ minHeight: 200 }}
              onDragOver={(e) => (e.preventDefault(), setDrag(true))}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const f = e.dataTransfer.files[0];
                if (f) void readFile(f);
              }}
            >
              <span className="dz-icon" aria-hidden>
                <FileUp />
              </span>
              <span className="dz-title">Vous avez le fichier .json d’un passeport ? Déposez-le ici</span>
              <span className="dz-text">Le fichier complet contient aussi le journal d’audit, dont la chaîne sera vérifiée.</span>
              <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
            </label>
            <p className="hint">
              Clé publique de la plateforme{platformPublicKey() === DEMO_PUBLIC_KEY ? " (démonstration)" : ""} : <span className="mono" style={{ wordBreak: "break-all" }}>{platformPublicKey()}</span>
            </p>
          </div>
        )}
      </main>
      <footer className="public-foot">
        <span>Sawti 360 · L’IA propose, l’humain décide, la confiance accompagne chaque export.</span>
        <span>{platformPublicKey() === DEMO_PUBLIC_KEY ? "Clé de démonstration publique : prouve le mécanisme, pas le secret." : "Clé publique de la plateforme : la clé secrète ne quitte jamais le serveur."}</span>
      </footer>
      <Toasts />
    </div>
  );
}
