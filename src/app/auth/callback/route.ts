import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { hasLocale } from "@/i18n/config";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const langParam = searchParams.get("lang") ?? "";
  const lang = hasLocale(langParam) ? langParam : "en";
  const next = safeNext(searchParams.get("next"), `/${lang}`);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/${lang}/login?error=1`);
}
