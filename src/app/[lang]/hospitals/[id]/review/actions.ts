"use server";

import { redirect } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { parseReviewInput } from "@/lib/review-input";
import { createClient } from "@/lib/supabase/server";

export type ReviewState = { error?: "notLoggedIn" | "invalid" | "consent" | "alreadyUsed" | "generic" } | null;

export async function submitReview(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  const parsed = parseReviewInput((key) => {
    const v = form.get(key);
    return typeof v === "string" ? v : null;
  });
  if (!parsed.ok) return { error: parsed.reason };
  const input = parsed.value;
  if (!hasLocale(input.lang)) return { error: "invalid" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "notLoggedIn" };

  // RLS verifies that the receipt is the author's, matches the clinic and is approved.
  const { error } = await supabase.from("reviews").insert({
    user_id: auth.user.id,
    hospital_id: input.hospitalId,
    receipt_id: input.receiptId,
    rating: input.rating,
    body: input.body,
    visit_date: input.visitDate,
    treatment: input.treatment,
    lang: input.lang,
    english_support: input.english,
    interpreter_available: input.interpreter,
    director_consultation: input.director,
    price_explained: input.priceExplained,
    no_upselling: input.noUpselling,
  });
  if (error) return { error: error.code === "23505" ? "alreadyUsed" : "generic" };

  redirect(`/${input.lang}/hospitals/${input.hospitalId}`);
}
