// Nickname validation. Pure so it can be unit tested.

export const NICKNAME_MAX = 30;

const codePoints = (s: string) => [...s].length;

/** Trims and validates a public nickname; returns null when invalid. */
export function parseNickname(raw: string | null | undefined): string | null {
  // collapse inner whitespace so "  Jamie   K. " becomes "Jamie K."
  const value = (raw ?? "").replace(/\s+/g, " ").trim();
  // reject control characters (they could break layouts or logs)
  if (/[\p{Cc}\p{Cf}]/u.test(value)) return null;
  const n = codePoints(value);
  return n >= 1 && n <= NICKNAME_MAX ? value : null;
}
