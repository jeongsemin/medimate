import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getProfile } from "@/lib/auth";
import { Container } from "./container";
import { LanguageSwitcher } from "./language-switcher";

export function BrandMark({ lang }: { lang: Locale }) {
  return (
    <Link href={`/${lang}`} className="flex items-center gap-2">
      <span className="flex size-[30px] items-center justify-center rounded-[10px] bg-brand text-[23px] font-bold leading-none text-white">
        m
      </span>
      <span className="text-[25px] font-bold leading-none text-foreground">medimate</span>
    </Link>
  );
}

export async function Header({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const profile = await getProfile();

  return (
    <header className="border-b border-border bg-card">
      <Container className="flex h-[72px] items-center justify-between gap-4 md:h-[88px]">
        <BrandMark lang={lang} />

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          <Link href={`/${lang}#search`} className="hover:text-brand">
            {dict.nav.find}
          </Link>
          {profile && (
            <Link href={`/${lang}/my`} className="hover:text-brand">
              {dict.nav.my}
            </Link>
          )}
          {profile?.is_admin && (
            <Link href={`/${lang}/admin`} className="hover:text-brand">
              {dict.nav.admin}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4 text-sm md:gap-6">
          <LanguageSwitcher current={lang} label={dict.common.lang} />
          {profile ? (
            <form action="/auth/logout" method="post">
              <input type="hidden" name="lang" value={lang} />
              <button className="hover:text-brand">{dict.nav.logout}</button>
            </form>
          ) : (
            <Link href={`/${lang}/login`} className="hover:text-brand">
              {dict.nav.login}
            </Link>
          )}
        </div>
      </Container>
    </header>
  );
}
