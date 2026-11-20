/**
 * Everything here runs in the browser: the video file never leaves the creator's computer.
 * Files are kept in memory, and in IndexedDB for already-public videos so a reload keeps them.
 * Simulated mode only: the synthesized lines of an already-public video are kept there too, so the
 * MP4 export still works after a reload (inédites keep nothing after the session).
 */
import { audioKey, audioUrls } from "../state/audio";

const files = new Map<string, File>();
const urls = new Map<string, string>();
const listeners = new Set<() => void>();
let version = 0;
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};
export const subscribeMedia = (cb: () => void) => (listeners.add(cb), () => listeners.delete(cb));
export const mediaVersion = () => version;

/** Frames the analysis looked at, per project and segment (JPEG data URLs, memory only). */
const frames = new Map<string, string[]>();
export const frameKey = (projectId: string, segId: string) => `${projectId}/${segId}`;
export const getFrames = (projectId: string, segId: string) => frames.get(frameKey(projectId, segId)) ?? [];
export function setFrames(projectId: string, segId: string, list: string[]) {
  frames.set(frameKey(projectId, segId), list);
  emit();
}

const DB = "sawti360-media";
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      for (const store of ["videos", "lines"]) if (!req.result.objectStoreNames.contains(store)) req.result.createObjectStore(store);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function keepVideo(projectId: string, file: File, persist: boolean) {
  files.set(projectId, file);
  emit();
  if (!persist) return;
  try {
    const d = await db();
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction("videos", "readwrite");
      tx.objectStore("videos").put(file, projectId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* storage refused (private mode, quota): the session copy still works */
  }
}

export async function loadVideo(projectId: string): Promise<File | null> {
  if (files.has(projectId)) return files.get(projectId)!;
  try {
    const d = await db();
    const file = await new Promise<File | undefined>((resolve, reject) => {
      const req = d.transaction("videos").objectStore("videos").get(projectId);
      req.onsuccess = () => resolve(req.result as File | undefined);
      req.onerror = () => reject(req.error);
    });
    if (file) {
      files.set(projectId, file);
      emit();
      return file;
    }
  } catch {
    /* no stored copy */
  }
  return null;
}

export async function forgetVideo(projectId: string) {
  files.delete(projectId);
  const u = urls.get(projectId);
  if (u) URL.revokeObjectURL(u);
  urls.delete(projectId);
  try {
    const d = await db();
    d.transaction("videos", "readwrite").objectStore("videos").delete(projectId);
  } catch {
    /* nothing stored */
  }
  await forgetLineAudio(projectId);
  emit();
}

/* ------------------------------------------------------------------ synthesized lines (simulated mode) */

/** Keeps one synthesized line (key: audioKey(project, segment)) so a reload does not lose it. */
export async function keepLineAudio(key: string, blob: Blob): Promise<void> {
  try {
    const d = await db();
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction("lines", "readwrite");
      tx.objectStore("lines").put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* storage refused (private mode, quota): the session copy still works */
  }
}

/** Puts back in audioUrls the stored lines of a project that this session no longer has. Returns how many. */
export async function restoreLineAudio(projectId: string): Promise<number> {
  try {
    const d = await db();
    const range = IDBKeyRange.bound(`${projectId}/`, `${projectId}/\uffff`);
    const rows = await new Promise<{ key: string; blob: Blob }[]>((resolve, reject) => {
      const out: { key: string; blob: Blob }[] = [];
      const req = d.transaction("lines").objectStore("lines").openCursor(range);
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return resolve(out);
        out.push({ key: String(c.key), blob: c.value as Blob });
        c.continue();
      };
      req.onerror = () => reject(req.error);
    });
    let n = 0;
    for (const { key, blob } of rows) {
      if (audioUrls.has(key)) continue;
      audioUrls.set(key, URL.createObjectURL(blob));
      n++;
    }
    return n;
  } catch {
    return 0;
  }
}

/** Removes a line (refused on a new run) or every line of a project. */
export async function forgetLineAudio(projectId: string, segId?: string): Promise<void> {
  try {
    const d = await db();
    const store = d.transaction("lines", "readwrite").objectStore("lines");
    store.delete(segId ? audioKey(projectId, segId) : IDBKeyRange.bound(`${projectId}/`, `${projectId}/\uffff`));
  } catch {
    /* nothing stored */
  }
}

/** Remote videos imported by link (direct media URL). Not persisted: the link itself is. */
const remote = new Map<string, string>();
export function setRemoteVideo(projectId: string, url: string) {
  remote.set(projectId, url);
  emit();
}

