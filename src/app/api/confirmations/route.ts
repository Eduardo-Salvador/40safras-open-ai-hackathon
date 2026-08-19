import { NextRequest, NextResponse } from "next/server";
import { ConfirmationError, RequestConfirmationArgsSchema, confirmationGuard } from "@/lib/confirmation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RequestConfirmationArgsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid confirmation request" }, { status: 400 });

  try {
    const challenge = confirmationGuard.request(parsed.data);
    return NextResponse.json(challenge, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof ConfirmationError ? error.code : "CONFIRMATION_UNAVAILABLE";
    return NextResponse.json({ error: "confirmation unavailable", code }, { status: 503 });
  }
}
