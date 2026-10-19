import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ExternalLink, MapPin, Phone, PenLine } from "lucide-react";
import { hasLocale, localeNames } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { StarRating } from "@/components/star-rating";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function HospitalPage({ params }: PageProps<"/[lang]/hospitals/[id]">) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !UUID.test(id)) notFound();
  const dict = await getDictionary(lang);
  const supabase = await createClient();

  const [{ data: hospital }, { data: stats }, { data: reviews }] = await Promise.all([
    supabase.from("hospitals").select("*").eq("id", id).single(),
    supabase.from("hospital_stats").select("*").eq("hospital_id", id).single(),
    supabase
      .from("reviews")
      .select("*, profiles(display_name, avatar_url)")
      .eq("hospital_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (!hospital) notFound();

  const mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(`${hospital.name} ${hospital.road_address ?? ""}`.trim())}`;

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <h1 className="text-2xl font-bold">{hospital.name}</h1>
        {hospital.category && <p className="text-sm text-muted">{hospital.category}</p>}
        <ul className="space-y-1 text-sm">
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-label={dict.hospital.address} />
            {hospital.road_address || hospital.address}
          </li>
          {hospital.phone && (
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-muted" aria-label={dict.hospital.phone} />
              {hospital.phone}
            </li>
          )}
        </ul>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {stats && stats.review_count > 0 && (
            <div className="flex items-center gap-2">
              <StarRating value={Number(stats.avg_rating)} />
              <span className="font-semibold">{stats.avg_rating}</span>
              <span className="text-sm text-muted">
                ({stats.review_count} {dict.hospital.count})
              </span>
            </div>
          )}
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-sm text-brand-strong hover:underline"
          >
            {dict.hospital.openNaver}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
        <Link
          href={`/${lang}/hospitals/${id}/review`}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 font-medium text-white hover:bg-brand-strong"
        >
          <PenLine className="size-4" aria-hidden />
          {dict.hospital.write}
        </Link>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{dict.hospital.reviews}</h2>
        {!reviews || reviews.length === 0 ? (
          <p className="text-muted">{dict.hospital.noReviews}</p>
        ) : (
          reviews.map((r) => {
            const profile = r.profiles as { display_name: string | null; avatar_url: string | null } | null;
            const badges = [
              r.english_support !== "none" && `${dict.review.english}: ${dict.review.englishOptions[r.english_support as "basic" | "fluent"]}`,
              r.interpreter_available && dict.review.interpreter,
              r.director_consultation && dict.hospital.director,
              r.price_explained && dict.review.priceExplained,
              r.no_upselling && dict.review.noUpselling,
            ].filter(Boolean) as string[];
            return (
              <article key={r.id} className="space-y-3 rounded-2xl border border-border bg-card p-5">
                <header className="flex flex-wrap items-center gap-2">
                  <StarRating value={r.rating} />
                  <span className="font-medium">{profile?.display_name ?? "—"}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand-strong">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    {dict.hospital.verified}
                  </span>
                  <span className="ml-auto text-xs text-muted">
                    {localeNames[r.lang as keyof typeof localeNames]} ·{" "}
                    {new Date(r.created_at).toLocaleDateString(lang)}
                  </span>
                </header>
                {badges.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5 text-xs">
                    {badges.map((b) => (
                      <li key={b} className="rounded-full border border-border px-2.5 py-0.5">
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="whitespace-pre-line text-sm leading-relaxed">{r.body}</p>
                {(r.visit_date || r.treatment) && (
                  <p className="text-xs text-muted">
                    {r.visit_date && `${dict.hospital.visited}: ${r.visit_date}`}
                    {r.visit_date && r.treatment && " · "}
                    {r.treatment && `${dict.hospital.treatment}: ${r.treatment}`}
                  </p>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
