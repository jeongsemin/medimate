import Link from "next/link";
import { MapPin, Search, Star } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { searchHospitals } from "@/lib/hospital-search";

/** Search is a plain GET form: results are rendered on the server from ?q=&type=. */
export function SearchForm({
  lang,
  dict,
  q,
}: {
  lang: Locale;
  dict: Dictionary;
  q: string;
}) {
  const h = dict.home;
  return (
    <div id="search" className="scroll-mt-6 space-y-4">
      <form
        action={`/${lang}`}
        className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-[0_8px_28px_rgba(23,62,64,0.06)] sm:flex-row sm:items-center sm:gap-6"
      >
        <Search className="hidden size-[22px] shrink-0 sm:block" aria-hidden />
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[10px] font-bold text-muted">{h.searchLabel}</span>
          <input
            name="q"
            defaultValue={q}
            maxLength={50}
            required
            placeholder={h.placeholder}
            className="w-full bg-transparent text-base font-medium outline-none placeholder:text-foreground/70"
          />
        </label>
        <button className="flex min-h-12 items-center justify-center gap-2 rounded-sm bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-strong">
          <Search className="size-5" aria-hidden />
          {h.searchBtn}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="text-[11px] text-muted">{h.popular}</span>
        {h.popularQueries.map((p) => (
          <Link key={p.q} href={`/${lang}?q=${encodeURIComponent(p.q)}#results`} className="text-brand hover:underline">
            {p.label} ↗
          </Link>
        ))}
      </div>
      <p className="text-[11px] text-muted">{h.hint}</p>
    </div>
  );
}

export async function SearchResults({
  lang,
  dict,
  q,
}: {
  lang: Locale;
  dict: Dictionary;
  q: string;
}) {
  if (!q.trim()) return null;
  const outcome = await searchHospitals(q, "all");

  return (
    <section id="results" className="scroll-mt-6" aria-live="polite">
      {!outcome.ok ? (
        <p className="text-sm text-error">{dict.search.error}</p>
      ) : outcome.results.length === 0 ? (
        <p className="text-sm text-muted">{dict.search.empty}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {outcome.results.map((r) => (
            <li key={r.id}>
              <Link
                href={`/${lang}/hospitals/${r.id}`}
                className="flex h-full items-start justify-between gap-3 rounded-md border border-border bg-card p-5 hover:border-brand"
              >
                <div className="min-w-0 space-y-1">
                  {r.category && <p className="text-[10px] font-bold text-brand">{r.category}</p>}
                  <p className="text-[19px] font-bold leading-snug">{r.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{r.road_address || r.address}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs">
                  {r.avg_rating !== null && (
                    <p className="flex items-center justify-end gap-1 font-semibold">
                      <Star className="size-4 fill-star text-star" aria-hidden />
                      {r.avg_rating}
                    </p>
                  )}
                  <p className="text-muted">
                    {dict.hospital.reviews} {r.review_count}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
