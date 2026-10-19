"use server";

import { revalidatePath } from "next/cache";
import { hasLocale } from "@/i18n/config";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function decideReceipt(form: FormData) {
  // Re-check authorization here: server actions are public endpoints.
  const profile = await getProfile();
  if (!profile?.is_admin) throw new Error("forbidden");

  const receiptId = String(form.get("receiptId") ?? "");
  const decision = form.get("decision");
  if (!UUID.test(receiptId)) throw new Error("invalid receipt");
  if (decision !== "approved" && decision !== "rejected") throw new Error("invalid decision");
  const reason = String(form.get("reason") ?? "").replace(/\s+/g, " ").trim().slice(0, 200);

  // Only a still-pending receipt can be decided, so two admins can't overwrite each other.
  const { error } = await createAdminClient()
    .from("receipts")
    .update({
      status: decision,
      reject_reason: decision === "rejected" ? reason || null : null,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", receiptId)
    .eq("status", "pending");
  if (error) throw new Error("update failed");

  const lang = String(form.get("lang") ?? "");
  revalidatePath(`/${hasLocale(lang) ? lang : "en"}/admin`);
}
