import type { Emotion } from "../core/emotion";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appendEntry } from "../core/audit";
import { sha256Hex } from "../core/canonical";
import { PROJECT, VOICES, voiceById } from "../core/catalog";
import { costOf, PLANS, split, type PlanId } from "../core/credits";
import { signLicense } from "../core/crypto";
import { runGate } from "../core/gate";
import type { Passport360 } from "../core/passport";
import { REASONS_FR } from "../core/rules";
import type { AuditEntry, Decision, Segment, Theme, Use, VoiceLicense } from "../core/types";
import { profileOf, type DemoAccount, type VoiceProfile } from "../mock/registry";
import { GEN_STAGES, reviewSegment, simulateFamilyCheck, wait, type Review } from "../mock/simulate";
import { BACKEND } from "../lib/backend";
import * as remote from "./remote";
import { emptyData, type RemoteState } from "./remote/state";
import { audioKey, audioUrls } from "./audio";
import { forgetLineAudio, keepLineAudio } from "../media/local";
import { buildPassport, requestFor } from "./passportBuild";
import { DEMO_ID, emptyGen, seed } from "./seed";
import {
  dossierReference,
  EXPIRY_MS,
  FORMAT_LABEL,
  nothingGenerated,
  OUTCOME_LABEL,
  originalVoiceState,
  tallyOf,
  requestStatus,
  voiceSlot,
  type Character,
  type FamilyDossier,
  type LicenseRequest,
  type LifeStatus,
  type VideoFormat,
} from "./workflow";

export type Persona = "creator" | "owner";
export const OWNER_VOICE = "v_lina";
export const CREATOR = { name: "Nour Films", role: "Studio de création · Tunis" };
export const OWNER = { name: "Lina M.", role: "Comédienne · titulaire de voix" };
export { DEMO_ID };

export interface GenState {
  status: "pending" | "ok" | "refused" | "error" | "skipped";
  decision?: Decision;
  message?: string;
  chars?: number;
  cost?: number;
  ownerShare?: number;
  ms?: number;
  bytes?: number;
  mock?: boolean;
  at?: string;
  by?: "client" | "server";
  /** Back-end (C2): length of the audio against its place on screen, and the rate used to fit it. */
  fit?: { seconds: number; slot: number; speed?: number; tooLong: boolean };
}

export interface UsageRow {
  id: string;
  at: string;
  project: string;
  creator: string;
  voice_id: string;
  chars: number;
  cost: number;
  owner: number;
  platform: number;
  ms?: number;
  bytes?: number;
}

export interface Notice {
  id: string;
  to: string;
  space: Persona;
  at: string;
  tone: "ok" | "red" | "warn" | "plain";
  title: string;
  body: string;
  read: boolean;
  link?: string;
}

export type Privacy = "publique" | "inedite";

export interface VideoMeta {
  name: string;
  size: number;
  type: string;
  duration: number;
  width: number;
  height: number;
  privacy: Privacy;
  poster?: string;
  /** SHA-256 of the source file, computed locally while importing. */
  sha256?: string;
  url?: string;
}

export interface Pipeline {
  status: "running" | "done" | "error";
  step: number;
  /** false once a real analysis ran; the models used are in `providers` (labels « Réel »). */
  simulated: boolean;
  providers?: Record<string, string>;
  /** Back-end mode: the analysis task being followed, and its error message if it failed. */
  jobId?: string;
  error?: string;
  /** Sentence of the running step (« Transcription de 14 segments… »). */
  detail?: string;
}

export interface Speaker {
  name: string;
  gender: "femme" | "homme" | "inconnu";
}

export interface Generation {
  status: "idle" | "running" | "done";
  stage: number;
  synthDone: number;
  synthTotal: number;
  startedAt?: string;
  finishedAt?: string;
  etaMs?: number;
  /** Back-end mode: the server's task, followed again after a reload. */
  jobId?: string;
  /** Back-end mode: why the last run stopped (the generation can be started again). */
  error?: string;
}

export type StepKey = "analyse" | "personnages" | "autorisations" | "voix" | "traduction" | "timeline" | "generation" | "resultat";

export interface Project {
  id: string;
  accountId: string;
  title: string;
  subtitle: string;
  kind: "demo" | "video";
  format: VideoFormat;
  createdAt: string;
  updatedAt: string;
  video?: VideoMeta;
  pipeline?: Pipeline;
  segments: Segment[];
  speakers: Record<string, Speaker>;
  characters: Record<string, Character>;
  speakerVoices: Record<string, string>;
  /** First-model translation, kept to tell « modifiée » from « générée ». */
  proposals: Record<string, string>;
  reviews: Record<string, Review>;
  use: Use;
  gens: Record<string, GenState>;
  generation: Generation;
  example: boolean;
}

export interface OwnedVoice {
  voiceId: string;
  profile: VoiceProfile;
  createdAt: string;
  published: boolean;
  sample?: { duration: number; peak: number; rms: number; recordedAt: string };
}

export interface Session {
  accountId: string;
}

export interface Data {
  session: Session | null;
  accounts: DemoAccount[];
  persona: Persona;
  plan: PlanId;
  spent: number;
  licenses: VoiceLicense[];
  projects: Record<string, Project>;
  order: string[];
  currentId: string;
  usage: UsageRow[];
  notifications: Notice[];
  journal: AuditEntry[];
  passports: Record<string, Passport360>;
  requests: LicenseRequest[];
  ownedVoices: Record<string, OwnedVoice>;
  validator: string;
  /** Back-end mode: published voice profiles of the library, and the journal's head (GET /api/bootstrap). */
  profiles?: VoiceProfile[];
  journalHead?: { count: number; head: string };
}

export interface NewProjectInput {
  meta: VideoMeta;
  title: string;
  format: VideoFormat;
}

