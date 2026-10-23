import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { statusPages, statusPageText } from "../src/i18n/status-pages.ts";

const keys = (o: object): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v).map((s) => `${k}.${s}`) : [k]));

describe("status page strings", () => {
  it("every locale defines exactly the same keys as English, with no empty values", () => {
    const expected = keys(statusPages.en).sort();
    for (const [locale, text] of Object.entries(statusPages)) {
      assert.deepEqual(keys(text).sort(), expected, `${locale} keys differ`);
      for (const k of expected) {
        const value = k.split(".").reduce<unknown>((o, part) => (o as Record<string, unknown>)[part], text);
        assert.ok(typeof value === "string" && value.trim().length > 0, `${locale}.${k} is empty`);
      }
    }
  });
  it("falls back to English for unknown or missing locales", () => {
    assert.equal(statusPageText("xx"), statusPages.en);
    assert.equal(statusPageText(undefined), statusPages.en);
    assert.equal(statusPageText("ko"), statusPages.ko);
  });
});
