import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import "../globals.css";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { Header } from "@/components/header";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.meta.title, description: dict.meta.description };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html lang={lang === "zh" ? "zh-CN" : lang}>
      <body className="min-h-dvh flex flex-col">
        <Suspense fallback={<div className="h-14 border-b border-border" />}>
          <Header lang={lang} dict={dict} />
        </Suspense>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          © MediMate
        </footer>
      </body>
    </html>
  );
}
