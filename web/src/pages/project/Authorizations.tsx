import { ArrowRight, CircleCheck, CircleX, ExternalLink, FileText, Loader2, Mail, Scale, SearchCheck, ShieldAlert, Upload } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { messageOf } from "../../api/client";
import { BACKEND } from "../../lib/backend";
import { formatSize, hashFile } from "../../media/local";
import { consentLinkFor, consentMailed, useRefreshWhile } from "../../state/remote/consents";
import { useStore, type Project } from "../../state/store";
import {
  canValidateDossier,
  DOSSIER_LABEL,
  LIFE_LABEL,
  LIVING_LABEL,
  originalVoiceState,
  OUTCOME_LABEL,
  type AuthState,
  type Character,
  type CheckOutcome,
} from "../../state/workflow";
import { Callout, CopyField, KV, Prov, relTime, Status, toast, VoiceMark, type Tone } from "../../ui/kit";
import { WhatsAppButton } from "../../ui/share";
import { StepFoot } from "./Workspace";

const AUTH_LABEL: Record<AuthState, [string, Tone]> = {
  non_requise: ["Voix de remplacement", "muted"],
  a_renseigner: ["Statut de vie à renseigner", "warn"],
  a_obtenir: ["Autorisation à obtenir", "warn"],
  en_attente: ["En attente", "info"],
  bloquee: ["Voix originale bloquée", "bad"],
  autorisee: ["Voix originale autorisée", "ok"],
};

