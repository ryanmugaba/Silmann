import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/configured";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

function getSupabaseEnv(): { url: string; anonKey: string } | null {
  if (!isSupabaseConfigured()) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
  return { url, anonKey };
}

/** Paths that do not require an authenticated session. */
function isAuthExemptPath(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/signup") ||
    pathname === "/" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/setup")
  );
}

function isAuthEntryPath(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/signup")
  );
}

function withPathname(response: NextResponse, pathname: string): NextResponse {
  response.headers.set("x-pathname", pathname);
  return response;
}

/**
 * Redirect while preserving refreshed session cookies from supabaseResponse.
 * Only creates NextResponse.redirect here (allowed); cookies are copied from
 * supabaseResponse headers so setAll mutations are not lost.
 */
function redirectPreservingSession(
  request: NextRequest,
  pathname: string,
  targetPath: string,
  supabaseResponse: NextResponse
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = targetPath;
  const redirectResponse = NextResponse.redirect(url, {
    headers: supabaseResponse.headers,
  });
  return withPathname(redirectResponse, pathname);
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const env = getSupabaseEnv();
  if (!env) {
    if (isAuthExemptPath(pathname)) {
      return withPathname(NextResponse.next({ request }), pathname);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withPathname(NextResponse.redirect(url), pathname);
  }

  // Must exist before createServerClient — same object returned after getUser()
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        // Two-pass write required by @supabase/ssr on Edge (Vercel)
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthExemptPath(pathname)) {
    return redirectPreservingSession(request, pathname, "/login", supabaseResponse);
  }

  if (user && isAuthEntryPath(pathname)) {
    return redirectPreservingSession(request, pathname, "/dashboard", supabaseResponse);
  }

  return withPathname(supabaseResponse, pathname);
}
