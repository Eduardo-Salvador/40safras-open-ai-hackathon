import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseFieldEvent } from "@/lib/openai";

const RequestSchema = z.object({ text: z.string().trim().min(1).max(10_000) });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid or missing 'text' in request body" }, { status: 400 });
  }

  const result = await parseFieldEvent(parsed.data.text);
  return NextResponse.json({
    event: result.data,
    source: result.source,
    attempts: result.attempts,
    ...(result.warning ? { warning: "structured parsing unavailable; review the editable recovery" } : {}),
    ...(result.source === "recovery" ? { originalText: parsed.data.text } : {}),
  });
}
