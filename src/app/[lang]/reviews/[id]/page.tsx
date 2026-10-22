import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { ReviewView, type ClinicData, type ReviewData } from "./review-view";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string) {
  const supabase = await createClient();
  const { data: review } = await supabase
    .from("reviews")
    .select("*, profiles(display_name), hospitals(id, name, category, road_address, address)")
    .eq("id", id)
    .maybeSingle();
  if (!review) return null;

  const hospital = review.hospitals as unknown as {
    id: string;
    name: string;
    category: string | null;
    road_address: string | null;
    address: string | null;
  };
  const { data: stats } = await supabase.from("hospital_stats").select("*").eq("hospital_id", hospital.id).maybeSingle();

  const reviewData: ReviewData = {
    id: review.id,
    rating: review.rating,
    body: review.body,
    treatment: review.treatment,
    visit_date: review.visit_date,
    created_at: review.created_at,
    lang: review.lang,
    english_support: review.english_support,
    interpreter_available: review.interpreter_available,
    director_consultation: review.director_consultation,
    price_explained: review.price_explained,
    no_upselling: review.no_upselling,
    author: (review.profiles as unknown as { display_name: string | null } | null)?.display_name ?? null,
  };
  const clinic: ClinicData = {
    id: hospital.id,
    name: hospital.name,
    category: hospital.category,
    address: hospital.road_address || hospital.address,
    review_count: stats?.review_count ?? 0,
    avg_rating: stats?.avg_rating === null || stats?.avg_rating === undefined ? null : Number(stats.avg_rating),
    fluent_english_count: stats?.fluent_english_count ?? 0,
    director_count: stats?.director_count ?? 0,
  };
  return { reviewData, clinic };
}

export async function generateMetadata({ params }: PageProps<"/[lang]/reviews/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !UUID.test(id)) return {};
  const found = await load(id);
  if (!found) return {};
  const excerpt = found.reviewData.body.replace(/\s+/g, " ").slice(0, 150);
  return { title: `${found.clinic.name} – ${found.reviewData.author ?? "Review"} | MediMate`, description: excerpt };
}

export default async function ReviewPage({ params }: PageProps<"/[lang]/reviews/[id]">) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !UUID.test(id)) notFound();
  const found = await load(id);
  if (!found) notFound();
  const dict = await getDictionary(lang);
  return <ReviewView lang={lang} dict={dict} review={found.reviewData} clinic={found.clinic} />;
}
