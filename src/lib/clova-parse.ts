// Turns a CLOVA OCR (receipt domain) response into the few fields we verify.
// Pure and defensive: OCR output is untrusted input and must never make an upload fail.
import type { OcrReceipt } from "./receipt-verify.ts";

/** Largest amount we accept (KRW). Anything above is an OCR misread, and would overflow the DB integer column. */
export const MAX_TOTAL = 1_000_000_000;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function dig(value: unknown, ...path: string[]): unknown {
  return path.reduce<unknown>((o, key) => (isObj(o) ? o[key] : undefined), value);
}

/** A strictly valid calendar date, as YYYY-MM-DD, or null. */
export function toIsoDate(year: number, month: number, day: number): string | null {
  if (![year, month, day].every(Number.isInteger) || year < 2000 || year > 2100) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls over invalid values (Feb 30 -> Mar 2), so compare the parts back.
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDate(node: unknown): string | null {
  const formatted = dig(node, "formatted");
  if (isObj(formatted)) {
    const iso = toIsoDate(Number(formatted.year), Number(formatted.month), Number(formatted.day));
    if (iso) return iso;
  }
  const text = dig(node, "text");
  if (typeof text !== "string") return null;

  const four = text.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (four) return toIsoDate(Number(four[1]), Number(four[2]), Number(four[3]));
  // Korean receipts often print yy-mm-dd. A time like "14:12:10" can also match, but the
  // verification step rejects dates outside the recent window.
  const two = text.match(/(\d{2})\D+(\d{1,2})\D+(\d{1,2})/);
  return two ? toIsoDate(2000 + Number(two[1]), Number(two[2]), Number(two[3])) : null;
}

/** Parses "55,000", "55000원", "₩55,000", 55000 or "55000.00" into whole won; null if unusable. */
export function parseAmount(value: unknown): number | null {
  let n: number;
  if (typeof value === "number") n = value;
  else if (typeof value === "string") {
    const cleaned = value.replace(/[,\s원₩]|KRW/gi, "");
    if (!/^\d+(\.\d+)?$/.test(cleaned)) return null; // rejects negatives, exponents, stray text
    n = Number(cleaned);
  } else return null;
  if (!Number.isFinite(n) || n <= 0 || n > MAX_TOTAL) return null;
  return Math.round(n);
}

function parseTotal(node: unknown): number | null {
  return parseAmount(dig(node, "formatted", "value")) ?? parseAmount(dig(node, "text"));
}

function parseText(node: unknown): string | null {
  const text = dig(node, "text");
  if (typeof text !== "string") return null;
  const value = text.replace(/\s+/g, " ").trim().slice(0, 200);
  return value || null;
}

/**
 * Returns the parsed receipt, or null when the response is unusable
 * (malformed, or CLOVA reports that it could not read the image).
 */
export function parseClovaResult(raw: unknown): OcrReceipt | null {
  const images = dig(raw, "images");
  const first = Array.isArray(images) ? images[0] : undefined;
  if (!isObj(first)) return null;

  const infer = first.inferResult;
  if (typeof infer === "string" && infer !== "SUCCESS") return null;

  const result = dig(first, "receipt", "result");
  if (!isObj(result)) return null;

  return {
    storeName: parseText(dig(result, "storeInfo", "name")),
    paidOn: parseDate(dig(result, "paymentInfo", "date")),
    total: parseTotal(dig(result, "totalPrice", "price")),
  };
}
