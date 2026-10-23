import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { languageAlternates, siteUrl } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";

// Cached by default; the clinic list changes as reviews arrive, so refresh it hourly.
export const revalidate = 3600;

/** One entry per locale for a path, each listing all language versions. */
function localized(path: string, lastModified: Date, priority: number): MetadataRoute.Sitemap {
  const base = siteUrl();
  const languages = Object.fromEntries(
    Object.entries(languageAlternates(path)).map(([code, p]) => [code, `${base}${p}`]),
  );
  return locales.map((l) => ({
    url: `${base}/${l}${path}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = localized("", new Date(), 1);

  // Only clinics that have at least one review are worth indexing.
  try {
    const { data } = await createAdminClient()
      .from("reviews")
      .select("hospital_id, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    const latest = new Map<string, string>();
    for (const r of data ?? []) if (!latest.has(r.hospital_id)) latest.set(r.hospital_id, r.created_at);
    for (const [id, created] of latest) entries.push(...localized(`/hospitals/${id}`, new Date(created), 0.7));
  } catch {
    // The database being unreachable must not break the sitemap: serve the static entries.
  }

  return entries;
}
