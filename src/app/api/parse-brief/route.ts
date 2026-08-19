import { NextResponse } from "next/server";
import { z } from "zod";
import { parseOperationBrief } from "@/lib/openai";

const RequestSchema = z.object({ text: z.string().min(3).max(8_000) });

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "relato inválido" }, { status: 400 });
  return NextResponse.json(await parseOperationBrief(parsed.data.text));
}
