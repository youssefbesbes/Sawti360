/**
 * Back-end versions of the synthesis actions (écran 11 timeline preview, écran 12 generation, library sample):
 * the server runs the rules engine, spends the jetons and keeps the audio; the browser follows the task and
 * plays the lines from signed URLs (valid 10 min), refreshed while a screen shows them.
 */
import { useEffect, useState } from "react";
import { api, ApiCallError, messageOf } from "../../api/client";
import { waitJob } from "../../api/useJob";
import { PLANS } from "../../core/credits";
import type { Decision } from "../../core/types";
import { BACKEND } from "../../lib/backend";
import { audioKey, audioUrls } from "../audio";
import { restoreLineAudio } from "../../media/local";
import type { GenState } from "../store";
import { bootstrap } from "./bootstrap";
import { flushEdits, patchLocal, refreshProject, whenSent } from "./projects";
import { report } from "./report";
import type { Get, Set } from "./state";

function setBalance(set: Set, get: Get, balance: number | undefined): void {
  if (balance !== undefined && Number.isFinite(balance)) set({ spent: PLANS[get().plan].monthly - balance });
}

/* ------------------------------------------------------------------ audio of the lines */

export type LineAudio = Record<string, { url: string; start: number; end: number }>;

/** Puts the signed URLs of the project's synthesized lines in audioUrls (timeline, result, export). */
export async function loadLineAudio(pid: string): Promise<LineAudio> {
  const map = await api.get<LineAudio>(`/projects/${pid}/audio`);
  for (const key of [...audioUrls.keys()]) if (key.startsWith(`${pid}/`) && !map[key.slice(pid.length + 1)]) audioUrls.delete(key);
  for (const [segId, a] of Object.entries(map)) audioUrls.set(audioKey(pid, segId), a.url);
  return map;
}

/** Keeps the lines' signed URLs fresh while a screen shows them (they expire after 10 minutes). */
export function useLineAudio(pid: string): void {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!pid) return;
    // Simulated mode: the lines kept in this browser (already-public video) come back after a reload.
    if (!BACKEND) {
      let alive = true;
      void restoreLineAudio(pid).then((n) => alive && n > 0 && bump((x) => x + 1));
      return () => {
        alive = false;
      };
    }
    let alive = true;
    const load = () =>
      void loadLineAudio(pid).then(
        () => alive && bump((n) => n + 1),
        () => undefined,
      );
    load();
    const timer = setInterval(load, 8 * 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [pid]);
}

/* ------------------------------------------------------------------ timeline preview (C5) */

export async function generateLine(set: Set, get: Get, pid: string, sid: string): Promise<void> {
  const setGen = (g: GenState) => patchLocal(set, pid, (p) => ({ gens: { ...p.gens, [sid]: g } }));
  setGen({ status: "pending" });
  try {
    // The server synthesizes its own copy of the line: the approval and the text typed go first.
    await flushEdits(set);
    await whenSent(pid);
    const res = await api.post<{ gen: GenState; audioUrl?: string; balance?: number }>(`/projects/${pid}/segments/${sid}/synthesize`);
    const key = audioKey(pid, sid);
    if (res.audioUrl) audioUrls.set(key, res.audioUrl);
    else audioUrls.delete(key);
    setGen(res.gen);
    setBalance(set, get, res.balance);
  } catch (err) {
    setGen({ status: "error", message: messageOf(err), by: "server" });
  }
}

/* ------------------------------------------------------------------ library sample (C5) */

export async function tryVoice(set: Set, get: Get, voiceId: string, text: string): Promise<GenState & { url?: string }> {
  const projectId = get().projects[get().currentId] ? get().currentId : undefined;
  try {
    const res = await api.post<Response>(`/voices/${encodeURIComponent(voiceId)}/preview`, { text, ...(projectId ? { projectId } : {}) }, { raw: true });
    const blob = await res.blob();
    const num = (h: string) => Number(res.headers.get(h) ?? 0);
    const balance = res.headers.get("x-sawti-balance");
    setBalance(set, get, balance ? Number(balance) : undefined);
    return {
      status: "ok",
      chars: num("x-sawti-cost"),
      cost: num("x-sawti-cost"),
      ownerShare: num("x-sawti-owner"),
      ms: num("x-sawti-ms"),
      bytes: blob.size,
      mock: res.headers.get("x-sawti-mock") === "1",
      at: new Date().toISOString(),
      by: "server",
      url: URL.createObjectURL(blob),
    };
  } catch (err) {
    if (err instanceof ApiCallError && err.status === 403 && err.body.decision) return { status: "refused", decision: err.body.decision as Decision, by: "server" };
    return { status: "error", message: messageOf(err), by: "server" };
  }
}

/* ------------------------------------------------------------------ generation (C1) */

const following = new Set<string>();

async function follow(set: Set, get: Get, pid: string, jobId: string): Promise<void> {
  if (following.has(pid)) return;
  following.add(pid);
  try {
    let last = 0;
    const job = await waitJob(jobId, () => {
      if (Date.now() - last < 1400) return;
      last = Date.now();
      void refreshProject(set, pid);
    });
    await refreshProject(set, pid);
    if (job.status === "error") {
      // A task stopped by the platform: the server marks the generation stopped; same here at once.
      patchLocal(set, pid, (p) => (p.generation.status === "running" ? { generation: { ...p.generation, status: "idle", error: job.error ?? "La génération s’est arrêtée." } } : {}));
      throw new Error(job.error ?? "La génération s’est arrêtée.");
    }
    await loadLineAudio(pid).catch(() => undefined);
    // Balance, usage, journal, notifications and the passport, as the server now has them.
    await bootstrap(set, get);
  } catch (err) {
    report(err);
  } finally {
    following.delete(pid);
  }
}

export async function startGeneration(set: Set, get: Get, pid: string): Promise<void> {
  const p = get().projects[pid];
  if (!p || p.generation.status === "running") return;
  const total = p.segments.filter((s) => s.validated).length;
  patchLocal(set, pid, () => ({ generation: { status: "running", stage: 0, synthDone: 0, synthTotal: total, startedAt: new Date().toISOString(), etaMs: total * 1500 } }));
  let jobId: string;
  try {
    await flushEdits(set);
    await whenSent(pid);
    ({ jobId } = await api.post<{ jobId: string }>(`/projects/${pid}/generation`));
  } catch (err) {
    report(err);
    await refreshProject(set, pid);
    return;
  }
  patchLocal(set, pid, (pp) => ({ generation: { ...pp.generation, jobId } }));
  await follow(set, get, pid, jobId);
}

/** After a reload or on another device: follows again the generations the server is still running. */
export function resumeGenerations(set: Set, get: Get): void {
  for (const p of Object.values(get().projects)) if (p.generation?.status === "running" && p.generation.jobId) void follow(set, get, p.id, p.generation.jobId);
}
