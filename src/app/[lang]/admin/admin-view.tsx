import { Info } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Container } from "@/components/container";
import { decideReceipt } from "./actions";
import { GrantAdminForm, RevokeAdminForm } from "./admin-roles";

export type Counts = { pending: number; auto_approved: number; approved: number; rejected: number };

export type QueueItem = {
  id: string;
  url: string | null;
  created_at: string;
  hospital: string;
  uploader: string;
  ocr_store_name: string | null;
  ocr_paid_on: string | null;
  ocr_total: number | null;
  match_score: number | null;
  reasons: string[];
};

export type RecentItem = {
  id: string;
  status: "approved" | "rejected";
  hospital: string;
  uploader: string;
  reviewer: string;
  reviewed_at: string;
  reject_reason: string | null;
};

export type AdminItem = { id: string; name: string; email: string | null };

const fmt = (iso: string, lang: Locale) =>
  new Date(iso).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });

export function AdminView({
  lang,
  dict,
  counts,
  queue,
  recent,
  admins,
  currentId,
}: {
  lang: Locale;
  dict: Dictionary;
  counts: Counts;
  queue: QueueItem[];
  recent: RecentItem[];
  admins: AdminItem[];
  currentId: string;
}) {
  const t = dict.admin;
  const stats = [
    { key: "pending", label: t.stats.pending, value: counts.pending, tone: "text-star" },
    { key: "auto", label: t.stats.autoApproved, value: counts.auto_approved, tone: "text-brand" },
    { key: "approved", label: t.stats.approved, value: counts.approved, tone: "text-brand" },
    { key: "rejected", label: t.stats.rejected, value: counts.rejected, tone: "text-error" },
  ];

  return (
    <>
      <section className="pb-9 pt-8">
        <Container className="space-y-4">
          <p className="text-xs text-muted">{t.breadcrumb}</p>
          <h1 className="text-3xl font-bold leading-snug md:text-[36px]">{t.title}</h1>
          <p className="max-w-3xl text-sm text-muted">{t.subtitle}</p>
        </Container>
      </section>

      <Container className="space-y-10 pb-16">
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <li key={s.key} className="space-y-1 rounded-md border border-border bg-card p-5">
              <p className="text-xs text-muted">{s.label}</p>
              <p className={`text-[30px] font-bold leading-none ${s.tone}`}>{s.value}</p>
            </li>
          ))}
        </ul>

        {/* Queue */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold leading-snug md:text-[28px]">{t.queueTitle}</h2>
          {queue.length === 0 ? (
            <p className="text-sm text-muted">{t.empty}</p>
          ) : (
            <ul className="space-y-5">
              {queue.map((r) => {
                const ocr: [string, string][] = [
                  [t.card.hospital, r.hospital],
                  [t.card.ocrStore, r.ocr_store_name ?? "—"],
                  [t.card.ocrDate, r.ocr_paid_on ?? "—"],
                  [t.card.ocrTotal, r.ocr_total !== null ? `${r.ocr_total.toLocaleString()} KRW` : "—"],
                  [t.card.score, r.match_score !== null ? `${Math.round(r.match_score * 100)}%` : t.card.noOcr],
                ];
                return (
                  <li key={r.id} className="grid gap-6 rounded-md border border-border bg-card p-5 md:grid-cols-[240px_1fr] md:p-6">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label={t.card.viewImage} className="block space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.url} alt="" className="max-h-[300px] w-full rounded-sm border border-border bg-surface object-contain" />
                        <span className="text-xs text-brand hover:underline">{t.card.viewImage}</span>
                      </a>
                    ) : (
                      <div className="rounded-sm bg-surface" />
                    )}

                    <div className="min-w-0 space-y-4">
                      <div className="space-y-1">
                        <p className="text-[19px] font-bold leading-snug">{r.hospital}</p>
                        <p className="text-xs text-muted">
                          {t.card.uploader}: {r.uploader} · {t.card.uploadedAt} {fmt(r.created_at, lang)}
                        </p>
                      </div>

                      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
                        {ocr.map(([label, value]) => (
                          <div key={label} className="contents">
                            <dt className="text-muted">{label}</dt>
                            <dd className="min-w-0 break-words font-medium">{value}</dd>
                          </div>
                        ))}
                      </dl>

                      {r.reasons.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted">{t.card.autoReasons}</p>
                          <ul className="flex flex-wrap gap-1.5">
                            {r.reasons.map((x) => (
                              <li key={x} className="rounded-full bg-star-soft px-2.5 py-1 text-[11px] text-star">
                                {dict.reasons[x as keyof typeof dict.reasons] ?? x}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <form action={decideReceipt} className="space-y-3">
                        <input type="hidden" name="lang" value={lang} />
                        <input type="hidden" name="receiptId" value={r.id} />
                        <input
                          name="reason"
                          maxLength={200}
                          placeholder={t.card.reasonPlaceholder}
                          className="min-h-[52px] w-full rounded-sm border border-border bg-white p-3.5 text-sm outline-none focus:border-focus"
                        />
                        <div className="flex flex-wrap gap-3">
                          <button name="decision" value="approved" className="min-h-12 rounded-sm bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-strong">
                            {t.card.approve}
                          </button>
                          <button name="decision" value="rejected" className="min-h-12 rounded-sm border border-error bg-white px-5 py-3 text-sm font-bold text-error hover:bg-error-soft">
                            {t.card.reject}
                          </button>
                        </div>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recently decided */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold leading-snug md:text-[28px]">{t.recent.title}</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">{t.recent.empty}</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border bg-card">
              {recent.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-bold">{r.hospital}</p>
                    <p className="text-xs text-muted">
                      {r.uploader} · {t.recent.by} {r.reviewer} · {fmt(r.reviewed_at, lang)}
                      {r.reject_reason && ` · ${r.reject_reason}`}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${r.status === "approved" ? "bg-brand-soft text-brand" : "bg-error-soft text-error"}`}>
                    {t.recent[r.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Administrators */}
        <section className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold leading-snug md:text-[28px]">{t.roles.title}</h2>
            <p className="text-sm text-muted">{t.roles.subtitle}</p>
          </div>
          <ul className="divide-y divide-border rounded-md border border-border bg-card">
            {admins.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-bold">
                    {a.name}
                    {a.id === currentId && <span className="ml-2 rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] text-brand">{t.roles.you}</span>}
                  </p>
                  <p className="break-all text-xs text-muted">{a.email ?? "—"}</p>
                </div>
                {admins.length > 1 ? (
                  <RevokeAdminForm lang={lang} userId={a.id} label={t.roles.revoke} confirmText={t.roles.revokeConfirm} />
                ) : (
                  <span className="text-xs text-muted">{t.roles.lastAdmin}</span>
                )}
              </li>
            ))}
          </ul>
          <GrantAdminForm lang={lang} text={t.roles} />
        </section>

        <div className="flex items-start gap-3 rounded-[12px] bg-brand-soft p-5">
          <Info className="size-5 shrink-0 text-brand" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-bold text-brand">{t.note.title}</p>
            <p className="text-xs leading-relaxed text-muted">{t.note.body}</p>
          </div>
        </div>
      </Container>
    </>
  );
}
