import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ConfirmedFarmOperationSchema,
  FarmOperationInputSchema,
  HistoricalDatasetSchema,
  PlanResultSchema,
} from "@/domain/schemas";
import { buildPlan } from "@/domain/planner";
import { ConfirmationError, confirmationGuard } from "@/lib/confirmation";

export const runtime = "nodejs";

const PlanRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(200),
  draftVersion: z.string().min(1),
  confirmationToken: z.string().min(1),
  affirmative: z.boolean(),
  method: z.enum(["voice", "button"]),
  operation: FarmOperationInputSchema,
  dataset: HistoricalDatasetSchema,
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = PlanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid plan request", issues: parsed.error.issues.map((issue) => issue.path.join(".")) },
      { status: 400 },
    );
  }

  try {
    const args = parsed.data;
    const confirmation = confirmationGuard.confirm({
      sessionId: args.sessionId,
      subject: "operation",
      draftVersion: args.draftVersion,
      confirmationToken: args.confirmationToken,
      method: args.method,
      affirmative: args.affirmative,
    });
    const confirmed = ConfirmedFarmOperationSchema.parse({
      draftVersion: args.draftVersion,
      confirmation,
      municipality: args.operation.municipality,
      operation: args.operation,
    });
    const plan = PlanResultSchema.parse(buildPlan(confirmed.operation, args.dataset));

    return NextResponse.json(
      { draftVersion: confirmed.draftVersion, plan },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ConfirmationError) {
      return NextResponse.json(
        { error: "operation confirmation rejected", code: error.code },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "plan calculation failed" }, { status: 500 });
  }
}
