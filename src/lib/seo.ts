// Metadata helpers shared by every page. No server-only imports so it can be unit tested.
import type { Metadata } from "next";
// The ".ts" extension lets the plain Node test runner resolve this import.
import { locales, type Locale } from "../i18n/config.ts";

export const SITE_NAME = "MediMate";

const HREFLANG: Record<Locale, string> = { en: "en", ja: "ja", zh: "zh-CN", ko: "ko" };
const OG_LOCALE: Record<Locale, string> = { en: "en_US", ja: "ja_JP", zh: "zh_CN", ko: "ko_KR" };

/** Public origin of the site, without a trailing slash. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/** hreflang map for a path that exists in every locale (relative to metadataBase). */
export function languageAlternates(path = ""): Record<string, string> {
  const map: Record<string, string> = {};
  for (const l of locales) map[HREFLANG[l]] = `/${l}${path}`;
  map["x-default"] = `/en${path}`;
  return map;
}

export type PageMetaOptions = {
  lang: Locale;
  /** Path after the locale, e.g. "/search" or "/hospitals/<id>". */
  path?: string;
  title?: string;
  /** Open Graph / Twitter title when the page has no `title` of its own (the home page). */
  socialTitle?: string;
  description?: string;
  /** Keep the page out of search results. `follow` lets crawlers still follow its links. */
  noindex?: boolean;
  follow?: boolean;
  type?: "website" | "article";
};

export function pageMetadata(o: PageMetaOptions): Metadata {
  const path = o.path ?? "";
  const url = `/${o.lang}${path}`;
  const ogTitle = o.title ? `${o.title} | ${SITE_NAME}` : o.socialTitle;

  return {
    ...(o.title ? { title: o.title } : {}),
    ...(o.description ? { description: o.description } : {}),
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: o.type ?? "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[o.lang],
      alternateLocale: locales.filter((l) => l !== o.lang).map((l) => OG_LOCALE[l]),
      url,
      ...(ogTitle ? { title: ogTitle } : {}),
      ...(o.description ? { description: o.description } : {}),
    },
    twitter: {
      card: "summary",
      ...(ogTitle ? { title: ogTitle } : {}),
      ...(o.description ? { description: o.description } : {}),
    },
    ...(o.noindex ? { robots: { index: false, follow: o.follow ?? false } } : {}),
  };
}

/** One-line description of a clinic for search results and link previews. */
export function clinicDescription(c: {
  name: string;
  address?: string | null;
  reviewCount?: number;
  avgRating?: number | null;
}): string {
  const parts = [c.name, c.address].filter(Boolean) as string[];
  const text = parts.join(" – ");
  return c.reviewCount && c.avgRating ? `${text} · ★${c.avgRating.toFixed(1)} (${c.reviewCount})` : text;
}
