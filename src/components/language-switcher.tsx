"use client";

import { Globe } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
    <label className="flex items-center gap-1.5">
      <Globe className="size-[18px]" aria-hidden />
      <select
        aria-label={label}
        value={current}
        onChange={(e) => change(e.target.value)}
        className="cursor-pointer bg-transparent text-xs"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LanguageSwitcher(props: { current: Locale; label: string }) {
  return (
    <Suspense fallback={null}>
      <Select {...props} />
    </Suspense>
  );
}
