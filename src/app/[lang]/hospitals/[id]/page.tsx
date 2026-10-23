import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ExternalLink, Info, MapPin, PenLine, Phone } from "lucide-react";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { aggregateReviews, type ReviewRow } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/container";
import { StarRating } from "@/components/star-rating";
import type { Metadata } from "next";
import { clinicDescription, pageMetadata } from "@/lib/seo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = 10;

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

type Filter = "all" | "english" | "director";
type Sort = "latest" | "high" | "low";

export async function generateMetadata({ params }: PageProps<"/[lang]/hospitals/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !UUID.test(id)) return {};
  const supabase = await createClient();
  const [{ data: hospital }, { data: stats }] = await Promise.all([
    supabase.from("hospitals").select("name, road_address, address").eq("id", id).maybeSingle(),
    supabase.from("hospital_stats").select("review_count, avg_rating").eq("hospital_id", id).maybeSingle(),
  ]);
  if (!hospital) return {};
  return pageMetadata({
    lang,
    path: `/hospitals/${id}`,
    title: hospital.name,
    description: clinicDescription({
      name: hospital.name,
      address: hospital.road_address || hospital.address,
      reviewCount: stats?.review_count ?? 0,
      avgRating: stats?.avg_rating === null || stats?.avg_rating === undefined ? null : Number(stats.avg_rating),
    }),
  });
}

