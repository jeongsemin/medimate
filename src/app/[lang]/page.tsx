import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  Droplets,
  HeartPulse,
  MessageSquare,
  Shield,
  Sparkles,
  Sun,
} from "lucide-react";
import { hasLocale, localeNames, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/container";
import { SearchForm } from "@/components/search-form";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

const AREA_IMAGES = ["area-gangnam", "area-myeongdong", "area-hongdae", "area-busan"];
const TREATMENT_ICONS = [Sparkles, Droplets, Sun, HeartPulse];
const SOURCE_ICONS = [Building2, MessageSquare, Shield];

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-bold text-brand">{children}</p>
);

function SectionIntro({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="space-y-2">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-2xl font-bold leading-snug md:text-[30px]">{title}</h2>
      <p className="text-sm text-muted">{subtitle}</p>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  // the home page uses the layout's default title, so only the social title is set here
  return pageMetadata({ lang, description: dict.meta.description, socialTitle: dict.meta.title });
}

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const h = dict.home;

  // Real data only: clinics with the most verified reviews, and the latest reviews.
  const supabase = await createClient();
  const [{ data: topStats }, { data: latest }] = await Promise.all([
    supabase
      .from("hospital_stats")
      .select("hospital_id, review_count, avg_rating, fluent_english_count, director_count")
      .gt("review_count", 0)
      .order("review_count", { ascending: false })
      .limit(4),
    supabase
      .from("reviews")
      .select("id, rating, body, treatment, visit_date, created_at, profiles(display_name), hospitals(id, name)")
      .order("created_at", { ascending: false })
      .limit(2),
  ]);
  const { data: topHospitals } = topStats?.length
    ? await supabase
        .from("hospitals")
        .select("id, name, category, road_address, address")
        .in("id", topStats.map((s) => s.hospital_id))
    : { data: [] };
  const featured = (topStats ?? []).flatMap((s) => {
    const hospital = topHospitals?.find((x) => x.id === s.hospital_id);
    return hospital ? [{ ...hospital, ...s }] : [];
  });

  return (
    <>
      {/* Hero + search */}
      <section className="bg-surface pb-12 pt-10 md:pt-14">
        <Container className="space-y-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_510px] lg:gap-[72px]">
            <div className="space-y-5">
              <Eyebrow>{h.eyebrow}</Eyebrow>
              <h1 className="text-4xl font-bold leading-tight md:text-[52px] md:leading-tight">
                {h.title[0]}
                <br />
                {h.title[1]}
              </h1>
              <p className="text-base text-muted">
                {h.subtitle[0]}
                <br className="hidden sm:block" /> {h.subtitle[1]}
              </p>
              <ul className="flex flex-wrap gap-5 text-xs">
                {h.values.map((v) => (
                  <li key={v} className="flex items-center gap-1.5">
                    <Check className="size-4 text-brand" aria-hidden />
                    {v}
                  </li>
                ))}
              </ul>
            </div>
            <figure className="space-y-3">
              <div className="relative h-[240px] overflow-hidden rounded-md md:h-[340px]">
                <Image
                  src="/images/home/hero-seoul.jpg"
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1024px) 510px, 100vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="flex justify-between text-[10px] text-muted">
                <span>{h.photoPlace}</span>
                <span>{h.photoNote}</span>
              </figcaption>
            </figure>
          </div>

          <SearchForm lang={lang} dict={dict} />
        </Container>
      </section>

      {/* Areas and treatments */}
      <Container className="space-y-[60px] py-12 md:py-16">
        <section className="space-y-6">
          <SectionIntro eyebrow={h.areas.eyebrow} title={h.areas.title} subtitle={h.areas.subtitle} />
          <ul className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {h.areas.items.map((a, i) => (
              <li key={a.q}>
                <Link href={`/${lang}/search?area=${encodeURIComponent(a.q)}`} className="group block space-y-2.5">
                  <div className="relative h-[140px] overflow-hidden rounded-[14px] md:h-[185px]">
                    <Image
                      src={`/images/home/${AREA_IMAGES[i]}.jpg`}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 285px, 50vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="flex items-start justify-between">
                    <p className="text-[19px] font-bold">{a.name}</p>
                    <ArrowUpRight className="size-[17px] text-brand" aria-hidden />
                  </div>
                  <p className="text-[11px] text-muted">{a.desc}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-6">
          <SectionIntro eyebrow={h.treatments.eyebrow} title={h.treatments.title} subtitle={h.treatments.subtitle} />
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {h.treatments.items.map((t, i) => {
              const Icon = TREATMENT_ICONS[i];
              return (
                <li key={t.q}>
                  <Link
                    href={`/${lang}/search?treatment=${encodeURIComponent(t.q)}`}
                    className="flex items-center gap-4 rounded-[14px] bg-surface p-5 hover:bg-brand-soft"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-white">
                      <Icon className="size-5 text-brand" aria-hidden />
                    </span>
                    <span className="text-sm font-bold">{t.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </Container>

      {/* Clinics with the most verified reviews (hidden until there is data) */}
      {featured.length > 0 && (
        <section className="bg-background py-12 md:py-16">
          <Container className="space-y-6">
            <SectionIntro eyebrow={h.featured.eyebrow} title={h.featured.title} subtitle={h.featured.subtitle} />
            <ul className="grid gap-6 md:grid-cols-2">
              {featured.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/${lang}/hospitals/${c.id}`}
                    className="block h-full space-y-3 rounded-md border border-border bg-card p-5 hover:border-brand"
                  >
                    {c.category && <p className="text-[10px] font-bold text-brand">{c.category}</p>}
                    <p className="text-[19px] font-bold">{c.name}</p>
                    <p className="text-xs">
                      <span className="text-star">★</span> {c.avg_rating} · {h.featured.reviews} {c.review_count}
                    </p>
                    <p className="text-xs text-muted">{c.road_address || c.address}</p>
                    {(c.fluent_english_count > 0 || c.director_count > 0) && (
                      <p className="text-xs text-brand">
                        {[
                          c.fluent_english_count > 0 && `${h.featured.english} ${c.fluent_english_count}`,
                          c.director_count > 0 && `${h.featured.director} ${c.director_count}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* Latest verified reviews (hidden until there is data) */}
      {latest && latest.length > 0 && (
        <Container className="space-y-6 py-12 md:py-16">
          <SectionIntro eyebrow={h.latest.eyebrow} title={h.latest.title} subtitle={h.latest.subtitle} />
          <ul className="grid gap-6 md:grid-cols-2">
            {latest.map((r) => {
              const author = r.profiles as unknown as { display_name: string | null } | null;
              const hospital = r.hospitals as unknown as { id: string; name: string } | null;
              const month = (r.visit_date ?? r.created_at).slice(0, 7).replace("-", ".");
              return (
                <li key={r.id} className="space-y-4 rounded-md border border-border bg-card p-6">
                  <div className="flex items-start justify-between">
                    <p className="text-[13px] font-semibold">{author?.display_name ?? "—"}</p>
                    <p className="text-xs text-star">★ {r.rating.toFixed(1)}</p>
                  </div>
                  <p className="text-[10px] text-muted">{month}</p>
                  <p className="line-clamp-4 text-[13px] leading-relaxed text-muted">{r.body}</p>
                  <Link href={`/${lang}/reviews/${r.id}`} className="inline-block text-xs font-bold text-brand hover:underline">
                    {dict.reviewDetail.readMore} →
                  </Link>
                  {hospital && (
                    <Link href={`/${lang}/hospitals/${hospital.id}`} className="block text-[11px] text-brand hover:underline">
                      {hospital.name}
                      {r.treatment && ` · ${r.treatment}`}
                    </Link>
                  )}
                  <p className="text-[10px] text-muted">{h.latest.note}</p>
                </li>
              );
            })}
          </ul>
        </Container>
      )}

      {/* Language support */}
      <Container className="py-12 md:py-16">
        <div className="flex flex-col gap-8 rounded-[20px] bg-deep p-8 text-white md:flex-row md:items-center md:gap-8 md:p-10">
          <div className="flex-1 space-y-3">
            <p className="text-[11px] text-[#9cd3ce]">{h.language.eyebrow}</p>
            <h2 className="text-2xl font-bold leading-snug md:text-[30px]">
              {h.language.title[0]}
              <br />
              {h.language.title[1]}
            </h2>
            <p className="text-[13px] leading-relaxed text-[#c0d2d5]">{h.language.body}</p>
          </div>
          <ul className="w-full space-y-4 md:w-[260px]">
            {locales.map((l) => (
              <li key={l}>
                <Link href={`/${l}`} className="flex items-center justify-between text-base hover:text-[#9cd3ce]">
                  {localeNames[l]}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      {/* Information transparency */}
      <Container className="space-y-6 pb-12 md:pb-16">
        <SectionIntro eyebrow={h.transparency.eyebrow} title={h.transparency.title} subtitle={h.transparency.subtitle} />
        <ul className="grid gap-4 md:grid-cols-3">
          {h.transparency.items.map((item, i) => {
            const Icon = SOURCE_ICONS[i];
            return (
              <li key={item.title} className="space-y-3 rounded-md border border-border p-6">
                <Icon className="size-6 text-brand" aria-hidden />
                <h3 className="text-base font-bold">{item.title}</h3>
                <p className="text-xs leading-relaxed text-muted">{item.body}</p>
              </li>
            );
          })}
        </ul>
      </Container>

      {/* FAQ */}
      <Container className="space-y-5 pb-12 md:pb-16">
        <h2 className="text-2xl font-bold md:text-[30px]">{h.faq.title}</h2>
        <dl>
          {h.faq.items.map((item) => (
            <div key={item.q} className="space-y-2.5 border-t border-border py-5">
              <dt className="text-[15px] font-bold">{item.q}</dt>
              <dd className="text-[13px] text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </>
  );
}
