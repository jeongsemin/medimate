import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { daysBetween, decideReceipt, nameSimilarity, verifyReceipt } from "../src/lib/receipt-verify.ts";

const now = new Date("2026-10-12T03:00:00Z");

describe("nameSimilarity", () => {
  it("ignores company suffixes and punctuation", () => {
    assert.equal(nameSimilarity("(주)서울맑은피부과의원", "서울맑은피부과"), 1);
  });
  it("matches when one name contains the other", () => {
    assert.ok(nameSimilarity("강남 서울맑은 피부과 본점", "서울맑은피부과") >= 0.9);
  });
  it("scores unrelated names low", () => {
    assert.ok(nameSimilarity("행복약국", "서울맑은피부과") < 0.3);
  });
  it("returns 0 for empty input", () => {
    assert.equal(nameSimilarity("", "서울맑은피부과"), 0);
  });
});

describe("daysBetween", () => {
  it("counts whole days", () => {
    assert.equal(daysBetween("2026-10-02", now), 10);
  });
});

describe("verifyReceipt", () => {
  const ok = { storeName: "서울맑은피부과의원", paidOn: "2026-10-05", total: 55000 };

  it("passes a matching recent receipt", () => {
    const r = verifyReceipt(ok, "서울맑은피부과", now);
    assert.equal(r.passed, true);
    assert.deepEqual(r.reasons, []);
  });
  it("flags a different clinic", () => {
    const r = verifyReceipt({ ...ok, storeName: "행복약국" }, "서울맑은피부과", now);
    assert.equal(r.passed, false);
    assert.ok(r.reasons.includes("store_name_mismatch"));
  });
  it("flags old and future dates", () => {
    assert.ok(verifyReceipt({ ...ok, paidOn: "2026-01-01" }, "서울맑은피부과", now).reasons.includes("date_too_old"));
    assert.ok(verifyReceipt({ ...ok, paidOn: "2026-12-01" }, "서울맑은피부과", now).reasons.includes("date_in_future"));
  });
  it("flags unreadable fields", () => {
    const r = verifyReceipt({ storeName: null, paidOn: null, total: null }, "서울맑은피부과", now);
    assert.deepEqual(r.reasons, ["store_name_missing", "date_missing", "total_missing"]);
  });
});

describe("decideReceipt", () => {
  const ok = { storeName: "서울맑은피부과의원", paidOn: "2026-10-05", total: 55000 };

  it("auto-approves only a fully matching receipt", () => {
    assert.deepEqual(decideReceipt(ok, "서울맑은피부과", now), { status: "auto_approved", reasons: [], score: 1 });
  });
  it("sends a mismatching receipt to manual review with the reasons", () => {
    const d = decideReceipt({ ...ok, storeName: "행복약국" }, "서울맑은피부과", now);
    assert.equal(d.status, "pending");
    assert.deepEqual(d.reasons, ["store_name_mismatch"]);
    assert.ok(d.score !== null && d.score < 0.6);
  });
  it("collects every failing check", () => {
    const d = decideReceipt({ storeName: null, paidOn: "2026-01-01", total: null }, "서울맑은피부과", now);
    assert.deepEqual(d.reasons, ["store_name_missing", "date_too_old", "total_missing"]);
    assert.equal(d.status, "pending");
  });
  it("treats an unavailable or failed OCR as 'unavailable', not as unreadable fields", () => {
    assert.deepEqual(decideReceipt(null, "서울맑은피부과", now), { status: "pending", reasons: ["ocr_unavailable"], score: null });
  });
  it("never auto-approves a future-dated receipt", () => {
    assert.equal(decideReceipt({ ...ok, paidOn: "2026-12-31" }, "서울맑은피부과", now).status, "pending");
  });
});
