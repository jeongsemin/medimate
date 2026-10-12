"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { locales, localeNames, type Locale } from "@/i18n/config";

function Select({ current, label }: { current: Locale; label: string }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();

  function change(next: string) {
    const rest = pathname.split("/").slice(2).join("/");
    router.push(`/${next}${rest ? `/${rest}` : ""}${search ? `?${search}` : ""}`);
  }

  return (
    <select
      aria-label={label}
      value={current}
      onChange={(e) => change(e.target.value)}
      className="rounded-md border border-border bg-card px-2 py-1 text-sm"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeNames[l]}
        </option>
      ))}
    </select>
  );
}

export function LanguageSwitcher(props: { current: Locale; label: string }) {
  return (
    <Suspense fallback={null}>
      <Select {...props} />
    </Suspense>
  );
}
