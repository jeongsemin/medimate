import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMedical, toCandidate, type NaverLocalItem } from "@/lib/naver-local";

export type SearchType = "all" | "derm";

export type SearchResult = {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  road_address: string | null;
  review_count: number;
  avg_rating: number | null;
};

export type SearchOutcome =
  | { ok: true; results: SearchResult[] }
  | { ok: false; error: "not_configured" | "upstream" | "db" };

const KEYWORD: Record<SearchType, string> = { all: "병원", derm: "피부과" };

/** Searches Naver Local Search and upserts the medical hits into `hospitals`. */
export async function searchHospitals(rawQuery: string, type: SearchType): Promise<SearchOutcome> {
  const q = rawQuery.trim().slice(0, 50);
  if (!q) return { ok: true, results: [] };

  const id = process.env.NAVER_SEARCH_CLIENT_ID;
  const secret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!id || !secret) return { ok: false, error: "not_configured" };

  // Don't append the keyword twice if the user already typed it.
  const query = q.includes(KEYWORD[type]) ? q : `${q} ${KEYWORD[type]}`;
  const url = new URL("https://openapi.naver.com/v1/search/local.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "5"); // the API caps local search at 5 results
  url.searchParams.set("sort", "comment");

  let items: NaverLocalItem[];
  try {
    const res = await fetch(url, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: "upstream" };
    items = ((await res.json()).items ?? []) as NaverLocalItem[];
  } catch {
    return { ok: false, error: "upstream" };
  }

  const candidates = items.filter(isMedical).map(toCandidate);
  if (candidates.length === 0) return { ok: true, results: [] };

  const admin = createAdminClient();
  const { data: hospitals, error } = await admin
    .from("hospitals")
    .upsert(candidates, { onConflict: "external_id" })
    .select("id, name, category, address, road_address");
  if (error || !hospitals) return { ok: false, error: "db" };

  const { data: stats } = await admin
    .from("hospital_stats")
    .select("hospital_id, review_count, avg_rating")
    .in("hospital_id", hospitals.map((h) => h.id));
  const byId = new Map((stats ?? []).map((s) => [s.hospital_id, s]));

  // keep Naver's ordering
  const order = new Map(candidates.map((c, i) => [c.name, i]));
  hospitals.sort((a, b) => (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0));

  return {
    ok: true,
    results: hospitals.map((h) => ({
      ...h,
      review_count: byId.get(h.id)?.review_count ?? 0,
      avg_rating: byId.get(h.id)?.avg_rating ?? null,
    })),
  };
}
