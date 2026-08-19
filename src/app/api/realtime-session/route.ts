import { NextRequest, NextResponse } from "next/server";
import { RealtimeSessionRequestSchema, mintRealtimeClientSecret } from "@/lib/realtime";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RealtimeSessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid or missing 'sessionId' in request body" }, { status: 400 });
  }

  try {
    return NextResponse.json(await mintRealtimeClientSecret(parsed.data));
  } catch {
    return NextResponse.json({ error: "voice session is temporarily unavailable" }, { status: 503 });
  }
}
