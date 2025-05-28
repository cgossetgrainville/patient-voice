

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/enquete", "/dashboard", "/questionnaire"];

export function middleware(request: NextRequest) {
  const session = request.cookies.get("admin_session");

  const isProtected = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && session?.value !== "true") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/enquete/:path*", "/dashboard/:path*", "/questionnaire/:path*"],
};