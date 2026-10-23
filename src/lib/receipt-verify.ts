// Pure matching logic between OCR output and a hospital. No imports on purpose
// so it can be unit tested with the plain Node test runner.

export type OcrReceipt = {
  storeName: string | null;
  paidOn: string | null; // YYYY-MM-DD
  total: number | null;
};

export type VerifyResult = {
  score: number; // name similarity 0..1
  passed: boolean;
  reasons: string[];
};

export const NAME_THRESHOLD = 0.6;
export const MAX_AGE_DAYS = 90;

const NOISE = /(주식회사|\(주\)|㈜|의료법인|의원|병원|클리닉|clinic|hospital)/gi;

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(NOISE, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function bigrams(s: string): Map<string, number> {
  const map = new Map<string, number>();
  const grams = s.length < 2 ? [s] : Array.from({ length: s.length - 1 }, (_, i) => s.slice(i, i + 2));
  for (const g of grams) map.set(g, (map.get(g) ?? 0) + 1);
  return map;
}

/** Sørensen–Dice coefficient on character bigrams, with a containment shortcut. */
export function nameSimilarity(a: string, b: string): number {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length >= 2 && y.length >= 2 && (x.includes(y) || y.includes(x))) return 0.9;
  const bx = bigrams(x);
  const by = bigrams(y);
  let overlap = 0;
  for (const [g, n] of bx) overlap += Math.min(n, by.get(g) ?? 0);
  const total = [...bx.values()].reduce((s, n) => s + n, 0) + [...by.values()].reduce((s, n) => s + n, 0);
  return total === 0 ? 0 : (2 * overlap) / total;
}

export function daysBetween(from: string, to: Date): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.floor((end - start) / 86_400_000);
}

export function verifyReceipt(
  ocr: OcrReceipt,
  hospitalName: string,
  now: Date = new Date(),
): VerifyResult {
  const reasons: string[] = [];
  const score = ocr.storeName ? nameSimilarity(ocr.storeName, hospitalName) : 0;
  if (!ocr.storeName) reasons.push("store_name_missing");
  else if (score < NAME_THRESHOLD) reasons.push("store_name_mismatch");

  if (!ocr.paidOn) reasons.push("date_missing");
  else {
    const age = daysBetween(ocr.paidOn, now);
    // allow one day of clock skew across time zones
    if (age < -1) reasons.push("date_in_future");
    else if (age > MAX_AGE_DAYS) reasons.push("date_too_old");
  }

  if (!ocr.total || ocr.total <= 0) reasons.push("total_missing");

  return { score: Math.round(score * 1000) / 1000, passed: reasons.length === 0, reasons };
}

export type ReceiptDecision = {
  status: "auto_approved" | "pending";
  reasons: string[];
  score: number | null;
};

/**
 * The outcome of the automatic check. Only a fully matching receipt is approved
 * automatically; everything else, including an OCR that is unavailable or failed,
 * goes to the manual queue.
 */
export function decideReceipt(
  parsed: OcrReceipt | null,
  hospitalName: string,
  now: Date = new Date(),
): ReceiptDecision {
  if (!parsed) return { status: "pending", reasons: ["ocr_unavailable"], score: null };
  const v = verifyReceipt(parsed, hospitalName, now);
  return { status: v.passed ? "auto_approved" : "pending", reasons: v.reasons, score: v.score };
}
