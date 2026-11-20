/**
 * Business rules of the creator journey from the UX Specification V2 (PDF).
 * Pure functions only, no UI and no store: they are unit-tested and shared by every screen.
 *
 * What is decided here:
 *  - an original voice is usable only after the applicable path is validated
 *    (living person: their consent; deceased person: family dossier + successful consistency check + human validation);
 *  - a licensed replacement voice is usable only after the owner accepted the project licence
 *    and, when the price is above 0, the payment is confirmed; a request expires after 72 hours;
 *  - transparency elements depend on the video format.
 */

export type LifeStatus = "a_renseigner" | "vivant" | "decede";
export type LivingStatus = "a_obtenir" | "en_attente" | "autorisee" | "refusee";
export type DossierStatus = "manquant" | "recu" | "analyse" | "correspondance" | "incoherence" | "verification" | "valide";
export type CheckOutcome = "correspondance" | "incoherence" | "verification";
export type VideoFormat = "film" | "podcast" | "reel";
export type ProjectStatus = "brouillon" | "analyse" | "attente_autorisation" | "generation" | "termine";
export type RequestStatus = "envoyee" | "acceptee" | "refusee" | "expiree";
export type PaymentStatus = "non_requis" | "en_attente" | "confirme" | "echoue";

export const EXPIRY_HOURS = 72;
export const EXPIRY_MS = EXPIRY_HOURS * 3600 * 1000;

export interface LivingConsent {
  status: LivingStatus;
  email: string;
  /** Whether the person already has a Voice Passport. The creator can never create it for them. */
  registered: boolean;
  token?: string;
  sentAt?: string;
  decidedAt?: string;
}

export interface FamilyCheck {
  outcome: CheckOutcome;
  extractedPerson: string;
  extractedRole: string;
  videoFinding: string;
  explanation: string;
  at: string;
  /** false when a real model read the document (its name in `provider`), checked by deterministic rules. */
  simulated: boolean;
  provider?: string;
}

export interface FamilyDossier {
  status: DossierStatus;
  deceasedName: string;
  declaredRole: string;
  reference?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileHash?: string;
  receivedAt?: string;
  check?: FamilyCheck;
  validatedAt?: string;
  validatedBy?: string;
  complementaryRequestedAt?: string;
}

export interface Character {
  key: string;
  proposedName: string;
  proposedDescription: string;
  name: string;
  description: string;
  confirmed: boolean;
  /** The creator intends to keep this person's original voice (requires the V2 authorization path). */
  useOriginal: boolean;
  lifeStatus: LifeStatus;
  living?: LivingConsent;
  dossier?: FamilyDossier;
}

export interface LicenseRequest {
  id: string;
  token: string;
  projectId: string;
  projectTitle: string;
  characterKey: string;
  characterName: string;
  voiceId: string;
  creator: string;
  message: string;
  price: number;
  sentAt: string;
  expiresAt: string;
  status: RequestStatus;
  decidedAt?: string;
  payment: PaymentStatus;
  paymentAt?: string;
  reference?: string;
}

export const LIFE_LABEL: Record<LifeStatus, string> = { a_renseigner: "À renseigner", vivant: "Vivante", decede: "Décédée" };
export const LIVING_LABEL: Record<LivingStatus, string> = { a_obtenir: "À obtenir", en_attente: "En attente", autorisee: "Autorisée", refusee: "Refusée" };
export const DOSSIER_LABEL: Record<DossierStatus, string> = {
  manquant: "Document manquant",
  recu: "Document reçu",
  analyse: "Analyse en cours",
  correspondance: "Correspondance détectée",
  incoherence: "Incohérence détectée",
  verification: "Vérification nécessaire",
  valide: "Dossier validé",
};
export const OUTCOME_LABEL: Record<CheckOutcome, string> = {
  correspondance: "Correspondance détectée",
  incoherence: "Incohérence détectée",
  verification: "Vérification nécessaire",
};
export const REQUEST_LABEL: Record<RequestStatus, string> = { envoyee: "Envoyée", acceptee: "Acceptée", refusee: "Refusée", expiree: "Expirée" };
export const PAYMENT_LABEL: Record<PaymentStatus, string> = { non_requis: "Gratuit", en_attente: "En attente", confirme: "Confirmé", echoue: "Échoué" };
export const PROJECT_LABEL: Record<ProjectStatus, string> = {
  brouillon: "Brouillon",
  analyse: "Analyse",
  attente_autorisation: "En attente d’autorisation",
  generation: "Génération",
  termine: "Terminé",
};
export const FORMAT_LABEL: Record<VideoFormat, string> = { film: "Film / vidéo longue", podcast: "Podcast vidéo", reel: "Reel / Short" };

