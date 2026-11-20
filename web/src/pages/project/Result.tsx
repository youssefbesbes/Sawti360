import QRCode from "qrcode";
import { Captions, Check, Download, FileBadge2, Minus, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toSrt } from "../../core/srt";
import { encodePassport, type Passport360 } from "../../core/passport";
import { BACKEND } from "../../lib/backend";
import { audioKey, audioUrls, useStore, type Project } from "../../state/store";
import { useLineAudio } from "../../state/remote/generation";
import { FORMAT_LABEL, transparencyPolicy } from "../../state/workflow";
import { Seal } from "../../ui/brand";
import { Callout, KV, Prov, reduceMotion, timecode, toast, VoiceMark } from "../../ui/kit";
import { Mp4Item, mp4Reason } from "./ExportMp4";
import { useVideoSrc, voiceInfo } from "./shared";

export function publicUrl(code: string) {
  return `${window.location.origin}/verifier#p=${code}`;
}

/**
 * A QR code a phone can read: the back-end's short link is about 60 characters. The simulated mode's
 * self-contained link carries the whole passport (about 2 000 characters): no QR then, the link is shown instead.
 */
export const QR_MAX_CHARS = 300;
export const qrReady = (url: string) => url.length > 0 && url.length <= QR_MAX_CHARS;

/** Back-end: the short link (identifier, read on the server, small QR). Simulated: the self-contained #p= link. */
export function passportUrl(p: Passport360): string {
  return BACKEND && p.identifiant ? `${window.location.origin}/verifier?id=${p.identifiant}` : publicUrl(encodePassport(p));
}

export function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const slug = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "video";

/**
 * Preview of the dubbed version with its transparency elements: the AI label at the beginning and,
 * for long formats, the QR code at the end. The image is the source video; French lines come from
 * the synthesized clips when they exist.
 */
