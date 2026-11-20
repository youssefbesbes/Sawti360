/**
 * Generation (écran 12), timeline preview (écran 11) and library sample (écran 08), ARCHITECTURE.md § 4.8–4.9.
 *  POST /api/projects/:id/generation              → 202 { jobId }: every approved line, in order (task « generation »)
 *  GET  /api/projects/:id/audio                   → { [segId]: { url, start, end } }, signed URLs valid 10 min
 *  GET  /api/projects/:id/original                → { url }: the source video, when it was sent (MP4 export)
 *  POST /api/projects/:id/segments/:segId/synthesize → { gen, audioUrl?, balance? }
 *  POST /api/voices/:voiceId/preview { text, projectId? } → audio (or 403 { decision })
 * The jetons are checked before the task starts (402 JETONS_INSUFFISANTS), then line by line under lock.
 */
import { Hono } from "hono";
import type { Sql } from "postgres";
import { z } from "zod";
import { costOf, fmt } from "../../src/core/credits.js";
import type { Use } from "../../src/core/types.js";
import { GEN_STAGES } from "../../src/mock/simulate.js";
import type { GenState, Generation, Project } from "../../src/state/store.js";
import { nothingGenerated, tallyOf, type LicenseRequest } from "../../src/state/workflow.js";
import { requireAccount, type AccountOut } from "../accounts.js";
import { appendAudit } from "../audit.js";
import type { AppEnv } from "../auth.js";
import { db } from "../db.js";
import { env } from "../env.js";
import { ApiError, notFound, readBody } from "../errors.js";
import { ensureIdle, startJob } from "../jobs.js";
import { balanceOf } from "../ledger.js";
import { renderReadyMail, sendMail } from "../mail.js";
import { notify } from "../notify.js";
import { ownedProject, readProject } from "../projects.js";
import { issuePassport } from "./passports.js";
import { files } from "../storage.js";
import { linePath, loadVoiceBook, projectRequests, proposeShorter, refuseSlot, SKIPPED, slotFor, speakLine, type VoiceBook } from "../synthesis.js";

/** Rough time per line for the first estimate; then the measured average. */
const ETA_PER_LINE_MS = 1500;

const lineLabel = (segId: string) => `réplique ${segId.replace(/^s/, "")}`;

async function setGen(sql: Sql, pid: string, segId: string, gen: GenState): Promise<void> {
  await sql`update public.projects set gens = coalesce(gens, '{}'::jsonb) || ${sql.json({ [segId]: gen } as never)} where id = ${pid}`;
}

async function setGeneration(sql: Sql, pid: string, patch: Partial<Generation>): Promise<void> {
  await sql`update public.projects set generation = coalesce(generation, '{}'::jsonb) || ${sql.json(patch as never)} where id = ${pid}`;
}

/** One line of the project: its voice slot, then the shared synthesis; the audio goes to Storage. */
async function lineOf(sql: Sql, me: AccountOut, project: Project, segId: string, book: VoiceBook, requests: LicenseRequest[]): Promise<{ gen: GenState; failure?: unknown; balance?: number }> {
  const seg = project.segments.find((s) => s.id === segId);
  if (!seg) throw notFound("Réplique introuvable.");
  const slot = slotFor(project, seg.speaker, book, requests);
  const voiceId = project.speakerVoices[seg.speaker];
  if (slot.mode === "original" && slot.usable) return { gen: SKIPPED };
  if (!slot.usable || !voiceId) return { gen: await refuseSlot(sql, me, project, voiceId, seg.translation, slot) };
  const res = await speakLine(sql, {
    me,
    voiceId,
    text: seg.translation,
    use: project.use,
    project: { id: project.id, title: project.title },
    label: lineLabel(seg.id),
    humanValidated: seg.validated,
    book,
    slot: seg.end - seg.start,
    emotion: seg.emotion,
    keep: (speech) => files().write("media", linePath(project.accountId, project.id, seg.id, speech.mock), speech.bytes, speech.mime),
  });
  if (res.gen.fit?.tooLong) await proposeShorter(sql, project.id, seg, res.gen.fit);
  return res;
}

const PreviewBody = z.object({ text: z.string().trim().min(1).max(2000), projectId: z.string().max(80).optional() });

