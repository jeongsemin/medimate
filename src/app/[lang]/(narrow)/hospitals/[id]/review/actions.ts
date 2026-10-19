"use server";

import { redirect } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

export type ReviewState = { error?: "notLoggedIn" | "invalid" | "alreadyUsed" | "generic" } | null;

const ENGLISH = ["none", "basic", "fluent"] as const;

export async function submitReview(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  const lang = String(form.get("lang") ?? "");
  const hospitalId = String(form.get("hospitalId") ?? "");
  const receiptId = String(form.get("receiptId") ?? "");
  const rating = Number(form.get("rating"));
  const body = String(form.get("body") ?? "").trim();
  const english = String(form.get("english") ?? "none");
  const visitDate = String(form.get("visitDate") ?? "");
  const treatment = String(form.get("treatment") ?? "").trim();

  if (
    !hasLocale(lang) ||
    !hospitalId ||
    !receiptId ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    body.length < 10 ||
    body.length > 3000 ||
    treatment.length > 100 ||
    !(ENGLISH as readonly string[]).includes(english) ||
    (visitDate && !/^\d{4}-\d{2}-\d{2}$/.test(visitDate))
  ) {
    return { error: "invalid" };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "notLoggedIn" };

  // RLS verifies that the receipt is the author's, matches the clinic and is approved.
  const { error } = await supabase.from("reviews").insert({
    user_id: auth.user.id,
    hospital_id: hospitalId,
    receipt_id: receiptId,
    rating,
    body,
    visit_date: visitDate || null,
    treatment: treatment || null,
    lang,
    english_support: english,
    interpreter_available: form.get("interpreter") === "on",
    director_consultation: form.get("director") === "on",
    price_explained: form.get("priceExplained") === "on",
    no_upselling: form.get("noUpselling") === "on",
  });
  if (error) return { error: error.code === "23505" ? "alreadyUsed" : "generic" };

  redirect(`/${lang}/hospitals/${hospitalId}`);
}
