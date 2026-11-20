import { ArrowRight, Info, Merge, Pause, Pencil, Play, UserPlus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { accountOf, useStore, type Project } from "../../state/store";
import type { Character } from "../../state/workflow";
import { Callout, Dialog, plural, Proposal, Prov, Status, timecode, toast, VoiceMark } from "../../ui/kit";
import { useVideoSrc } from "./shared";
import { StepFoot } from "./Workspace";

/** Plays a slice of the project's own video: the real audio excerpt of a speaker. */
function useExcerpt(src: string | null) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const stopAt = useRef(0);
  useEffect(() => {
    if (!src) return;
    const v = document.createElement("video");
    v.src = src;
    v.preload = "auto";
    v.playsInline = true;
    const onTime = () => {
      if (v.currentTime >= stopAt.current) {
        v.pause();
        setPlaying(null);
      }
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("pause", () => setPlaying(null));
    ref.current = v;
    return () => {
      v.pause();
      v.removeEventListener("timeupdate", onTime);
      ref.current = null;
    };
  }, [src]);
  const toggle = (id: string, start: number, end: number) => {
    const v = ref.current;
    if (!v) return;
    if (playing === id) {
      v.pause();
      return;
    }
    stopAt.current = end;
    v.currentTime = start;
    void v.play().then(() => setPlaying(id)).catch(() => toast("Lecture impossible dans ce navigateur", "bad"));
  };
  return { available: Boolean(src), playing, toggle };
}

const shownName = (c: Character) => (c.confirmed ? c.name : c.name || c.proposedName);

function CharacterCard({ p, c, excerpt }: { p: Project; c: Character; excerpt: ReturnType<typeof useExcerpt> }) {
  const confirm = useStore((s) => s.confirmCharacter);
  const update = useStore((s) => s.updateCharacter);
  const setLineSpeaker = useStore((s) => s.setLineSpeaker);
  const mergeCharacter = useStore((s) => s.mergeCharacter);
  const others = Object.values(p.characters).filter((x) => x.key !== c.key);
  const requests = useStore((s) => s.requests);
  // A character already engaged in an authorization or a licence keeps its identity (the server refuses too).
  const engaged = requests.some((r) => r.projectId === p.id && r.characterKey === c.key) || (c.living !== undefined && c.living.status !== "a_obtenir") || (c.dossier !== undefined && c.dossier.status !== "manquant");
  const [mergeInto, setMergeInto] = useState("");
  const target = others.find((x) => x.key === mergeInto);
  const me = useStore(accountOf);
  const [name, setName] = useState(c.name);
  const [desc, setDesc] = useState(c.description);
  const [editing, setEditing] = useState(!c.confirmed);
  const ids = { name: useId(), desc: useId(), merge: useId() };
  const [asking, setAsking] = useState(false);
  const lines = p.segments.filter((s) => s.speaker === c.key);
  const total = lines.reduce((a, s) => a + (s.end - s.start), 0);
  const first = lines[0];

  return (
    <article className="char" aria-label={`Personnage ${c.name}`}>
      <div>
        <div className="char-head">
          <VoiceMark name={c.confirmed ? c.name : c.proposedName} kind="original" size={36} />
          <div className="grow">
            <h3>{c.confirmed ? c.name : c.proposedName}</h3>
            <span className="hint num">
              {plural(lines.length, "prise de parole", "prises de parole")} · {total.toFixed(1).replace(".", ",")} s au total
            </span>
          </div>
          {c.confirmed ? <Status tone="ok">Confirmé</Status> : <Status tone="info">À confirmer</Status>}
        </div>

        {editing ? (
          <Proposal className="stack">
            <p className="hint">
              Identifiant proposé : <b>{c.proposedName}</b> · {c.proposedDescription}
            </p>
            <div className="field">
              <label htmlFor={ids.name}>Nom du personnage</label>
              <input id={ids.name} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Amel" />
            </div>
            <div className="field">
              <label htmlFor={ids.desc}>Description</label>
              <textarea id={ids.desc} className="textarea" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div className="row">
              <button
                className="btn btn-primary"
                disabled={!name.trim()}
                onClick={() => {
                  confirm(p.id, c.key, name, desc);
                  setEditing(false);
                  toast(`Personnage « ${name.trim()} » confirmé`, "ok");
                }}
              >
                Confirmer ce personnage
              </button>
              {c.confirmed && (
                <button className="btn btn-ghost" onClick={() => (setEditing(false), setName(c.name), setDesc(c.description))}>
                  Annuler
                </button>
              )}
            </div>
          </Proposal>
        ) : (
          <Proposal decided by={me?.name}>
            <div className="row-between" style={{ alignItems: "flex-start" }}>
              <div className="stack-sm">
                <b>{c.name}</b>
                <p className="muted" style={{ fontSize: 13 }}>
                  {c.description || "Sans description."}
                </p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setEditing(true);
                  update(p.id, c.key, { confirmed: false });
                }}
              >
                <Pencil />
                Modifier
              </button>
            </div>
          </Proposal>
        )}
        {others.length > 0 && (
          <div className="char-merge">
            {lines.length === 0 && !engaged && <p className="hint">Plus aucune réplique : fusionnez ce personnage avec un autre pour le retirer.</p>}
            <label className="hint" htmlFor={ids.merge}>
              {engaged ? "Autorisation ou licence déjà engagée pour ce personnage : il ne peut plus être fusionné." : "C’est la même personne que :"}
            </label>
            <div className="row">
              <select id={ids.merge} className="select" value={mergeInto} onChange={(e) => setMergeInto(e.target.value)} disabled={engaged}>
                <option value="">Choisir un personnage…</option>
                {others.map((o) => (
                  <option key={o.key} value={o.key}>
                    {shownName(o)}
                  </option>
                ))}
              </select>
              <button className="btn btn-secondary" disabled={!target || engaged} onClick={() => setAsking(true)}>
                <Merge />
                Fusionner
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="stack">
        <div className="row-between">
          <span className="label-sm">Extrait audio</span>
          {excerpt.available ? <Prov kind="real">votre vidéo</Prov> : <Prov kind="example" />}
        </div>
        {excerpt.available && first ? (
          <button className="btn btn-secondary" onClick={() => excerpt.toggle(`${c.key}-all`, first.start, first.end)}>
            {excerpt.playing === `${c.key}-all` ? <Pause /> : <Play />}
            Écouter la première intervention
          </button>
        ) : (
          <p className="hint">
            {p.example
              ? "Projet d’exemple sans fichier vidéo : l’extrait n’est pas disponible. Les répliques transcrites sont listées ci-dessous."
              : "Vidéo non disponible dans ce navigateur : ré-importez le fichier pour écouter l’extrait. Les répliques transcrites sont listées ci-dessous."}
          </p>
        )}
        <span className="label-sm">Positions des interventions</span>
        <div className="char-lines">
          {lines.length === 0 && <p className="hint">Aucune réplique attribuée à ce personnage.</p>}
          {lines.map((s) => (
            <div key={s.id} className="char-line-row">
              <button className="char-line" aria-pressed={excerpt.playing === s.id} onClick={() => excerpt.available && excerpt.toggle(s.id, s.start, s.end)} disabled={!excerpt.available} aria-label={`Écouter ${timecode(s.start)}`}>
                <span className="mono">
                  {timecode(s.start)}–{timecode(s.end).slice(3)}
                </span>
                <span className="ar" lang="ar-TN" dir="rtl">
                  {s.source}
                </span>
              </button>
              {others.length > 0 && (
                <select
                  className="select char-line-who"
                  aria-label={`Qui parle à ${timecode(s.start)} ?`}
                  title="Qui parle ?"
                  value={s.speaker}
                  onChange={(e) => {
                    const to = p.characters[e.target.value];
                    setLineSpeaker(p.id, s.id, e.target.value);
                    if (to) toast(`Réplique de ${timecode(s.start)} attribuée à ${shownName(to)}`, "ok");
                  }}
                >
                  {Object.values(p.characters).map((o) => (
                    <option key={o.key} value={o.key}>
                      {shownName(o)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      </div>
      <Dialog
        open={asking && Boolean(target)}
        onClose={() => setAsking(false)}
        size="sm"
        title={`Fusionner avec ${target ? shownName(target) : ""} ?`}
        description={`${lines.length ? `${plural(lines.length, "réplique de", "répliques de")} « ${shownName(c)} » ${lines.length > 1 ? "seront attribuées" : "sera attribuée"} à « ${target ? shownName(target) : ""} », puis` : `« ${shownName(c)} » n’a plus de réplique :`} ce personnage disparaîtra. Ses répliques déjà synthétisées devront l’être à nouveau avec la voix de l’autre personnage.`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setAsking(false)}>
              Annuler
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!target) return;
                void mergeCharacter(p.id, c.key, target.key);
                setAsking(false);
                toast(`« ${shownName(c)} » fusionné avec « ${shownName(target)} »`, "ok");
              }}
            >
              Fusionner
            </button>
          </>
        }
      />
    </article>
  );
}

export default function Characters({ p }: { p: Project }) {
  const { src } = useVideoSrc(p);
  const excerpt = useExcerpt(src);
  const chars = Object.values(p.characters);
  const left = chars.filter((c) => !c.confirmed).length;
  const addCharacter = useStore((s) => s.addCharacter);
  return (
    <>
      <div className="stack-lg">
        <Callout tone="plain" icon={Info} title="La détection d’une voix ne prouve pas l’identité réelle d’une personne.">
          Les noms et descriptions ci-dessous sont des propositions de l’IA, encadrées en pointillés. Corrigez-les puis confirmez : un trait plein indique une décision humaine.
        </Callout>
        <div className="chars">
          {chars.map((c) => (
            <CharacterCard key={c.key} p={p} c={c} excerpt={excerpt} />
          ))}
        </div>
        <div className="chars-fix">
          <p>
            <b>Le nombre de personnes n’est pas le bon ?</b> L’IA peut confondre deux voix proches ou séparer une même personne. Changez « Qui parle » sur une réplique, fusionnez deux personnages qui sont la même personne, ou ajoutez une voix que l’analyse a manquée.
          </p>
          <button className="btn btn-secondary" onClick={() => void addCharacter(p.id)} disabled={chars.length >= 12}>
            <UserPlus />
            Ajouter un intervenant
          </button>
        </div>
      </div>
      <StepFoot hint={left ? `${plural(left, "personnage reste", "personnages restent")} à confirmer.` : "Tous les personnages sont confirmés."}>
        <Link to={`/projet/${p.id}/autorisations`} className="btn btn-primary" aria-disabled={left > 0} onClick={(e) => left > 0 && e.preventDefault()}>
          Continuer vers les autorisations
          <ArrowRight />
        </Link>
      </StepFoot>
    </>
  );
}
