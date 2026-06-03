import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isClerkConfigured } from "@/lib/config";

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (request.nextUrl.searchParams.has("__clerk_handshake")) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("__clerk_handshake");

    return NextResponse.redirect(url);
  }

  if (!isClerkConfigured()) {
    return NextResponse.next();
  }

  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  const middleware = clerkMiddleware(async (auth) => {
    const authState = await auth();
    const isAuthRoute =
      request.nextUrl.pathname.startsWith("/sign-in") || request.nextUrl.pathname.startsWith("/sign-up");
    const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");

    if (authState.userId && isAuthRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (!authState.userId && isDashboardRoute) {
      return authState.redirectToSignIn({ returnBackUrl: request.url });
    }
  });

  return middleware(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/api/(.*)",
  ],
};
