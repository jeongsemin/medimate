import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { charCount, parseReviewInput } from "../src/lib/review-input.ts";

const now = new Date("2026-10-19T03:00:00Z");
const body = "가".repeat(100);

const valid: Record<string, string> = {
  lang: "ko",
  hospitalId: "h1",
  receiptId: "r1",
  rating: "5",
  body,
  visitMonth: "2026-10",
  treatment: "레이저 토닝",
  english: "fluent",
  interpreter: "on",
  consentPublish: "on",
  consentOwn: "on",
};
const parse = (patch: Record<string, string | undefined> = {}) => {
  const data = { ...valid, ...patch };
  return parseReviewInput((k) => data[k] ?? null, now);
};

describe("parseReviewInput", () => {
  it("accepts a complete form and normalizes the month to the first day", () => {
    const r = parse();
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.visitDate, "2026-10-01");
      assert.equal(r.value.english, "fluent");
      assert.equal(r.value.interpreter, true);
      assert.equal(r.value.director, false);
    }
  });
  it("requires both consents, with a dedicated reason", () => {
    assert.deepEqual(parse({ consentOwn: undefined }), { ok: false, reason: "consent" });
    assert.deepEqual(parse({ consentPublish: undefined }), { ok: false, reason: "consent" });
  });
  it("enforces body length in code points (100–2000)", () => {
    assert.equal(parse({ body: "가".repeat(99) }).ok, false);
    assert.equal(parse({ body: "가".repeat(2000) }).ok, true);
    assert.equal(parse({ body: "가".repeat(2001) }).ok, false);
    assert.equal(parse({ body: "😀".repeat(100) }).ok, true); // 100 code points, 200 UTF-16 units
    assert.equal(charCount("😀😀"), 2);
  });
  it("rejects bad rating, treatment, english level and months", () => {
    assert.equal(parse({ rating: "0" }).ok, false);
    assert.equal(parse({ rating: "6" }).ok, false);
    assert.equal(parse({ rating: "4.5" }).ok, false);
    assert.equal(parse({ treatment: "  " }).ok, false);
    assert.equal(parse({ treatment: "a".repeat(101) }).ok, false);
    assert.equal(parse({ english: "native" }).ok, false);
    assert.equal(parse({ visitMonth: "2026-13" }).ok, false);
    assert.equal(parse({ visitMonth: "2026-11" }).ok, false); // future month
    assert.equal(parse({ visitMonth: "2026-10-05" }).ok, false);
  });
  it("defaults the English level to none", () => {
    const r = parse({ english: undefined });
    assert.equal(r.ok && r.value.english, "none");
  });
});
