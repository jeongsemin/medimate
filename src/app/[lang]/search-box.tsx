"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MapPin, Search, Star } from "lucide-react";

type Result = {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  road_address: string | null;
  review_count: number;
  avg_rating: number | null;
};

type Text = {
  placeholder: string;
  hint: string;
  search: string;
  typeAll: string;
  typeDerm: string;
  loading: string;
  empty: string;
  error: string;
  reviews: string;
};

export function SearchBox({ lang, text }: { lang: string; text: Text }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "derm">("all");
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    startTransition(async () => {
      setError(false);
      try {
        const res = await fetch(`/api/hospitals/search?q=${encodeURIComponent(q)}&type=${type}`);
        if (!res.ok) throw new Error();
        setResults((await res.json()).results);
      } catch {
        setResults(null);
        setError(true);
      }
    });
  }

  return (
    <section className="mx-auto max-w-2xl space-y-3">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={text.placeholder}
          maxLength={50}
          className="min-w-0 flex-1 rounded-full border border-border bg-card px-5 py-3 outline-none focus:border-brand"
        />
        <button
          disabled={pending}
          className="flex items-center gap-2 rounded-full bg-brand px-5 font-medium text-white hover:bg-brand-strong disabled:opacity-60"
        >
          <Search className="size-4" aria-hidden />
          {text.search}
        </button>
      </form>

      <div className="flex justify-center gap-2 text-sm" role="radiogroup">
        {(["all", "derm"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={`rounded-full border px-4 py-1 ${
              type === t ? "border-brand bg-brand-soft text-brand-strong" : "border-border text-muted"
            }`}
          >
            {t === "all" ? text.typeAll : text.typeDerm}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-muted">{text.hint}</p>

      <div aria-live="polite" className="pt-2">
        {pending && <p className="text-center text-sm text-muted">{text.loading}</p>}
        {error && <p className="text-center text-sm text-red-600">{text.error}</p>}
        {!pending && results?.length === 0 && (
          <p className="text-center text-sm text-muted">{text.empty}</p>
        )}
        {!pending && results && results.length > 0 && (
          <ul className="space-y-2">
            {results.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/${lang}/hospitals/${h.id}`}
                  className="block rounded-2xl border border-border bg-card p-4 hover:border-brand"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{h.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                        <MapPin className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{h.road_address || h.address}</span>
                      </p>
                      {h.category && <p className="mt-1 text-xs text-muted">{h.category}</p>}
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      {h.avg_rating !== null && (
                        <p className="flex items-center justify-end gap-1 font-semibold">
                          <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                          {h.avg_rating}
                        </p>
                      )}
                      <p className="text-xs text-muted">
                        {text.reviews} {h.review_count}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
