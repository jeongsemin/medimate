import Link from "next/link";
import { Info } from "lucide-react";
import { localeNames, locales, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Container } from "@/components/container";
import { DeleteReviewForm, MemberDetailsForm, NicknameForm } from "./account-forms";

export type MyReceipt = {
  id: string;
  status: string;
  created_at: string;
  reject_reason: string | null;
  ocr_raw: unknown;
  hospitals: unknown;
};

export type MyReview = {
  id: string;
  rating: number;
  body: string;
  treatment: string | null;
  visit_date: string | null;
  created_at: string;
  receipt_id: string;
  /** Set when an administrator hid the review; the author still sees it here. */
  hidden_at?: string | null;
  hospitals: unknown;
};

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-star-soft text-star",
  auto_approved: "bg-brand-soft text-brand",
  approved: "bg-brand-soft text-brand",
  rejected: "bg-error-soft text-error",
};

const buttonSecondary =
  "flex min-h-12 items-center justify-center rounded-sm border border-border bg-white px-5 py-3 text-sm font-bold text-brand hover:bg-brand-soft";

export function MyView({
  lang,
  dict,
  name,
  email,
  receipts,
  reviews,
  countries,
  details,
  suspension,
}: {
  lang: Locale;
  dict: Dictionary;
  name: string;
  email: string | null;
  receipts: MyReceipt[];
  reviews: MyReview[];
  countries: { code: string; name: string }[];
  details: { country: string | null; age_group: string | null; gender: string | null };
  suspension: { reason: string | null } | null;
}) {
  const t = dict.my;
  const reviewed = new Set(reviews.map((r) => r.receipt_id));
  const initial = (name || email || "?").slice(0, 1).toUpperCase();

  const navLink = "block text-sm text-muted hover:text-foreground";

  return (
    <>
      <section className="pb-9 pt-8">
        <Container className="space-y-4">
          <p className="text-xs text-muted">{t.breadcrumb}</p>
          <h1 className="text-3xl font-bold leading-snug md:text-[36px]">{fill(t.title, { name: name || "—" })}</h1>
          <p className="text-sm text-muted">{t.subtitle}</p>
        </Container>
      </section>

      <Container className="grid items-start gap-10 pb-16 lg:grid-cols-[220px_1fr]">
        {/* Account navigation */}
        <aside className="space-y-6 rounded-md border border-border bg-card p-6 lg:sticky lg:top-6">
          <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-2xl text-brand" aria-hidden>
            {initial}
          </span>
          <p className="break-words text-lg font-bold leading-snug">{name || "—"}</p>
          <nav className="space-y-4">
            <p className="text-sm font-bold text-brand">{t.nav.activity}</p>
            <a href="#receipts" className={navLink}>{fill(t.nav.receipts, { n: receipts?.length ?? 0 })}</a>
            <a href="#reviews" className={navLink}>{fill(t.nav.reviews, { n: reviews?.length ?? 0 })}</a>
            <a href="#account" className={navLink}>{t.nav.account}</a>
            <a href="#language" className={navLink}>{t.nav.language}</a>
            <form action="/auth/logout" method="post">
              <input type="hidden" name="lang" value={lang} />
              <button className={`${navLink} text-left`}>{t.nav.logout}</button>
            </form>
          </nav>
        </aside>

        <div className="min-w-0 space-y-10">
          {suspension && (
            <div role="alert" className="space-y-1.5 rounded-md border border-error bg-error-soft p-5">
              <p className="text-sm font-bold text-error">{t.suspended.title}</p>
              <p className="text-xs leading-relaxed text-muted">{t.suspended.body}</p>
              {suspension.reason && (
                <p className="text-xs text-error">
                  {t.suspended.reason}: {suspension.reason}
                </p>
              )}
            </div>
          )}

          {/* Receipt verification */}
          <section id="receipts" className="scroll-mt-6 space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold leading-snug md:text-[30px]">{t.receipts.title}</h2>
              <p className="text-sm text-muted">{t.receipts.subtitle}</p>
            </div>
            {receipts.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted">{t.receipts.empty}</p>
                <Link href={`/${lang}#search`} className={`${buttonSecondary} inline-flex`}>
                  {t.receipts.find}
                </Link>
              </div>
            ) : (
              <ul className="space-y-4">
                {receipts.map((r) => {
                  const hospital = r.hospitals as unknown as { id: string; name: string } | null;
                  const reasons = ((r.ocr_raw as { reasons?: string[] } | null)?.reasons ?? []) as string[];
                  const usable = r.status === "auto_approved" || r.status === "approved";
                  return (
                    <li key={r.id} className="space-y-3 rounded-md border border-border bg-card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="text-[19px] font-bold leading-snug">{hospital?.name}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[r.status]}`}>
                          {t.receipts.statusLabels[r.status as keyof typeof t.receipts.statusLabels]}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        {t.receipts.uploadedOn} {new Date(r.created_at).toLocaleDateString(lang)}
                      </p>
                      {r.status === "pending" && reasons.length > 0 && (
                        <p className="text-xs text-muted">
                          {reasons.map((x) => dict.reasons[x as keyof typeof dict.reasons] ?? x).join(" · ")}
                        </p>
                      )}
                      {r.status === "rejected" && r.reject_reason && (
                        <p className="text-xs text-error">
                          {t.receipts.reason}: {r.reject_reason}
                        </p>
                      )}
                      {usable && hospital && (
                        reviewed.has(r.id) ? (
                          <p className="text-sm font-bold text-brand">{t.receipts.reviewed}</p>
                        ) : (
                          <Link href={`/${lang}/hospitals/${hospital.id}/review`} className="inline-block text-sm font-bold text-brand hover:underline">
                            {t.receipts.write} →
                          </Link>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* My reviews */}
          <section id="reviews" className="scroll-mt-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold leading-snug md:text-[28px]">{t.reviews.title}</h2>
              <Link href={`/${lang}#search`} className="flex min-h-12 items-center justify-center rounded-sm bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-strong">
                {t.reviews.find}
              </Link>
            </div>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted">{t.reviews.empty}</p>
            ) : (
              <ul className="space-y-6">
                {reviews.map((r) => {
                  const hospital = r.hospitals as unknown as { id: string; name: string } | null;
                  const ym = (r.visit_date ?? r.created_at).slice(0, 7).replace("-", ".");
                  return (
                    <li key={r.id} className="space-y-4">
                      <article className="space-y-4 rounded-md border border-border bg-card p-6">
                        <div className="flex items-start justify-between">
                          <p className="text-[13px] font-semibold">{name}</p>
                          <p className="text-xs text-star">★ {r.rating.toFixed(1)}</p>
                        </div>
                        <p className="text-[10px] text-muted">{fill(t.reviews.visit, { ym })}</p>
                        <p className="line-clamp-6 whitespace-pre-line text-[13px] leading-relaxed text-muted">{r.body}</p>
                        <Link href={`/${lang}/reviews/${r.id}`} className="inline-block text-xs font-bold text-brand hover:underline">
                          {dict.reviewDetail.readMore} →
                        </Link>
                        {hospital && (
                          <Link href={`/${lang}/hospitals/${hospital.id}`} className="block text-[11px] text-brand hover:underline">
                            {hospital.name}
                            {r.treatment && ` · ${r.treatment}`}
                          </Link>
                        )}
                        <p className="text-[10px] text-muted">{t.reviews.note}</p>
                      </article>
                      <div className="flex items-center gap-3">
                        <DeleteReviewForm lang={lang} reviewId={r.id} label={t.reviews.delete} confirmText={t.reviews.deleteConfirm} />
                        <p className="text-xs text-muted">{suspension || r.hidden_at ? t.reviews.hidden : t.reviews.public}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Account */}
          <section id="account" className="scroll-mt-6 space-y-6 rounded-md border border-border bg-card p-6 md:p-7">
            <h2 className="text-2xl font-bold">{t.account.title}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <NicknameForm
                lang={lang}
                nickname={name}
                text={{ ...t.account, notLoggedIn: dict.errors.notLoggedIn, generic: dict.errors.generic }}
              />
              <div className="space-y-2">
                <p className="text-[13px] font-bold">{t.account.email}</p>
                <div className="min-h-[52px] break-all rounded-sm border border-border bg-surface p-3.5 text-sm text-muted">
                  {email ?? "—"}
                </div>
                <p className="text-xs text-muted">{t.account.emailHelp}</p>
              </div>
            </div>
            <MemberDetailsForm
              lang={lang}
              countries={countries}
              current={details}
              text={{ ...t.details, notLoggedIn: dict.errors.notLoggedIn, generic: dict.errors.generic }}
            />
          </section>

          {/* Language */}
          <section id="language" className="scroll-mt-6 space-y-5 rounded-md border border-border bg-card p-6 md:p-7">
            <h2 className="text-2xl font-bold">{t.language.title}</h2>
            <div className="space-y-1.5">
              <p className="text-[15px] font-bold">
                {t.language.current}: {localeNames[lang]}
              </p>
              <p className="text-xs text-muted">{t.language.help}</p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {locales.map((l) => (
                <li key={l}>
                  <Link
                    href={`/${l}/my#language`}
                    aria-current={l === lang}
                    className={`flex min-h-10 items-center rounded-full border px-3.5 py-2 text-[13px] ${
                      l === lang ? "border-brand bg-brand-soft font-bold text-brand" : "border-border bg-white text-muted hover:text-foreground"
                    }`}
                  >
                    {localeNames[l]}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex items-start gap-3 rounded-[12px] bg-brand-soft p-5">
            <Info className="size-5 shrink-0 text-brand" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-bold text-brand">{t.noteTitle}</p>
              <p className="text-xs leading-relaxed text-muted">{t.noteBody}</p>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
