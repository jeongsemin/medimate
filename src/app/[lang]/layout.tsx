import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Inter, Noto_Sans_JP, Noto_Sans_KR, Noto_Sans_SC } from "next/font/google";
import "../globals.css";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { SITE_NAME, siteUrl } from "@/lib/seo";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const notoKr = Noto_Sans_KR({ weight: ["400", "500", "700"], variable: "--font-noto-kr", display: "swap", preload: false });
const notoJp = Noto_Sans_JP({ weight: ["400", "500", "700"], variable: "--font-noto-jp", display: "swap", preload: false });
const notoSc = Noto_Sans_SC({ weight: ["400", "500", "700"], variable: "--font-noto-sc", display: "swap", preload: false });

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    metadataBase: new URL(siteUrl()),
    // The template applies to child pages; pages in this segment (the home page) use the default.
    title: { default: dict.meta.title, template: `%s | ${SITE_NAME}` },
    description: dict.meta.description,
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html
      lang={lang === "zh" ? "zh-CN" : lang}
      className={`${inter.variable} ${notoKr.variable} ${notoJp.variable} ${notoSc.variable}`}
    >
      <body className="min-h-dvh flex flex-col">
        <Suspense fallback={<div className="h-[72px] border-b border-border md:h-[88px]" />}>
          <Header lang={lang} dict={dict} />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer lang={lang} dict={dict} />
      </body>
    </html>
  );
}
