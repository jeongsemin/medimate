"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { defaultLocale, hasLocale } from "@/i18n/config";
import { statusPageText } from "@/i18n/status-pages";
import { StatusScreen, primaryAction, secondaryAction } from "@/components/status-screen";

// Next.js 16.4 passes `retry` (not `reset`) to re-fetch and re-render the segment.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { lang } = useParams<{ lang?: string }>();
  const t = statusPageText(lang).error;
  const base = `/${lang && hasLocale(lang) ? lang : defaultLocale}`;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen icon={TriangleAlert} title={t.title} body={t.body}>
      <button onClick={() => retry()} className={primaryAction}>
        {t.retry}
      </button>
      <Link href={base} className={secondaryAction}>
        {t.home}
      </Link>
      {error.digest && (
        <p className="w-full pt-2 text-[11px] text-muted">
          {t.reference}: <code>{error.digest}</code>
        </p>
      )}
    </StatusScreen>
  );
}
