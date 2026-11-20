/// <reference types="vite/client" />
import { decodePassport, encodePassport, type Passport360 } from "./passport";

/**
 * The exported PDF carries the signed passport as a printed code between two markers,
 * so the public page can read it back from the file and check the signature in the browser.
 */
export const PDF_CODE_START = "SAWTI360:";
export const PDF_CODE_END = ":FIN";

export function passportPdfCode(p: Passport360): string {
  return `${PDF_CODE_START}${encodePassport(p)}${PDF_CODE_END}`;
}

export type PdfReadResult = { passport: Passport360 } | { id: string } | null;

/** Reads a Passport 360° PDF: the embedded code first, otherwise the passport identifier. */
export async function readPassportPdf(file: File): Promise<PdfReadResult> {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    text += content.items.map((it) => ("str" in it ? it.str : "")).join("");
  }
  const flat = text.replace(/\s+/g, "");
  const m = flat.match(/SAWTI360:([A-Za-z0-9_-]+):FIN/);
  if (m) return { passport: decodePassport(m[1]) };
  const id = text.match(/S360-[A-Z0-9]{4}-[A-Z0-9]{4}/);
  return id ? { id: id[0] } : null;
}