interface Actions {
  login: (accountId: string) => void | Promise<void>;
  signup: (name: string, email: string, password?: string) => void | Promise<"ok" | "confirm">;
  logout: () => void | Promise<void>;
  setPersona: (p: Persona) => void;
  setPlan: (p: PlanId) => void | Promise<void>;
  openProject: (id: string) => void;
  createVideoProject: (input: NewProjectInput) => string | Promise<string>;
  patchProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setUse: (u: Use) => void;
  setSpeakerVoice: (speaker: string, voiceId: string) => void | Promise<void>;
  editTranslation: (id: string, text: string) => void;
  setValidated: (id: string, v: boolean) => void | Promise<void>;
  generate: (id: string) => Promise<void>;
  tryVoice: (voiceId: string, text: string) => Promise<GenState & { url?: string }>;
  updateOwnLicense: (patch: Pick<VoiceLicense, "allowed_uses" | "forbidden_themes">) => void;
  revoke: (licenseId: string) => void;
  reinstate: (licenseId: string) => void;
  exportPassport: (projectId?: string) => Passport360 | Promise<Passport360 | undefined>;
  logExport: (kind: string, detail: Record<string, unknown>) => void;
  markRead: () => void;
  reset: () => void;

  /* characters and authorizations */
  updateCharacter: (pid: string, key: string, patch: Partial<Character>) => void | Promise<void>;
  confirmCharacter: (pid: string, key: string, name: string, description: string) => void | Promise<void>;
  /** Corrections of the speaker detection: who says a line, a missed speaker, one person split in two. */
  setLineSpeaker: (pid: string, segId: string, key: string) => void;
  /** The feeling a line is spoken with; its old audio is dropped. */
  setLineEmotion: (pid: string, segId: string, emotion: Emotion) => void;
  addCharacter: (pid: string) => void | Promise<void>;
  mergeCharacter: (pid: string, key: string, into: string) => void | Promise<void>;
  setUseOriginal: (pid: string, key: string, v: boolean) => void | Promise<void>;
  setLifeStatus: (pid: string, key: string, s: LifeStatus) => void | Promise<void>;
  sendConsent: (pid: string, key: string, email: string, registered: boolean) => string | Promise<string>;
  respondConsent: (token: string, accept: boolean) => void;
  /** `file`: the signed document itself (back-end mode sends it to the private bucket). */
  uploadDossier: (pid: string, key: string, d: Pick<FamilyDossier, "deceasedName" | "declaredRole" | "fileName" | "fileSize" | "fileType" | "fileHash"> & { file?: File }) => Promise<void>;
  validateDossier: (pid: string, key: string) => void | Promise<void>;
  requestComplementary: (pid: string, key: string) => void | Promise<void>;
  resetDossier: (pid: string, key: string) => void | Promise<void>;

  /* voice licensing */
  requestLicense: (pid: string, key: string, voiceId: string, message: string) => LicenseRequest | Promise<LicenseRequest>;
  /** `token`: the link's token; in back-end mode, the request id when the owner answers connected. */
  respondLicense: (token: string, accept: boolean) => void | Promise<unknown>;
  payLicense: (id: string, success: boolean) => void | Promise<void>;
  expireRequest: (id: string) => void | Promise<void>;
  assignVoice: (pid: string, key: string, voiceId: string) => void | Promise<void>;

  /* translation, generation */
  applySuggestion: (pid: string, segId: string) => void;
  reviewAll: (pid: string) => void;
  startGeneration: (pid: string) => Promise<void>;

  /* voice owner */
  createOwnVoice: (profile: Omit<VoiceProfile, "voiceId" | "accountId">, sample: OwnedVoice["sample"], audioUrl?: string) => void | Promise<void>;
  updateProfile: (patch: Partial<VoiceProfile>) => void;
}

export type Store = Data & Actions & { server: RemoteState };

export { audioKey, audioUrls } from "./audio";
/** Voice samples recorded by owners: memory only, never persisted. */
export const sampleUrls = new Map<string, string>();

const id = () => Math.random().toString(36).slice(2, 10);
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

function safeStorage(): Storage {
  try {
    const k = "__sawti_probe__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (key) => mem.get(key) ?? null,
      setItem: (key, value) => void mem.set(key, value),
      removeItem: (key) => void mem.delete(key),
      clear: () => mem.clear(),
      key: (i) => [...mem.keys()][i] ?? null,
      get length() {
        return mem.size;
      },
    };
  }
}

export const kindOf = (voiceId: string): "licensed" | "ai" | null => {
  const v = voiceById(voiceId);
  if (!v) return null;
  return v.kind === "base" ? "ai" : "licensed";
};

export { requestFor } from "./passportBuild";

/* ------------------------------------------------------------------ selectors */

export const accountOf = (s: Pick<Data, "session" | "accounts">) => s.accounts.find((a) => a.id === s.session?.accountId) ?? null;
export const balanceOf = (s: Pick<Data, "plan" | "spent">) => Math.max(0, PLANS[s.plan].monthly - s.spent);
export const earningsOf = (s: Pick<Data, "usage">, voiceId: string) => s.usage.filter((u) => u.voice_id === voiceId).reduce((a, u) => a + u.owner, 0);
export const currentProject = (s: Pick<Data, "projects" | "currentId">): Project => s.projects[s.currentId] ?? s.projects[DEMO_ID];

export function slotsOf(s: Pick<Data, "requests">, p: Project, now = new Date()) {
  return Object.fromEntries(
    Object.values(p.characters).map((c) => [c.key, voiceSlot(c, p.speakerVoices[c.key], kindOf, requestFor(s, p.id, c.key, p.speakerVoices[c.key]), now)]),
  );
}

