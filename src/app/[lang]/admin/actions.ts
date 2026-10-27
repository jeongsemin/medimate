"use server";

import { revalidatePath } from "next/cache";
import { hasLocale } from "@/i18n/config";
import { checkRoleChange, parseEmail, type RoleError } from "@/lib/admin-roles";
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

export type GrantState = { ok?: true; error?: RoleError | "invalidEmail" | "notFound" | "forbidden" | "generic" } | null;

async function adminCount(admin: ReturnType<typeof createAdminClient>) {
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_admin", true);
  return count ?? 0;
}

/** Looks a user up by email. Only people who have signed in once have an account to promote. */
async function findUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return undefined;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

export async function grantAdmin(_prev: GrantState, form: FormData): Promise<GrantState> {
  const profile = await getProfile();
  if (!profile?.is_admin) return { error: "forbidden" };

  const email = parseEmail(form.get("email"));
  if (!email) return { error: "invalidEmail" };

  const admin = createAdminClient();
  const userId = await findUserIdByEmail(admin, email);
  if (userId === undefined) return { error: "generic" };
  if (userId === null) return { error: "notFound" };

  const { data: target } = await admin.from("profiles").select("id, is_admin").eq("id", userId).maybeSingle();
  if (!target) return { error: "notFound" };
  const refused = checkRoleChange("grant", { isAdmin: target.is_admin }, await adminCount(admin));
  if (refused) return { error: refused };

  const { error } = await admin.from("profiles").update({ is_admin: true }).eq("id", userId);
  if (error) return { error: "generic" };

  const lang = String(form.get("lang") ?? "");
  revalidatePath(`/${hasLocale(lang) ? lang : "en"}/admin`);
  return { ok: true };
}

export async function revokeAdmin(form: FormData) {
  const profile = await getProfile();
  if (!profile?.is_admin) throw new Error("forbidden");

  const targetId = String(form.get("userId") ?? "");
  if (!UUID.test(targetId)) throw new Error("invalid user");

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("id, is_admin").eq("id", targetId).maybeSingle();
  if (!target) return;
  if (checkRoleChange("revoke", { isAdmin: target.is_admin }, await adminCount(admin))) return;

  const { error } = await admin.from("profiles").update({ is_admin: false }).eq("id", targetId).eq("is_admin", true);
  if (error) throw new Error("update failed");

  // Two admins demoting each other at the same moment could both pass the check above.
  if ((await adminCount(admin)) === 0) await admin.from("profiles").update({ is_admin: true }).eq("id", targetId);

  const lang = String(form.get("lang") ?? "");
  revalidatePath(`/${hasLocale(lang) ? lang : "en"}/admin`);
}