function DubPlayer({ p, qr }: { p: Project; qr: string }) {
  const { src } = useVideoSrc(p);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const clock = useRef({ t: 0, last: 0 });
  const played = useRef(new Set<string>());
  const clips = useRef(new Map<string, HTMLAudioElement>());
  const duration = p.video?.duration ?? Math.ceil((p.segments[p.segments.length - 1]?.end ?? 10) + 4);
  const policy = transparencyPolicy(p.format);
  const current = p.segments.find((s) => now >= s.start && now < s.end);

  useEffect(() => {
    let raf = 0;
    const tick = (ts: number) => {
      let t: number;
      const v = video.current;
      if (v) t = v.currentTime;
      else {
        if (playing) {
          clock.current.t = Math.min(duration, clock.current.t + (clock.current.last ? (ts - clock.current.last) / 1000 : 0));
          if (clock.current.t >= duration) setPlaying(false);
        }
        clock.current.last = ts;
        t = clock.current.t;
      }
      setNow((prev) => (Math.abs(prev - t) > 0.05 ? t : prev));
      const seg = p.segments.find((s) => t >= s.start && t < s.end);
      const url = seg ? audioUrls.get(audioKey(p.id, seg.id)) : undefined;
      if (v) v.volume += ((playing && url ? 0.12 : 1) - v.volume) * 0.25;
      if (playing && seg && url && !played.current.has(seg.id)) {
        played.current.add(seg.id);
        let a = clips.current.get(seg.id);
        if (!a || a.src !== url) {
          a = new Audio(url);
          clips.current.set(seg.id, a);
        }
        a.currentTime = Math.max(0, t - seg.start);
        void a.play().catch(() => {});
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [p.id, p.segments, duration, playing]);

  // Pausing (button, click on the image, end of the video) also silences the French line speaking,
  // and leaving the page stops everything.
  useEffect(() => {
    if (playing) return;
    clips.current.forEach((a) => a.pause());
    played.current.clear();
  }, [playing]);
  useEffect(() => {
    const all = clips.current;
    return () => all.forEach((a) => a.pause());
  }, []);

  const toggle = () => {
    if (playing) {
      video.current?.pause();
      setPlaying(false);
    } else {
      if (!video.current && clock.current.t >= duration) clock.current.t = 0;
      if (video.current && video.current.ended) video.current.currentTime = 0;
      played.current.clear();
      clock.current.last = 0;
      void video.current?.play();
      setPlaying(true);
    }
  };
  const showLabel = now < 4;
  const showQr = policy.qrInVideo && now > duration - 5;

  return (
    <div className="stack" style={{ gap: 0 }}>
      <div className="stage" onClick={toggle}>
        {src ? (
          <video ref={video} src={src} playsInline preload="auto" onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
        ) : (
          <div className="stage-placeholder">
            <div>
              <div className="stage-title">{p.title}</div>
              <p>Projet d’exemple sans fichier vidéo : l’aperçu montre la chronologie, les sous-titres et les éléments de transparence.</p>
            </div>
          </div>
        )}
        {showLabel && <span className="stage-label">Doublé avec l’IA · voix françaises générées</span>}
        {current?.translation && (
          <p className="stage-caption" key={current.id}>
            {current.translation}
          </p>
        )}
        {showQr && qr && (
          <div className="stage-qr" aria-label="QR code du Passeport 360° affiché à la fin">
            <span dangerouslySetInnerHTML={{ __html: qr }} />
            <small>Passeport 360°</small>
          </div>
        )}
        <button type="button" className={`stage-play ${playing ? "hide" : ""}`} aria-hidden tabIndex={-1}>
          <Play />
        </button>
      </div>
      <div className="transport">
        <button className="btn btn-dark btn-icon" onClick={toggle} aria-label={playing ? "Pause" : "Lecture"}>
          {playing ? <Pause /> : <Play />}
        </button>
        <span className="tc">
          {timecode(now)} / {timecode(duration)}
        </span>
        <span className="grow" />
        <span className="hint">Label IA : {policy.label.toLowerCase()} · QR : {!BACKEND && policy.qrInVideo ? "non incrusté sans serveur (lien partagé depuis le passeport)" : policy.qr.toLowerCase()}</span>
      </div>
    </div>
  );
}

/** True the first time this project's result is shown in this tab: the stamp presses in once, then stays put. */
function useFirstVisit(id: string): boolean {
  const [first] = useState(() => {
    try {
      const k = `sawti.result-seen.${id}`;
      if (sessionStorage.getItem(k)) return false;
      sessionStorage.setItem(k, "1");
      return true;
    } catch {
      return false;
    }
  });
  return first;
}

/**
 * The finish line: says the French version is ready, then lists what the creator now has and how to
 * get each one, including what is not available and why.
 */
function ResultHero({ p, mp4Reason }: { p: Project; mp4Reason: string }) {
  const first = useFirstVisit(p.id);
  const gens = Object.values(p.gens);
  const ok = gens.filter((g) => g.status === "ok").length;
  const refused = gens.filter((g) => g.status === "refused").length;
  const failed = gens.filter((g) => g.status === "error").length;
  const original = gens.filter((g) => g.status === "skipped").length;
  const finished = p.generation.finishedAt ? new Date(p.generation.finishedAt).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : null;
  const toDownloads = (label: string) => (
    <a
      href="#telechargements"
      className="link"
      onClick={(e) => {
        e.preventDefault();
        document.getElementById("telechargements")?.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
      }}
    >
      {label}
    </a>
  );
  const gets: { ok: boolean; title: string; how: React.ReactNode }[] = [
    { ok: ok > 0, title: "La version française", how: ok > 0 ? "à écouter dans le lecteur ci-dessous" : "aucune réplique n’a été synthétisée" },
    { ok: true, title: "Les sous-titres français", how: <>bouton .srt dans {toDownloads("Téléchargements")}</> },
    { ok: !mp4Reason, title: "La vidéo doublée en MP4", how: mp4Reason || <>bouton MP4 dans {toDownloads("Téléchargements")} : le fichier est assemblé dans votre navigateur</> },
    { ok: true, title: "Le Passeport 360° signé", how: "consultable par tous, sans compte, à partir de son lien ou du QR code" },
  ];
  return (
    <section className={`result-hero ${first ? "first" : ""}`} aria-labelledby="result-hero-title">
      <span className="result-hero-seal">
        <Seal size={76} word="SIGNÉ" date={p.generation.finishedAt} label="Passeport 360° signé" />
      </span>
      <div className="result-hero-body">
        <h2 id="result-hero-title">{refused + failed + original === 0 ? "Votre version française est prête" : ok > 0 ? "Votre version française est prête, en partie" : "Aucune réplique doublée en français"}</h2>
        <p className="result-hero-lead">
          {ok} réplique{ok > 1 ? "s" : ""} doublée{ok > 1 ? "s" : ""}
          {refused > 0 && ` · ${refused} refusée${refused > 1 ? "s" : ""} par le moteur de règles`}
          {failed > 0 && ` · ${failed} non synthétisée${failed > 1 ? "s" : ""}`}
          {original > 0 && ` · ${original} gardée${original > 1 ? "s" : ""} en voix originale (clonage vocal non branché)`}
          {finished && ` · terminé le ${finished}`}
        </p>
        <ul className="result-gets" aria-label="Ce que vous obtenez">
          {gets.map((g, i) => (
            <li key={g.title} className={g.ok ? "ok" : "no"} style={{ "--i": i } as React.CSSProperties}>
              {g.ok ? <Check aria-hidden /> : <Minus aria-hidden />}
              <span>
                <b>{g.title}</b> · {g.how}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function Result({ p }: { p: Project }) {
  useLineAudio(p.id);
  const passport = useStore((s) => s.passports[p.id]);
  const logExport = useStore((s) => s.logExport);
  const [qr, setQr] = useState("");
  const url = useMemo(() => (passport ? passportUrl(passport) : ""), [passport]);
  useEffect(() => {
    if (qrReady(url)) void QRCode.toString(url, { type: "svg", errorCorrectionLevel: "L", margin: 0 }).then(setQr);
    else setQr("");
  }, [url]);
  const chars = Object.values(p.characters);

  return (
    <>
    <ResultHero p={p} mp4Reason={mp4Reason(p)} />
    <div className="result">
      <div className="stack-lg">
        <DubPlayer p={p} qr={qr} />
        <section className="card">
          <div className="card-head">
            <h2>Informations du projet</h2>
          </div>
          <div className="card-body-tight">
            <KV
              rows={[
                ["Titre", p.title],
                ["Format", FORMAT_LABEL[p.format]],
                ["Langues", "Derja tunisienne → Français"],
                ["Source", p.video ? `${p.video.name}${p.video.url ? " (lien externe)" : ""}` : "Projet d’exemple"],
                [
                  "Voix",
                  <div className="stack-sm">
                    {chars.map((c) => {
                      const info = voiceInfo(p, c.key);
                      return (
                        <span key={c.key} className="row" style={{ gap: 8 }}>
                          <VoiceMark name={info.name} kind={info.kind} size={20} />
                          {c.name} · {info.name} · <span className="muted">{info.label}</span>
                        </span>
                      );
                    })}
                  </div>,
                ],
                ["Validation humaine", `${p.segments.filter((s) => s.validated).length} / ${p.segments.length} répliques approuvées`],
                ["Génération", p.generation.finishedAt ? new Date(p.generation.finishedAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }) : "—"],
              ]}
            />
          </div>
        </section>
      </div>

      <aside className="sticky-aside">
        <div className="card" id="telechargements">
          <div className="card-head">
            <h3>Téléchargements</h3>
          </div>
          <div className="card-body-tight">
            <ul className="dl-list">
              <Mp4Item p={p} fileName={`${slug(p.title)}.vf.mp4`} overlay={transparencyPolicy(p.format).qrInVideo && passport && url ? { label: passport.transparence.label, qrUrl: qrReady(url) ? url : undefined } : undefined} />
              <li>
                <Captions aria-hidden />
                <span>
                  <b>Sous-titres français</b>
                  <span>Répliques approuvées, fichier .srt</span>
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    download(`${slug(p.title)}.fr.srt`, toSrt(p.segments), "application/x-subrip");
                    logExport("SOUS_TITRES_SRT", { projet: p.id });
                    toast("Sous-titres téléchargés", "ok");
                  }}
                >
                  <Download />
                  .srt
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pp-card">
          <div className="pp-card-body">
            <div className="row-between">
              <b>Passeport 360°</b>
              <Prov kind="real">signé Ed25519</Prov>
            </div>
            <p className="hint">Public, sans compte, à partir d’une URL. Le QR code n’est qu’un moyen d’y accéder.</p>
            <div className="row">
              <Link to={`/passeports/${p.id}`} className="btn btn-primary btn-sm">
                <FileBadge2 />
                Ouvrir le passeport
              </Link>
              {url && (
                <a href={url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                  Page publique
                </a>
              )}
            </div>
          </div>
        </div>
        <Callout tone="plain">La vidéo d’origine reste sur votre appareil. Les fichiers téléchargés sont produits dans votre navigateur.</Callout>
      </aside>
    </div>
    </>
  );
}
