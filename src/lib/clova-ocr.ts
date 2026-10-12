import "server-only";
import type { OcrReceipt } from "./receipt-verify";

type ClovaText = { text?: string; formatted?: Record<string, string | number> };

export function ocrConfigured(): boolean {
  return Boolean(process.env.CLOVA_OCR_INVOKE_URL && process.env.CLOVA_OCR_SECRET);
}

/** Calls CLOVA OCR (receipt domain). Returns null if OCR is not configured or fails. */
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
    const image0 = raw?.images?.[0];
    if (image0?.inferResult && image0.inferResult !== "SUCCESS") return null;
    const result = image0?.receipt?.result;

    const storeName: ClovaText | undefined = result?.storeInfo?.name;
    const date: ClovaText | undefined = result?.paymentInfo?.date;
    const price: ClovaText | undefined = result?.totalPrice?.price;

    return { parsed: { storeName: storeName?.text?.trim() || null, paidOn: toIsoDate(date), total: toAmount(price) }, raw };
  } catch {
    return null;
  }
}

function toIsoDate(date?: ClovaText): string | null {
  const f = date?.formatted;
  if (f?.year && f?.month && f?.day) {
    return `${String(f.year).padStart(4, "0")}-${String(f.month).padStart(2, "0")}-${String(f.day).padStart(2, "0")}`;
  }
  const m = date?.text?.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null;
}

function toAmount(price?: ClovaText): number | null {
  const v = price?.formatted?.value ?? price?.text?.replace(/[^\d]/g, "");
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
