import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Info } from "lucide-react";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireProfile } from "@/lib/auth";
import { AGE_GROUPS, COUNTRY_CODES, GENDERS } from "@/lib/member-details";
import { PAGE_SIZE, STATUSES, hasMemberFilters, memberQuery, parseMemberFilters } from "@/lib/member-filters";
import { createAdminClient } from "@/lib/supabase/admin";
import { Container } from "@/components/container";
import { MembersTable, type MemberRow } from "./members-table";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

type Row = {
  id: string;
  email: string | null;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
  country: string | null;
  age_group: string | null;
  gender: string | null;
  suspended: boolean;
  suspended_reason: string | null;
  receipt_count: number;
  review_count: number;
  total_count: number;
};

export async function generateMetadata({ params }: PageProps<"/[lang]/admin/members">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return pageMetadata({ lang, path: "/admin/members", title: dict.admin.members.title, noindex: true });
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default async function MembersPage({ params, searchParams }: PageProps<"/[lang]/admin/members">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const profile = await requireProfile(lang, `/${lang}/admin/members`);
  if (!profile.is_admin) notFound();
  const dict = await getDictionary(lang);
  const t = dict.admin.members;
  const f = parseMemberFilters(await searchParams);

  const admin = createAdminClient();
  const count = async (table: "profiles" | "suspensions", admins = false) => {
    let q = admin.from(table).select("*", { count: "exact", head: true });
    if (admins) q = q.eq("is_admin", true);
    return (await q).count ?? 0;
  };
  const [{ data, error }, total, suspended, admins] = await Promise.all([
    admin.rpc("admin_list_members", {
      p_q: f.q,
      p_country: f.country,
      p_age: f.age,
      p_gender: f.gender,
      p_status: f.status,
      p_from: f.from || null,
      p_to: f.to || null,
      p_limit: PAGE_SIZE,
      p_offset: (f.page - 1) * PAGE_SIZE,
    }),
    count("profiles"),
    count("suspensions"),
    count("profiles", true),
  ]);
  if (error) throw new Error(`admin_list_members failed: ${error.message}`);
  const list = (data ?? []) as Row[];
  if (list.length === 0 && f.page > 1) redirect(`/${lang}/admin/members${memberQuery(f, 1)}`);

  const matching = list[0]?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(matching / PAGE_SIZE));

  const regions = new Intl.DisplayNames(lang, { type: "region" });
  const countries = COUNTRY_CODES.map((code) => ({ code, name: regions.of(code) ?? code })).sort((a, b) =>
    a.name.localeCompare(b.name, lang),
  );
  const mine = dict.my.details;
  const label = (map: Record<string, string>, v: string | null) => (v ? (map[v] ?? v) : t.unset);

  const rows: MemberRow[] = list.map((r) => ({
    id: r.id,
    name: r.display_name ?? "—",
    email: r.email ?? "—",
    joined: new Date(r.created_at).toLocaleDateString(lang),
    country: r.country ? (regions.of(r.country) ?? r.country) : t.unset,
    age: label(mine.ageOptions, r.age_group),
    gender: label(mine.genderOptions, r.gender),
    receipts: r.receipt_count,
    reviews: r.review_count,
    isAdmin: r.is_admin,
    suspended: r.suspended,
    reason: r.suspended_reason,
    isSelf: r.id === profile.id,
  }));

  const stats = [
    { key: "total", label: t.stats.total, value: total, tone: "text-foreground" },
    { key: "active", label: t.stats.active, value: Math.max(total - suspended, 0), tone: "text-brand" },
    { key: "suspended", label: t.stats.suspended, value: suspended, tone: "text-error" },
    { key: "admins", label: t.stats.admins, value: admins, tone: "text-brand" },
  ];

  const field = "block space-y-1.5";
  const input = "min-h-12 w-full rounded-sm border border-border bg-white px-3.5 text-sm outline-none focus:border-focus";
  const pageLink = (page: number, text: string, disabled: boolean) =>
    disabled ? (
      <span className="flex min-h-12 items-center rounded-sm border border-border px-5 text-sm text-muted opacity-50">{text}</span>
    ) : (
      <Link
        href={`/${lang}/admin/members${memberQuery(f, page)}`}
        className="flex min-h-12 items-center rounded-sm border border-border bg-white px-5 text-sm font-bold text-brand hover:bg-brand-soft"
      >
        {text}
      </Link>
    );

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

      <Container className="space-y-8 pb-16">
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <li key={s.key} className="space-y-1 rounded-md border border-border bg-card p-5">
              <p className="text-xs text-muted">{s.label}</p>
              <p className={`text-[30px] font-bold leading-none ${s.tone}`}>{s.value.toLocaleString(lang)}</p>
            </li>
          ))}
        </ul>

        {/* Filters: a plain GET form, so the URL is shareable and the back button works. */}
        <form method="get" key={`filters${memberQuery(f, 1)}`}className="space-y-4 rounded-md border border-border bg-card p-5 md:p-6">
          <h2 className="text-lg font-bold">{t.filters.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className={field}>
              <span className="text-[13px] font-bold">{t.filters.search}</span>
              <input name="q" defaultValue={f.q} maxLength={100} placeholder={t.filters.searchPlaceholder} className={input} />
            </label>
            <label className={field}>
              <span className="text-[13px] font-bold">{t.filters.status}</span>
              <select name="status" defaultValue={f.status} className={input}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t.statusOptions[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className={field}>
              <span className="text-[13px] font-bold">{t.filters.country}</span>
              <select name="country" defaultValue={f.country} className={input}>
                <option value="">{t.filters.any}</option>
                <option value="unset">{t.filters.unset}</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={field}>
              <span className="text-[13px] font-bold">{t.filters.age}</span>
              <select name="age" defaultValue={f.age} className={input}>
                <option value="">{t.filters.any}</option>
                <option value="unset">{t.filters.unset}</option>
                {AGE_GROUPS.map((a) => (
                  <option key={a} value={a}>
                    {mine.ageOptions[a]}
                  </option>
                ))}
              </select>
            </label>
            <label className={field}>
              <span className="text-[13px] font-bold">{t.filters.gender}</span>
              <select name="gender" defaultValue={f.gender} className={input}>
                <option value="">{t.filters.any}</option>
                <option value="unset">{t.filters.unset}</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {mine.genderOptions[g]}
                  </option>
                ))}
              </select>
            </label>
            <label className={field}>
              <span className="text-[13px] font-bold">{t.filters.from}</span>
              <input type="date" name="from" defaultValue={f.from} className={input} />
            </label>
            <label className={field}>
              <span className="text-[13px] font-bold">{t.filters.to}</span>
              <input type="date" name="to" defaultValue={f.to} className={input} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="min-h-12 rounded-sm bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-strong">
              {t.filters.apply}
            </button>
            {hasMemberFilters(f) && (
              <Link href={`/${lang}/admin/members`} className="flex min-h-12 items-center px-3 text-sm font-bold text-brand hover:underline">
                {t.filters.reset}
              </Link>
            )}
            <p className="ml-auto text-sm text-muted">
              {t.stats.matching}: <strong className="text-foreground">{matching.toLocaleString(lang)}</strong>
            </p>
          </div>
        </form>

        {/* Keyed by page and filters so the checkbox selection resets when the list changes. */}
        <MembersTable key={`table${memberQuery(f)}`}lang={lang} rows={rows} text={t} />

        {pages > 1 && (
          <nav className="flex flex-wrap items-center justify-between gap-3" aria-label={t.pageOf}>
            {pageLink(f.page - 1, t.prev, f.page <= 1)}
            <p className="text-sm text-muted">{fill(t.pageOf, { page: f.page, pages })}</p>
            {pageLink(f.page + 1, t.next, f.page >= pages)}
          </nav>
        )}

        <div className="flex items-start gap-3 rounded-[12px] bg-brand-soft p-5">
          <Info className="size-5 shrink-0 text-brand" aria-hidden />
          <p className="text-xs leading-relaxed text-muted">{t.privacy}</p>
        </div>
      </Container>
    </>
  );
}
