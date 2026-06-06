import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { aj } from "@/src/lib/arcjet";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Run Arcjet Security Protection on API routes and public survey endpoints
  if (pathname.startsWith("/api") || pathname.startsWith("/s/")) {
    try {
      const decision = await aj.protect(request, { requested: 1 });

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            { status: 429 }
          );
        }
        if (decision.reason.isBot()) {
          return NextResponse.json(
            { error: "Automated traffic is not allowed." },
            { status: 403 }
          );
        }
        return NextResponse.json(
          { error: "Access Denied by Edge Security" },
          { status: 403 }
        );
      }
    } catch (error) {
      // Fail-open or log in production; here we log and continue to avoid breaking the app
      console.error("Arcjet shield check encountered an error:", error);
    }
  }

  // 2. Optimistic Auth Check for /dashboard segment
  if (pathname.startsWith("/dashboard")) {
    const sessionToken = request.cookies.get("better-auth.session_token");

    // If session token is missing, redirect to sign-in page
    if (!sessionToken) {
      const loginUrl = new URL("/sign-in", request.url);
      // Pass the current path as a redirect parameter
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Configure middleware matcher to skip public static files and assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public folder files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
