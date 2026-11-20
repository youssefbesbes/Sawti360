import { describe, expect, it } from "vitest";
import { simulateFamilyCheck } from "../mock/simulate";
import { EXPIRY_MS, licenseUsable, nothingGenerated, originalVoiceState, partialNote, requestStatus, tallyOf, transparencyPolicy, voiceSlot, type Character, type LicenseRequest } from "./workflow";

const NOW = new Date("2026-11-19T12:00:00Z");
const char = (over: Partial<Character> = {}): Character => ({
  key: "a",
  proposedName: "Intervenant A",
  proposedDescription: "",
  name: "Jeddi",
  description: "Grand-père, raconte ses souvenirs du souk",
  confirmed: true,
  useOriginal: true,
  lifeStatus: "a_renseigner",
  ...over,
});
const req = (over: Partial<LicenseRequest> = {}): LicenseRequest => ({
  id: "r",
  token: "t",
  projectId: "p",
  projectTitle: "P",
  characterKey: "a",
  characterName: "A",
  voiceId: "v_lina",
  creator: "c",
  message: "",
  price: 120,
  sentAt: new Date(NOW.getTime() - 3600000).toISOString(),
  expiresAt: new Date(NOW.getTime() - 3600000 + EXPIRY_MS).toISOString(),
  status: "envoyee",
  payment: "en_attente",
  ...over,
});
const kindOf = (id: string) => (id.startsWith("v_base") ? ("ai" as const) : id === "v_lina" ? ("licensed" as const) : null);

describe("voix originale (spécification V2)", () => {
  it("exige le statut de vie avant tout", () => expect(originalVoiceState(char())).toBe("a_renseigner"));
  it("bloque une personne vivante sans consentement", () => {
    expect(originalVoiceState(char({ lifeStatus: "vivant", living: { status: "en_attente", email: "x@y.z", registered: false } }))).toBe("en_attente");
    expect(originalVoiceState(char({ lifeStatus: "vivant", living: { status: "refusee", email: "x@y.z", registered: true } }))).toBe("bloquee");
  });
  it("autorise une personne vivante qui consent", () => expect(originalVoiceState(char({ lifeStatus: "vivant", living: { status: "autorisee", email: "x@y.z", registered: true } }))).toBe("autorisee"));
  it("bloque un dossier familial incohérent ou incertain", () => {
    for (const status of ["incoherence", "verification"] as const) expect(originalVoiceState(char({ lifeStatus: "decede", dossier: { status, deceasedName: "M", declaredRole: "r" } }))).toBe("bloquee");
  });
  it("une correspondance ne suffit pas : la validation humaine est requise", () => {
    expect(originalVoiceState(char({ lifeStatus: "decede", dossier: { status: "correspondance", deceasedName: "M", declaredRole: "r" } }))).toBe("en_attente");
    expect(originalVoiceState(char({ lifeStatus: "decede", dossier: { status: "valide", deceasedName: "M", declaredRole: "r" } }))).toBe("autorisee");
  });
  it("une voix de remplacement ne demande pas d’autorisation originale", () => expect(originalVoiceState(char({ useOriginal: false }))).toBe("non_requise"));
});

describe("licence de projet", () => {
  it("expire après 72 h sans réponse", () => {
    expect(requestStatus(req(), NOW)).toBe("envoyee");
    expect(requestStatus(req(), new Date(NOW.getTime() + EXPIRY_MS))).toBe("expiree");
  });
  it("une réponse donnée n’expire pas", () => expect(requestStatus(req({ status: "acceptee" }), new Date(NOW.getTime() + 10 * EXPIRY_MS))).toBe("acceptee"));
  it("une voix payante n’est utilisable qu’après paiement confirmé", () => {
    expect(licenseUsable(req({ status: "acceptee" }), NOW)).toBe(false);
    expect(licenseUsable(req({ status: "acceptee", payment: "confirme" }), NOW)).toBe(true);
    expect(licenseUsable(req({ status: "acceptee", price: 0, payment: "non_requis" }), NOW)).toBe(true);
  });
  it("attribution : voix IA immédiate, voix licenciée sous conditions", () => {
    const c = char({ useOriginal: false });
    expect(voiceSlot(c, "v_base_nadia", kindOf, undefined, NOW).usable).toBe(true);
    expect(voiceSlot(c, "v_lina", kindOf, undefined, NOW).usable).toBe(false);
    expect(voiceSlot(c, "v_lina", kindOf, req({ status: "refusee" }), NOW).reason).toMatch(/refusée/);
    expect(voiceSlot(c, "v_lina", kindOf, req({ status: "acceptee", payment: "confirme" }), NOW).usable).toBe(true);
  });
});

describe("transparence par format", () => {
  it("film : label au début, QR à la fin ; reel : règle à confirmer, pas de QR", () => {
    expect(transparencyPolicy("film")).toMatchObject({ label: "Au début du contenu", qr: "À la fin", qrInVideo: true });
    expect(transparencyPolicy("reel")).toMatchObject({ pending: true, qrInVideo: false });
  });
});

describe("contrôle de cohérence simulé : trois résultats seulement", () => {
  const jeddi = char({ lifeStatus: "decede" });
  const narr = char({ key: "b", name: "Narratrice", description: "Petite-fille, présente l’épisode" });
  const d = (declaredRole: string) => ({ status: "analyse" as const, deceasedName: "Mohamed B.", declaredRole });
  it("correspondance quand le rôle décrit le personnage", () => expect(simulateFamilyCheck(d("le grand-père qui raconte le souk"), jeddi, [narr], 2, "00:05").outcome).toBe("correspondance"));
  it("incohérence quand le rôle décrit un autre intervenant", () => expect(simulateFamilyCheck(d("la petite-fille qui présente"), jeddi, [narr], 2, "00:05").outcome).toBe("incoherence"));
  it("vérification nécessaire quand le rôle est trop général", () => expect(simulateFamilyCheck(d("un intervenant"), jeddi, [narr], 2, "00:05").outcome).toBe("verification"));
});

describe("Résultat d'une génération", () => {
  const ok = { status: "ok" as const };
  const refused = (code: string) => ({ status: "refused" as const, decision: { reason_code: code } });
  const skipped = { status: "skipped" as const };

  it("toutes les répliques refusées : pas de résultat, cause et codes dans le message", () => {
    const t = tallyOf([refused("SIGNATURE_INVALIDE"), refused("SIGNATURE_INVALIDE"), undefined]);
    expect(t).toEqual({ ok: 0, refused: 2, error: 0, skipped: 0, codes: ["SIGNATURE_INVALIDE"] });
    expect(nothingGenerated(t)).toBe("Aucune réplique n’a été doublée : 2 refusées par le moteur de règles (SIGNATURE_INVALIDE). Rien n’a été signé : corrigez la cause puis relancez la génération.");
    expect(partialNote(t)).toBeNull();
  });
  it("seulement des voix originales (clonage non branché) : pas de résultat non plus", () => {
    expect(nothingGenerated(tallyOf([skipped]))).toMatch(/1 gardée en voix originale/);
  });
  it("au moins une réplique doublée : un résultat, partiel s'il en manque", () => {
    const t = tallyOf([ok, ok, skipped, { status: "pending" }]);
    expect(nothingGenerated(t)).toBeNull();
    expect(partialNote(t)).toBe("2 répliques doublées sur 4. Non doublées en français : 1 en erreur, 1 gardée en voix originale (clonage vocal non branché dans ce prototype).");
    expect(partialNote(tallyOf([ok, ok]))).toBeNull();
  });
});
