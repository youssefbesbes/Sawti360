/**
 * Back-end versions of « Relancer la vérification » (LLM 2 review, a long task) and « Appliquer »
 * (the suggestion becomes the translation, to be approved again).
 */
import { api } from "../../api/client";
import type { Project } from "../store";
import { waitJob } from "../../api/useJob";
import { applyServer, flushEdits, patchLocal, refreshProject } from "./projects";
import { report } from "./report";
import type { Get, Set } from "./state";

export async function reviewAll(set: Set, pid: string, segmentIds?: string[]): Promise<void> {
  try {
    await flushEdits(set);
    const { jobId } = await api.post<{ jobId: string }>(`/projects/${pid}/review`, segmentIds ? { segmentIds } : {});
    const job = await waitJob(jobId);
    if (job.status === "error") throw new Error(job.error ?? "La relecture a échoué.");
  } catch (err) {
    report(err);
  } finally {
    await refreshProject(set, pid);
  }
}

export async function applySuggestion(set: Set, get: Get, pid: string, segId: string): Promise<void> {
  const sug = get().projects[pid]?.reviews[segId]?.suggestion;
  if (!sug) return;
  patchLocal(set, pid, (p) => ({
    segments: p.segments.map((x) => (x.id === segId ? { ...x, translation: sug, validated: false } : x)),
    reviews: { ...p.reviews, [segId]: { ...p.reviews[segId], verdict: "ok", note: "Correction du LLM 2 appliquée : relisez-la avant d’approuver.", suggestion: undefined } },
  }));
  try {
    await flushEdits(set);
    applyServer(set, await api.post<Project>(`/projects/${pid}/segments/${segId}/apply-suggestion`));
  } catch (err) {
    report(err);
    await refreshProject(set, pid);
  }
}
