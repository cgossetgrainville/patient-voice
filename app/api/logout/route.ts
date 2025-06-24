import { NextResponse } from "next/server";

export async function GET() {
  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    throw new Error("NEXT_PUBLIC_BASE_URL is not defined");
  }

  const res = NextResponse.redirect(process.env.NEXT_PUBLIC_BASE_URL!);

  res.cookies.set("admin_session", "", {
    path: "/",
    maxAge: 0,
  });

  res.cookies.set("admin_session_info", "", {
    path: "/",
    maxAge: 0,
  });

  return res;
}
