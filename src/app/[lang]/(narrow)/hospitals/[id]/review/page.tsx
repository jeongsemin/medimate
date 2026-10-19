import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReceiptUploader } from "./receipt-uploader";
import { ReviewForm } from "./review-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReviewPage({ params }: PageProps<"/[lang]/hospitals/[id]/review">) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !UUID.test(id)) notFound();
  const profile = await requireProfile(lang, `/${lang}/hospitals/${id}/review`);
  const dict = await getDictionary(lang);
  const supabase = await createClient();

  const { data: hospital } = await supabase.from("hospitals").select("id, name").eq("id", id).single();
  if (!hospital) notFound();

  const [{ data: receipts }, { data: mine }] = await Promise.all([
    supabase
      .from("receipts")
      .select("id, status, created_at, ocr_paid_on")
      .eq("hospital_id", id)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase.from("reviews").select("receipt_id").eq("hospital_id", id).eq("user_id", profile.id),
  ]);
  const used = new Set((mine ?? []).map((r) => r.receipt_id));
  const usable = (receipts ?? []).filter(
    (r) => (r.status === "auto_approved" || r.status === "approved") && !used.has(r.id),
  );
  const waiting = (receipts ?? []).filter((r) => r.status === "pending" || r.status === "rejected");

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header>
        <p className="text-sm text-muted">{dict.review.forClinic}</p>
        <h1 className="text-2xl font-bold">{hospital.name}</h1>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">{dict.review.step1}</h2>
        <ReceiptUploader
          hospitalId={id}
          text={{ ...dict.review, errors: dict.errors, reasons: dict.reasons }}
        />
        {waiting.length > 0 && (
          <ul className="space-y-1 pt-2 text-sm">
            {waiting.map((r) => (
              <li key={r.id} className="text-muted">
                {new Date(r.created_at).toLocaleDateString(lang)} – {dict.review.status[r.status as "pending" | "rejected"]}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">{dict.review.step2}</h2>
        {usable.length === 0 ? (
          <p className="text-sm text-muted">{dict.review.noUsable}</p>
        ) : (
          <ReviewForm
            lang={lang}
            hospitalId={id}
            receipts={usable.map((r) => ({
              id: r.id,
              label: `${new Date(r.created_at).toLocaleDateString(lang)}${r.ocr_paid_on ? ` (${r.ocr_paid_on})` : ""}`,
            }))}
            text={{ ...dict.review, errors: dict.errors }}
          />
        )}
      </section>
    </div>
  );
}
