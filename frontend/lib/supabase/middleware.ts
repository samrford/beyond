import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session and handles route protection.
 * Called from the root Next.js middleware.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          // Update both the request and response cookies
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this is the critical call
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Auth-related public routes
  const authPublicRoutes = ["/login", "/signup", "/reset-password", "/auth/callback"];
  const isAuthPublicRoute = authPublicRoutes.some((route) => pathname.startsWith(route));

  // Resource pages that anonymous visitors can view. The page itself
  // queries the backend, which returns 404 for non-public resources.
  // Strict regex so e.g. /plans/new and /trip/{id}/edit still redirect.
  const isPublicResourceRoute =
    /^\/u\/[^/]+\/?$/.test(pathname) ||
    /^\/trip\/[^/]+\/?$/.test(pathname) ||
    /^\/plans\/(?!new$|import$)[^/]+\/?$/.test(pathname);

  const isPublicRoute = isAuthPublicRoute || isPublicResourceRoute;

  // If no user and trying to access a protected route → redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is logged in and trying to access auth pages → redirect to home
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
