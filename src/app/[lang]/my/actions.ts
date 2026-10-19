"use server";

import { revalidatePath } from "next/cache";
import { hasLocale } from "@/i18n/config";
import { parseNickname } from "@/lib/profile-input";
import { createClient } from "@/lib/supabase/server";

export type NicknameState = { ok?: true; error?: "invalid" | "notLoggedIn" | "generic" } | null;

export async function updateNickname(_prev: NicknameState, form: FormData): Promise<NicknameState> {
  const nickname = parseNickname(String(form.get("nickname") ?? ""));
  if (!nickname) return { error: "invalid" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "notLoggedIn" };

  // RLS limits this to the caller's own profile row.
  const { error } = await supabase.from("profiles").update({ display_name: nickname }).eq("id", auth.user.id);
  if (error) return { error: "generic" };

  const lang = String(form.get("lang") ?? "");
  if (hasLocale(lang)) revalidatePath(`/${lang}/my`);
  return { ok: true };
}

export async function deleteReview(form: FormData) {
  const id = String(form.get("reviewId") ?? "");
  const lang = String(form.get("lang") ?? "");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !id) return;

  // Filter by author as well as relying on RLS ("review delete own").
  await supabase.from("reviews").delete().eq("id", id).eq("user_id", auth.user.id);
  if (hasLocale(lang)) revalidatePath(`/${lang}/my`);
}
