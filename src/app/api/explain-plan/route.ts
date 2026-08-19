import { NextRequest, NextResponse } from "next/server";
import { PlanResultSchema } from "@/domain/schemas";
import { explainPlan } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = PlanResultSchema.safeParse(body?.plan);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid or missing 'plan' in request body" }, { status: 400 });
  }

  const explanation = await explainPlan(parsed.data);
  return NextResponse.json({
    explanation: explanation.text,
    source: explanation.source,
    ...(explanation.warning ? { warning: "verified deterministic explanation used" } : {}),
  });
}
