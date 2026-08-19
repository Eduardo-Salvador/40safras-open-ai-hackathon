import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = verifySessionToken(req.cookies.get(AUTH_COOKIE_NAME)?.value);
  return session
    ? NextResponse.json({ authenticated: true, username: session.username })
    : NextResponse.json({ authenticated: false }, { status: 401 });
}
