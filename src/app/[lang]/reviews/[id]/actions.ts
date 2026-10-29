"use server";

import { revalidatePath } from "next/cache";
import { hasLocale } from "@/i18n/config";
import { parseReportInput } from "@/lib/report-input";
import { createClient } from "@/lib/supabase/server";

const DAILY_LIMIT = 20;

export type ReportState = {
  ok?: true;
  error?: "invalid" | "own" | "already" | "suspended" | "limit" | "notLoggedIn" | "generic";
} | null;

export async function submitReport(_prev: ReportState, form: FormData): Promise<ReportState> {
  const input = parseReportInput((key) => {
    const v = form.get(key);
    return typeof v === "string" ? v : null;
  });
  if (!input) return { error: "invalid" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "notLoggedIn" };
  const me = auth.user.id;

  // RLS enforces all of this too; checking first lets us tell the member why.
  const { data: suspension } = await supabase.from("suspensions").select("user_id").eq("user_id", me).maybeSingle();
  if (suspension) return { error: "suspended" };

  const { data: review } = await supabase.from("reviews").select("user_id").eq("id", input.reviewId).maybeSingle();
  if (!review) return { error: "invalid" }; // gone, or hidden from this member
  if (review.user_id === me) return { error: "own" };

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await supabase
    .from("review_reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", me)
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) return { error: "limit" };

  const { error } = await supabase
    .from("review_reports")
    .insert({ review_id: input.reviewId, reporter_id: me, reason: input.reason, detail: input.detail });
  if (error) return { error: error.code === "23505" ? "already" : "generic" };

  const lang = String(form.get("lang") ?? "");
  if (hasLocale(lang)) revalidatePath(`/${lang}/reviews/${input.reviewId}`);
  return { ok: true };
}