export function videoUrl(projectId: string): string | null {
  if (remote.has(projectId)) return remote.get(projectId)!;
  const f = files.get(projectId);
  if (!f) return null;
  if (!urls.has(projectId)) urls.set(projectId, URL.createObjectURL(f));
  return urls.get(projectId)!;
}

export interface Probe {
  duration: number;
  width: number;
  height: number;
  poster: string;
}

function whenSeeked(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => (v.removeEventListener("seeked", done), resolve());
    v.addEventListener("seeked", done);
    v.currentTime = Math.max(0, Math.min(t, (v.duration || t) - 0.05));
  });
}

function snapshot(v: HTMLVideoElement, width: number, quality = 0.78): string {
  const ratio = v.videoHeight / v.videoWidth || 9 / 16;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = Math.round(width * ratio);
  c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

async function openVideo(src: string): Promise<HTMLVideoElement> {
  const v = document.createElement("video");
  v.muted = true;
  v.preload = "auto";
  v.playsInline = true;
  v.src = src;
  await new Promise<void>((resolve, reject) => {
    v.onloadeddata = () => resolve();
    v.onerror = () => reject(new Error("Format vidéo non lisible par ce navigateur."));
  });
  // Some WebM files (browser recordings) carry no duration: seeking far forces the browser to compute it.
  if (!Number.isFinite(v.duration)) {
    await new Promise<void>((resolve) => {
      const done = () => (v.removeEventListener("durationchange", check), resolve());
      const check = () => Number.isFinite(v.duration) && done();
      v.addEventListener("durationchange", check);
      setTimeout(done, 4000);
      v.currentTime = 1e101;
    });
    v.currentTime = 0;
  }
  return v;
}

/** SHA-256 of a file, read in chunks so progress is real and memory stays flat. */
export async function hashFile(file: File, onProgress: (ratio: number) => void): Promise<string> {
  const { sha256 } = await import("@noble/hashes/sha2.js");
  const { bytesToHex } = await import("@noble/hashes/utils.js");
  const h = sha256.create();
  const CHUNK = 4 * 1024 * 1024;
  for (let off = 0; off < file.size; off += CHUNK) {
    const buf = new Uint8Array(await file.slice(off, off + CHUNK).arrayBuffer());
    h.update(buf);
    onProgress(Math.min(1, (off + buf.length) / file.size));
    await new Promise((r) => setTimeout(r, 0));
  }
  onProgress(1);
  return bytesToHex(h.digest());
}

/** Probes a direct media URL (MP4/WebM). The poster is empty when the host forbids cross-origin reads. */
export async function probeUrl(url: string): Promise<Probe> {
  const v = document.createElement("video");
  v.muted = true;
  v.preload = "metadata";
  v.crossOrigin = "anonymous";
  v.src = url;
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Le lien ne répond pas.")), 12000);
    v.onloadeddata = () => (clearTimeout(t), resolve());
    v.onerror = () => (clearTimeout(t), reject(new Error("Ce lien ne pointe pas vers une vidéo lisible (MP4, WebM).")));
  });
  let poster = "";
  try {
    await whenSeeked(v, Math.min(1, v.duration / 3));
    poster = snapshot(v, 480);
  } catch {
    poster = "";
  }
  return { duration: v.duration, width: v.videoWidth, height: v.videoHeight, poster };
}

/** Reads duration, size and a poster frame. Rejects formats the browser cannot decode. */
export async function probeVideo(file: File): Promise<Probe> {
  const src = URL.createObjectURL(file);
  try {
    const v = await openVideo(src);
    await whenSeeked(v, Math.min(1, v.duration / 3));
    return { duration: v.duration, width: v.videoWidth, height: v.videoHeight, poster: snapshot(v, 480) };
  } finally {
    URL.revokeObjectURL(src);
  }
}

/** Captures one frame per timestamp, in order, yielding as each one is ready. */
export async function* captureFrames(src: string, times: number[], width = 320): AsyncGenerator<{ t: number; data: string }> {
  const v = await openVideo(src);
  for (const t of times) {
    await whenSeeked(v, t);
    yield { t, data: snapshot(v, width) };
  }
  v.removeAttribute("src");
  v.load();
}

/** Re-encodes a frame at a small width so it can be kept with the project. */
export function shrinkImage(dataUrl: string, width = 240, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = Math.round((img.naturalHeight / img.naturalWidth) * width) || Math.round(width * 0.5625);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function formatDuration(s: number): string {
  if (!Number.isFinite(s)) return "–";
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m ? `${m} min ${String(r).padStart(2, "0")} s` : `${r} s`;
}

export function formatSize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1).replace(".", ",")} Go` : `${Math.max(0.1, mb).toFixed(1).replace(".", ",")} Mo`;
}