export default async function HospitalPage({ params, searchParams }: PageProps<"/[lang]/hospitals/[id]">) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !UUID.test(id)) notFound();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const filter: Filter = one(sp.filter) === "english" || one(sp.filter) === "director" ? (one(sp.filter) as Filter) : "all";
  const sort: Sort = one(sp.sort) === "high" || one(sp.sort) === "low" ? (one(sp.sort) as Sort) : "latest";
  const limit = Math.min(Math.max(Number(one(sp.limit)) || PAGE, PAGE), 200);

  const dict = await getDictionary(lang);
  const t = dict.hospital.detail;
  const supabase = await createClient();

  const [{ data: hospital }, { data: reviews }] = await Promise.all([
    supabase.from("hospitals").select("*").eq("id", id).single(),
    supabase
      .from("reviews")
      .select("*, profiles(display_name)")
      .eq("hospital_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (!hospital) notFound();

  const all = reviews ?? [];
  const stats = aggregateReviews(all as unknown as ReviewRow[]);

  const filtered = all
    .filter((r) => (filter === "english" ? r.english_support === "fluent" : filter === "director" ? r.director_consultation : true))
    .sort((a, b) => (sort === "high" ? b.rating - a.rating : sort === "low" ? a.rating - b.rating : 0));
  const shown = filtered.slice(0, limit);

  const href = (patch: { filter?: Filter; sort?: Sort; limit?: number }) => {
    const next = { filter, sort, limit, ...patch };
    const p = new URLSearchParams();
    if (next.filter !== "all") p.set("filter", next.filter);
    if (next.sort !== "latest") p.set("sort", next.sort);
    if (next.limit > PAGE) p.set("limit", String(next.limit));
    const q = p.toString();
    return `/${lang}/hospitals/${id}${q ? `?${q}` : ""}#reviews`;
  };

  const address = hospital.road_address || hospital.address;
  const naverUrl = hospital.naver_link || `https://map.naver.com/p/search/${encodeURIComponent(`${hospital.name} ${address ?? ""}`.trim())}`;
  const googleUrl =
    hospital.lat && hospital.lng
      ? `https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hospital.name} ${address ?? ""}`.trim())}`;

  const summary = [
    stats.fluentEnglish > 0 && `${dict.hospital.englishFluent} ${stats.fluentEnglish}`,
    stats.director > 0 && `${dict.hospital.director} ${stats.director}`,
  ].filter(Boolean) as string[];

  const supportRows: [string, number][] = [
    [t.supportRows.english, stats.fluentEnglish],
    [t.supportRows.interpreter, stats.interpreter],
    [t.supportRows.director, stats.director],
    [t.supportRows.price, stats.priceExplained],
    [t.supportRows.upselling, stats.noUpselling],
  ];

  const chip = (active: boolean) =>
    `flex min-h-10 items-center rounded-full border px-3.5 py-2 text-[13px] ${
      active ? "border-brand bg-brand-soft font-bold text-brand" : "border-border bg-white text-muted hover:text-foreground"
    }`;

  const [crumbRoot, crumbHere] = t.breadcrumb.split("  /  ");

  return (
    <>
      {/* Identity */}
      <section className="bg-white py-7">
        <Container className="space-y-6">
          <p className="whitespace-pre text-[11px] text-muted">
            <Link href={`/${lang}/search`} className="hover:text-foreground">
              {crumbRoot}
            </Link>
            {"  /  "}
            {crumbHere}
          </p>
          <div className="space-y-2.5">
            {hospital.category && <p className="text-[11px] text-brand">{hospital.category}</p>}
            <h1 className="text-3xl font-bold leading-snug md:text-[40px]">{hospital.name}</h1>
            <div className="flex items-center gap-1.5">
              {stats.total > 0 ? (
                <>
                  <StarRating value={stats.avgRating ?? 0} size="size-[15px]" />
                  <span className="text-sm font-bold">{stats.avgRating?.toFixed(1)}</span>
                  <span className="text-xs text-muted">{fill(t.reviewCount, { n: stats.total })}</span>
                </>
              ) : (
                <span className="text-xs text-muted">{dict.search.noReviews}</span>
              )}
            </div>
            <p className="text-xs text-muted">{[address, ...summary].filter(Boolean).join(" · ")}</p>
          </div>
        </Container>
      </section>

      {/* Section navigation */}
      <nav className="border-y border-border bg-white">
        <Container className="flex gap-10 py-4 text-[13px]">
          <a href="#info" className="font-bold text-brand">{t.nav.info}</a>
          <a href="#support" className="text-muted hover:text-foreground">{t.nav.support}</a>
          <a href="#reviews" className="text-muted hover:text-foreground">{fill(t.nav.reviews, { n: stats.total })}</a>
        </Container>
      </nav>

      <Container className="grid gap-12 py-12 lg:grid-cols-[1fr_344px]">
        <div className="min-w-0 space-y-12">
          {/* Clinic info */}
          <section id="info" className="scroll-mt-6 space-y-5">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-brand">{t.infoEyebrow}</p>
              <h2 className="text-2xl font-bold leading-snug md:text-[30px]">{t.infoTitle}</h2>
              <p className="text-sm text-muted">{t.infoSubtitle}</p>
            </div>
            <dl className="space-y-5">
              <div className="space-y-1">
                <dt className="flex items-center gap-1.5 text-[15px] font-bold">
                  <MapPin className="size-4 text-muted" aria-hidden />
                  {t.address}
                </dt>
                <dd className="text-sm">{address}</dd>
                {hospital.road_address && hospital.address && (
                  <dd className="text-xs text-muted">
                    {t.jibun}: {hospital.address}
                  </dd>
                )}
              </div>
              {hospital.phone && (
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-[15px] font-bold">
                    <Phone className="size-4 text-muted" aria-hidden />
                    {t.phone}
                  </dt>
                  <dd className="text-sm">
                    <a href={`tel:${hospital.phone}`} className="hover:text-brand">{hospital.phone}</a>
                  </dd>
                </div>
              )}
            </dl>
            <div className="space-y-3 rounded-md border border-border bg-card p-5">
              <p className="text-[15px] font-bold">{t.mapTitle}</p>
              <div className="flex flex-wrap gap-3">
                <a href={naverUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-2 rounded-sm border border-border bg-white px-5 py-3 text-sm font-bold text-brand hover:bg-brand-soft">
                  {t.naverMap}
                  <ExternalLink className="size-4" aria-hidden />
                </a>
                <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-2 rounded-sm border border-border bg-white px-5 py-3 text-sm font-bold text-brand hover:bg-brand-soft">
                  {t.googleMap}
                  <ExternalLink className="size-4" aria-hidden />
                </a>
              </div>
            </div>
          </section>

          {/* Language support, from reviews */}
          <section id="support" className="scroll-mt-6 space-y-4 rounded-md bg-[#eaf1f8] p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold">{t.supportTitle}</h2>
              <p className="text-xs text-muted">{t.supportSubtitle}</p>
            </div>
            {stats.total === 0 ? (
              <p className="text-sm text-muted">{t.supportEmpty}</p>
            ) : (
              <dl className="space-y-4">
                {supportRows.map(([label, n]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 border-t border-[#c8d8e8] pt-3 first:border-t-0 first:pt-0">
                    <dt className="text-[13px] font-bold">{label}</dt>
                    <dd className="text-[13px] text-muted">{n} / {stats.total}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="text-[11px] text-muted">{t.supportNote}</p>
          </section>

          {/* Reviews */}
          <section id="reviews" className="scroll-mt-6 space-y-6 rounded-lg bg-surface p-5 md:p-7">
            <p className="text-[11px] font-bold text-muted">{t.reviewsEyebrow}</p>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold leading-snug md:text-[30px]">{t.reviewsTitle}</h2>
              <p className="text-sm text-muted">{t.reviewsSubtitle}</p>
            </div>

            {stats.total > 0 ? (
              <>
                <div className="flex items-center gap-6">
                  <p className="text-[44px] font-bold leading-none">{stats.avgRating?.toFixed(1)}</p>
                  <div className="space-y-1">
                    <StarRating value={stats.avgRating ?? 0} size="size-4" />
                    <p className="text-xs text-muted">{fill(t.reviewCount, { n: stats.total })}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(["all", "english", "director"] as const).map((f) => (
                    <Link key={f} href={href({ filter: f, limit: PAGE })} scroll={false} aria-current={filter === f} className={chip(filter === f)}>
                      {t.filters[f]}
                    </Link>
                  ))}
                  <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
                  {(["latest", "high", "low"] as const).map((s) => (
                    <Link key={s} href={href({ sort: s, limit: PAGE })} scroll={false} aria-current={sort === s} className={chip(sort === s)}>
                      {t.sorts[s]}
                    </Link>
                  ))}
                </div>

                {shown.length === 0 ? (
                  <p className="text-sm text-muted">{t.noMatch}</p>
                ) : (
                  <ul className="space-y-4">
                    {shown.map((r) => {
                      const author = (r.profiles as unknown as { display_name: string | null } | null)?.display_name;
                      const badges = [
                        r.english_support !== "none" && `${dict.review.english}: ${dict.review.englishOptions[r.english_support as "basic" | "fluent"]}`,
                        r.interpreter_available && dict.review.interpreter,
                        r.director_consultation && dict.hospital.director,
                        r.price_explained && dict.review.priceExplained,
                        r.no_upselling && dict.review.noUpselling,
                      ].filter(Boolean) as string[];
                      const ym = (r.visit_date ?? r.created_at).slice(0, 7).replace("-", ".");
                      return (
                        <li key={r.id} className="space-y-4 rounded-md border border-border bg-card p-6">
                          <div className="flex items-start justify-between gap-3">
                            <p className="flex items-center gap-2 text-[13px] font-semibold">
                              {author ?? "—"}
                              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-normal text-brand">
                                <BadgeCheck className="size-3" aria-hidden />
                                {dict.hospital.verified}
                              </span>
                            </p>
                            <p className="text-xs text-star">★ {r.rating.toFixed(1)}</p>
                          </div>
                          <p className="text-[10px] text-muted">
                            {fill(t.visitMonth, { ym })}
                            {r.treatment && ` · ${r.treatment}`}
                          </p>
                          {badges.length > 0 && (
                            <ul className="flex flex-wrap gap-1.5 text-[11px]">
                              {badges.map((b) => (
                                <li key={b} className="rounded-full border border-border px-2.5 py-0.5 text-muted">{b}</li>
                              ))}
                            </ul>
                          )}
                          <p className="line-clamp-6 whitespace-pre-line text-[13px] leading-relaxed text-muted">{r.body}</p>
                          <Link href={`/${lang}/reviews/${r.id}`} className="inline-block text-xs font-bold text-brand hover:underline">
                            {dict.reviewDetail.readMore} →
                          </Link>
                          <p className="text-[10px] text-muted">{t.cardNote}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {filtered.length > shown.length && (
                  <Link href={href({ limit: limit + PAGE })} scroll={false} className="flex min-h-12 items-center justify-center rounded-sm border border-border bg-white px-5 py-3 text-sm font-bold text-brand hover:bg-brand-soft">
                    {t.more}
                  </Link>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">{dict.hospital.noReviews}</p>
            )}
          </section>

          <div className="flex items-start gap-3 rounded-[12px] bg-brand-soft p-5">
            <Info className="size-5 shrink-0 text-brand" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-bold text-brand">{t.medicalTitle}</p>
              <p className="text-xs leading-relaxed text-muted">{t.medicalBody}</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-5 rounded-md border border-border bg-card p-6">
            <p className="text-[10px] font-bold text-brand">{t.ctaEyebrow}</p>
            <p className="text-xl font-bold leading-snug">{t.ctaTitle}</p>
            <p className="text-[13px] text-muted">{t.ctaBody}</p>
            <Link href={`/${lang}/hospitals/${id}/review`} className="flex min-h-12 items-center justify-center gap-2 rounded-sm bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-strong">
              <PenLine className="size-5" aria-hidden />
              {t.ctaButton}
            </Link>
            <p className="text-[11px] text-muted">{t.ctaNote}</p>
          </div>
          <div className="flex items-start gap-3 rounded-[12px] bg-brand-soft p-5">
            <Info className="size-5 shrink-0 text-brand" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-bold text-brand">{t.sourceTitle}</p>
              <p className="text-xs leading-relaxed text-muted">{t.sourceBody}</p>
            </div>
          </div>
        </aside>
      </Container>
    </>
  );
}
