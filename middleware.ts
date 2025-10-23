import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Get the current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Skip middleware for API routes - they handle their own auth
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return res;
  }

  // Define public paths that don't require authentication
  const publicPaths = [
    "/login",
    "/signup",
    "/auth/callback",
    "/icon.svg",
    "/favicon.ico",
  ];

  const isPublicPath = publicPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  // Allow public paths
  if (isPublicPath) {
    // If user is logged in and tries to access login/signup, redirect to home
    if (session && (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return res;
  }

  // Protect all other routes - require authentication
  if (!session) {
    // Store the original URL to redirect back after login
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("redirectTo", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};