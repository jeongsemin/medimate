import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideReceipt } from "./actions";

export default async function AdminPage({ params }: PageProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const profile = await requireProfile(lang, `/${lang}/admin`);
  if (!profile.is_admin) notFound();
  const dict = await getDictionary(lang);

  const admin = createAdminClient();
  const { data: queue } = await admin
    .from("receipts")
    .select("id, storage_path, created_at, ocr_store_name, ocr_paid_on, ocr_total, match_score, ocr_raw, hospitals(name), profiles(display_name)")
    .eq("status", "pending")
    .order("created_at")
    .limit(30);

  const items = await Promise.all(
    (queue ?? []).map(async (r) => {
      const { data } = await admin.storage.from("receipts").createSignedUrl(r.storage_path, 300);
      return { ...r, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.admin.title}</h1>
      {items.length === 0 && <p className="text-muted">{dict.admin.empty}</p>}
      <ul className="space-y-4">
        {items.map((r) => {
          const hospital = r.hospitals as unknown as { name: string } | null;
          const user = r.profiles as unknown as { display_name: string | null } | null;
          const reasons = ((r.ocr_raw as { reasons?: string[] } | null)?.reasons ?? []) as string[];
          return (
            <li key={r.id} className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[200px_1fr]">
              {r.url && (
                <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label={dict.admin.viewImage}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.url} alt={dict.admin.viewImage} className="max-h-60 w-full rounded-lg object-contain" />
                </a>
              )}
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted">{dict.admin.hospital}: </span>
                  <strong>{hospital?.name}</strong> · {user?.display_name}
                </p>
                <p className="text-muted">
                  {dict.admin.ocr}: {r.ocr_store_name ?? "–"} / {r.ocr_paid_on ?? "–"} /{" "}
                  {r.ocr_total?.toLocaleString() ?? "–"} KRW
                  {r.match_score !== null && ` / ${dict.admin.score} ${Math.round(Number(r.match_score) * 100)}%`}
                </p>
                {reasons.length > 0 && (
                  <p className="text-xs text-amber-700">
                    {reasons.map((x) => dict.reasons[x as keyof typeof dict.reasons] ?? x).join(" · ")}
                  </p>
                )}
                <form action={decideReceipt} className="space-y-2">
                  <input type="hidden" name="lang" value={lang} />
                  <input type="hidden" name="receiptId" value={r.id} />
                  <input
                    name="reason"
                    maxLength={200}
                    placeholder={dict.admin.reasonPlaceholder}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5"
                  />
                  <div className="flex gap-2">
                    <button
                      name="decision"
                      value="approved"
                      className="rounded-full bg-brand px-4 py-1.5 font-medium text-white hover:bg-brand-strong"
                    >
                      {dict.admin.approve}
                    </button>
                    <button
                      name="decision"
                      value="rejected"
                      className="rounded-full border border-red-300 px-4 py-1.5 font-medium text-red-700 hover:bg-red-50"
                    >
                      {dict.admin.reject}
                    </button>
                  </div>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