function Disclaimer() {
  return (
    <div className="disclaimer">
      <Scale aria-hidden />
      <p>
        <b>Le contrôle IA vérifie la cohérence entre le rôle déclaré et la vidéo.</b> Il ne certifie pas à lui seul l’authenticité de la signature, le lien familial ou la qualité juridique des signataires.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ living person */

function LivingPath({ p, c }: { p: Project; c: Character }) {
  const send = useStore((s) => s.sendConsent);
  const setUseOriginal = useStore((s) => s.setUseOriginal);
  const navigate = useNavigate();
  const living = c.living ?? { status: "a_obtenir" as const, email: "", registered: false };
  const [email, setEmail] = useState(living.email);
  // The answer to « déjà un Passeport de voix ? » is kept in this browser until the request is sent.
  const regKey = `sawti-reg-${p.id}-${c.key}`;
  const [registered, setRegisteredState] = useState<boolean | null>(() => {
    if (living.token) return living.registered;
    try {
      const v = localStorage.getItem(regKey);
      return v === "1" ? true : v === "0" ? false : null;
    } catch {
      return null;
    }
  });
  const setRegistered = (v: boolean) => {
    setRegisteredState(v);
    try {
      localStorage.setItem(regKey, v ? "1" : "0");
    } catch {
      /* storage refused: the answer lasts for this page only */
    }
  };
  const emailId = useId();
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());
  // Back-end mode: the server gives the link once (kept in this browser); the person may answer on any device.
  const link = BACKEND ? consentLinkFor(p.id, c.key) : living.token ? `${window.location.origin}/consentement/${living.token}` : "";
  useRefreshWhile(useStore.setState, p.id, BACKEND && living.status === "en_attente");
  const sendNow = async (to: string, reg: boolean) => {
    try {
      await send(p.id, c.key, to, reg);
      toast(BACKEND ? (consentMailed(p.id, c.key) ? "Demande envoyée par e-mail" : "Demande enregistrée : transmettez le lien") : "Demande de consentement enregistrée", "ok");
    } catch (err) {
      toast(messageOf(err), "bad");
    }
  };
  const states = ["a_obtenir", "en_attente", living.status === "refusee" ? "refusee" : "autorisee"] as const;
  const idx = living.status === "a_obtenir" ? 0 : living.status === "en_attente" ? 1 : 2;

  return (
    <div className="auth-split">
      <div className="stack">
        {living.status === "a_obtenir" && (
          <>
            <div className="auth-q">
              <span className="label">
                <span className="q-no">03</span> Cette personne ({c.name}) a-t-elle déjà un Passeport de voix ?
              </span>
              <div className="choices choices-2">
                <label className="choice">
                  <input type="radio" name={`reg-${c.key}`} checked={registered === true} onChange={() => setRegistered(true)} />
                  <span className="choice-radio" aria-hidden />
                  <b>Oui, elle est inscrite</b>
                  <span className="choice-text">La demande arrive directement dans son espace et par e-mail.</span>
                </label>
                <label className="choice">
                  <input type="radio" name={`reg-${c.key}`} checked={registered === false} onChange={() => setRegistered(false)} />
                  <span className="choice-radio" aria-hidden />
                  <b>Non, pas encore</b>
                  <span className="choice-text">Elle créera elle-même son Passeport de voix depuis le lien reçu.</span>
                </label>
              </div>
            </div>
            {registered === false && (
              <Callout tone="warn" title="Vous ne pouvez pas créer ce passeport à sa place.">
                La personne crée elle-même son Passeport de voix depuis le lien reçu, à distance ou en votre présence, puis accepte ou refuse.
              </Callout>
            )}
            {registered !== null && (
              <div className="field">
                <label htmlFor={emailId}>Adresse e-mail de {c.name}</label>
                <div className="row" style={{ flexWrap: "nowrap" }}>
                  <input id={emailId} className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@exemple.tn" />
                  <button
                    className="btn btn-primary"
                    disabled={!valid}
                    onClick={() => void sendNow(email, registered)}
                  >
                    <Mail />
                    {registered ? "Envoyer la demande" : "Envoyer l’invitation"}
                  </button>
                </div>
                <span className="hint">Elle pourra accepter ou refuser depuis un lien sécurisé, sans créer de compte. Sans son accord, la voix originale ne peut pas être utilisée.</span>
              </div>
            )}
          </>
        )}

        {living.status !== "a_obtenir" && (
          <>
            {living.status === "en_attente" && (
              <Callout tone="info" title={`Demande envoyée à ${living.email}`}>
                Envoyée {relTime(living.sentAt!)}. La voix originale reste bloquée jusqu’à sa réponse.
              </Callout>
            )}
            {living.status === "autorisee" && (
              <Callout tone="ok" title={`${c.name} a donné son consentement`}>
                Réponse reçue {relTime(living.decidedAt!)}. La voix originale peut être utilisée pour ce projet uniquement.
              </Callout>
            )}
            {living.status === "refusee" && (
              <Callout
                tone="bad"
                title={`${c.name} a refusé l’utilisation de sa voix`}
                action={
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setUseOriginal(p.id, c.key, false);
                      navigate(`/projet/${p.id}/voix`);
                    }}
                  >
                    Choisir une voix de remplacement
                  </button>
                }
              >
                La voix originale reste bloquée. Ce refus est inscrit au journal d’audit.
              </Callout>
            )}
            {living.status === "en_attente" && BACKEND && !link && (
              <div className="stack-sm">
                <span className="hint">Le lien a été envoyé par e-mail et n’est pas conservé dans ce navigateur. Un nouvel envoi crée un nouveau lien et désactive l’ancien.</span>
                <div>
                  <button className="btn btn-secondary btn-sm" onClick={() => void sendNow(living.email, living.registered)}>
                    <Mail />
                    Renvoyer un nouveau lien
                  </button>
                </div>
              </div>
            )}
            {living.status === "en_attente" && link && (
              <div className="stack-sm">
                <span className="label-sm">Lien sécurisé reçu par la personne</span>
                <CopyField value={link} label="Lien de consentement" />
                <div className="row">
                  <a className="btn btn-secondary btn-sm" href={link} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    Ouvrir comme la personne (démonstration)
                  </a>
                  {BACKEND && <WhatsAppButton text={`Demande de consentement pour votre voix (${p.title}) :`} url={link} />}
                  {BACKEND ? (
                    <span className="hint">
                      <Prov kind="real">e-mail</Prov> {consentMailed(p.id, c.key) === false ? "e-mail non envoyé (SMTP non configuré) : transmettez ce lien." : "envoyé à la personne avec ce lien."}
                    </span>
                  ) : (
                    <span className="hint">
                      <Prov kind="sim">e-mail</Prov> aucun e-mail n’est réellement envoyé par le prototype.
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <ol className="timeline-state" aria-label="États du consentement">
        {states.map((s, i) => (
          <li key={s} className={i < idx ? "done" : i === idx ? "now" : ""}>
            <i aria-hidden />
            <span>{LIVING_LABEL[s]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ deceased person */

const OUTCOME_TONE: Record<CheckOutcome, "ok" | "bad" | "warn"> = { correspondance: "ok", incoherence: "bad", verification: "warn" };

function DeceasedPath({ p, c }: { p: Project; c: Character }) {
  const upload = useStore((s) => s.uploadDossier);
  const validate = useStore((s) => s.validateDossier);
  const complementary = useStore((s) => s.requestComplementary);
  const resetDossier = useStore((s) => s.resetDossier);
  const setUseOriginal = useStore((s) => s.setUseOriginal);
  const navigate = useNavigate();
  const d = c.dossier ?? { status: "manquant" as const, deceasedName: "", declaredRole: "" };
  const [name, setName] = useState(d.deceasedName);
  const [role, setRole] = useState(d.declaredRole);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const ids = { name: useId(), role: useId() };
  useRefreshWhile(useStore.setState, p.id, BACKEND && (d.status === "recu" || d.status === "analyse"), 5000);
  const order = ["manquant", "recu", "analyse", "resultat", "valide"] as const;
  const at = d.status === "manquant" ? 0 : d.status === "recu" ? 1 : d.status === "analyse" ? 2 : d.status === "valide" ? 4 : 3;
  const labels = ["Document manquant", "Document reçu", "Analyse en cours", d.check ? OUTCOME_LABEL[d.check.outcome] : "Résultat du contrôle", "Dossier validé"];

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!/pdf|image\//.test(f.type) && !/\.(pdf|jpe?g|png)$/i.test(f.name)) return toast("Format non pris en charge : PDF, JPG ou PNG", "bad");
    if (f.size > 20 * 1024 * 1024) return toast("Document trop lourd : 20 Mo au plus", "bad");
    setFile(f);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    const fileHash = await hashFile(file, () => {});
    setBusy(false);
    void upload(p.id, c.key, { deceasedName: name.trim(), declaredRole: role.trim(), fileName: file.name, fileSize: file.size, fileType: file.type, fileHash, ...(BACKEND ? { file } : {}) });
    toast("Document reçu, contrôle de cohérence lancé");
  };

  const timeline = (
    <ol className="timeline-state" aria-label="États du dossier familial">
      {order.map((s, i) => (
        <li key={s} className={i < at ? "done" : i === at ? "now" : ""}>
          <i aria-hidden />
          <span>{labels[i]}</span>
        </li>
      ))}
    </ol>
  );

  if (d.status === "manquant") {
    return (
      <div className="auth-split">
        <div className="stack">
          <p className="muted" style={{ fontSize: 13 }}>
            Téléversez le document d’autorisation signé par la famille. Il doit identifier la personne décédée et préciser le rôle qu’elle joue dans la vidéo.
          </p>
          <div className="field-row">
            <div className="field">
              <label htmlFor={ids.name}>Personne décédée, telle que nommée dans le document</label>
              <input id={ids.name} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom et prénom" />
            </div>
            <div className="field">
              <label htmlFor={ids.role}>Rôle exact dans la vidéo, tel qu’indiqué dans le document</label>
              <input id={ids.role} className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder={`Ex. ${c.description.split(",")[0] || "le grand-père qui raconte"}`} />
            </div>
          </div>
          <label
            className={`mini-drop ${drag ? "drag" : ""}`}
            onDragOver={(e) => (e.preventDefault(), setDrag(true))}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              pick(e.dataTransfer.files[0]);
            }}
          >
            {file ? <FileText aria-hidden /> : <Upload aria-hidden />}
            <span className="grow">
              <b>{file ? file.name : "Déposer le document signé"}</b>
              <span className="hint" style={{ display: "block" }}>
                {file ? `${formatSize(file.size)} · prêt à être téléversé` : "PDF, JPG ou PNG · 20 Mo au plus · cliquez pour choisir"}
              </span>
            </span>
            <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          <p className="hint">Les personnes de la famille habilitées à signer, le nombre de signatures et les formats acceptés restent à définir. L’interface n’impose aucune règle qui n’a pas été fixée.</p>
          <div className="row">
            <button className="btn btn-primary" disabled={!file || !name.trim() || !role.trim() || busy} onClick={submit}>
              {busy ? <Loader2 className="spin" /> : <SearchCheck />}
              Téléverser et lancer le contrôle
            </button>
            <span className="hint">Le document reste privé : seuls sa référence et le résultat du contrôle figureront au Passeport 360°.</span>
          </div>
        </div>
        {timeline}
      </div>
    );
  }

  const running = d.status === "recu" || d.status === "analyse";
  const outcome = d.check?.outcome;

  return (
    <div className="auth-split">
      <div className="stack">
        <div className="file-pill">
          <FileText aria-hidden />
          <span className="grow">
            <b>{d.fileName}</b>
            <span className="hint" style={{ display: "block" }}>
              Référence <span className="mono">{d.reference}</span> · {d.fileSize ? formatSize(d.fileSize) : ""} · reçu {d.receivedAt ? relTime(d.receivedAt) : ""}
            </span>
          </span>
          <Prov kind="real">empreinte SHA-256</Prov>
        </div>

        {running ? (
          <div className="verdict verdict-run" role="status">
            <span className="verdict-mark">
              <span className="spinner" />
            </span>
            <div>
              <h4>{d.status === "recu" ? "Document reçu" : "Analyse en cours"}</h4>
              <p className="muted" style={{ fontSize: 13 }}>
                L’IA lit le document, extrait la personne et le rôle déclaré, puis cherche l’intervenant correspondant dans la vidéo.
              </p>
            </div>
          </div>
        ) : d.check && outcome ? (
          <>
            <div className="three-outcomes" aria-label="Résultats possibles du contrôle">
              {(Object.keys(OUTCOME_LABEL) as CheckOutcome[]).map((o) => (
                <div key={o} className={o === outcome ? "on" : ""} aria-current={o === outcome || undefined}>
                  <b>{OUTCOME_LABEL[o]}</b>
                  <span>{o === "correspondance" ? "Validation possible par vous" : "Autorisation non validée"}</span>
                </div>
              ))}
            </div>
            <div className={`verdict verdict-${d.status === "valide" ? "ok" : OUTCOME_TONE[outcome]}`} role={outcome === "correspondance" ? "status" : "alert"}>
              <span className="verdict-mark">{outcome === "correspondance" ? <CircleCheck /> : outcome === "incoherence" ? <CircleX /> : <ShieldAlert />}</span>
              <div>
                <div className="row">
                  <h4>{d.status === "valide" ? "Dossier validé" : OUTCOME_LABEL[outcome]}</h4>
                  <Prov kind={d.check.simulated ? "sim" : "real"}>{d.check.simulated ? "contrôle IA" : `contrôle IA · ${d.check.provider ?? "modèle"}`}</Prov>
                </div>
                <p style={{ fontSize: 13, color: "var(--ink-2)" }}>{d.check.explanation}</p>
                <KV
                  rows={[
                    ["Personne extraite du document", d.check.extractedPerson],
                    ["Rôle déclaré", d.check.extractedRole],
                    ["Repéré dans la vidéo", d.check.videoFinding],
                  ]}
                />
              </div>
            </div>
            <Disclaimer />

            {d.status === "correspondance" && (
              <div className="stack-sm">
                <label className="check">
                  <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
                  <span>J’ai relu le document et je confirme qu’il autorise l’utilisation de la voix de {d.deceasedName} pour ce rôle.</span>
                </label>
                <div>
                  <button
                    className="btn btn-primary"
                    disabled={!checked || !canValidateDossier(d)}
                    onClick={() => {
                      validate(p.id, c.key);
                      toast("Dossier familial validé", "ok");
                    }}
                  >
                    Valider le dossier
                  </button>
                </div>
              </div>
            )}
            {d.status === "valide" && (
              <Callout tone="ok" title="Voix originale autorisée">
                Validé {relTime(d.validatedAt!)} par {d.validatedBy}. Seuls la référence {d.reference} et le résultat du contrôle sont publiés.
              </Callout>
            )}
            {(d.status === "incoherence" || d.status === "verification") && (
              <Callout tone="bad" title="Autorisation non validée : la voix originale reste bloquée.">
                <p>Fournissez un document corrigé, ou passez par une vérification complémentaire. Vous pouvez aussi choisir une voix de remplacement.</p>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => resetDossier(p.id, c.key)}>
                    <Upload />
                    Téléverser un document corrigé
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={Boolean(d.complementaryRequestedAt)}
                    onClick={() => {
                      complementary(p.id, c.key);
                      toast("Vérification complémentaire demandée");
                    }}
                  >
                    {d.complementaryRequestedAt ? "Vérification complémentaire demandée" : "Demander une vérification complémentaire"}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setUseOriginal(p.id, c.key, false);
                      navigate(`/projet/${p.id}/voix`);
                    }}
                  >
                    Utiliser une voix de remplacement
                  </button>
                </div>
                {d.complementaryRequestedAt && <p className="hint" style={{ marginTop: 8 }}>Demande enregistrée {relTime(d.complementaryRequestedAt)}. La procédure de vérification complémentaire reste à définir : le dossier reste bloqué d’ici là.</p>}
              </Callout>
            )}
          </>
        ) : null}
      </div>
      {timeline}
    </div>
  );
}

/* ------------------------------------------------------------------ card */

function AuthCard({ p, c }: { p: Project; c: Character }) {
  const setUseOriginal = useStore((s) => s.setUseOriginal);
  const setLife = useStore((s) => s.setLifeStatus);
  const st = originalVoiceState(c);
  const [label, tone] = AUTH_LABEL[st];
  const locked = (c.lifeStatus === "vivant" && c.living && c.living.status !== "a_obtenir") || (c.lifeStatus === "decede" && c.dossier && c.dossier.status !== "manquant");

  return (
    <article className="auth-card" aria-label={`Autorisation pour ${c.name}`}>
      <div className="auth-card-head">
        <VoiceMark name={c.name} kind="original" size={32} />
        <div className="grow">
          <h3>{c.name}</h3>
          <span className="hint">
            {c.description}
            {c.useOriginal && c.lifeStatus !== "a_renseigner" ? ` · Personne ${LIFE_LABEL[c.lifeStatus].toLowerCase()}` : ""}
          </span>
        </div>
        <Status tone={tone}>{c.useOriginal && c.lifeStatus === "decede" && c.dossier ? DOSSIER_LABEL[c.dossier.status] : label}</Status>
      </div>
      <div className="auth-card-body">
        <div className="auth-q">
          <span className="label">
            <span className="q-no">01</span> Voix française de {c.name}
          </span>
          <div className="choices choices-2">
            <label className="choice">
              <input type="radio" name={`orig-${c.key}`} checked={c.useOriginal} onChange={() => setUseOriginal(p.id, c.key, true)} disabled={Boolean(locked)} />
              <span className="choice-radio" aria-hidden />
              <b>Utiliser sa voix originale</b>
              <span className="choice-text">Exige le consentement de la personne, ou un dossier familial validé si elle est décédée.</span>
            </label>
            <label className="choice">
              <input type="radio" name={`orig-${c.key}`} checked={!c.useOriginal} onChange={() => setUseOriginal(p.id, c.key, false)} disabled={Boolean(locked)} />
              <span className="choice-radio" aria-hidden />
              <b>Voix de remplacement</b>
              <span className="choice-text">Voix licenciée de la bibliothèque ou voix générée par IA, choisie à l’étape suivante.</span>
            </label>
          </div>
          {locked && <span className="hint">Une procédure est engagée : le choix est verrouillé pour garder la trace de la demande.</span>}
        </div>

        {c.useOriginal && (
          <div className="auth-q">
            <span className="label">
              <span className="q-no">02</span> Cette personne est-elle vivante ou décédée ?
            </span>
            <div className="choices choices-2">
              <label className="choice">
                <input type="radio" name={`life-${c.key}`} checked={c.lifeStatus === "vivant"} onChange={() => setLife(p.id, c.key, "vivant")} disabled={Boolean(locked)} />
                <span className="choice-radio" aria-hidden />
                <b>Vivante</b>
                <span className="choice-text">Elle participe directement : consentement par lien sécurisé.</span>
              </label>
              <label className="choice">
                <input type="radio" name={`life-${c.key}`} checked={c.lifeStatus === "decede"} onChange={() => setLife(p.id, c.key, "decede")} disabled={Boolean(locked)} />
                <span className="choice-radio" aria-hidden />
                <b>Décédée</b>
                <span className="choice-text">Document d’autorisation signé par la famille et contrôle de cohérence.</span>
              </label>
            </div>
          </div>
        )}

        {c.useOriginal && c.lifeStatus === "vivant" && <LivingPath p={p} c={c} />}
        {c.useOriginal && c.lifeStatus === "decede" && <DeceasedPath p={p} c={c} />}
      </div>
    </article>
  );
}

export default function Authorizations({ p }: { p: Project }) {
  const chars = Object.values(p.characters);
  const pending = chars.filter((c) => {
    const s = originalVoiceState(c);
    return s !== "non_requise" && s !== "autorisee";
  });
  return (
    <>
      <div className="stack-lg">
        <Callout tone="plain" title="Aucune voix originale sans autorisation.">
          Pour chaque personne dont vous voulez garder la voix, indiquez si elle est vivante ou décédée. La voix originale ne peut être utilisée qu’après validation du parcours correspondant.
        </Callout>
        {chars.map((c) => (
          <AuthCard key={c.key} p={p} c={c} />
        ))}
      </div>
      <StepFoot hint={pending.length ? `${pending.length} voix originale${pending.length > 1 ? "s" : ""} bloquée${pending.length > 1 ? "s" : ""} pour l’instant. Vous pouvez continuer : la génération attendra les autorisations.` : "Toutes les autorisations requises sont validées."}>
        <Link to={`/projet/${p.id}/voix`} className="btn btn-primary">
          Continuer vers les voix
          <ArrowRight />
        </Link>
      </StepFoot>
    </>
  );
}
