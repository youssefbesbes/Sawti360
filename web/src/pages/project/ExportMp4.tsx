/**
 * « Vidéo doublée · MP4 » (écran 13, C3): assembled in this browser from the source video and the
 * synthesized lines (media/export.ts). The source video comes from this browser (IndexedDB, or the
 * link it was imported from), or from Storage when the original was sent (back-end mode).
 */
import { Clapperboard, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { api, messageOf } from "../../api/client";
import { BACKEND } from "../../lib/backend";
import { exportMp4, type ExportLine, type ExportPhase, type Overlay } from "../../media/export";
import { formatSize, loadVideo, restoreLineAudio } from "../../media/local";
import { loadLineAudio } from "../../state/remote/generation";
import { audioKey, audioUrls, useStore, type Project } from "../../state/store";
import { transparencyPolicy } from "../../state/workflow";
import { Progress, toast } from "../../ui/kit";

async function sourceOf(p: Project): Promise<Blob | string> {
  const file = await loadVideo(p.id);
  if (file) return file;
  if (p.video?.url) return p.video.url;
  const original = (p.video as { originalPath?: string } | undefined)?.originalPath;
  if (BACKEND && original) return (await api.get<{ url: string }>(`/projects/${p.id}/original`)).url;
  throw new Error("Vidéo source absente de ce navigateur : importez de nouveau le fichier pour exporter le MP4.");
}

async function linesOf(p: Project): Promise<ExportLine[]> {
  if (BACKEND) return Object.values(await loadLineAudio(p.id)).sort((a, b) => a.start - b.start);
  await restoreLineAudio(p.id);
  return p.segments.flatMap((s) => {
    const url = audioUrls.get(audioKey(p.id, s.id));
    return url ? [{ start: s.start, end: s.end, url }] : [];
  });
}

/** Why the MP4 cannot be built for this project, or "" when it can. Shown on the button and in the result summary. */
export function mp4Reason(p: Project): string {
  if (!p.video) return "indisponible : ce projet d’exemple n’a pas de fichier vidéo. Créez un projet avec votre propre vidéo pour obtenir le MP4";
  if (!Object.values(p.gens).some((g) => g.status === "ok")) return "indisponible : aucune réplique synthétisée à poser sur la vidéo";
  return "";
}

/** `overlay`: film and podcast with a signed passport → AI label and QR code drawn in the video (C4). */
export function Mp4Item({ p, fileName, overlay }: { p: Project; fileName: string; overlay?: Overlay }) {
  const logExport = useStore((s) => s.logExport);
  const [work, setWork] = useState<{ phase: ExportPhase; fraction: number } | null>(null);
  const [error, setError] = useState("");
  const reason = mp4Reason(p);
  const policy = transparencyPolicy(p.format);
  const describe = overlay
    ? overlay.qrUrl
      ? "Assemblée dans votre navigateur : label IA 4 s au début, QR du Passeport 360° 5 s à la fin (vidéo réencodée, plus long), voix françaises à leur place, original atténué."
      : "Assemblée dans votre navigateur : label IA 4 s au début (vidéo réencodée, plus long), voix françaises à leur place, original atténué. Sans serveur, le lien du passeport est trop long pour un QR lisible : partagez-le depuis le Passeport 360°."
    : policy.pending
      ? "Format court : label et QR selon une règle à confirmer, rien n’est ajouté. Vidéo copiée sans réencodage, voix françaises à leur place, original atténué."
      : "Assemblée dans votre navigateur : vidéo copiée sans réencodage, voix françaises à leur place, original atténué.";

  const run = async () => {
    setError("");
    setWork({ phase: "voix", fraction: 0 });
    try {
      const [source, lines] = await Promise.all([sourceOf(p), linesOf(p)]);
      if (!lines.length) throw new Error(
          p.video?.privacy === "inedite"
            ? "Audio des répliques indisponible : pour une vidéo inédite, rien n’est conservé après la session. Relancez la génération (étape Génération) pour exporter le MP4."
            : "Audio des répliques indisponible dans ce navigateur. Relancez la génération (étape Génération) pour exporter le MP4.",
        );
      const r = await exportMp4(source, lines, (fraction, phase) => setWork({ phase, fraction }), overlay);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(r.blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
      logExport("VIDEO_MP4", { projet: p.id, repliques: r.lines, duree_s: Math.round(r.duration), octets: r.blob.size, codec_audio: r.audioCodec, video_copiee: r.videoCopied, label_et_qr: r.overlay, ms: r.ms });
      toast(`MP4 prêt en ${(r.ms / 1000).toFixed(1).replace(".", ",")} s · ${formatSize(r.blob.size)}${r.overlay ? (overlay?.qrUrl ? " · label et QR incrustés" : " · label incrusté") : ""}`, "ok");
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setWork(null);
    }
  };

  return (
    <li>
      <Clapperboard aria-hidden />
      <span>
        <b>Vidéo doublée · MP4</b>
        <span>
          {work
            ? work.phase === "voix"
              ? "Pose des voix françaises à leur place…"
              : `Assemblage : ${Math.round(work.fraction * 100)} %`
            : reason ? `MP4 ${reason}.` : describe}
        </span>
        {work && <Progress value={work.fraction} indeterminate={work.phase === "voix"} label="Export du MP4" />}
        {error && (
          <span role="alert" style={{ color: "var(--bad-ink)" }}>
            {error}
          </span>
        )}
      </span>
      <button className="btn btn-secondary btn-sm" disabled={Boolean(reason) || work !== null} onClick={() => void run()} title={reason || undefined}>
        {work ? <Loader2 className="spin" /> : <Download />}
        MP4
      </button>
    </li>
  );
}
