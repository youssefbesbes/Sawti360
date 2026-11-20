import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedDatabase } from "../scripts/lib/seed-db.js";
import { PROJECT } from "../src/core/catalog.js";
import { costOf, split } from "../src/core/credits.js";
import { GEN_STAGES } from "../src/mock/simulate.js";
import { setSynthesizerForTests, type Synthesizer } from "./ai/elevenlabs.js";
import { app } from "./app.js";
import { readJournal } from "./audit.js";
import { setVerifierForTests } from "./auth.js";
import { setDbForTests } from "./db.js";
import { setEnvForTests } from "./env.js";
import { ApiError } from "./errors.js";
import { setBackgroundForTests } from "./jobs.js";
import { balanceOf } from "./ledger.js";
import { setMailSenderForTests, type Mail } from "./mail.js";
import { setFileStoreForTests, type FileStore } from "./storage.js";
import { createTestDb, createUser, hasTestDb, type TestDb } from "./test/db.js";

const PID = PROJECT.id; // « Le dernier car » : Amel → v_lina (licence acceptée et payée), Yassine → v_sami (gratuite)

describe.skipIf(!hasTestDb)("C1 · C5 · génération côté serveur et aperçus", () => {
  let t: TestDb;
  let nour: string;
  let lina: string;
  let other: string;
  const running: Promise<unknown>[] = [];
  const stored = new Map<string, { bytes: Uint8Array; type: string }>();
  const mails: Mail[] = [];
  const spoken: { voice: string; text: string }[] = [];
  let engine: Synthesizer = async (voice, text) => (spoken.push({ voice, text }), { bytes: new TextEncoder().encode(`MP3:${text}`), mime: "audio/mpeg", mock: false, ms: 12 });
  const fakeFiles: FileStore = {
    signUpload: async () => ({ signedUrl: "https://stockage/x", token: "t" }),
    signRead: async (b, p, s) => `https://stockage/${b}/${p}?expire=${s}`,
    read: async (b, p) => stored.get(`${b}/${p}`)?.bytes ?? Promise.reject(new Error(`absent ${p}`)),
    write: async (b, p, bytes, type) => void stored.set(`${b}/${p}`, { bytes, type }),
    remove: async () => undefined,
  };

  beforeAll(async () => {
    t = await createTestDb();
    setDbForTests(t.sql);
    setBackgroundForTests((p) => running.push(p));
    setFileStoreForTests(fakeFiles);
    setMailSenderForTests(async (m) => (mails.push(m), true));
    setEnvForTests({ APP_URL: "https://sawti360.vercel.app", ELEVENLABS_API_KEY: "k" });
    setSynthesizerForTests((voice, text, o) => engine(voice, text, o));
    nour = await createUser(t.sql, "nour@exemple.tn", { name: "Nour Films" });
    lina = await createUser(t.sql, "lina@exemple.tn", { name: "Lina M." });
    other = await createUser(t.sql, "autre@exemple.tn", { name: "Autre" });
    await seedDatabase(t.sql, { nour, lina });
    const emails: Record<string, string> = { [nour]: "nour@exemple.tn", [lina]: "lina@exemple.tn", [other]: "autre@exemple.tn" };
    setVerifierForTests(async (tok) => (emails[tok] ? { id: tok, email: emails[tok] } : null));
  }, 30_000);
  afterAll(async () => {
    for (const f of [setDbForTests, setBackgroundForTests, setFileStoreForTests, setVerifierForTests, setMailSenderForTests, setSynthesizerForTests, setEnvForTests]) (f as (x: null) => void)(null);
    await t?.drop();
  });

  const call = (who: string | null, method: string, path: string, body?: unknown) =>
    app.request(`/api${path}`, { method, headers: { ...(who ? { authorization: `Bearer ${who}` } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const notices = async (id: string) => (await t.sql<{ title: string; space: string; body: string }[]>`select title, space, body from public.notifications where account_id = ${id} order by at desc, id desc`).map((n) => `${n.space}:${n.title}`);
  const lastAction = async () => (await readJournal(t.sql)).at(-1);
  const approve = (segId: string, validated = true) => call(nour, "PATCH", `/projects/${PID}/segments/${segId}`, { validated });
  const project = async () => (await call(nour, "GET", `/projects/${PID}`)).json();

  it("réplique non approuvée → refusée par le moteur de règles, rien débité, journal GENERATION_REFUSEE", async () => {
    const before = await balanceOf(t.sql, nour);
    const r = await call(nour, "POST", `/projects/${PID}/segments/s1/synthesize`);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.gen).toMatchObject({ status: "refused", by: "server", decision: { reason_code: "VALIDATION_HUMAINE_MANQUANTE" } });
    expect(body.audioUrl).toBeUndefined();
    expect(await balanceOf(t.sql, nour)).toBe(before);
    expect(await lastAction()).toMatchObject({ action: "GENERATION_REFUSEE", decision: "VALIDATION_HUMAINE_MANQUANTE" });
    expect(spoken).toHaveLength(0);
  });

  it("aperçu d'une réplique approuvée : audio rangé, jetons débités, 70 % à Lina, journal et notification", async () => {
    expect((await approve("s1")).status).toBe(200);
    const text = "Yassine, le car part à cinq heures et demie.";
    const cost = costOf(text);
    const parts = split(cost, 0.7);
    const before = { nour: await balanceOf(t.sql, nour), lina: await balanceOf(t.sql, lina) };
    const body = await (await call(nour, "POST", `/projects/${PID}/segments/s1/synthesize`)).json();
    expect(body.gen).toMatchObject({ status: "ok", cost, ownerShare: parts.owner, by: "server", mock: false, decision: { reason_code: "OK", license_id: "VL-2026-0001" } });
    expect(body.audioUrl).toBe(`https://stockage/media/${nour}/${PID}/lines/s1.mp3?expire=600`);
    expect(body.balance).toBe(before.nour - cost);
    expect(spoken.at(-1)).toEqual({ voice: "EXAVITQu4vr4xnSDxMaL", text });
    expect(stored.get(`media/${nour}/${PID}/lines/s1.mp3`)?.type).toBe("audio/mpeg");
    expect(await balanceOf(t.sql, nour)).toBe(before.nour - cost);
    expect(await balanceOf(t.sql, lina)).toBe(before.lina + parts.owner);
    const [usage] = await t.sql<{ project_id: string; project_label: string; owner: number; platform: number; voice_id: string }[]>`select * from public.usage_rows where creator_account_id = ${nour} order by at desc limit 1`;
    expect(usage).toMatchObject({ project_id: PID, project_label: "Le dernier car, réplique 1", owner: parts.owner, platform: parts.platform, voice_id: "v_lina" });
    expect(await lastAction()).toMatchObject({ action: "GENERATION_AUTORISEE", decision: "OK" });
    expect((await notices(lina))[0]).toBe("owner:Votre voix a été utilisée");
    expect((await project()).gens.s1).toMatchObject({ status: "ok", cost });
  });

  it("thème interdit par la titulaire → refusé, Lina prévenue, aucun audio", async () => {
    await call(nour, "PATCH", `/projects/${PID}/segments/s3`, { translation: "Votez pour notre parti aux élections !" });
    await approve("s3");
    const calls = spoken.length;
    const body = await (await call(nour, "POST", `/projects/${PID}/segments/s3/synthesize`)).json();
    expect(body.gen).toMatchObject({ status: "refused", decision: { reason_code: "THEME_INTERDIT_PAR_TITULAIRE" } });
    expect(spoken).toHaveLength(calls);
    expect((await notices(lina))[0]).toBe("owner:Tentative bloquée sur votre voix");
    await call(nour, "PATCH", `/projects/${PID}/segments/s3`, { translation: "Je l’ai payé 300 dinars, ce n’est pas rien !" });
  });

  it("moteur de voix en panne → erreur expliquée, jetons rendus", async () => {
    const before = await balanceOf(t.sql, nour);
    const keep = engine;
    engine = async () => {
      throw new ApiError(502, "MOTEUR_VOIX_INDISPONIBLE", "Le moteur de voix a répondu 429 : quota ou crédits épuisés.");
    };
    const body = await (await call(nour, "POST", `/projects/${PID}/segments/s1/synthesize`)).json();
    engine = keep;
    expect(body.gen.status).toBe("error");
    expect(body.gen.message).toMatch(/429.*Aucun jeton débité/);
    expect(await balanceOf(t.sql, nour)).toBe(before);
    const reasons = (await t.sql<{ reason: string }[]>`select reason from public.token_ledger where account_id = ${nour} order by id desc limit 2`).map((r) => r.reason);
    expect(reasons).toEqual(["remboursement", "synthese"]);
  });

  it("voix titulaire sans licence de projet → refus expliqué (PROJET_NON_AUTORISE), sans appel au moteur", async () => {
    expect((await call(nour, "POST", `/projects/${PID}/characters/yassine/voice`, { voiceId: "v_maya" })).status).toBe(200);
    await approve("s2");
    const calls = spoken.length;
    const body = await (await call(nour, "POST", `/projects/${PID}/segments/s2/synthesize`)).json();
    expect(body.gen).toMatchObject({ status: "refused", decision: { reason_code: "PROJET_NON_AUTORISE", detail: "Licence de projet à demander" } });
    expect(spoken).toHaveLength(calls);
    await call(nour, "POST", `/projects/${PID}/characters/yassine/voice`, { voiceId: "v_sami" });
  });

  it("solde insuffisant → 402 expliqué avant de lancer la génération", async () => {
    for (const s of ["s1", "s2", "s3", "s4", "s5", "s6"]) await approve(s);
    const balance = await balanceOf(t.sql, nour);
    await t.sql`insert into public.token_ledger (account_id, delta, reason, ref) values (${nour}, ${-(balance - 10)}, 'synthese', 'test')`;
    const r = await call(nour, "POST", `/projects/${PID}/generation`);
    expect(r.status).toBe(402);
    const body = await r.json();
    expect(body).toMatchObject({ error: "JETONS_INSUFFISANTS", balance: 10 });
    expect(body.message).toMatch(/nécessaires pour 6 répliques/);
    await t.sql`delete from public.token_ledger where account_id = ${nour} and ref = 'test'`;
    expect((await project()).generation.status).not.toBe("running");
  });

  it("génération complète : chaque réplique approuvée synthétisée, « Rendu prêt », e-mail, URL signées", async () => {
    const calls = spoken.length;
    const before = await balanceOf(t.sql, nour);
    const r = await call(nour, "POST", `/projects/${PID}/generation`);
    expect(r.status).toBe(202);
    const { jobId } = await r.json();
    expect((await call(nour, "POST", `/projects/${PID}/generation`)).status).toBe(409);
    await Promise.all(running.splice(0));
    const job = await (await call(nour, "GET", `/jobs/${jobId}`)).json();
    expect(job).toMatchObject({ status: "done", kind: "generation" });
    const p = await project();
    expect(p.generation).toMatchObject({ status: "done", stage: GEN_STAGES.length, synthDone: 6, synthTotal: 6, jobId });
    expect(Object.values(p.gens).map((g) => (g as { status: string }).status)).toEqual(["ok", "ok", "ok", "ok", "ok", "ok"]);
    expect(spoken.length - calls).toBe(6);
    const cost = p.segments.reduce((a: number, s: { translation: string }) => a + costOf(s.translation), 0);
    expect(await balanceOf(t.sql, nour)).toBe(before - cost);
    expect((await notices(nour))[0]).toBe("creator:Rendu prêt");
    expect(mails.at(-1)).toMatchObject({ to: "nour@exemple.tn", subject: "Rendu prêt : Le dernier car" });
    expect(mails.at(-1)!.text).toContain(`https://sawti360.vercel.app/projet/${PID}/resultat`);
    const actions = (await readJournal(t.sql, { projectId: PID })).map((e) => e.action);
    expect(actions).toContain("GENERATION_LANCEE");
    expect(actions.filter((a) => a === "GENERATION_AUTORISEE").length).toBeGreaterThanOrEqual(7);

    const audio = await (await call(nour, "GET", `/projects/${PID}/audio`)).json();
    expect(Object.keys(audio)).toEqual(["s1", "s2", "s3", "s4", "s5", "s6"]);
    expect(audio.s2).toEqual({ url: `https://stockage/media/${nour}/${PID}/lines/s2.mp3?expire=600`, start: 3.4, end: 6.2 });
    expect((await call(other, "GET", `/projects/${PID}/audio`)).status).toBe(403);
  });

  it("solde épuisé pendant la tâche → seule la réplique concernée échoue, la génération se termine", async () => {
    const balance = await balanceOf(t.sql, nour);
    const keep = engine;
    let n = 0;
    engine = async (voice, text, o) => {
      // Someone spends the last jetons during the second line.
      if (++n === 1) await t.sql`insert into public.token_ledger (account_id, delta, reason, ref) values (${nour}, ${-(balance - 60)}, 'synthese', 'test')`;
      return keep(voice, text, o);
    };
    const { jobId } = await (await call(nour, "POST", `/projects/${PID}/generation`)).json();
    await Promise.all(running.splice(0));
    engine = keep;
    expect((await (await call(nour, "GET", `/jobs/${jobId}`)).json()).status).toBe("done");
    const p = await project();
    expect(p.generation.status).toBe("done");
    const failed = Object.values(p.gens).filter((g) => (g as { status: string }).status === "error") as { message: string }[];
    expect(failed.length).toBeGreaterThan(0);
    expect(failed[0].message).toMatch(/Jetons insuffisants/);
    await t.sql`delete from public.token_ledger where account_id = ${nour} and ref = 'test'`;
  });

  it("aucune réplique doublée → pas « Rendu prêt » : génération à relancer, aucun passeport signé, cause expliquée", async () => {
    const passportsBefore = (await t.sql<{ n: number }[]>`select count(*)::int as n from public.passports where project_id = ${PID}`)[0].n;
    const keep = engine;
    engine = async () => {
      throw new ApiError(502, "MOTEUR_VOIX_INDISPONIBLE", "Le moteur de voix a répondu 429 : quota ou crédits épuisés.");
    };
    const { jobId } = await (await call(nour, "POST", `/projects/${PID}/generation`)).json();
    await Promise.all(running.splice(0));
    engine = keep;
    expect((await (await call(nour, "GET", `/jobs/${jobId}`)).json()).status).toBe("done");
    const p = await project();
    expect(p.generation.status).toBe("idle");
    expect(p.generation.error).toMatch(/^Aucune réplique n’a été doublée : 6 en erreur\. Rien n’a été signé/);
    expect((await t.sql<{ n: number }[]>`select count(*)::int as n from public.passports where project_id = ${PID}`)[0].n).toBe(passportsBefore);
    expect((await notices(nour))[0]).toBe("creator:Aucune réplique doublée");
    expect(await lastAction()).toMatchObject({ action: "GENERATION_SANS_RESULTAT", decision: "AUCUNE_REPLIQUE" });
    // The cause fixed, the same project can be generated again.
    expect((await call(nour, "POST", `/projects/${PID}/generation`)).status).toBe(202);
    await Promise.all(running.splice(0));
    expect((await project()).generation).toMatchObject({ status: "done" });
  });

  it("vidéo d'origine : URL signée seulement si le créateur l'a envoyée", async () => {
    expect((await call(nour, "GET", `/projects/${PID}/original`)).status).toBe(404);
    await t.sql`update public.projects set video = ${t.sql.json({ name: "film.mp4", size: 1, type: "video/mp4", duration: 20, width: 640, height: 360, privacy: "inedite", originalPath: `${nour}/${PID}/original.mp4` })} where id = ${PID}`;
    expect(await (await call(nour, "GET", `/projects/${PID}/original`)).json()).toEqual({ url: `https://stockage/media/${nour}/${PID}/original.mp4?expire=600` });
    expect((await call(other, "GET", `/projects/${PID}/original`)).status).toBe(403);
    await t.sql`update public.projects set video = null where id = ${PID}`;
  });

  it("génération arrêtée par la plateforme (plus de 300 s sans nouvelles) → le projet peut être relancé", async () => {
    const [job] = await t.sql<{ id: string }[]>`
      insert into public.jobs (kind, account_id, project_id, status, step, updated_at)
      values ('generation', ${nour}, ${PID}, 'running', 0, now() - interval '400 seconds') returning id`;
    await t.sql`update public.projects set generation = generation || ${t.sql.json({ status: "running", jobId: job.id })} where id = ${PID}`;
    expect((await (await call(nour, "GET", `/jobs/${job.id}`)).json()).status).toBe("error");
    const p = await project();
    expect(p.generation.status).toBe("idle");
    expect(p.generation.error).toMatch(/300 s/);
    expect((await call(nour, "POST", `/projects/${PID}/generation`)).status).toBe(202);
    await Promise.all(running.splice(0));
    expect((await project()).generation).toMatchObject({ status: "done" });
  });

  it("écoute d'échantillon : audio et en-têtes ; voix révoquée → 403 avec la décision", async () => {
    const r = await call(nour, "POST", "/voices/v_base_walid/preview", { text: "Bonjour, ceci est un essai." });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("audio/mpeg");
    expect(r.headers.get("x-sawti-decision")).toBe("OK");
    expect(Number(r.headers.get("x-sawti-cost"))).toBe(costOf("Bonjour, ceci est un essai."));
    expect(new TextDecoder().decode(await r.arrayBuffer())).toBe("MP3:Bonjour, ceci est un essai.");
    const [usage] = await t.sql<{ project_id: string | null; project_label: string }[]>`select project_id, project_label from public.usage_rows where voice_id = 'v_base_walid' order by at desc limit 1`;
    expect(usage).toEqual({ project_id: null, project_label: "Bibliothèque, essai de voix" });
    const inProject = await call(nour, "POST", "/voices/v_base_walid/preview", { text: "Un essai dans le projet.", projectId: PID });
    expect(inProject.status).toBe(200);
    const [row] = await t.sql<{ project_id: string | null; project_label: string }[]>`select project_id, project_label from public.usage_rows where voice_id = 'v_base_walid' order by at desc limit 1`;
    expect(row).toEqual({ project_id: null, project_label: "Le dernier car, essai de voix" });

    const refused = await call(nour, "POST", "/voices/v_hedi/preview", { text: "Bonjour." });
    expect(refused.status).toBe(403);
    expect((await refused.json()).decision).toMatchObject({ allowed: false, reason_code: "LICENCE_REVOQUEE" });
    expect((await call(nour, "POST", "/voices/v_inconnue/preview", { text: "Bonjour." })).status).toBe(403);
    expect((await call(null, "POST", "/voices/v_base_walid/preview", { text: "Bonjour." })).status).toBe(401);
  });

});
