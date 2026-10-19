import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMedical, toCandidate, type NaverLocalItem } from "@/lib/naver-local";
import { searchTokens } from "@/lib/search-params";

export type SearchType = "all" | "derm";

export type SearchResult = {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  road_address: string | null;
  review_count: number;
  avg_rating: number | null;
  fluent_english_count: number;
  director_count: number;
};

export type SearchOutcome = {
  results: SearchResult[];
  /** Set when Naver (or the DB) failed; `results` may still hold DB matches. */
  error?: "not_configured" | "upstream" | "db";
};

const KEYWORD: Record<SearchType, string> = { all: "병원", derm: "피부과" };
const BASE_COLUMNS = "id, name, category, address, road_address";

type Base = Omit<SearchResult, "review_count" | "avg_rating" | "fluent_english_count" | "director_count">;

async function fromNaver(q: string, type: SearchType): Promise<{ items: NaverLocalItem[] } | { error: "not_configured" | "upstream" }> {
  const id = process.env.NAVER_SEARCH_CLIENT_ID;
  const secret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!id || !secret) return { error: "not_configured" };

  // Don't append the keyword twice if the user already typed it.
  const query = q.includes(KEYWORD[type]) ? q : `${q} ${KEYWORD[type]}`;
  const url = new URL("https://openapi.naver.com/v1/search/local.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "5"); // the API caps local search at 5 results
  url.searchParams.set("sort", "comment");

  try {
    const res = await fetch(url, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return { error: "upstream" };
    return { items: ((await res.json()).items ?? []) as NaverLocalItem[] };
  } catch {
    return { error: "upstream" };
  }
}

/**
 * Searches Naver Local Search (upserting the medical hits into `hospitals`) and
 * merges hospitals we already know by name/address, so results survive a Naver outage.
 */
export async function searchHospitals(rawQuery: string, type: SearchType): Promise<SearchOutcome> {
  const q = rawQuery.trim().slice(0, 50);
  if (!q) return { results: [] };

  const admin = createAdminClient();
  let error: SearchOutcome["error"];
  const ordered: Base[] = [];

  const naver = await fromNaver(q, type);
  if ("error" in naver) {
    error = naver.error;
  } else {
    const candidates = naver.items.filter(isMedical).map(toCandidate);
    if (candidates.length > 0) {
      const { data, error: dbError } = await admin
        .from("hospitals")
        .upsert(candidates, { onConflict: "external_id" })
        .select(BASE_COLUMNS);
      if (dbError || !data) error = "db";
      else {
        const order = new Map(candidates.map((c, i) => [c.name, i]));
        ordered.push(...[...data].sort((a, b) => (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0)));
      }
    }
  }

  // Known hospitals where every word appears in the name or address.
  const tokens = searchTokens(q);
  if (tokens.length > 0) {
    let query = admin.from("hospitals").select(BASE_COLUMNS);
    for (const word of tokens) {
      query = query.or(`name.ilike.%${word}%,road_address.ilike.%${word}%,address.ilike.%${word}%`);
    }
    const { data } = await query.limit(10);
    const seen = new Set(ordered.map((h) => h.id));
    for (const h of data ?? []) if (!seen.has(h.id)) ordered.push(h);
  }
  if (ordered.length === 0) return { results: [], error };

  const { data: stats } = await admin
    .from("hospital_stats")
    .select("hospital_id, review_count, avg_rating, fluent_english_count, director_count")
    .in("hospital_id", ordered.map((h) => h.id));
  const byId = new Map((stats ?? []).map((s) => [s.hospital_id, s]));

  return {
    results: ordered.map((h) => {
      const s = byId.get(h.id);
      return {
        ...h,
        review_count: s?.review_count ?? 0,
        avg_rating: s?.avg_rating === null || s?.avg_rating === undefined ? null : Number(s.avg_rating),
        fluent_english_count: s?.fluent_english_count ?? 0,
        director_count: s?.director_count ?? 0,
      };
    }),
    // Naver being down only matters when we have nothing to show.
    error,
  };
}
