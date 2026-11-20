/**
 * Assembly of a project's Passeport 360° (pure: no store, no browser API).
 * draftPassport() is shared: the simulated store signs it with the demo key (buildPassport),
 * the server with its own seed (server/sign.ts, A8).
 */
import { voiceById } from "../core/catalog.js";
import { assemblePassport, signPassport, type Passport360 } from "../core/passport.js";
import type { Data, Project } from "./store";
import { FORMAT_LABEL, LIFE_LABEL, OUTCOME_LABEL, passportId, requestStatus, transparencyPolicy, type LicenseRequest } from "./workflow.js";


export function requestFor(s: Pick<Data, "requests">, pid: string, key: string, voiceId?: string): LicenseRequest | undefined {
  return [...s.requests].reverse().find((r) => r.projectId === pid && r.characterKey === key && (!voiceId || r.voiceId === voiceId));
}

type PassportData = Pick<Data, "validator" | "usage" | "licenses" | "journal" | "requests">;

/**
 * The passport signed in the browser (simulated mode). Without the server its link carries the whole
 * passport, too long for a readable QR: the MP4 gets the AI label but no QR, and the passport says so.
 */
export function buildPassport(s: PassportData, project: Project, when = new Date()): Passport360 {
  const draft = draftPassport(s, project, when);
  if (draft.doublage_ia && transparencyPolicy(project.format).qrInVideo) draft.doublage_ia.qr = "Non incrusté : sans serveur, le lien du passeport est partagé depuis le Passeport 360°";
  return signPassport(draft);
}

/** The passport before signature. */
export function draftPassport(s: PassportData, project: Project, when = new Date()): Passport360 {
  const name = (k: string) => project.characters[k]?.name ?? project.speakers[k]?.name ?? k;
  const keys = Object.keys(project.characters);
  const speakers = keys.map((k) => {
    const c = project.characters[k];
    if (c.useOriginal) return { personnage: name(k), voice_id: `original:${k}`, voiceName: `voix originale de ${name(k)}`, kind: "originale" };
    const vid = project.speakerVoices[k];
    const v = voiceById(vid);
    return { personnage: name(k), voice_id: vid, voiceName: v?.name ?? vid, kind: v?.kind ?? "consentie" };
  });
  const mine = s.usage.filter((u) => u.project.startsWith(project.title));
  const draft = assemblePassport(
    {
      title: project.title,
      validator: s.validator,
      referent: "Ahmed, référent éthique",
      segments: project.segments,
      speakers,
      licenses: s.licenses,
      journal: s.journal,
      generated: Object.values(project.gens).filter((g) => g.status === "ok").length,
      charactersSynthesized: mine.reduce((a, u) => a + u.chars, 0),
    },
    when,
  );
  const policy = transparencyPolicy(project.format);
  draft.voix = draft.voix.map((v, i) => {
    const k = keys[i];
    const c = project.characters[k];
    if (c?.useOriginal) return { ...v, nature: "Voix originale de l’intervenant", titulaire: name(k), licence: null };
    const r = requestFor(s, project.id, k, project.speakerVoices[k]);
    return r && requestStatus(r) === "acceptee"
      ? { ...v, nature: "Voix licenciée · générée par IA avec autorisation du titulaire", licence_projet: { reference: r.reference ?? r.id, statut: "accordée", tarif: r.price ? `${r.price} DT` : "gratuit" } }
      : { ...v, nature: v.nature.includes("base") ? "Voix générée par IA · voix de synthèse Sawti, n’imite personne" : v.nature };
  });
  draft.transparence.label = `Doublé avec l’IA · ${draft.voix.length} voix · validé par ${s.validator}`;
  // What really ran: the analysis models (back-end) and the voice engine's test mode.
  const real = project.pipeline?.simulated === false ? (project.pipeline.providers ?? {}) : null;
  const testAudio = Object.values(project.gens).some((g) => g.status === "ok" && g.mock);
  return {
    ...draft,
    identifiant: passportId(project.id),
    source: {
      nom: project.video?.name ?? `${project.title} (exemple)`,
      type: project.video?.url ? "lien externe" : project.video ? "fichier importé" : "exemple de démonstration",
      format: FORMAT_LABEL[project.format],
      langue_originale: "Derja tunisienne (ar-TN)",
      langue_cible: "Français (fr)",
      ...(project.video?.sha256 ? { empreinte_sha256: project.video.sha256 } : {}),
    },
    intervenants: keys.map((k) => {
      const c = project.characters[k];
      if (!c.useOriginal) return { personnage: name(k), voix_originale: false, statut_vie: "non requis", autorisation: "aucune : voix de remplacement", statut: "sans objet" };
      if (c.lifeStatus === "decede")
        return {
          personnage: name(k),
          voix_originale: true,
          statut_vie: LIFE_LABEL[c.lifeStatus],
          autorisation: "dossier familial",
          statut: c.dossier?.status === "valide" ? "validé" : "non validé",
          reference: c.dossier?.reference,
          controle_ia: c.dossier?.check ? `${OUTCOME_LABEL[c.dossier.check.outcome]} (contrôle de cohérence, ne certifie ni signature ni lien familial)` : undefined,
        };
      return { personnage: name(k), voix_originale: true, statut_vie: LIFE_LABEL[c.lifeStatus], autorisation: "consentement de la personne", statut: c.living?.status === "autorisee" ? "autorisée" : "non autorisée" };
    }),
    doublage_ia: {
      transcription: real ? `Derja → texte : ${real.asr ?? "IA"} (réel)` : "Derja → texte, IA (simulée dans le prototype)",
      traduction: real ? `LLM 1 : ${real.llm1 ?? "IA"} · LLM 2 : ${real.llm2 ?? "règles"} (réels)` : "LLM 1 traduit, LLM 2 vérifie (simulés dans le prototype)",
      verification: "Vérificateur de fidélité : chiffres et négations (règles)",
      validation_humaine: `${project.segments.filter((x) => x.validated).length} / ${project.segments.length} répliques approuvées par ${s.validator}`,
      synthese: `ElevenLabs eleven_multilingual_v2, après décision du moteur de règles${testAudio ? " · mode test : audio silencieux" : ""}`,
      label_ia: policy.label,
      qr: policy.qr,
    },
  };
}
