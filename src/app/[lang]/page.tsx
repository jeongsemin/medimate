import { notFound } from "next/navigation";
import { LogIn, Search, ShieldCheck } from "lucide-react";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { SearchBox } from "./search-box";

const icons = [LogIn, Search, ShieldCheck];

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-12">
      <section className="space-y-3 pt-6 text-center">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{dict.home.title}</h1>
        <p className="mx-auto max-w-xl text-muted">{dict.home.subtitle}</p>
      </section>

      <SearchBox
        lang={lang}
        text={{ ...dict.home, ...dict.search, reviews: dict.hospital.reviews }}
      />

      <section>
        <h2 className="mb-4 text-center text-lg font-semibold">{dict.home.howTitle}</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {dict.home.steps.map((step, i) => {
            const Icon = icons[i];
            return (
              <li key={step.title} className="rounded-2xl border border-border bg-card p-5">
                <span className="mb-3 inline-flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="font-semibold">
                  {i + 1}. {step.title}
                </h3>
                <p className="mt-1 text-sm text-muted">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
