import { NextResponse, type NextRequest } from "next/server";
import { searchHospitals } from "@/lib/hospital-search";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const type = request.nextUrl.searchParams.get("type") === "derm" ? "derm" : "all";
  const { results, error } = await searchHospitals(q, type);
  if (results.length === 0 && error) {
    const status = error === "not_configured" ? 503 : error === "upstream" ? 502 : 500;
    return NextResponse.json({ error }, { status });
  }
  return NextResponse.json({ results });
}
