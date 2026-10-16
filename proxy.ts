import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/reset-password");

  const isProtectedPage =
    request.nextUrl.pathname.startsWith("/feed") ||
    request.nextUrl.pathname.startsWith("/me") ||
    request.nextUrl.pathname.startsWith("/saved") ||
    request.nextUrl.pathname.startsWith("/connections") ||
    request.nextUrl.pathname.startsWith("/notifications") ||
    request.nextUrl.pathname.startsWith("/posts/create") ||
    request.nextUrl.pathname.includes("/edit");

  if (!sessionToken && isProtectedPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (sessionToken && isAuthPage) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login/:path*",
    "/register/:path*",
    "/forgot-password/:path*",
    "/reset-password/:path*",
    "/feed/:path*",
    "/me/:path*",
    "/saved/:path*",
    "/connections/:path*",
    "/notifications/:path*",
    "/posts/create",
    "/posts/:id/edit",
  ],
};