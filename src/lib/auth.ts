import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/config";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
};

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, is_admin")
    .eq("id", data.user.id)
    .single();
  return profile;
}

/** Redirects to the login page (remembering where to return) when signed out. */
export async function requireProfile(lang: Locale, next: string): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect(`/${lang}/login?next=${encodeURIComponent(next)}`);
  return profile;
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined, fallback: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