export const generation = new Hono<AppEnv>()
  .post("/projects/:id/generation", async (c) => {
    const sql = db();
    const user = c.get("user");
    const me = await requireAccount(sql, user);
    const row = await ownedProject(sql, user, c.req.param("id"));
    await ensureIdle(sql, row.id, "generation");
    const project = await readProject(sql, row.id);
    const book = await loadVoiceBook(sql);
    const requests = await projectRequests(sql, row.id);
    const lines = project.segments.filter((s) => s.validated);
    if (!lines.length) throw new ApiError(409, "RIEN_A_GENERER", "Aucune réplique approuvée : approuvez la traduction avant de lancer la génération.");
    const slots = Object.fromEntries(Object.keys(project.characters).map((k) => [k, slotFor(project, k, book, requests)]));
    const spoken = lines.filter((s) => slots[s.speaker]?.usable && slots[s.speaker].mode !== "original");
    const needed = spoken.reduce((a, s) => a + costOf(s.translation), 0);
    const balance = await balanceOf(sql, me.id);
    if (needed > balance)
      throw new ApiError(
        402,
        "JETONS_INSUFFISANTS",
        `Jetons insuffisants : ${fmt.format(needed)} nécessaires pour ${spoken.length} réplique${spoken.length > 1 ? "s" : ""}, ${fmt.format(balance)} disponibles. Changez de plan pour en obtenir.`,
        { needed, balance },
      );

    const started: Generation = { status: "running", stage: 0, synthDone: 0, synthTotal: lines.length, startedAt: new Date().toISOString(), etaMs: lines.length * ETA_PER_LINE_MS };
    await sql`update public.projects set generation = ${sql.json(started as never)} where id = ${row.id}`;
    await appendAudit(sql, me.name, "GENERATION_LANCEE", { projet: row.id, repliques: lines.length, jetons: needed }, "EN_COURS", { projectId: row.id, accountId: me.id });

    const jobId = await startJob(sql, { kind: "generation", accountId: me.id, projectId: row.id }, async (ctx) => {
      const tally = { ok: 0, refused: 0, error: 0, skipped: 0 };
      const outcomes: GenState[] = [];
      try {
        const t0 = Date.now();
        for (const [i, seg] of lines.entries()) {
          await ctx.step(0, `Réplique ${i + 1} sur ${lines.length} · ${project.characters[seg.speaker]?.name ?? seg.speaker}`);
          await setGen(sql, row.id, seg.id, { status: "pending" });
          let gen: GenState;
          try {
            gen = (await lineOf(sql, me, project, seg.id, book, requests)).gen;
          } catch (err) {
            // A short balance (someone else spent the jetons meanwhile) stops only this line.
            gen = { status: "error", chars: costOf(seg.translation), by: "server", message: err instanceof Error ? err.message : String(err) };
          }
          tally[gen.status === "pending" ? "error" : gen.status]++;
          outcomes.push(gen);
          await setGen(sql, row.id, seg.id, gen);
          const done = i + 1;
          await setGeneration(sql, row.id, { synthDone: done, etaMs: Math.round(((Date.now() - t0) / done) * (lines.length - done)) + 500 });
        }
        // No line dubbed (all refused, failed or kept in the original voice): not a result. Nothing is
        // signed, the project is not marked finished, and the creator sees why and can start again.
        const failed = nothingGenerated(tallyOf(outcomes));
        if (failed) {
          await setGeneration(sql, row.id, { status: "idle", etaMs: 0, error: failed });
          await appendAudit(sql, me.name, "GENERATION_SANS_RESULTAT", { projet: row.id, ...tally }, "AUCUNE_REPLIQUE", { projectId: row.id, accountId: me.id });
          await notify(sql, { accountId: me.id, space: "creator", tone: "warn", title: "Aucune réplique doublée", body: `${project.title} · ${failed}`, link: `/projet/${row.id}/generation` });
          return tally;
        }
        for (let i = 1; i < GEN_STAGES.length; i++) {
          await ctx.step(i, GEN_STAGES[i].server.detail);
          await setGeneration(sql, row.id, { stage: i });
          // The Passeport 360°, signed by the server, once every line has its final state.
          if (GEN_STAGES[i].key === "transp") await issuePassport(sql, me, row.id);
        }
        await setGeneration(sql, row.id, { status: "done", stage: GEN_STAGES.length, finishedAt: new Date().toISOString(), etaMs: 0 });
        const link = `/projet/${row.id}/resultat`;
        await notify(sql, { accountId: me.id, space: "creator", tone: "ok", title: "Rendu prêt", body: `${project.title} · résultat et Passeport 360° disponibles.`, link });
        await sendMail(renderReadyMail(me.email, { project: project.title, url: `${env().appUrl}${link}` })).catch(() => false);
        return tally;
      } catch (err) {
        await setGeneration(sql, row.id, { status: "idle", etaMs: 0, error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    });
    await setGeneration(sql, row.id, { jobId });
    return c.json({ jobId }, 202);
  })

  .get("/projects/:id/audio", async (c) => {
    const sql = db();
    const row = await ownedProject(sql, c.get("user"), c.req.param("id"));
    const out: Record<string, { url: string; start: number; end: number }> = {};
    await Promise.all(
      (row.segments ?? []).map(async (s) => {
        const g = row.gens?.[s.id];
        if (g?.status !== "ok") return;
        out[s.id] = { url: await files().signRead("media", linePath(row.account_id, row.id, s.id, Boolean(g.mock)), 600), start: s.start, end: s.end };
      }),
    );
    return c.json(out);
  })

  .get("/projects/:id/original", async (c) => {
    // The source video, only when the creator chose to send it (otherwise it never leaves their computer).
    const row = await ownedProject(db(), c.get("user"), c.req.param("id"));
    const path = (row.video as { originalPath?: string } | null)?.originalPath;
    if (!path) throw notFound("La vidéo d’origine n’a pas été envoyée : elle est restée sur l’ordinateur du créateur.");
    return c.json({ url: await files().signRead("media", path, 600) });
  })

  .post("/projects/:id/segments/:segId/synthesize", async (c) => {
    const sql = db();
    const user = c.get("user");
    const me = await requireAccount(sql, user);
    const row = await ownedProject(sql, user, c.req.param("id"));
    const project = await readProject(sql, row.id);
    const segId = c.req.param("segId");
    await setGen(sql, row.id, segId, { status: "pending" });
    let res: { gen: GenState; failure?: unknown; balance?: number };
    try {
      res = await lineOf(sql, me, project, segId, await loadVoiceBook(sql), await projectRequests(sql, row.id));
    } catch (err) {
      await sql`update public.projects set gens = gens - ${segId} where id = ${row.id}`;
      throw err;
    }
    await setGen(sql, row.id, segId, res.gen);
    const audioUrl = res.gen.status === "ok" ? await files().signRead("media", linePath(row.account_id, row.id, segId, Boolean(res.gen.mock)), 600) : undefined;
    return c.json({ gen: res.gen, ...(audioUrl ? { audioUrl } : {}), ...(res.balance !== undefined ? { balance: res.balance } : {}) });
  })

  .post("/voices/:voiceId/preview", async (c) => {
    const body = await readBody(c, PreviewBody);
    const sql = db();
    const user = c.get("user");
    const me = await requireAccount(sql, user);
    let use: Use = "doublage_film";
    let gateProjectId: string | undefined;
    let title = "Bibliothèque";
    if (body.projectId) {
      const row = await ownedProject(sql, user, body.projectId);
      use = row.use_case;
      gateProjectId = row.id;
      title = row.title;
    }
    const res = await speakLine(sql, { me, voiceId: c.req.param("voiceId"), text: body.text, use, project: null, gateProjectId, title, label: "essai de voix", humanValidated: true });
    if (res.gen.status === "refused") return c.json({ decision: res.gen.decision }, 403);
    if (res.failure) throw res.failure;
    if (!res.speech) throw new ApiError(409, "VOIX_SANS_RENDU", res.gen.message ?? "Cette voix ne peut pas être rendue.");
    return new Response(res.speech.bytes, {
      status: 200,
      headers: {
        "content-type": res.speech.mime,
        "cache-control": "no-store",
        "x-sawti-decision": res.gen.decision?.reason_code ?? "OK",
        "x-sawti-license": res.gen.decision?.license_id ?? "",
        "x-sawti-cost": String(res.gen.cost ?? 0),
        "x-sawti-owner": String(res.gen.ownerShare ?? 0),
        "x-sawti-ms": String(res.gen.ms ?? 0),
        "x-sawti-balance": String(res.balance ?? ""),
        ...(res.speech.mock ? { "x-sawti-mock": "1" } : {}),
      },
    });
  });

