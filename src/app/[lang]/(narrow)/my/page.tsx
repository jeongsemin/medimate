import Link from "next/link";
import { hasLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function MyPage({ params }: PageProps<"/[lang]/my">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const profile = await requireProfile(lang, `/${lang}/my`);
  const dict = await getDictionary(lang);
  const supabase = await createClient();

  const [{ data: receipts }, { data: reviews }] = await Promise.all([
    supabase
      .from("receipts")
      .select("id, status, created_at, reject_reason, ocr_raw, hospitals(id, name)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase.from("reviews").select("receipt_id").eq("user_id", profile.id),
  ]);
  const reviewed = new Set((reviews ?? []).map((r) => r.receipt_id));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.my.title}</h1>
      {!receipts || receipts.length === 0 ? (
        <p className="text-muted">{dict.my.empty}</p>
      ) : (
        <ul className="space-y-3">
          {receipts.map((r) => {
            const hospital = r.hospitals as unknown as { id: string; name: string } | null;
            const reasons = ((r.ocr_raw as { reasons?: string[] } | null)?.reasons ?? []) as string[];
            const usable = r.status === "auto_approved" || r.status === "approved";
            return (
              <li key={r.id} className="space-y-1 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{hospital?.name}</p>
                  <time className="text-xs text-muted">
                    {new Date(r.created_at).toLocaleDateString(lang)}
                  </time>
                </div>
                <p className="text-sm">{dict.review.status[r.status as keyof typeof dict.review.status]}</p>
                {r.status === "pending" && reasons.length > 0 && (
                  <p className="text-xs text-muted">
                    {reasons.map((x) => dict.reasons[x as keyof typeof dict.reasons] ?? x).join(" · ")}
                  </p>
                )}
                {r.status === "rejected" && r.reject_reason && (
                  <p className="text-xs text-muted">
                    {dict.my.reason}: {r.reject_reason}
                  </p>
                )}
                {usable &&
                  hospital &&
                  (reviewed.has(r.id) ? (
                    <p className="text-sm font-medium text-brand-strong">{dict.my.reviewed}</p>
                  ) : (
                    <Link
                      href={`/${lang}/hospitals/${hospital.id}/review`}
                      className="inline-block text-sm font-medium text-brand-strong hover:underline"
                    >
                      {dict.my.writeReview} →
                    </Link>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
