import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, LoginSchema, createSessionToken, validateLogin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success || !validateLogin(parsed.data)) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true, username: parsed.data.username });
  response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(parsed.data.username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return response;
}
