// Validation of the review form. Pure and dependency-free so it can be unit tested.

export const BODY_MIN = 100;
export const BODY_MAX = 2000;
export const TREATMENT_MAX = 100;

export type EnglishLevel = "none" | "basic" | "fluent";

export type ReviewInput = {
  lang: string;
  hospitalId: string;
  receiptId: string;
  rating: number;
  body: string;
  visitDate: string; // YYYY-MM-01
  treatment: string;
  english: EnglishLevel;
  interpreter: boolean;
  director: boolean;
  priceExplained: boolean;
  noUpselling: boolean;
};

export type ParseResult = { ok: true; value: ReviewInput } | { ok: false; reason: "invalid" | "consent" };

const LEVELS: readonly string[] = ["none", "basic", "fluent"];

/** Length in code points, matching Postgres char_length for the DB check. */
export const charCount = (s: string) => [...s].length;

export function parseReviewInput(
  get: (key: string) => string | null,
  now: Date = new Date(),
): ParseResult {
  const text = (key: string) => (get(key) ?? "").trim();
  const flag = (key: string) => get(key) === "on";

  // consent is checked first so the user gets a specific message
  if (!flag("consentPublish") || !flag("consentOwn")) return { ok: false, reason: "consent" };

  const rating = Number(text("rating"));
  const body = text("body");
  const treatment = text("treatment");
  const english = text("english") || "none";
  const month = text("visitMonth");

  const monthOk = /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && month <= now.toISOString().slice(0, 7);

  if (
    !text("lang") ||
    !text("hospitalId") ||
    !text("receiptId") ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    charCount(body) < BODY_MIN ||
    charCount(body) > BODY_MAX ||
    charCount(treatment) < 1 ||
    charCount(treatment) > TREATMENT_MAX ||
    !LEVELS.includes(english) ||
    !monthOk
  ) {
    return { ok: false, reason: "invalid" };
  }

  return {
    ok: true,
    value: {
      lang: text("lang"),
      hospitalId: text("hospitalId"),
      receiptId: text("receiptId"),
      rating,
      body,
      visitDate: `${month}-01`,
      treatment,
      english: english as EnglishLevel,
      interpreter: flag("interpreter"),
      director: flag("director"),
      priceExplained: flag("priceExplained"),
      noUpselling: flag("noUpselling"),
    },
  };
}
