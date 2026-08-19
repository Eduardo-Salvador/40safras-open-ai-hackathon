import { NextResponse } from "next/server";
import { z } from "zod";
import { parseFieldEvent } from "@/lib/openai";

const RequestSchema = z.object({
  text: z.string().min(3).max(4_000),
  defaultDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "evento inválido" }, { status: 400 });
  return NextResponse.json(await parseFieldEvent(parsed.data.text, parsed.data.defaultDate));
}
