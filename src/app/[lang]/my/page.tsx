import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireProfile } from "@/lib/auth";
import { COUNTRY_CODES } from "@/lib/member-details";
import { createClient } from "@/lib/supabase/server";
import { MyView } from "./my-view";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/my">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return pageMetadata({ lang, path: "/my", title: dict.nav.my, noindex: true });
}

export default async function MyPage({ params }: PageProps<"/[lang]/my">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const profile = await requireProfile(lang, `/${lang}/my`);
  const dict = await getDictionary(lang);
  const supabase = await createClient();

  const [{ data: auth }, { data: receipts }, { data: reviews }, { data: details }, { data: suspension }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("receipts")
      .select("id, status, created_at, reject_reason, ocr_raw, hospitals(id, name)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, rating, body, treatment, visit_date, created_at, receipt_id, hospitals(id, name)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    // Both tables are private: RLS returns only the caller's own row.
    supabase.from("member_details").select("country, age_group, gender").eq("user_id", profile.id).maybeSingle(),
    supabase.from("suspensions").select("reason").eq("user_id", profile.id).maybeSingle(),
  ]);

  const regionNames = new Intl.DisplayNames(lang, { type: "region" });
  const countries = COUNTRY_CODES.map((code) => ({ code, name: regionNames.of(code) ?? code })).sort((a, b) =>
    a.name.localeCompare(b.name, lang),
  );

  return (
    <MyView
      lang={lang}
      dict={dict}
      name={profile.display_name ?? ""}
      email={auth.user?.email ?? null}
      receipts={receipts ?? []}
      reviews={reviews ?? []}
      countries={countries}
      details={details ?? { country: null, age_group: null, gender: null }}
      suspension={suspension ? { reason: suspension.reason } : null}
    />
  );
}
