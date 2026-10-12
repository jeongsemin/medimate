import Link from "next/link";
import { HeartPulse } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getProfile } from "@/lib/auth";
import { LanguageSwitcher } from "./language-switcher";

export async function Header({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const profile = await getProfile();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
        <Link href={`/${lang}`} className="flex items-center gap-2 font-bold text-brand-strong">
          <HeartPulse className="size-5" aria-hidden />
          MediMate
        </Link>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <LanguageSwitcher current={lang} label={dict.common.lang} />
          {profile ? (
            <>
              <Link href={`/${lang}/my`} className="hover:text-brand">
                {dict.nav.my}
              </Link>
              {profile.is_admin && (
                <Link href={`/${lang}/admin`} className="hover:text-brand">
                  {dict.nav.admin}
                </Link>
              )}
              <form action="/auth/logout" method="post">
                <input type="hidden" name="lang" value={lang} />
                <button className="text-muted hover:text-foreground">{dict.nav.logout}</button>
              </form>
            </>
          ) : (
            <Link
              href={`/${lang}/login`}
              className="rounded-full bg-brand px-4 py-1.5 font-medium text-white hover:bg-brand-strong"
            >
              {dict.nav.login}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