/** Table « Format · AI Label · QR » of the specification, kept word for word where it is undecided. */
export function transparencyPolicy(format: VideoFormat): { label: string; qr: string; qrInVideo: boolean; pending: boolean } {
  if (format === "film") return { label: "Au début du contenu", qr: "À la fin", qrInVideo: true, pending: false };
  if (format === "podcast") return { label: "Au début, selon le support", qr: "À la fin", qrInVideo: true, pending: false };
  return { label: "Règle à confirmer", qr: "Non", qrInVideo: false, pending: true };
}

/** Effective request status: a request still « envoyée » after 72 hours is expired. */
export function requestStatus(r: Pick<LicenseRequest, "status" | "expiresAt">, now = new Date()): RequestStatus {
  if (r.status === "envoyee" && now.getTime() > new Date(r.expiresAt).getTime()) return "expiree";
  return r.status;
}

export function hoursLeft(r: Pick<LicenseRequest, "expiresAt">, now = new Date()): number {
  return Math.max(0, (new Date(r.expiresAt).getTime() - now.getTime()) / 3600000);
}

/** A licensed voice becomes usable only after acceptance and, if needed, confirmed payment. */
export function licenseUsable(r: LicenseRequest | undefined, now = new Date()): boolean {
  if (!r || requestStatus(r, now) !== "acceptee") return false;
  return r.price === 0 || r.payment === "confirme";
}

export type AuthState = "non_requise" | "a_renseigner" | "a_obtenir" | "en_attente" | "bloquee" | "autorisee";

/** Where a character stands on the original-voice authorization path. */
export function originalVoiceState(c: Character): AuthState {
  if (!c.useOriginal) return "non_requise";
  if (c.lifeStatus === "a_renseigner") return "a_renseigner";
  if (c.lifeStatus === "vivant") {
    const s = c.living?.status ?? "a_obtenir";
    if (s === "autorisee") return "autorisee";
    if (s === "refusee") return "bloquee";
    if (s === "en_attente") return "en_attente";
    return "a_obtenir";
  }
  const d = c.dossier?.status ?? "manquant";
  if (d === "valide") return "autorisee";
  if (d === "incoherence" || d === "verification") return "bloquee";
  if (d === "manquant") return "a_obtenir";
  return "en_attente";
}

export const originalAllowed = (c: Character) => originalVoiceState(c) === "autorisee";

/** A deceased person's dossier can be validated by the creator only after a successful consistency check. */
export const canValidateDossier = (d: FamilyDossier | undefined) => d?.status === "correspondance";

export function dossierReference(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `DF-2026-${String(h % 100000).padStart(5, "0")}`;
}

export function passportId(seed: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[h % alphabet.length];
    h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0;
  }
  return `S360-${out.slice(0, 4)}-${out.slice(4)}`;
}

export interface VoiceSlot {
  mode: "original" | "licensed" | "ai" | "none";
  usable: boolean;
  reason: string;
}

/**
 * Can this character be voiced in French right now?
 * kindOf tells whether a voice id is a licensed holder voice or a Sawti AI voice.
 */
