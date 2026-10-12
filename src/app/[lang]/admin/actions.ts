"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function decideReceipt(form: FormData) {
  // Re-check authorization here: server actions are public endpoints.
  const profile = await getProfile();
  if (!profile?.is_admin) throw new Error("forbidden");

  const receiptId = String(form.get("receiptId") ?? "");
  const decision = form.get("decision");
  if (decision !== "approved" && decision !== "rejected") throw new Error("invalid");
  const reason = String(form.get("reason") ?? "").trim().slice(0, 200);

  await createAdminClient()
    .from("receipts")
    .update({
      status: decision,
      reject_reason: decision === "rejected" ? reason || null : null,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", receiptId)
    .eq("status", "pending");

  revalidatePath(`/${String(form.get("lang") ?? "en")}/admin`);
}
