import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function withPathname(response: NextResponse, pathname: string): NextResponse {
  response.headers.set("x-pathname", pathname);
  return response;
}

function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (url.includes("placeholder") || url.includes("your-project")) return null;
  if (anonKey.includes("your-anon")) return null;
  return { url, anonKey };
}

/** Routes that never need a Supabase session check in middleware. */
function isMiddlewarePublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/privacy" || pathname === "/terms") return true;
  if (pathname.startsWith("/auth/callback")) return true;
  if (pathname.startsWith("/api/stripe/webhook")) return true;
  if (pathname.startsWith("/api/cron/")) return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/signup")) return true;
  if (pathname.startsWith("/invite")) return true;
  if (pathname.startsWith("/forgot-password")) return true;
  if (pathname.startsWith("/reset-password")) return true;
  return false;
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  );
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  try {
    const env = getSupabaseEnv();
    if (!env) {
      // Misconfigured Vercel env — do not throw; allow marketing/auth pages
      if (isMiddlewarePublicPath(pathname)) {
        return withPathname(NextResponse.next({ request }), pathname);
      }
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return withPathname(NextResponse.redirect(url), pathname);
    }

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[middleware] auth.getUser:", authError.message);
    }

    const isPublic = isMiddlewarePublicPath(pathname);

    if (!user && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return withPathname(NextResponse.redirect(url), pathname);
    }

    if (user && isAuthRoute(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return withPathname(NextResponse.redirect(url), pathname);
    }

    return withPathname(supabaseResponse, pathname);
  } catch (error) {
    console.error("[middleware] unhandled error:", error);
    if (isMiddlewarePublicPath(pathname)) {
      return withPathname(NextResponse.next({ request }), pathname);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return withPathname(NextResponse.redirect(url), pathname);
  }
}
