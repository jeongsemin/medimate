import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Info } from "lucide-react";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/container";
import { ReceiptUploader } from "./receipt-uploader";
import { ReviewForm } from "./review-form";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/[lang]/hospitals/[id]/review">): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !UUID.test(id)) return {};
  const dict = await getDictionary(lang);
  return pageMetadata({ lang, path: `/hospitals/${id}/review`, title: dict.write.breadcrumb[1], noindex: true });
}

export default async function ReviewPage({ params }: PageProps<"/[lang]/hospitals/[id]/review">) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !UUID.test(id)) notFound();
  const profile = await requireProfile(lang, `/${lang}/hospitals/${id}/review`);
  const dict = await getDictionary(lang);
  const w = dict.write;
  const supabase = await createClient();

  const { data: hospital } = await supabase
    .from("hospitals")
    .select("id, name, road_address, address")
    .eq("id", id)
    .single();
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

  const defaultMonth = new Date().toISOString().slice(0, 7);

  return (
    <>
      <section className="space-y-4 pb-9 pt-8">
        <Container className="space-y-4">
          <p className="text-xs text-muted">
            <Link href={`/${lang}/hospitals/${id}`} className="hover:text-foreground">
              {w.breadcrumb[0]}
            </Link>
            {"  /  "}
            {w.breadcrumb[1]}
          </p>
          <h1 className="text-3xl font-bold leading-snug md:text-[36px]">{w.title}</h1>
          <p className="text-[15px] text-muted">{w.subtitle}</p>
        </Container>
      </section>

      <Container className="grid items-start gap-10 pb-16 lg:grid-cols-[minmax(0,780px)_1fr]">
        <div className="space-y-[30px] rounded-[20px] border border-border bg-card p-6 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-xs font-bold text-brand">{w.progress.join("  →  ")}</p>
            <p className="text-[11px] text-muted">{w.required}</p>
          </div>

          {/* Step 1: verify the visit */}
          <div className="space-y-2">
            <p className="text-[13px] font-bold">{w.hospital} *</p>
            <div className="min-h-[52px] rounded-sm border border-border bg-white p-3.5 text-sm">
              {hospital.name}
              <span className="text-muted"> · {hospital.road_address || hospital.address}</span>
            </div>
            <p className="text-xs text-muted">{w.hospitalHelp}</p>
          </div>

          <ReceiptUploader
            hospitalId={id}
            text={{ ...dict.review, errors: dict.errors, reasons: dict.reasons }}
          />
          {waiting.length > 0 && (
            <ul className="space-y-1 text-xs text-muted">
              {waiting.map((r) => (
                <li key={r.id}>
                  {new Date(r.created_at).toLocaleDateString(lang)} – {dict.review.status[r.status as "pending" | "rejected"]}
                </li>
              ))}
            </ul>
          )}

          {/* Steps 2 and 3: experience and publication */}
          {usable.length === 0 ? (
            <p className="rounded-sm bg-surface p-4 text-sm text-muted">{w.gate}</p>
          ) : (
            <ReviewForm
              lang={lang}
              hospitalId={id}
              defaultMonth={defaultMonth}
              treatmentSuggestions={dict.home.treatments.items.map((t) => t.name)}
              receipts={usable.map((r) => ({
                id: r.id,
                label: `${new Date(r.created_at).toLocaleDateString(lang)}${r.ocr_paid_on ? ` (${r.ocr_paid_on})` : ""}`,
              }))}
              text={{ write: w, review: dict.review, errors: dict.errors }}
            />
          )}
        </div>

        <aside className="space-y-5">
          <div className="space-y-4 rounded-md border border-border bg-card p-7">
            <p className="text-xl font-bold leading-snug">
              {w.guideTitle[0]}
              <br />
              {w.guideTitle[1]}
            </p>
            <ul className="space-y-3.5">
              {w.guide.map((g) => (
                <li key={g} className="flex items-start gap-2.5 text-[13px] text-muted">
                  <Check className="mt-1 size-4 shrink-0 text-brand" aria-hidden />
                  {g}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-start gap-3 rounded-[12px] bg-brand-soft p-5">
            <Info className="size-5 shrink-0 text-brand" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-bold text-brand">{w.verifyTitle}</p>
              <p className="text-xs leading-relaxed text-muted">{w.verifyBody}</p>
            </div>
          </div>
        </aside>
      </Container>
    </>
  );
}
