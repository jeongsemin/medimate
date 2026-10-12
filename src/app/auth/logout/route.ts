import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "");
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL(`/${hasLocale(lang) ? lang : "en"}`, request.url), 303);
}