export function voiceSlot(
  c: Character,
  voiceId: string | undefined,
  kindOf: (id: string) => "licensed" | "ai" | null,
  request: LicenseRequest | undefined,
  now = new Date(),
): VoiceSlot {
  if (c.useOriginal) {
    const st = originalVoiceState(c);
    if (st === "autorisee") return { mode: "original", usable: true, reason: "Voix originale autorisée" };
    return { mode: "original", usable: false, reason: "Voix originale bloquée tant que l’autorisation n’est pas validée" };
  }
  const kind = voiceId ? kindOf(voiceId) : null;
  if (!kind) return { mode: "none", usable: false, reason: "Aucune voix française attribuée" };
  if (kind === "ai") return { mode: "ai", usable: true, reason: "Voix générée par IA, sans titulaire" };
  if (!request) return { mode: "licensed", usable: false, reason: "Licence de projet à demander" };
  const st = requestStatus(request, now);
  if (st === "envoyee") return { mode: "licensed", usable: false, reason: "Demande envoyée, en attente de réponse" };
  if (st === "refusee") return { mode: "licensed", usable: false, reason: "Demande refusée : choisissez une autre voix" };
  if (st === "expiree") return { mode: "licensed", usable: false, reason: "Demande expirée après 72 h : choisissez une autre voix" };
  if (request.price > 0 && request.payment !== "confirme") return { mode: "licensed", usable: false, reason: request.payment === "echoue" ? "Paiement échoué" : "Paiement à confirmer" };
  return { mode: "licensed", usable: true, reason: "Licence de projet accordée" };
}

/** Project status as listed in the specification (§8). */
export function projectStatus(p: { analysing: boolean; generation: "idle" | "running" | "done"; blocked: boolean }): ProjectStatus {
  if (p.generation === "done") return "termine";
  if (p.generation === "running") return "generation";
  if (p.analysing) return "analyse";
  if (p.blocked) return "attente_autorisation";
  return "brouillon";
}

/** Simple keyword overlap used by the simulated consistency check (see mock/simulate.ts). */
export function keywords(text: string): string[] {
  const stop = new Set(["le", "la", "les", "de", "du", "des", "un", "une", "et", "en", "dans", "qui", "est", "a", "au", "aux", "sa", "son", "ses", "pour", "par", "sur", "avec", "l", "d"]);
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !stop.has(w));
}

/* ------------------------------------------------------------------ generation outcome */

/** What a generation run produced, line by line (the same counts on the server and in the browser). */
export interface GenTally {
  ok: number;
  refused: number;
  error: number;
  /** Lines kept in the authorised original voice: their French rendering needs voice cloning, not wired yet. */
  skipped: number;
  /** Reason codes of the refused lines, without duplicates (e.g. SIGNATURE_INVALIDE). */
  codes: string[];
}

type LineOutcome = { status: "pending" | "ok" | "refused" | "error" | "skipped"; decision?: { reason_code?: string } };

export function tallyOf(lines: (LineOutcome | undefined)[]): GenTally {
  const t: GenTally = { ok: 0, refused: 0, error: 0, skipped: 0, codes: [] };
  for (const g of lines) {
    if (!g) continue;
    const k = g.status === "pending" ? "error" : g.status;
    t[k]++;
    const code = g.decision?.reason_code;
    if (g.status === "refused" && code && !t.codes.includes(code)) t.codes.push(code);
  }
  return t;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** The lines that were not dubbed, in words: « 2 refusées par le moteur de règles (USAGE_INTERDIT), 1 en voix originale… ». */
function notDubbed(t: GenTally): string {
  const parts: string[] = [];
  if (t.refused) parts.push(`${plural(t.refused, "refusée", "refusées")} par le moteur de règles${t.codes.length ? ` (${t.codes.join(", ")})` : ""}`);
  if (t.error) parts.push(plural(t.error, "en erreur", "en erreur"));
  if (t.skipped) parts.push(`${plural(t.skipped, "gardée", "gardées")} en voix originale (clonage vocal non branché dans ce prototype)`);
  return parts.join(", ");
}

/**
 * A run where no line was dubbed is not a result: nothing is signed and the generation can be started again.
 * Returns the message to show, or null when at least one line was synthesised.
 */
export function nothingGenerated(t: GenTally): string | null {
  if (t.ok > 0) return null;
  const total = t.refused + t.error + t.skipped;
  if (total === 0) return "Aucune réplique n’a été doublée. Rien n’a été signé : relancez la génération.";
  return `Aucune réplique n’a été doublée : ${notDubbed(t)}. Rien n’a été signé : corrigez la cause puis relancez la génération.`;
}

/** For a finished run where some lines were not dubbed: the sentence to show; null when every line was dubbed. */
export function partialNote(t: GenTally): string | null {
  const missing = t.refused + t.error + t.skipped;
  if (missing === 0 || t.ok === 0) return null;
  return `${plural(t.ok, "réplique doublée", "répliques doublées")} sur ${t.ok + missing}. Non doublées en français : ${notDubbed(t)}.`;
}
