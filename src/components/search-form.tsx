import Link from "next/link";
import { Search } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

/** Search is a plain GET form to /[lang]/search, so results are server-rendered and shareable. */
export function SearchForm({
  lang,
  dict,
  q = "",
  keep = {},
  showExtras = true,
}: {
  lang: Locale;
  dict: Dictionary;
  q?: string;
  /** Extra params carried over so the current filters survive a new search. */
  keep?: Record<string, string>;
  showExtras?: boolean;
}) {
  const h = dict.home;
  return (
    <div id="search" className="scroll-mt-6 space-y-4">
      <form
        action={`/${lang}/search`}
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
        {Object.entries(keep).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <button className="flex min-h-12 items-center justify-center gap-2 rounded-sm bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-strong">
          <Search className="size-5" aria-hidden />
          {h.searchBtn}
        </button>
      </form>

      {showExtras && (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <span className="text-[11px] text-muted">{h.popular}</span>
            {h.popularQueries.map((p) => (
              <Link key={p.q} href={`/${lang}/search?q=${encodeURIComponent(p.q)}`} className="text-brand hover:underline">
                {p.label} ↗
              </Link>
            ))}
          </div>
          <p className="text-[11px] text-muted">{h.hint}</p>
        </>
      )}
    </div>
  );
}
