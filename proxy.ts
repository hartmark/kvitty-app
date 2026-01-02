import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// Routes that require authentication
const protectedRoutes = ["/dash"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Validate session properly using Better Auth API
  // This validates the session against the database, not just cookie existence
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect unauthenticated users to login from protected routes
  // Note: Auth route redirects are handled by (auth)/layout.tsx which validates sessions properly
  if (!session && protectedRoutes.some((route) => pathname.startsWith(route))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
