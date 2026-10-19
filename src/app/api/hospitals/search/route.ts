import { NextResponse, type NextRequest } from "next/server";
import { searchHospitals } from "@/lib/hospital-search";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const type = request.nextUrl.searchParams.get("type") === "derm" ? "derm" : "all";
  const outcome = await searchHospitals(q, type);
  if (outcome.ok) return NextResponse.json({ results: outcome.results });
  const status = outcome.error === "not_configured" ? 503 : outcome.error === "upstream" ? 502 : 500;
  return NextResponse.json({ error: outcome.error }, { status });
}
