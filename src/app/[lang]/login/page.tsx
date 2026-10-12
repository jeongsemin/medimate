import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { safeNext } from "@/lib/auth";
import { GoogleButton } from "./google-button";

export default async function LoginPage({ params, searchParams }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const sp = await searchParams;
  const dict = await getDictionary(lang);
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, `/${lang}`);

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
      <h1 className="text-xl font-bold">{dict.login.title}</h1>
      <p className="mt-2 text-sm text-muted">{dict.login.subtitle}</p>
      {sp.error && <p className="mt-4 text-sm text-red-600">{dict.login.failed}</p>}
      <GoogleButton lang={lang} next={next} label={dict.login.google} />
      <p className="mt-4 text-xs text-muted">{dict.login.note}</p>
    </div>
  );
}
