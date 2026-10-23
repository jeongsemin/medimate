import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireProfile } from "@/lib/auth";
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

  const [{ data: auth }, { data: receipts }, { data: reviews }] = await Promise.all([
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
  ]);

  return (
    <MyView
      lang={lang}
      dict={dict}
      name={profile.display_name ?? ""}
      email={auth.user?.email ?? null}
      receipts={receipts ?? []}
      reviews={reviews ?? []}
    />
  );
}
