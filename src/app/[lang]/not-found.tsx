import Link from "next/link";
import { lang } from "next/root-params";
import { SearchX } from "lucide-react";
import { defaultLocale, hasLocale } from "@/i18n/config";
import { statusPageText } from "@/i18n/status-pages";
import { StatusScreen, primaryAction, secondaryAction } from "@/components/status-screen";

export default async function NotFound() {
  // not-found.js receives no props; the locale comes from the root param.
  let current: string = defaultLocale;
  try {
    current = await lang();
  } catch {
    // rendered outside a locale segment: fall back to the default language
  }
  const base = `/${hasLocale(current) ? current : defaultLocale}`;
  const t = statusPageText(current).notFound;

  return (
    <StatusScreen icon={SearchX} code="404" title={t.title} body={t.body}>
      <Link href={base} className={primaryAction}>
        {t.home}
      </Link>
      <Link href={`${base}/search`} className={secondaryAction}>
        {t.search}
      </Link>
    </StatusScreen>
  );
}
