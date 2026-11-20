/**
 * POST /api/projects/:id/review { segmentIds? } → 202 { jobId }: LLM 2 review (+ fidelity rules), in the background.
 * POST /api/projects/:id/segments/:segId/apply-suggestion → Project: the suggestion becomes the translation,
 * which must then be approved again by a human.
 */
import { Hono } from "hono";
import { z } from "zod";
import type { Review } from "../../src/mock/simulate.js";
import { requireAccount } from "../accounts.js";
import { reviewSegments } from "../ai/review.js";
import { appendAudit } from "../audit.js";
import type { AppEnv } from "../auth.js";
import { db } from "../db.js";
import { conflict, notFound, readBody } from "../errors.js";
import { ensureIdle, startJob } from "../jobs.js";
import { mutateProject, ownedProject, updateProject } from "../projects.js";

const ReviewBody = z.object({ segmentIds: z.array(z.string().max(16)).max(500).optional() });

export const review = new Hono<AppEnv>()
  .post("/projects/:id/review", async (c) => {
    const { segmentIds } = await readBody(c, ReviewBody);
    const sql = db();
    const user = c.get("user");
    const project = await ownedProject(sql, user, c.req.param("id"));
    await ensureIdle(sql, project.id, "review");
    const me = await requireAccount(sql, user);
    const jobId = await startJob(sql, { kind: "review", accountId: user.id, projectId: project.id }, async (ctx) => {
      await ctx.step(4, "Relecture des répliques par le second modèle…");
      const wanted = segmentIds ? new Set(segmentIds) : null;
      const result = await reviewSegments(project.segments.filter((s) => !wanted || wanted.has(s.id)));
      ctx.providers.llm2 = result.provider;
      await sql.begin(async (tx) => {
        const row = await ownedProject(tx, user, project.id, true);
        // Only lines whose translation did not change during the review get its verdict.
        const fresh = Object.fromEntries(
          Object.entries(result.reviews).filter(([id]) => row.segments.find((s) => s.id === id)?.translation === project.segments.find((s) => s.id === id)?.translation),
        );
        await updateProject(tx, row.id, { reviews: { ...row.reviews, ...fresh } });
        await appendAudit(tx, me.name, "RELECTURE_LLM2", { projet: row.id, repliques: Object.keys(fresh).length, modele: result.provider }, "PROPOSITION", {
          projectId: row.id,
          accountId: user.id,
        });
      });
      return { reviewed: Object.keys(result.reviews).length, provider: result.provider, notes: result.notes };
    });
    return c.json({ jobId }, 202);
  })

  .post("/projects/:id/segments/:segId/apply-suggestion", async (c) => {
    const segId = c.req.param("segId");
    const project = await mutateProject(db(), c.get("user"), c.req.param("id"), async (tx, row) => {
      const seg = row.segments.find((s) => s.id === segId);
      if (!seg) throw notFound("Réplique introuvable.");
      const current = row.reviews[segId];
      if (!current?.suggestion) throw conflict("CONFLIT", "Aucune correction à appliquer sur cette réplique.");
      const applied: Review = { verdict: "ok", note: "Correction du LLM 2 appliquée : relisez-la avant d’approuver.", simulated: current.simulated, provider: current.provider };
      await updateProject(tx, row.id, {
        segments: row.segments.map((s) => (s.id === segId ? { ...s, translation: current.suggestion!, validated: false } : s)),
        reviews: { ...row.reviews, [segId]: applied },
      });
    });
    return c.json(project);
  });
