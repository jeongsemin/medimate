import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COUNTRY_CODES, parseMemberDetails } from "../src/lib/member-details.ts";
import { hasMemberFilters, memberQuery, parseMemberFilters, pickSuspendTargets } from "../src/lib/member-filters.ts";

const form = (o: Record<string, string>) => (k: string) => o[k] ?? null;

describe("COUNTRY_CODES", () => {
  it("has unique two-letter codes, and every one is known to Intl", () => {
    assert.equal(new Set(COUNTRY_CODES).size, COUNTRY_CODES.length);
    const names = new Intl.DisplayNames("en", { type: "region" });
    for (const c of COUNTRY_CODES) {
      assert.match(c, /^[A-Z]{2}$/);
      assert.notEqual(names.of(c), c, `${c} has no name`);
    }
    for (const c of ["KR", "JP", "CN", "US", "TW", "VN", "TH"]) assert.ok(COUNTRY_CODES.includes(c));
  });
});

describe("parseMemberDetails", () => {
  it("treats empty values as not provided", () => {
    assert.deepEqual(parseMemberDetails(form({})), { country: null, age_group: null, gender: null });
    assert.deepEqual(parseMemberDetails(form({ country: " ", age_group: "", gender: "" })), { country: null, age_group: null, gender: null });
  });
  it("accepts valid values and normalises the country case", () => {
    assert.deepEqual(parseMemberDetails(form({ country: "jp", age_group: "30s", gender: "undisclosed" })), {
      country: "JP",
      age_group: "30s",
      gender: "undisclosed",
    });
  });
  it("rejects anything outside the allowed sets", () => {
    assert.equal(parseMemberDetails(form({ country: "ZZ" })), null);
    assert.equal(parseMemberDetails(form({ country: "Korea" })), null);
    assert.equal(parseMemberDetails(form({ age_group: "teen" })), null);
    assert.equal(parseMemberDetails(form({ gender: "x'; drop table" })), null);
  });
});

describe("parseMemberFilters", () => {
  it("returns defaults for an empty query", () => {
    const f = parseMemberFilters({});
    assert.deepEqual(f, { q: "", country: "", age: "", gender: "", status: "all", from: "", to: "", page: 1 });
    assert.equal(hasMemberFilters(f), false);
  });
  it("keeps valid values, including 'unset'", () => {
    const f = parseMemberFilters({ q: " kim ", country: "kr", age: "unset", gender: "female", status: "suspended", from: "2026-01-31", to: "2026-02-28", page: "3" });
    assert.deepEqual(f, { q: "kim", country: "KR", age: "unset", gender: "female", status: "suspended", from: "2026-01-31", to: "2026-02-28", page: 3 });
    assert.equal(hasMemberFilters(f), true);
  });
  it("keeps 'unset' for every demographic filter, including the country", () => {
    const f = parseMemberFilters({ country: "unset", age: "unset", gender: "unset" });
    assert.deepEqual([f.country, f.age, f.gender], ["unset", "unset", "unset"]);
    assert.equal(memberQuery(f), "?country=unset&age=unset&gender=unset");
  });
  it("drops unknown or malformed values", () => {
    const f = parseMemberFilters({ country: "XX", age: "teen", gender: "?", status: "banned", from: "2026-02-30", to: "yesterday", page: "-4" });
    assert.deepEqual(f, { q: "", country: "", age: "", gender: "", status: "all", from: "", to: "", page: 1 });
  });
  it("takes the first value of a repeated parameter and caps the search text", () => {
    assert.equal(parseMemberFilters({ gender: ["male", "female"] }).gender, "male");
    assert.equal(parseMemberFilters({ q: "a".repeat(500) }).q.length, 100);
    assert.equal(parseMemberFilters({ page: "99999999" }).page, 1);
  });
});

describe("memberQuery", () => {
  it("omits defaults and round-trips through parseMemberFilters", () => {
    assert.equal(memberQuery(parseMemberFilters({})), "");
    const f = parseMemberFilters({ q: "a b", country: "JP", status: "admin", page: "2" });
    assert.deepEqual(parseMemberFilters(Object.fromEntries(new URLSearchParams(memberQuery(f)))), f);
  });
  it("can target another page", () => {
    assert.equal(memberQuery(parseMemberFilters({ q: "x", page: "5" }), 1), "?q=x");
    assert.equal(memberQuery(parseMemberFilters({ q: "x" }), 2), "?q=x&page=2");
  });
});

describe("pickSuspendTargets", () => {
  const admins = new Set(["a1"]);
  it("never includes administrators or the person acting", () => {
    assert.deepEqual(pickSuspendTargets(["u1", "a1", "me", "u2"], "me", admins), ["u1", "u2"]);
  });
  it("removes duplicates and tolerates an empty selection", () => {
    assert.deepEqual(pickSuspendTargets(["u1", "u1"], "me", admins), ["u1"]);
    assert.deepEqual(pickSuspendTargets([], "me", admins), []);
  });
});
