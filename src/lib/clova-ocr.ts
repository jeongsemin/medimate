import "server-only";
import { parseClovaResult } from "./clova-parse";
import type { OcrReceipt } from "./receipt-verify";

export function ocrConfigured(): boolean {
  return Boolean(process.env.CLOVA_OCR_INVOKE_URL && process.env.CLOVA_OCR_SECRET);
}

/**
 * Calls CLOVA OCR (receipt domain). Returns null when OCR is not configured, the call
 * fails, or the response is unusable; the caller then sends the receipt to manual review.
 */
export async function readReceipt(
  image: Buffer,
  format: "jpg" | "png",
): Promise<{ parsed: OcrReceipt; raw: unknown } | null> {
  if (!ocrConfigured()) return null;
  try {
    const res = await fetch(process.env.CLOVA_OCR_INVOKE_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OCR-SECRET": process.env.CLOVA_OCR_SECRET!,
      },
      body: JSON.stringify({
        version: "V2",
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
        lang: "ko",
        images: [{ format, name: "receipt", data: image.toString("base64") }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const raw = await res.json();
    const parsed = parseClovaResult(raw);
    return parsed ? { parsed, raw } : null;
  } catch {
    return null;
  }
}
