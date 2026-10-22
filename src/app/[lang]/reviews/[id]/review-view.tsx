import Link from "next/link";
import { Info, MapPin } from "lucide-react";
import { hasLocale, localeNames, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Container } from "@/components/container";
import { StarRating } from "@/components/star-rating";

export type ReviewData = {
  id: string;
  rating: number;
  body: string;
  treatment: string | null;
  visit_date: string | null;
  created_at: string;
  lang: string;
  english_support: "none" | "basic" | "fluent";
  interpreter_available: boolean;
  director_consultation: boolean;
  price_explained: boolean;
  no_upselling: boolean;
  author: string | null;
};

export type ClinicData = {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  review_count: number;
  avg_rating: number | null;
  fluent_english_count: number;
  director_count: number;
};

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export function ReviewView({
  lang,
  dict,
  review,
  clinic,
}: {
  lang: Locale;
  dict: Dictionary;
  review: ReviewData;
  clinic: ClinicData;
}) {
  const t = dict.reviewDetail;
  const author = review.author ?? "—";
  const ym = (review.visit_date ?? review.created_at).slice(0, 7).replace("-", ".");
  const writtenIn = hasLocale(review.lang) ? localeNames[review.lang] : review.lang;

  const tags = [
    review.english_support !== "none" && `${dict.review.english}: ${dict.review.englishOptions[review.english_support]}`,
    review.interpreter_available && dict.review.interpreter,
    review.director_consultation && dict.hospital.director,
    review.price_explained && dict.review.priceExplained,
    review.no_upselling && dict.review.noUpselling,
  ].filter(Boolean) as string[];

  const clinicBadges = [
    clinic.fluent_english_count > 0 && `${dict.hospital.englishFluent} ${clinic.fluent_english_count}`,
    clinic.director_count > 0 && `${dict.hospital.director} ${clinic.director_count}`,
  ].filter(Boolean) as string[];

  const [crumbHead, crumbTail] = fill(t.breadcrumb, { name: clinic.name }).split("  /  ");

  return (
    <>
      <section className="bg-surface pb-10 pt-8">
        <Container className="space-y-5">
          <p className="whitespace-pre text-xs text-muted">
            <Link href={`/${lang}/hospitals/${clinic.id}`} className="hover:text-foreground">
              {crumbHead}
            </Link>
            {"  /  "}
            {crumbTail}
          </p>
          <p className="text-[11px] font-bold text-brand">{t.eyebrow}</p>
          <h1 className="text-3xl font-bold leading-snug md:text-[36px]">{clinic.name}</h1>
          <p className="text-[15px] text-muted">{fill(t.subtitle, { author })}</p>
        </Container>
      </section>

      <Container className="grid items-start gap-12 py-12 lg:grid-cols-[1fr_352px] lg:gap-16">
        <article className="min-w-0 space-y-8">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-lg text-brand" aria-hidden>
              {author.slice(0, 1).toUpperCase()}
            </span>
            <div className="space-y-1">
              <p className="text-[15px] font-semibold">{author}</p>
              <p className="text-[11px] text-muted">
                {fill(t.written, { date: new Date(review.created_at).toLocaleDateString(lang), lang: writtenIn })}
              </p>
            </div>
          </div>

          <div className="space-y-3.5 rounded-md bg-surface p-6">
            <div className="flex items-center gap-2.5">
              <StarRating value={review.rating} size="size-5" />
              <span className="text-xl font-bold">{review.rating.toFixed(1)}</span>
            </div>
            <dl className="grid gap-5 sm:grid-cols-3">
              {(
                [
                  [t.meta.visit, ym],
                  [t.meta.treatment, review.treatment ?? "—"],
                  [t.meta.clinic, clinic.name],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="min-w-0 space-y-1">
                  <dt className="text-[11px] text-muted">{label}</dt>
                  <dd className="break-words text-sm font-bold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="whitespace-pre-line text-base leading-relaxed">{review.body}</p>

          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag} className="flex min-h-10 items-center rounded-full border border-border bg-white px-3.5 py-2 text-[13px] text-muted">
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-start gap-3 rounded-[12px] bg-brand-soft p-5">
            <Info className="size-5 shrink-0 text-brand" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-bold text-brand">{t.privacyTitle}</p>
              <p className="text-xs leading-relaxed text-muted">{t.privacyBody}</p>
            </div>
          </div>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <p className="text-base font-bold">{t.sidebarTitle}</p>
          <div className="space-y-3 rounded-md border border-border bg-card p-5">
            {clinic.category && <p className="text-[10px] font-bold text-brand">{clinic.category}</p>}
            <p className="text-[19px] font-bold leading-snug">{clinic.name}</p>
            <p className="text-xs">
              {clinic.review_count > 0 ? (
                <>
                  <span className="text-star">★</span> {clinic.avg_rating?.toFixed(1)} · {dict.hospital.reviews} {clinic.review_count}
                </>
              ) : (
                <span className="text-muted">{dict.search.noReviews}</span>
              )}
            </p>
            {clinic.address && (
              <p className="flex items-start gap-1 text-xs text-muted">
                <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {clinic.address}
              </p>
            )}
            {clinicBadges.length > 0 && <p className="text-xs text-brand">{clinicBadges.join(" · ")}</p>}
          </div>
          <Link
            href={`/${lang}/hospitals/${clinic.id}`}
            className="flex min-h-12 items-center justify-center rounded-sm bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-strong"
          >
            {fill(t.toClinic, { name: clinic.name })}
          </Link>
          <div className="flex items-start gap-3 rounded-[12px] bg-brand-soft p-5">
            <Info className="size-5 shrink-0 text-brand" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-bold text-brand">{t.separateTitle}</p>
              <p className="text-xs leading-relaxed text-muted">{t.separateBody}</p>
            </div>
          </div>
        </aside>
      </Container>
    </>
  );
}