export function statusOf(s: Pick<Data, "requests">, p: Project) {
  const analysing = p.pipeline?.status === "running";
  const slots = slotsOf(s, p);
  const blocked = Object.values(p.characters).some((c) => {
    const st = originalVoiceState(c);
    return st === "en_attente" || st === "bloquee" || st === "a_obtenir" || st === "a_renseigner";
  }) || Object.values(slots).some((sl) => sl.mode === "licensed" && !sl.usable);
  if (p.generation.status === "done") return "termine" as const;
  if (p.generation.status === "running") return "generation" as const;
  if (analysing) return "analyse" as const;
  if (blocked) return "attente_autorisation" as const;
  return "brouillon" as const;
}

/* ------------------------------------------------------------------ store */

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const me = () => accountOf(get())?.name ?? CREATOR.name;
      const meId = () => get().session?.accountId ?? "nour";
      const log = (actor: string, action: string, payload: unknown, decisionCode = "") =>
        set((s) => ({ journal: appendEntry(s.journal, actor, action, payload, decisionCode) }));
      const notify = (n: Omit<Notice, "id" | "at" | "read">) =>
        set((s) => ({ notifications: [{ ...n, id: id(), at: new Date().toISOString(), read: false }, ...s.notifications] }));
      const restrictions = () => {
        const s = get();
        return {
          revoked: s.licenses.filter((l) => l.status === "revoked").map((l) => l.license_id),
          extra_themes: [...new Set(s.licenses.flatMap((l) => l.forbidden_themes))] as Theme[],
        };
      };
      const patch = (pid: string, fn: (p: Project) => Partial<Project>) =>
        set((s) => {
          const p = s.projects[pid];
          return p ? { projects: { ...s.projects, [pid]: { ...p, ...fn(p), updatedAt: new Date().toISOString() } } } : {};
        });
      const patchChar = (pid: string, key: string, fn: (c: Character) => Partial<Character>) =>
        patch(pid, (p) => (p.characters[key] ? { characters: { ...p.characters, [key]: { ...p.characters[key], ...fn(p.characters[key]) } } } : {}));
      const patchCurrent = (fn: (p: Project) => Partial<Project>) => patch(currentProject(get()).id, fn);

      /** Gate in the browser, then the same gate again on the server, then payment in jetons. */
      async function synthesize(voiceId: string, text: string, humanValidated: boolean, label: string, project = currentProject(get())): Promise<GenState & { url?: string }> {
        const s = get();
        const cost = costOf(text);
        const gate = runGate(
          { voice_id: voiceId, text, use: project.use, language: "fr", project_id: PROJECT.id, requested_by: me(), human_validated: humanValidated },
          s.licenses,
        );
        if (!gate.decision.allowed) {
          log(me(), "GENERATION_REFUSEE", { voice_id: voiceId, text_hash: sha256Hex(text), code: gate.decision.reason_code }, gate.decision.reason_code);
          if (gate.decision.reason_code === "THEME_INTERDIT_PAR_TITULAIRE" && voiceId === OWNER_VOICE) {
            notify({ to: "lina", space: "owner", tone: "red", title: "Tentative bloquée sur votre voix", body: `${me()} · ${gate.decision.detail ?? ""} · aucun audio généré` });
          }
          return { status: "refused", decision: gate.decision, chars: cost, by: "client" };
        }
        if (cost > balanceOf(s)) return { status: "error", decision: gate.decision, message: `Crédits insuffisants : ${cost} jetons nécessaires.`, chars: cost };
        const t0 = performance.now();
        let res: Response;
        try {
          res = await fetch("/api/tts", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ voice_id: voiceId, text, use: project.use, language: "fr", human_validated: humanValidated, ...restrictions() }),
          });
        } catch {
          return { status: "error", decision: gate.decision, message: "Serveur injoignable.", chars: cost };
        }
        const ms = Math.round(performance.now() - t0);
        if (res.status === 403) {
          const body = await res.json();
          log(me(), "GENERATION_REFUSEE", { voice_id: voiceId, text_hash: sha256Hex(text), code: body.decision.reason_code, par: "serveur" }, body.decision.reason_code);
          return { status: "refused", decision: body.decision, chars: cost, by: "server" };
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { status: "error", decision: gate.decision, message: body.message ?? `Erreur ${res.status}`, chars: cost, ms };
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const lic = gate.license!;
        const parts = split(cost, lic.owner_share);
        const row: UsageRow = { id: id(), at: new Date().toISOString(), project: `${project.title}, ${label}`, creator: me(), voice_id: voiceId, chars: cost, cost, owner: parts.owner, platform: parts.platform, ms, bytes: blob.size };
        set((st) => ({ spent: st.spent + cost, usage: [row, ...st.usage] }));
        log(me(), "GENERATION_AUTORISEE", { voice_id: voiceId, license_id: lic.license_id, text_hash: sha256Hex(text), jetons: cost, titulaire: parts.owner }, "OK");
        if (lic.owner_share > 0 && voiceId === OWNER_VOICE) {
          notify({ to: "lina", space: "owner", tone: "ok", title: "Votre voix a été utilisée", body: `${me()} · ${project.title} · ${cost} caractères · +${parts.owner} jetons` });
        }
        return {
          status: "ok", decision: gate.decision, chars: cost, cost, ownerShare: parts.owner, ms, bytes: blob.size,
          mock: res.headers.get("x-sawti-mock") === "1", at: new Date().toISOString(), by: "server", url,
        };
      }

      const generateIn = async (pid: string, sid: string) => {
        const project = get().projects[pid];
        const seg = project?.segments.find((x) => x.id === sid);
        if (!project || !seg) return;
        const setGen = (g: GenState) => patch(pid, (p) => ({ gens: { ...p.gens, [sid]: g } }));
        setGen({ status: "pending" });
        const { url, ...result } = await synthesize(project.speakerVoices[seg.speaker], seg.translation, seg.validated, `réplique ${sid.replace(/^s/, "")}`, project);
        const key = audioKey(pid, sid);
        const old = audioUrls.get(key);
        if (old) URL.revokeObjectURL(old);
        if (url) audioUrls.set(key, url);
        else audioUrls.delete(key);
        // An already-public video keeps its synthesized lines across a reload (MP4 export); an inédite keeps nothing.
        if (url && project.video?.privacy === "publique") void fetch(url).then((r) => r.blob()).then((b) => keepLineAudio(key, b), () => undefined);
        else void forgetLineAudio(pid, sid);
        setGen(result);
      };

      return {
        ...(BACKEND ? emptyData() : seed()),
        server: { status: BACKEND ? "booting" : "off" },
        login: (accountId) => {
          if (BACKEND) return remote.session.demoLogin(set, get, accountId);
          set({ session: { accountId }, persona: "creator" });
          log(accountOf(get())?.name ?? accountId, "CONNEXION", { compte: accountId }, "DEMO");
        },
        signup: (name, email, password) => {
          if (BACKEND) return remote.session.signUp(set, get, name, email, password ?? "");
          const acc: DemoAccount = { id: `u_${id()}`, name, email, org: "Compte de démonstration", initials: name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "U" };
          set((s) => ({ accounts: [...s.accounts, acc], session: { accountId: acc.id }, persona: "creator" }));
          log(name, "COMPTE_CREE", { email_hash: sha256Hex(email) }, "DEMO");
        },
        logout: () => (BACKEND ? remote.session.logout(set) : void set({ session: null })),
        setPersona: (persona) => set({ persona }),
        setPlan: (plan) => (BACKEND ? remote.licensing.setPlan(set, get, plan) : void set({ plan })),
        openProject: (pid) => set((s) => (s.projects[pid] ? { currentId: pid } : {})),
        createVideoProject: ({ meta, title, format }) => {
          if (BACKEND) return remote.projects.createVideoProject(set, { meta, title, format });
          const pid = `v_${id()}`;
          const project: Project = {
            id: pid,
            accountId: meId(),
            title: title.trim() || meta.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Vidéo",
            subtitle: `${FORMAT_LABEL[format]} · ${meta.privacy === "publique" ? "déjà publique" : "inédite"}`,
            kind: "video",
            format,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            video: meta,
            pipeline: { status: "running", step: 0, simulated: true },
            segments: [],
            speakers: {},
            characters: {},
            speakerVoices: {},
            proposals: {},
            reviews: {},
            use: format === "film" ? "doublage_film" : "doublage_video_en_ligne",
            gens: {},
            generation: emptyGen(),
            example: false,
          };
          set((s) => ({ projects: { ...s.projects, [pid]: project }, order: [pid, ...s.order], currentId: pid }));
          log(me(), "VIDEO_IMPORTEE", { nom: meta.name, taille: meta.size, duree: meta.duration, empreinte: meta.sha256 ?? null, confidentialite: meta.privacy }, meta.privacy === "publique" ? "PUBLIQUE" : "INEDITE");
          return pid;
        },
        patchProject: (pid, p) => (BACKEND ? remote.projects.patchProject(set, get, pid, p) : patch(pid, () => p)),
        deleteProject: (pid) =>
          BACKEND ? remote.projects.deleteProject(set, get, pid) : set((s) => {
            if (s.projects[pid]?.example) return {};
            const { [pid]: _gone, ...rest } = s.projects;
            return { projects: rest, order: s.order.filter((x) => x !== pid), currentId: s.currentId === pid ? DEMO_ID : s.currentId };
          }),
        setUse: (use) => (BACKEND ? remote.projects.setUse(set, get, use) : patchCurrent(() => ({ use }))),
        setSpeakerVoice: (speaker, voiceId) =>
          BACKEND ? remote.characters.setSpeakerVoice(set, get, speaker, voiceId) : void patchCurrent((p) => ({ speakerVoices: { ...p.speakerVoices, [speaker]: voiceId } })),
        editTranslation: (sid, text) =>
          BACKEND ? remote.projects.editTranslation(set, get, sid, text) : patchCurrent((p) => ({ segments: p.segments.map((x) => (x.id === sid ? { ...x, translation: text, validated: x.translation === text ? x.validated : false } : x)) })),
        setValidated: (sid, v) => {
          if (BACKEND) return remote.projects.setValidated(set, get, sid, v);
          const seg = currentProject(get()).segments.find((x) => x.id === sid);
          patchCurrent((p) => ({ segments: p.segments.map((x) => (x.id === sid ? { ...x, validated: v } : x)) }));
          if (seg) log(get().validator, v ? "TEXTE_VALIDE" : "VALIDATION_RETIREE", { segment: sid, text_hash: sha256Hex(seg.translation) }, v ? "VALIDE" : "");
        },
        generate: (sid) => (BACKEND ? remote.generation.generateLine(set, get, get().currentId, sid) : generateIn(currentProject(get()).id, sid)),
        tryVoice: (voiceId, text) => (BACKEND ? remote.generation.tryVoice(set, get, voiceId, text) : synthesize(voiceId, text, true, "essai de voix")),
        updateOwnLicense: (p) => {
          if (BACKEND) return void remote.owner.updateRules(set, get, p);
          set((s) => ({ licenses: s.licenses.map((l) => (l.voice_id === OWNER_VOICE ? signLicense({ ...l, ...p }) : l)) }));
          const lic = get().licenses.find((l) => l.voice_id === OWNER_VOICE)!;
          log(OWNER.name, "PASSEPORT_MIS_A_JOUR", { license_id: lic.license_id, usages: lic.allowed_uses, themes: lic.forbidden_themes, signature: lic.signature }, "SIGNE");
        },
        revoke: (licenseId) => {
          if (BACKEND) return void remote.owner.revoke(set, get, licenseId);
          set((s) => ({ licenses: s.licenses.map((l) => (l.license_id === licenseId ? { ...l, status: "revoked", revoked_at: new Date().toISOString() } : l)) }));
          const lic = get().licenses.find((l) => l.license_id === licenseId)!;
          log(lic.holder_name, "LICENCE_REVOQUEE", { license_id: licenseId }, "REVOQUEE");
          notify({ to: "nour", space: "creator", tone: "red", title: `${lic.holder_name} a révoqué sa licence`, body: "Les prochaines générations avec cette voix seront refusées. L’audio déjà livré reste tel quel." });
        },
        reinstate: (licenseId) => {
          if (BACKEND) return void remote.owner.reinstate(set, get, licenseId);
          set((s) => ({ licenses: s.licenses.map((l) => (l.license_id === licenseId ? signLicense({ ...l, status: "active", revoked_at: null }) : l)) }));
          const lic = get().licenses.find((l) => l.license_id === licenseId)!;
          log(lic.holder_name, "LICENCE_RETABLIE", { license_id: licenseId, signature: lic.signature }, "SIGNE");
        },
        exportPassport: (projectId) => {
          if (BACKEND) return remote.passports.exportPassport(set, get, projectId ?? get().currentId);
          const s = get();
          const project = projectId ? s.projects[projectId] : currentProject(s);
          const signed = buildPassport(s, project);
          set((st) => ({
            passports: { ...st.passports, [project.id]: signed },
            journal: appendEntry(st.journal, st.validator, "PASSEPORT_EXPORTE", { projet: project.id, signature: signed.signature?.valeur }, "SIGNE"),
          }));
          return signed;
        },
        logExport: (kind, detail) => (BACKEND ? remote.journal.logExport(set, get, kind, detail) : log(get().validator, "EXPORT", { type: kind, ...detail }, "OK")),
        markRead: () => (BACKEND ? void remote.notifications.markRead(set, get) : set((s) => ({ notifications: s.notifications.map((n) => (n.to === meId() && n.space === s.persona ? { ...n, read: true } : n)) }))),
        reset: () => {
          if (BACKEND) return;
          audioUrls.forEach((u) => URL.revokeObjectURL(u));
          audioUrls.clear();
          const session = get().session;
          set({ ...seed(), session });
        },

        /* ---------------------------------------------- characters & authorizations */
        updateCharacter: (pid, key, p) => (BACKEND ? remote.characters.updateCharacter(set, pid, key, p) : void patchChar(pid, key, () => p)),
        confirmCharacter: (pid, key, name, description) => {
          if (BACKEND) return remote.characters.confirmCharacter(set, pid, key, name, description);
          patchChar(pid, key, () => ({ name: name.trim(), description: description.trim(), confirmed: true }));
          patch(pid, (p) => ({ speakers: { ...p.speakers, [key]: { ...(p.speakers[key] ?? { gender: "inconnu" }), name: name.trim() } } }));
          log(me(), "PERSONNAGE_CONFIRME", { projet: pid, personnage: key, nom: name.trim() }, "HUMAIN");
        },
        setLineSpeaker: (pid, segId, key) => {
          const p = get().projects[pid];
          if (!p) return;
          const seg = p.segments.find((s) => s.id === segId);
          if (!seg || seg.speaker === key) return;
          const segments = p.segments.map((s) => (s.id === segId ? { ...s, speaker: key } : s));
          if (BACKEND) return remote.projects.patchProject(set, get, pid, { segments });
          const { [segId]: _old, ...gens } = p.gens;
          patch(pid, () => ({ segments, gens }));
          log(me(), "REPLIQUE_REATTRIBUEE", { projet: pid, segment: segId, de: seg.speaker, a: key }, "HUMAIN");
        },
        setLineEmotion: (pid, segId, emotion) => {
          const p = get().projects[pid];
          const seg = p?.segments.find((s) => s.id === segId);
          if (!p || !seg || (seg.emotion ?? "neutre") === emotion) return;
          const segments = p.segments.map((s) => (s.id === segId ? { ...s, emotion: emotion === "neutre" ? undefined : emotion } : s));
          if (BACKEND) return remote.projects.patchProject(set, get, pid, { segments });
          const { [segId]: _old, ...gens } = p.gens;
          patch(pid, () => ({ segments, gens }));
        },
        addCharacter: (pid) => {
          if (BACKEND) return remote.characters.addCharacter(set, pid);
          const p = get().projects[pid];
          if (!p) return;
          const taken = new Set([...Object.keys(p.characters), ...Object.keys(p.speakers)]);
          let n = 1;
          while (taken.has(`p${n}`)) n += 1;
          const key = `p${n}`;
          const names = new Set(Object.values(p.characters).map((c) => c.name));
          let i = Object.keys(p.characters).length;
          while (names.has(`Intervenant ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i] ?? i + 1}`)) i += 1;
          const name = `Intervenant ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i] ?? i + 1}`;
          const ch: Character = { key, proposedName: name, proposedDescription: "Ajouté par le créateur : une voix que l’analyse n’avait pas séparée.", name, description: "", confirmed: false, useOriginal: false, lifeStatus: "a_renseigner" };
          patch(pid, (x) => ({ characters: { ...x.characters, [key]: ch }, speakers: { ...x.speakers, [key]: { name, gender: "inconnu" } } }));
          log(me(), "PERSONNAGE_AJOUTE", { projet: pid, personnage: key, nom: name }, "HUMAIN");
        },
        mergeCharacter: (pid, key, into) => {
          if (BACKEND) return remote.characters.mergeCharacter(set, pid, key, into);
          const p = get().projects[pid];
          if (!p?.characters[key] || !p.characters[into] || key === into) return;
          const moved = new Set(p.segments.filter((s) => s.speaker === key).map((s) => s.id));
          const { [key]: _c, ...characters } = p.characters;
          const { [key]: _s, ...speakers } = p.speakers;
          const { [key]: _v, ...speakerVoices } = p.speakerVoices;
          const gens = Object.fromEntries(Object.entries(p.gens).filter(([id]) => !moved.has(id)));
          patch(pid, (x) => ({ characters, speakers, speakerVoices, gens, segments: x.segments.map((s) => (s.speaker === key ? { ...s, speaker: into } : s)) }));
          log(me(), "PERSONNAGES_FUSIONNES", { projet: pid, personnage: key, dans: into, repliques: moved.size }, "HUMAIN");
        },
        setUseOriginal: (pid, key, v) => (BACKEND ? remote.characters.setUseOriginal(set, pid, key, v) : void patchChar(pid, key, () => ({ useOriginal: v }))),
        setLifeStatus: (pid, key, st) => {
          if (BACKEND) return remote.characters.setLifeStatus(set, pid, key, st);
          patchChar(pid, key, (c) => ({
            lifeStatus: st,
            living: st === "vivant" ? (c.living ?? { status: "a_obtenir", email: "", registered: false }) : c.living,
            dossier: st === "decede" ? (c.dossier ?? { status: "manquant", deceasedName: "", declaredRole: "" }) : c.dossier,
          }));
          log(me(), "STATUT_DE_VIE_RENSEIGNE", { projet: pid, personnage: key, statut: st }, st.toUpperCase());
        },
        sendConsent: (pid, key, email, registered) => {
          if (BACKEND) return remote.consents.sendConsent(set, pid, key, email, registered);
          const t = token();
          patchChar(pid, key, () => ({ living: { status: "en_attente", email: email.trim(), registered, token: t, sentAt: new Date().toISOString() } }));
          log(me(), "CONSENTEMENT_DEMANDE", { projet: pid, personnage: key, email_hash: sha256Hex(email.trim().toLowerCase()) }, "EN_ATTENTE");
          return t;
        },
        respondConsent: (t, accept) => {
          const s = get();
          for (const p of Object.values(s.projects)) {
            const c = Object.values(p.characters).find((x) => x.living?.token === t);
            if (!c || !c.living) continue;
            patchChar(p.id, c.key, (x) => ({ living: { ...x.living!, status: accept ? "autorisee" : "refusee", decidedAt: new Date().toISOString(), registered: true } }));
            log(`titulaire (${c.name})`, accept ? "CONSENTEMENT_ACCORDE" : "CONSENTEMENT_REFUSE", { projet: p.id, personnage: c.key }, accept ? "AUTORISEE" : "REFUSEE");
            notify({
              to: p.accountId, space: "creator", tone: accept ? "ok" : "red",
              title: accept ? `${c.name} a donné son consentement` : `${c.name} a refusé l’utilisation de sa voix`,
              body: accept ? `${p.title} · la voix originale peut être utilisée.` : `${p.title} · la voix originale reste bloquée. Choisissez une voix de remplacement.`,
              link: `/projet/${p.id}/autorisations`,
            });
            return;
          }
        },
        uploadDossier: async (pid, key, d) => {
          if (BACKEND) return remote.dossiers.uploadDossier(set, pid, key, d);
          const reference = dossierReference(`${pid}/${key}/${d.fileHash}`);
          patchChar(pid, key, (c) => ({ dossier: { ...(c.dossier ?? { status: "manquant", deceasedName: "", declaredRole: "" }), ...d, reference, status: "recu", receivedAt: new Date().toISOString(), check: undefined, validatedAt: undefined, complementaryRequestedAt: undefined } }));
          log(me(), "DOSSIER_FAMILIAL_RECU", { projet: pid, personnage: key, empreinte: d.fileHash, reference }, "RECU");
          const p0 = get().projects[pid];
          notify({ to: p0.accountId, space: "creator", tone: "plain", title: "Document familial reçu", body: `${p0.title} · ${p0.characters[key].name} · contrôle de cohérence lancé.`, link: `/projet/${pid}/autorisations` });
          await wait(700);
          patchChar(pid, key, (c) => ({ dossier: { ...c.dossier!, status: "analyse" } }));
          await wait(2600);
          const p = get().projects[pid];
          const target = p.characters[key];
          if (!target?.dossier) return;
          const lines = p.segments.filter((x) => x.speaker === key);
          const first = lines[0] ? new Date(lines[0].start * 1000).toISOString().slice(14, 19) : "–";
          const check = simulateFamilyCheck(target.dossier, target, Object.values(p.characters).filter((c) => c.key !== key), lines.length, first);
          patchChar(pid, key, (c) => ({ dossier: { ...c.dossier!, status: check.outcome, check } }));
          log("contrôle IA (simulé)", "CONTROLE_COHERENCE", { projet: pid, personnage: key, resultat: check.outcome }, check.outcome.toUpperCase());
          notify({
            to: p.accountId, space: "creator", tone: check.outcome === "correspondance" ? "ok" : "warn",
            title: check.outcome === "correspondance" ? "Analyse familiale terminée : correspondance détectée" : `Autorisation non validée : ${OUTCOME_LABEL[check.outcome].toLowerCase()}`,
            body: `${p.title} · ${target.name}.`,
            link: `/projet/${pid}/autorisations`,
          });
        },
        validateDossier: (pid, key) => {
          if (BACKEND) return remote.dossiers.validateDossier(set, pid, key);
          patchChar(pid, key, (c) => (c.dossier?.status === "correspondance" ? { dossier: { ...c.dossier, status: "valide", validatedAt: new Date().toISOString(), validatedBy: me() } } : {}));
          log(me(), "DOSSIER_FAMILIAL_VALIDE", { projet: pid, personnage: key }, "VALIDE");
        },
        requestComplementary: (pid, key) => {
          if (BACKEND) return remote.dossiers.requestComplementary(set, pid, key);
          patchChar(pid, key, (c) => ({ dossier: { ...c.dossier!, complementaryRequestedAt: new Date().toISOString() } }));
          log(me(), "VERIFICATION_COMPLEMENTAIRE_DEMANDEE", { projet: pid, personnage: key }, "EN_ATTENTE");
        },
        resetDossier: (pid, key) =>
          BACKEND ? remote.dossiers.resetDossier(set, pid, key) : void patchChar(pid, key, (c) => ({ dossier: { status: "manquant", deceasedName: c.dossier?.deceasedName ?? "", declaredRole: c.dossier?.declaredRole ?? "" } })),

        /* ---------------------------------------------- licensing */
        requestLicense: (pid, key, voiceId, message) => {
          if (BACKEND) return remote.licensing.requestLicense(set, pid, key, voiceId, message);
          const p = get().projects[pid];
          const prof = profileOf(voiceId);
          const now = new Date();
          const r: LicenseRequest = {
            id: `r_${id()}`, token: token(), projectId: pid, projectTitle: p.title, characterKey: key, characterName: p.characters[key]?.name ?? key,
            voiceId, creator: me(), message, price: prof?.price ?? 0, sentAt: now.toISOString(), expiresAt: new Date(now.getTime() + EXPIRY_MS).toISOString(),
            status: "envoyee", payment: (prof?.price ?? 0) > 0 ? "en_attente" : "non_requis",
          };
          set((s) => ({ requests: [...s.requests, r] }));
          patch(pid, (pp) => ({ speakerVoices: { ...pp.speakerVoices, [key]: voiceId }, characters: { ...pp.characters, [key]: { ...pp.characters[key], useOriginal: false } } }));
          log(me(), "LICENCE_DEMANDEE", { projet: pid, personnage: key, voix: voiceId }, "ENVOYEE");
          if (prof) notify({ to: prof.accountId, space: "owner", tone: "plain", title: "Nouvelle demande de licence", body: `${me()} · ${p.title} · expire dans 72 h.`, link: "/proprietaire/demandes" });
          return r;
        },
        respondLicense: (t, accept) => {
          if (BACKEND) return remote.licensing.respondLicense(set, t, accept);
          const r = get().requests.find((x) => x.token === t);
          if (!r || requestStatus(r) !== "envoyee") return;
          const ref = `LP-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
          set((s) => ({ requests: s.requests.map((x) => (x.token === t ? { ...x, status: accept ? "acceptee" : "refusee", decidedAt: new Date().toISOString(), reference: accept ? ref : undefined } : x)) }));
          const prof = profileOf(r.voiceId);
          log(prof?.publicName ?? r.voiceId, accept ? "LICENCE_ACCEPTEE" : "LICENCE_REFUSEE", { demande: r.id, projet: r.projectId }, accept ? "ACCEPTEE" : "REFUSEE");
          const p = get().projects[r.projectId];
          notify({
            to: p?.accountId ?? "nour", space: "creator", tone: accept ? "ok" : "red",
            title: accept ? `${prof?.publicName} a accepté votre demande` : `${prof?.publicName} a refusé votre demande`,
            body: accept ? `${r.projectTitle} · ${r.characterName}. ${r.price ? `Paiement de ${r.price} DT à confirmer.` : "Licence gratuite."}` : `${r.projectTitle} · choisissez une autre voix ou une voix générée par IA.`,
            link: `/projet/${r.projectId}/voix`,
          });
        },
        payLicense: (rid, success) => {
          if (BACKEND) return remote.licensing.payLicense(set, get, rid, success);
          set((s) => ({ requests: s.requests.map((x) => (x.id === rid ? { ...x, payment: success ? "confirme" : "echoue", paymentAt: new Date().toISOString() } : x)) }));
          const r = get().requests.find((x) => x.id === rid)!;
          log(me(), success ? "PAIEMENT_CONFIRME" : "PAIEMENT_ECHOUE", { demande: rid, montant: r.price, simule: true }, success ? "CONFIRME" : "ECHOUE");
          notify({ to: meId(), space: "creator", tone: success ? "ok" : "red", title: success ? "Paiement confirmé (simulé)" : "Paiement échoué (simulé)", body: `${r.projectTitle} · ${profileOf(r.voiceId)?.publicName} · ${r.price} DT`, link: "/paiements" });
        },
        expireRequest: (rid) => {
          if (BACKEND) return remote.licensing.expireRequest(set, rid);
          set((s) => ({ requests: s.requests.map((x) => (x.id === rid ? { ...x, sentAt: new Date(Date.now() - EXPIRY_MS - 60000).toISOString(), expiresAt: new Date(Date.now() - 60000).toISOString() } : x)) }));
          const r = get().requests.find((x) => x.id === rid)!;
          notify({ to: meId(), space: "creator", tone: "warn", title: "Demande expirée après 72 h", body: `${r.projectTitle} · ${profileOf(r.voiceId)?.publicName}. Choisissez une autre voix ou une voix IA.`, link: `/projet/${r.projectId}/voix` });
        },
        assignVoice: (pid, key, voiceId) => {
          if (BACKEND) return remote.characters.assignVoice(set, pid, key, voiceId);
          patch(pid, (p) => ({ speakerVoices: { ...p.speakerVoices, [key]: voiceId }, characters: { ...p.characters, [key]: { ...p.characters[key], useOriginal: false } } }));
          log(me(), "VOIX_ATTRIBUEE", { projet: pid, personnage: key, voix: voiceId }, kindOf(voiceId) === "ai" ? "IA" : "LICENCE");
        },

        /* ---------------------------------------------- translation & generation */
        applySuggestion: (pid, segId) => {
          if (BACKEND) return void remote.review.applySuggestion(set, get, pid, segId);
          const p = get().projects[pid];
          const sug = p?.reviews[segId]?.suggestion;
          if (!sug) return;
          patch(pid, (pp) => ({
            segments: pp.segments.map((x) => (x.id === segId ? { ...x, translation: sug, validated: false } : x)),
            reviews: { ...pp.reviews, [segId]: { verdict: "ok", note: "Correction du LLM 2 appliquée : relisez-la avant d’approuver.", simulated: true } },
          }));
        },
        reviewAll: (pid) => (BACKEND ? void remote.review.reviewAll(set, pid) : patch(pid, (p) => ({ reviews: Object.fromEntries(p.segments.map((x) => [x.id, reviewSegment(x)])) }))),
        startGeneration: async (pid) => {
          if (BACKEND) return remote.generation.startGeneration(set, get, pid);
          const p0 = get().projects[pid];
          if (!p0 || p0.generation.status === "running") return;
          const slots = slotsOf(get(), p0);
          const lines = p0.segments.filter((x) => x.validated);
          const simMs = GEN_STAGES.reduce((a, st) => a + ("ms" in st ? st.ms : 0), 0);
          patch(pid, () => ({ generation: { status: "running", stage: 0, synthDone: 0, synthTotal: lines.length, startedAt: new Date().toISOString(), etaMs: simMs + lines.length * 900 } }));
          log(me(), "GENERATION_LANCEE", { projet: pid, repliques: lines.length }, "EN_COURS");
          for (const seg of lines) {
            const slot = slots[seg.speaker];
            if (slot?.mode === "original") {
              patch(pid, (p) => ({ gens: { ...p.gens, [seg.id]: { status: "skipped", message: "Voix originale autorisée : son rendu demande le service de clonage vocal, non branché dans ce prototype." } } }));
            } else {
              await generateIn(pid, seg.id);
            }
            patch(pid, (p) => ({ generation: { ...p.generation, synthDone: p.generation.synthDone + 1, etaMs: Math.max(0, (p.generation.etaMs ?? 0) - 900) } }));
          }
          // No line dubbed: not a result. Nothing is signed and the generation can be started again.
          const tally = tallyOf(lines.map((s) => get().projects[pid]?.gens[s.id]));
          const failed = nothingGenerated(tally);
          if (failed) {
            patch(pid, (p) => ({ generation: { ...p.generation, status: "idle", etaMs: 0, error: failed } }));
            log(me(), "GENERATION_SANS_RESULTAT", { projet: pid, ok: tally.ok, refusees: tally.refused, erreurs: tally.error, voix_originale: tally.skipped }, "AUCUNE_REPLIQUE");
            const p = get().projects[pid];
            notify({ to: p.accountId, space: "creator", tone: "warn", title: "Aucune réplique doublée", body: `${p.title} · ${failed}`, link: `/projet/${pid}/generation` });
            return;
          }
          for (let i = 1; i < GEN_STAGES.length; i++) {
            patch(pid, (p) => ({ generation: { ...p.generation, stage: i } }));
            const st = GEN_STAGES[i];
            const ms = "ms" in st ? st.ms : 1000;
            await wait(ms);
            patch(pid, (p) => ({ generation: { ...p.generation, etaMs: Math.max(0, (p.generation.etaMs ?? 0) - ms) } }));
          }
          patch(pid, (p) => ({ generation: { ...p.generation, status: "done", stage: GEN_STAGES.length, finishedAt: new Date().toISOString(), etaMs: 0 } }));
          get().exportPassport(pid);
          const p = get().projects[pid];
          notify({ to: p.accountId, space: "creator", tone: "ok", title: "Rendu prêt", body: `${p.title} · résultat et Passeport 360° disponibles.`, link: `/projet/${pid}/resultat` });
        },

        /* ---------------------------------------------- voice owner */
        createOwnVoice: (profile, sample, audioUrl) => {
          if (BACKEND) return remote.owner.createOwnVoice(set, get, profile, sample, audioUrl);
          const acc = accountOf(get());
          if (!acc) return;
          const voiceId = `v_user_${acc.id}`;
          set((s) => ({ ownedVoices: { ...s.ownedVoices, [acc.id]: { voiceId, profile: { ...profile, voiceId, accountId: acc.id }, createdAt: new Date().toISOString(), published: true, sample } } }));
          log(acc.name, "PASSEPORT_DE_VOIX_CREE", { voix: voiceId, echantillon_s: sample?.duration ?? 0 }, "CREE");
        },
        updateProfile: (p) => {
          if (BACKEND) return void remote.owner.updateProfile(set, get, p);
          const acc = accountOf(get());
          if (!acc) return;
          set((s) => {
            const ov = s.ownedVoices[acc.id];
            return ov ? { ownedVoices: { ...s.ownedVoices, [acc.id]: { ...ov, profile: { ...ov.profile, ...p } } } } : {};
          });
          log(acc.name, "PROFIL_PUBLIC_MIS_A_JOUR", p, "OK");
        },
      };
    },
    {
      name: BACKEND ? "sawti360-backend" : "sawti360-demo",
      version: 3,
      storage: createJSONStorage(safeStorage),
      migrate: () => (BACKEND ? emptyData() : seed()) as unknown as Store,
      partialize: (s) => {
        if (BACKEND) return { persona: s.persona, currentId: s.currentId } as unknown as Store;
        const projects = Object.fromEntries(
          Object.entries(s.projects).map(([pid, p]) => {
            const gens = Object.fromEntries(
              Object.entries(p.gens)
                .filter(([, g]) => g.status !== "pending")
                .map(([k, g]) => [k, g.status === "ok" && !p.example ? { ...g, message: "Audio non conservé après rechargement." } : g]),
            );
            const generation = p.generation.status === "running" ? emptyGen() : p.generation;
            return [pid, { ...p, gens, generation }];
          }),
        );
        return { ...s, projects } as unknown as Store;
      },
    },
  ),
);

/** Profiles of every voice in the library: catalogue holders plus voices created by demo accounts. */
export function allProfiles(s: Pick<Data, "ownedVoices"> & Partial<Pick<Data, "profiles">>): VoiceProfile[] {
  if (BACKEND && s.profiles) return s.profiles;
  const own = Object.values(s.ownedVoices).map((o) => o.profile);
  const ids = new Set(own.map((p) => p.voiceId));
  return [...own, ...VOICES.filter((v) => v.kind === "consentie" && !ids.has(v.voice_id)).map((v) => profileOf(v.voice_id)).filter((x): x is VoiceProfile => Boolean(x))];
}

export { REASONS_FR };
