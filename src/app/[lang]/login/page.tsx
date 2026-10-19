import Image from "next/image";
import { notFound } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { safeNext } from "@/lib/auth";
import { GoogleButton } from "./google-button";

export default async function LoginPage({ params, searchParams }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const sp = await searchParams;
  const dict = await getDictionary(lang);
  const t = dict.login;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, `/${lang}`);

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 py-10 md:px-10 md:py-16 lg:grid-cols-[460px_1fr] lg:gap-[100px] xl:px-[160px]">
      <section className="space-y-6">
        <p className="text-[11px] font-bold text-brand">{t.eyebrow}</p>
        <h1 className="text-3xl font-bold leading-[1.6] md:text-[40px]">
          {t.headline[0]}
          <br />
          {t.headline[1]}
          <br />
          {t.headline[2]}
        </h1>
        <p className="text-[15px] text-muted">
          {t.intro[0]}
          <br className="hidden sm:block" /> {t.intro[1]}
        </p>
        <div className="relative hidden h-[330px] overflow-hidden rounded-md lg:block">
          <Image
            src="/images/login/seoul.jpg"
            alt=""
            fill
            priority
            sizes="460px"
            className="object-cover"
          />
        </div>
        <p className="text-[11px] text-muted">
          {t.guest[0]}
          <br className="hidden sm:block" /> {t.guest[1]}
        </p>
      </section>

      <section className="space-y-6 self-start rounded-[20px] border border-border bg-card p-6 md:p-9">
        <div className="space-y-2">
          <h2 className="text-[30px] font-bold leading-[1.6]">{t.title}</h2>
          <p className="text-[13px] text-muted">{t.subtitle}</p>
        </div>

        {sp.error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-sm bg-error-soft p-3.5 text-xs text-error">
            <CircleAlert className="size-[18px] shrink-0" aria-hidden />
            <p>{t.failed}</p>
          </div>
        )}

        <GoogleButton lang={lang} next={next} label={t.google} />
        <p className="text-[11px] text-muted">{t.note}</p>
      </section>
    </div>
  );
}
