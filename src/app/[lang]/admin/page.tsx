import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminView, type AdminItem, type Counts, type QueueItem, type RecentItem } from "./admin-view";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

type Named = { display_name: string | null } | null;
type Hospital = { name: string } | null;

export async function generateMetadata({ params }: PageProps<"/[lang]/admin">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return pageMetadata({ lang, path: "/admin", title: dict.admin.title, noindex: true });
}

export default async function AdminPage({ params }: PageProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const profile = await requireProfile(lang, `/${lang}/admin`);
  if (!profile.is_admin) notFound();
  const dict = await getDictionary(lang);

  const admin = createAdminClient();
  // receipts references profiles twice (uploader, reviewer), so each embed names its foreign key.
  const countOf = async (status: keyof Counts) => {
    const { count } = await admin.from("receipts").select("id", { count: "exact", head: true }).eq("status", status);
    return count ?? 0;
  };

  const [pending, auto_approved, approved, rejected, { data: queueRows }, { data: recentRows }] = await Promise.all([
    countOf("pending"),
    countOf("auto_approved"),
    countOf("approved"),
    countOf("rejected"),
    admin
      .from("receipts")
      .select(
        "id, storage_path, created_at, ocr_store_name, ocr_paid_on, ocr_total, match_score, ocr_raw, hospitals(name), uploader:profiles!receipts_user_id_fkey(display_name)",
      )
      .eq("status", "pending")
      .order("created_at")
      .limit(30),
    admin
      .from("receipts")
      .select(
        "id, status, reject_reason, reviewed_at, hospitals(name), uploader:profiles!receipts_user_id_fkey(display_name), reviewer:profiles!receipts_reviewed_by_fkey(display_name)",
      )
      .in("status", ["approved", "rejected"])
      .not("reviewed_at", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(10),
  ]);

  const queue: QueueItem[] = await Promise.all(
    (queueRows ?? []).map(async (r) => {
      const { data } = await admin.storage.from("receipts").createSignedUrl(r.storage_path, 300);
      return {
        id: r.id,
        url: data?.signedUrl ?? null,
        created_at: r.created_at,
        hospital: (r.hospitals as unknown as Hospital)?.name ?? "—",
        uploader: (r.uploader as unknown as Named)?.display_name ?? "—",
        ocr_store_name: r.ocr_store_name,
        ocr_paid_on: r.ocr_paid_on,
        ocr_total: r.ocr_total,
        match_score: r.match_score === null ? null : Number(r.match_score),
        reasons: ((r.ocr_raw as { reasons?: string[] } | null)?.reasons ?? []) as string[],
      };
    }),
  );

  const recent: RecentItem[] = (recentRows ?? []).map((r) => ({
    id: r.id,
    status: r.status as "approved" | "rejected",
    hospital: (r.hospitals as unknown as Hospital)?.name ?? "—",
    uploader: (r.uploader as unknown as Named)?.display_name ?? "—",
    reviewer: (r.reviewer as unknown as Named)?.display_name ?? "—",
    reviewed_at: r.reviewed_at as string,
    reject_reason: r.reject_reason,
  }));

  const { data: adminRows } = await admin
    .from("profiles")
    .select("id, display_name")
    .eq("is_admin", true)
    .order("created_at");
  // Emails live in auth.users, so they come from the auth admin API (a handful of people at most).
  const admins: AdminItem[] = await Promise.all(
    (adminRows ?? []).map(async (a) => {
      const { data } = await admin.auth.admin.getUserById(a.id);
      return { id: a.id, name: a.display_name ?? "—", email: data.user?.email ?? null };
    }),
  );

  return (
    <AdminView
      lang={lang}
      dict={dict}
      counts={{ pending, auto_approved, approved, rejected }}
      queue={queue}
      recent={recent}
      admins={admins}
      currentId={profile.id}
    />
  );
}
