import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_TOTAL, parseAmount, parseClovaResult, toIsoDate } from "../src/lib/clova-parse.ts";

// Fixtures follow the documented shape of a CLOVA OCR receipt response
// (images[].inferResult, images[].receipt.result.*). They are hand-built, not captured
// from the live service, so they pin our parsing rules rather than CLOVA's behavior.
const response = (result: Record<string, unknown>, inferResult: string = "SUCCESS") => ({
  version: "V2",
  images: [{ inferResult, receipt: { result } }],
});

const full = response({
  storeInfo: { name: { text: "서울맑은피부과의원" } },
  paymentInfo: { date: { text: "2026-10-05", formatted: { year: "2026", month: "10", day: "05" } } },
  totalPrice: { price: { text: "55,000", formatted: { value: "55000" } } },
});

describe("parseClovaResult", () => {
  it("extracts store name, date and total from a normal response", () => {
    assert.deepEqual(parseClovaResult(full), { storeName: "서울맑은피부과의원", paidOn: "2026-10-05", total: 55000 });
  });

  it("returns null when CLOVA could not read the image", () => {
    assert.equal(parseClovaResult(response({}, "FAILURE")), null);
    assert.equal(parseClovaResult(response({}, "ERROR")), null);
  });

  it("returns null, without throwing, for malformed input", () => {
    for (const bad of [null, undefined, "text", 42, [], {}, { images: [] }, { images: [null] }, { images: [{}] }, { images: "x" }]) {
      assert.equal(parseClovaResult(bad), null);
    }
  });

  it("returns empty fields for a readable receipt that lacks them", () => {
    assert.deepEqual(parseClovaResult(response({})), { storeName: null, paidOn: null, total: null });
  });

  it("trims and collapses whitespace in the store name, and rejects blank names", () => {
    const named = (text: unknown) => parseClovaResult(response({ storeInfo: { name: { text } } }))?.storeName;
    assert.equal(named("  서울맑은\n피부과   의원 "), "서울맑은 피부과 의원");
    assert.equal(named("   "), null);
    assert.equal(named(123), null);
    assert.equal(named("가".repeat(500))?.length, 200);
  });

  describe("dates", () => {
    const dated = (date: unknown) => parseClovaResult(response({ paymentInfo: { date } }))?.paidOn;

    it("accepts the formatted parts and zero-pads them", () => {
      assert.equal(dated({ formatted: { year: 2026, month: 3, day: 7 } }), "2026-03-07");
    });
    it("falls back to the printed text in common separators", () => {
      assert.equal(dated({ text: "2026.10.05 14:32:10" }), "2026-10-05");
      assert.equal(dated({ text: "2026/1/5" }), "2026-01-05");
      assert.equal(dated({ text: "결제일 2026년 10월 5일" }), "2026-10-05");
    });
    it("understands two-digit years", () => {
      assert.equal(dated({ text: "26-10-05" }), "2026-10-05");
    });
    it("rejects impossible dates instead of passing them to the database", () => {
      assert.equal(dated({ formatted: { year: "2026", month: "13", day: "45" } }), null);
      assert.equal(dated({ text: "2026-02-30" }), null);
      assert.equal(dated({ text: "2026-00-10" }), null);
    });
    it("prefers a valid text date when the formatted parts are invalid", () => {
      assert.equal(dated({ text: "2026-10-05", formatted: { year: "2026", month: "99", day: "1" } }), "2026-10-05");
    });
    it("rejects years outside a sane range", () => {
      assert.equal(dated({ text: "1999-10-05" }), null);
      assert.equal(dated({ text: "2101-10-05" }), null);
    });
    it("returns null when there is no usable date", () => {
      assert.equal(dated({}), null);
      assert.equal(dated({ text: "no date here" }), null);
    });
  });

  describe("totals", () => {
    const total = (price: unknown) => parseClovaResult(response({ totalPrice: { price } }))?.total;

    it("prefers the formatted value and falls back to the text", () => {
      assert.equal(total({ formatted: { value: "55000" }, text: "99,999" }), 55000);
      assert.equal(total({ text: "55,000원" }), 55000);
    });
    it("uses the text when the formatted value is unusable", () => {
      assert.equal(total({ formatted: { value: "abc" }, text: "12,000" }), 12000);
    });
    it("returns null for missing or zero totals", () => {
      assert.equal(total({}), null);
      assert.equal(total({ formatted: { value: "0" } }), null);
    });
  });
});

describe("parseAmount", () => {
  it("handles separators, currency marks and decimals", () => {
    assert.equal(parseAmount("55,000"), 55000);
    assert.equal(parseAmount("55000원"), 55000);
    assert.equal(parseAmount("₩ 55,000"), 55000);
    assert.equal(parseAmount("KRW 55000"), 55000);
    assert.equal(parseAmount("55000.00"), 55000); // not 5,500,000
    assert.equal(parseAmount("55000.6"), 55001);
    assert.equal(parseAmount(55000), 55000);
  });
  it("rejects negatives, exponents, stray text and non-values", () => {
    for (const bad of ["-5000", "1e6", "5,0,0abc", "abc", "", "12.34.56", NaN, Infinity, -1, 0, null, undefined, {}, []]) {
      assert.equal(parseAmount(bad), null, `should reject ${String(bad)}`);
    }
  });
  it("rejects amounts above the sanity cap so the DB integer can't overflow", () => {
    assert.equal(parseAmount(MAX_TOTAL), MAX_TOTAL);
    assert.equal(parseAmount(MAX_TOTAL + 1), null);
    assert.equal(parseAmount("99999999999"), null);
  });
});

describe("toIsoDate", () => {
  it("validates calendar dates, including leap years", () => {
    assert.equal(toIsoDate(2028, 2, 29), "2028-02-29");
    assert.equal(toIsoDate(2026, 2, 29), null);
    assert.equal(toIsoDate(2026, 4, 31), null);
    assert.equal(toIsoDate(2026, 12, 31), "2026-12-31");
  });
  it("rejects non-integers and NaN", () => {
    assert.equal(toIsoDate(2026.5, 1, 1), null);
    assert.equal(toIsoDate(NaN, 1, 1), null);
  });
});
