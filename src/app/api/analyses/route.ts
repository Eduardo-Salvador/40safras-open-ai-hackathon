import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildPlan } from "@/domain/planner";
import { FarmOperationInputSchema, HistoricalDatasetSchema, PlanResultSchema } from "@/domain/schemas";
import { analysisStore } from "@/lib/analysis-store";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";

const SaveAnalysisSchema = z.object({
  title: z.string().trim().min(1).max(120),
  operation: FarmOperationInputSchema,
  dataset: HistoricalDatasetSchema,
});

function authenticated(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(AUTH_COOKIE_NAME)?.value) !== null;
}

export async function GET(req: NextRequest) {
  if (!authenticated(req)) return NextResponse.json({ error: "authentication required" }, { status: 401 });
  const analyses = await analysisStore.list();
  return NextResponse.json({ analyses });
}

export async function POST(req: NextRequest) {
  if (!authenticated(req)) return NextResponse.json({ error: "authentication required" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = SaveAnalysisSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid analysis" }, { status: 400 });

  const plan = PlanResultSchema.parse(buildPlan(parsed.data.operation, parsed.data.dataset));
  const analysis = await analysisStore.create({ ...parsed.data, plan });
  return NextResponse.json({ analysis }, { status: 201 });
}
