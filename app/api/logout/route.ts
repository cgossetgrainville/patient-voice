import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
const res = NextResponse.redirect("http://localhost:3000");

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
