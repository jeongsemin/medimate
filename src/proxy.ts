import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasLocale, matchLocale } from "@/i18n/config";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];

  // 1. Locale routing: /foo -> /<locale>/foo
  if (!hasLocale(first)) {
    const preferred = request.cookies.get("NEXT_LOCALE")?.value;
    const locale =
      preferred && hasLocale(preferred)
        ? preferred
        : matchLocale(request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // 2. Refresh the Supabase session cookie.
  let response = NextResponse.next({ request });
  response.cookies.set("NEXT_LOCALE", first, { path: "/", maxAge: 31536000 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          response.cookies.set("NEXT_LOCALE", first, {
            path: "/",
            maxAge: 31536000,
          });
          for (const { name, value, options } of list) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    // Skip API, OAuth callback, Next internals and static files
    "/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
