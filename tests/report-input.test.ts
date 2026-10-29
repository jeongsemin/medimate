import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DETAIL_MAX, groupReports, parseReportInput } from "../src/lib/report-input.ts";

const ID = "11111111-2222-4333-8444-555555555555";
const form = (o: Record<string, string>) => (k: string) => o[k] ?? null;

describe("parseReportInput", () => {
  it("accepts a known reason with or without an explanation", () => {
    assert.deepEqual(parseReportInput(form({ reviewId: ID, reason: "spam" })), { reviewId: ID, reason: "spam", detail: null });
    assert.deepEqual(parseReportInput(form({ reviewId: ID, reason: "abuse", detail: "  rude \n words  " })), {
      reviewId: ID,
      reason: "abuse",
      detail: "rude words",
    });
  });
  it("requires an explanation for 'other'", () => {
    assert.equal(parseReportInput(form({ reviewId: ID, reason: "other" })), null);
    assert.equal(parseReportInput(form({ reviewId: ID, reason: "other", detail: "   " })), null);
    assert.equal(parseReportInput(form({ reviewId: ID, reason: "other", detail: "ad for another clinic" }))?.reason, "other");
  });
  it("rejects an unknown reason or a malformed review id", () => {
    assert.equal(parseReportInput(form({ reviewId: ID, reason: "hate" })), null);
    assert.equal(parseReportInput(form({ reviewId: ID })), null);
    assert.equal(parseReportInput(form({ reviewId: "not-a-uuid", reason: "spam" })), null);
    assert.equal(parseReportInput(form({ reason: "spam" })), null);
  });
  it("measures the explanation by code point and rejects, rather than cuts, an overlong one", () => {
    const ok = "가".repeat(DETAIL_MAX);
    assert.equal(parseReportInput(form({ reviewId: ID, reason: "spam", detail: ok }))?.detail, ok);
    assert.equal(parseReportInput(form({ reviewId: ID, reason: "spam", detail: ok + "가" })), null);
    const emoji = "😀".repeat(DETAIL_MAX); // 2 UTF-16 units each, but one character
    assert.equal(parseReportInput(form({ reviewId: ID, reason: "spam", detail: emoji }))?.detail, emoji);
  });
});

describe("groupReports", () => {
  const row = (review_id: string, reason: string, created_at: string, detail: string | null = null) => ({ review_id, reason, detail, created_at });

  it("groups by review with counts per reason and the written details", () => {
    const [g] = groupReports([
      row("a", "spam", "2026-10-01T00:00:00Z"),
      row("a", "spam", "2026-10-02T00:00:00Z", "ad"),
      row("a", "abuse", "2026-10-03T00:00:00Z", "rude"),
    ]);
    assert.equal(g.count, 3);
    assert.deepEqual(g.reasons, { spam: 2, abuse: 1 });
    assert.deepEqual(g.details, ["ad", "rude"]);
    assert.equal(g.latestAt, "2026-10-03T00:00:00Z");
  });
  it("puts the most reported review first, then the most recent", () => {
    const order = groupReports([
      row("old", "spam", "2026-10-01T00:00:00Z"),
      row("new", "spam", "2026-10-05T00:00:00Z"),
      row("busy", "spam", "2026-10-02T00:00:00Z"),
      row("busy", "abuse", "2026-10-03T00:00:00Z"),
    ]).map((g) => g.reviewId);
    assert.deepEqual(order, ["busy", "new", "old"]);
  });
  it("ignores an unknown reason in the breakdown but still counts the report", () => {
    const [g] = groupReports([row("a", "mystery", "2026-10-01T00:00:00Z")]);
    assert.equal(g.count, 1);
    assert.deepEqual(g.reasons, {});
  });
  it("returns nothing for no reports", () => {
    assert.deepEqual(groupReports([]), []);
  });
});
