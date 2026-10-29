import Link from "next/link";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireProfile } from "@/lib/auth";
import { REPORT_REASONS, groupReports } from "@/lib/report-input";
import { createAdminClient } from "@/lib/supabase/admin";
import { Container } from "@/components/container";
import { ResolveForm, RestoreForm } from "./report-actions";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

type ReviewInfo = {
  id: string;
  body: string;
  rating: number;
  hidden_at: string | null;
  hospitals: { id: string; name: string } | null;
  profiles: { display_name: string | null } | null;
};

export async function generateMetadata({ params }: PageProps<"/[lang]/admin/reports">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return pageMetadata({ lang, path: "/admin/reports", title: dict.admin.reports.title, noindex: true });
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default async function ReportsPage({ params }: PageProps<"/[lang]/admin/reports">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const profile = await requireProfile(lang, `/${lang}/admin/reports`);
  if (!profile.is_admin) notFound();
  const dict = await getDictionary(lang);
  const t = dict.admin.reports;
  const r = dict.reviewDetail.report;

  const admin = createAdminClient();
  const [{ data: openRows }, { data: doneRows }] = await Promise.all([
    admin.from("review_reports").select("review_id, reason, detail, created_at").eq("status", "open").order("created_at").limit(1000),
    admin
      .from("review_reports")
      .select("review_id, status, resolved_at")
      .neq("status", "open")
      .not("resolved_at", "is", null)
      .order("resolved_at", { ascending: false })
      .limit(100),
  ]);

  const groups = groupReports(openRows ?? []).slice(0, 30);

  // The most recently handled reviews, one row each, newest first.
  const handled: { reviewId: string; status: string; at: string }[] = [];
  for (const d of doneRows ?? []) {
    if (handled.length >= 10) break;
    if (!handled.some((h) => h.reviewId === d.review_id)) handled.push({ reviewId: d.review_id, status: d.status, at: d.resolved_at as string });
  }

  // `reviews` has a single foreign key to profiles, so the embed needs no hint.
  const ids = [...new Set([...groups.map((g) => g.reviewId), ...handled.map((h) => h.reviewId)])];
  const { data: reviewRows } =
    ids.length === 0
      ? { data: [] as ReviewInfo[] }
      : await admin.from("reviews").select("id, body, rating, hidden_at, hospitals(id, name), profiles(display_name)").in("id", ids);
  const reviews = new Map((reviewRows as unknown as ReviewInfo[]).map((x) => [x.id, x]));

  const fmt = (iso: string) => new Date(iso).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });
  const excerpt = (s: string) => (s.length > 300 ? `${s.slice(0, 300)}…` : s);
  const actionText = {
    reasonPlaceholder: t.card.reasonPlaceholder,
    dismiss: t.actions.dismiss,
    hide: t.actions.hide,
    hideSuspend: t.actions.hideSuspend,
    confirmHide: t.confirm.hide,
    confirmHideSuspend: t.confirm.hideSuspend,
  };

  return (
    <>
      <section className="pb-9 pt-8">
        <Container className="space-y-4">
          <p className="text-xs text-muted">{t.breadcrumb}</p>
          <h1 className="text-3xl font-bold leading-snug md:text-[36px]">{t.title}</h1>
          <p className="max-w-3xl text-sm text-muted">{t.subtitle}</p>
          <Link href={`/${lang}/admin`} className="inline-block text-sm font-bold text-brand hover:underline">
            ← {t.back}
          </Link>
        </Container>
      </section>

      <Container className="space-y-10 pb-16">
        <section className="space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-2xl font-bold leading-snug md:text-[28px]">{t.queueTitle}</h2>
            <p className="text-sm text-muted">
              {t.open}: <strong className="text-star">{(openRows ?? []).length}</strong>
            </p>
          </div>

          {groups.length === 0 ? (
            <p className="text-sm text-muted">{t.empty}</p>
          ) : (
            <ul className="space-y-5">
              {groups.map((g) => {
                const rv = reviews.get(g.reviewId);
                if (!rv) return null;
                return (
                  <li key={g.reviewId} className="space-y-4 rounded-md border border-border bg-card p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-[19px] font-bold leading-snug">{rv.hospitals?.name ?? "—"}</p>
                        <p className="text-xs text-muted">
                          {t.card.author}: {rv.profiles?.display_name ?? "—"} · ★ {Number(rv.rating).toFixed(1)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {rv.hidden_at && <span className="rounded-full bg-error-soft px-3 py-1 text-xs font-bold text-error">{t.card.hidden}</span>}
                        <span className="rounded-full bg-star-soft px-3 py-1 text-xs font-bold text-star">{fill(t.card.reports, { n: g.count })}</span>
                      </div>
                    </div>

                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{excerpt(rv.body)}</p>
                    <Link href={`/${lang}/reviews/${rv.id}`} className="inline-block text-sm font-bold text-brand hover:underline">
                      {t.card.viewReview} →
                    </Link>

                    <div className="space-y-1.5">
                      <p className="text-xs text-muted">{t.card.reasons}</p>
                      <ul className="flex flex-wrap gap-1.5">
                        {REPORT_REASONS.filter((x) => g.reasons[x]).map((x) => (
                          <li key={x} className="rounded-full bg-star-soft px-2.5 py-1 text-[11px] text-star">
                            {r.reasons[x]} · {g.reasons[x]}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {g.details.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted">{t.card.details}</p>
                        <ul className="space-y-1.5">
                          {g.details.slice(0, 5).map((d, i) => (
                            <li key={i} className="break-words rounded-sm bg-surface p-3 text-xs">
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <ResolveForm lang={lang} reviewId={g.reviewId} alreadyHidden={Boolean(rv.hidden_at)} text={actionText} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-5">
          <h2 className="text-2xl font-bold leading-snug md:text-[28px]">{t.recent.title}</h2>
          {handled.length === 0 ? (
            <p className="text-sm text-muted">{t.recent.empty}</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border bg-card">
              {handled.map((h) => {
                const rv = reviews.get(h.reviewId);
                return (
                  <li key={h.reviewId} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-bold">{rv?.hospitals?.name ?? "—"}</p>
                      <p className="text-xs text-muted">
                        {rv?.profiles?.display_name ?? "—"} · {fmt(h.at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${h.status === "actioned" ? "bg-error-soft text-error" : "bg-brand-soft text-brand"}`}
                      >
                        {h.status === "actioned" ? t.recent.actioned : t.recent.dismissed}
                      </span>
                      {rv?.hidden_at && (
                        <>
                          <span className="text-xs text-muted">{t.recent.hiddenNow}</span>
                          <RestoreForm lang={lang} reviewId={rv.id} label={t.recent.restore} confirmText={t.recent.restoreConfirm} />
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex items-start gap-3 rounded-[12px] bg-brand-soft p-5">
          <Info className="size-5 shrink-0 text-brand" aria-hidden />
          <p className="text-xs leading-relaxed text-muted">{t.note}</p>
        </div>
      </Container>
    </>
  );
}
