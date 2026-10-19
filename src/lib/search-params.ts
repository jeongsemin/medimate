// Pure helpers for the search & compare page. Kept free of server-only imports
// so they can be unit tested with the plain Node test runner.

export type Sort = "relevance" | "rating" | "reviews";
export const MAX_COMPARE = 3;

export type Filters = {
  q: string;
  area: string;
  treatment: string;
  rating: 0 | 40 | 45; // minimum average rating x10, 0 = any
  reviews: 0 | 1 | 5 | 10; // minimum review count, 0 = any
  english: boolean;
  director: boolean;
  sort: Sort;
  compare: string[];
};

type Raw = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function oneOf<T extends number>(value: string, allowed: readonly T[], fallback: T): T {
  const n = Number(value);
  return (allowed as readonly number[]).includes(n) ? (n as T) : fallback;
}

export function parseParams(sp: Raw): Filters {
  const sort = first(sp.sort);
  return {
    q: first(sp.q).trim().slice(0, 50),
    area: first(sp.area).trim().slice(0, 20),
    treatment: first(sp.treatment).trim().slice(0, 30),
    rating: oneOf(first(sp.rating), [0, 40, 45] as const, 0),
    reviews: oneOf(first(sp.reviews), [0, 1, 5, 10] as const, 0),
    english: first(sp.english) === "1",
    director: first(sp.director) === "1",
    sort: sort === "rating" || sort === "reviews" ? sort : "relevance",
    compare: [...new Set(first(sp.compare).split(","))].filter((id) => UUID.test(id)).slice(0, MAX_COMPARE),
  };
}

/** Query string for a filter set; defaults are omitted to keep URLs short. */
export function toQueryString(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.area) p.set("area", f.area);
  if (f.treatment) p.set("treatment", f.treatment);
  if (f.rating) p.set("rating", String(f.rating));
  if (f.reviews) p.set("reviews", String(f.reviews));
  if (f.english) p.set("english", "1");
  if (f.director) p.set("director", "1");
  if (f.sort !== "relevance") p.set("sort", f.sort);
  if (f.compare.length) p.set("compare", f.compare.join(","));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** What we send to Naver: area + treatment + free text, as one phrase. */
export function composeQuery(f: Filters): { query: string; type: "all" | "derm" } {
  const query = [f.area, f.treatment, f.q].filter(Boolean).join(" ").trim();
  return { query, type: f.treatment || f.q.includes("피부과") ? "derm" : "all" };
}

/** Words for matching known hospitals; drops characters that are special in PostgREST filters. */
export function searchTokens(q: string, max = 4): string[] {
  return q
    .replace(/[,()%*\\_]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max);
}

export type Searchable = {
  review_count: number;
  avg_rating: number | null;
  fluent_english_count: number;
  director_count: number;
};

export function applyFilters<T extends Searchable>(results: T[], f: Filters): T[] {
  return results.filter(
    (r) =>
      (!f.rating || (r.avg_rating ?? 0) >= f.rating / 10) &&
      r.review_count >= f.reviews &&
      (!f.english || r.fluent_english_count > 0) &&
      (!f.director || r.director_count > 0),
  );
}

export function sortResults<T extends Searchable>(results: T[], sort: Sort): T[] {
  if (sort === "relevance") return results;
  const copy = [...results];
  if (sort === "rating") copy.sort((a, b) => (b.avg_rating ?? -1) - (a.avg_rating ?? -1) || b.review_count - a.review_count);
  else copy.sort((a, b) => b.review_count - a.review_count || (b.avg_rating ?? -1) - (a.avg_rating ?? -1));
  return copy;
}

export function toggleCompare(f: Filters, id: string): Filters {
  const has = f.compare.includes(id);
  const compare = has ? f.compare.filter((x) => x !== id) : [...f.compare, id].slice(-MAX_COMPARE);
  return { ...f, compare };
}

export type ReviewRow = {
  hospital_id: string;
  rating: number;
  english_support: "none" | "basic" | "fluent";
  interpreter_available: boolean;
  director_consultation: boolean;
  price_explained: boolean;
  no_upselling: boolean;
};

export type CompareStats = {
  total: number;
  avgRating: number | null;
  fluentEnglish: number;
  interpreter: number;
  director: number;
  priceExplained: number;
  noUpselling: number;
};

export function aggregateReviews(rows: ReviewRow[]): CompareStats {
  const sum = (pick: (r: ReviewRow) => boolean) => rows.filter(pick).length;
  return {
    total: rows.length,
    avgRating: rows.length ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10 : null,
    fluentEnglish: sum((r) => r.english_support === "fluent"),
    interpreter: sum((r) => r.interpreter_available),
    director: sum((r) => r.director_consultation),
    priceExplained: sum((r) => r.price_explained),
    noUpselling: sum((r) => r.no_upselling),
  };
}
