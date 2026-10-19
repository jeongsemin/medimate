import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateReviews,
  applyFilters,
  composeQuery,
  parseParams,
  searchTokens,
  sortResults,
  toQueryString,
  toggleCompare,
} from "../src/lib/search-params.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";

describe("parseParams", () => {
  it("falls back to defaults for junk input", () => {
    const f = parseParams({ rating: "99", reviews: "abc", sort: "hack", compare: "x,y" });
    assert.equal(f.rating, 0);
    assert.equal(f.reviews, 0);
    assert.equal(f.sort, "relevance");
    assert.deepEqual(f.compare, []);
  });
  it("keeps valid values, dedupes and caps compare ids", () => {
    const f = parseParams({ rating: "45", reviews: "10", english: "1", compare: `${A},${A},${B},${C},${D}` });
    assert.equal(f.rating, 45);
    assert.equal(f.reviews, 10);
    assert.equal(f.english, true);
    assert.deepEqual(f.compare, [A, B, C]);
  });
});

describe("toQueryString", () => {
  it("round-trips and omits defaults", () => {
    assert.equal(toQueryString(parseParams({})), "");
    const f = parseParams({ q: "강남", rating: "40", sort: "rating", compare: A });
    assert.deepEqual(parseParams(Object.fromEntries(new URLSearchParams(toQueryString(f)))), f);
  });
});

describe("searchTokens", () => {
  it("splits a composed phrase into words so each can match name or address", () => {
    assert.deepEqual(searchTokens("강남 레이저 토닝"), ["강남", "레이저", "토닝"]);
  });
  it("removes PostgREST-special characters and caps the word count", () => {
    assert.deepEqual(searchTokens("a,b (c) 100%"), ["a", "b", "c", "100"]);
    assert.equal(searchTokens("1 2 3 4 5 6").length, 4);
  });
});

describe("composeQuery", () => {
  it("combines area, treatment and text and picks the dermatology keyword", () => {
    assert.deepEqual(composeQuery(parseParams({ area: "강남", treatment: "레이저 토닝" })), { query: "강남 레이저 토닝", type: "derm" });
    assert.deepEqual(composeQuery(parseParams({ q: "서울병원" })), { query: "서울병원", type: "all" });
  });
});

describe("filters and sorting", () => {
  const rows = [
    { id: "a", review_count: 0, avg_rating: null, fluent_english_count: 0, director_count: 0 },
    { id: "b", review_count: 12, avg_rating: 4.6, fluent_english_count: 5, director_count: 0 },
    { id: "c", review_count: 3, avg_rating: 4.1, fluent_english_count: 0, director_count: 2 },
  ];
  it("applies rating, review and support filters", () => {
    assert.deepEqual(applyFilters(rows, parseParams({ rating: "45" })).map((r) => r.id), ["b"]);
    assert.deepEqual(applyFilters(rows, parseParams({ reviews: "1" })).map((r) => r.id), ["b", "c"]);
    assert.deepEqual(applyFilters(rows, parseParams({ director: "1" })).map((r) => r.id), ["c"]);
    assert.deepEqual(applyFilters(rows, parseParams({ english: "1", reviews: "10" })).map((r) => r.id), ["b"]);
  });
  it("sorts without mutating the input", () => {
    assert.deepEqual(sortResults(rows, "rating").map((r) => r.id), ["b", "c", "a"]);
    assert.deepEqual(sortResults(rows, "reviews").map((r) => r.id), ["b", "c", "a"]);
    assert.deepEqual(rows.map((r) => r.id), ["a", "b", "c"]);
  });
});

describe("compare", () => {
  it("toggles and keeps only the latest three", () => {
    let f = parseParams({});
    for (const id of [A, B, C, D]) f = toggleCompare(f, id);
    assert.deepEqual(f.compare, [B, C, D]);
    assert.deepEqual(toggleCompare(f, C).compare, [B, D]);
  });
  it("aggregates review rows", () => {
    const base = { hospital_id: A, interpreter_available: false, director_consultation: false, price_explained: false, no_upselling: false };
    const s = aggregateReviews([
      { ...base, rating: 5, english_support: "fluent", director_consultation: true },
      { ...base, rating: 4, english_support: "basic", price_explained: true },
    ]);
    assert.deepEqual(s, { total: 2, avgRating: 4.5, fluentEnglish: 1, interpreter: 0, director: 1, priceExplained: 1, noUpselling: 0 });
    assert.equal(aggregateReviews([]).avgRating, null);
  });
});
