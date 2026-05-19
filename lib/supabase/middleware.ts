import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function withPathname(response: NextResponse, pathname: string): NextResponse {
  response.headers.set("x-pathname", pathname);
  return response;
}

function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  if (url.includes("placeholder") || url.includes("your-project") || url.includes("xxxxxxxx")) {
    return null;
  }
  if (anonKey.includes("your-anon") || anonKey.endsWith("...")) return null;
  try {
    new URL(url);
  } catch {
    return null;
  }
  return { url, anonKey };
}

function isMiddlewarePublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/privacy" || pathname === "/terms") return true;
  if (pathname.startsWith("/auth/callback")) return true;
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

  const env = getSupabaseEnv();
  if (!env) {
    if (isMiddlewarePublicPath(pathname)) {
      return withPathname(NextResponse.next(), pathname);
    }
    return withPathname(NextResponse.redirect(new URL("/", request.url)), pathname);
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Edge runtime (Vercel): do NOT call request.cookies.set — it throws and
          // causes MIDDLEWARE_INVOCATION_FAILED. Only write cookies on the response.
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

    const isPublic = isMiddlewarePublicPath(pathname);

    if (!user && !isPublic) {
      return withPathname(
        NextResponse.redirect(new URL("/login", request.url)),
        pathname
      );
    }

    if (user && isAuthRoute(pathname)) {
      return withPathname(
        NextResponse.redirect(new URL("/dashboard", request.url)),
        pathname
      );
    }

    return withPathname(supabaseResponse, pathname);
  } catch (error) {
    console.error("[middleware]", error);
    if (isMiddlewarePublicPath(pathname)) {
      return withPathname(NextResponse.next(), pathname);
    }
    return withPathname(NextResponse.redirect(new URL("/", request.url)), pathname);
  }
}
