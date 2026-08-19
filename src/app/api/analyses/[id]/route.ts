import { NextRequest, NextResponse } from "next/server";
import { analysisStore } from "@/lib/analysis-store";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!verifySessionToken(req.cookies.get(AUTH_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }
  const { id } = await context.params;
  const analysis = await analysisStore.get(id);
  return analysis
    ? NextResponse.json({ analysis })
    : NextResponse.json({ error: "analysis not found" }, { status: 404 });
}
