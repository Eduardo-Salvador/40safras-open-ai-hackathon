import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ConfirmedFieldEventSchema,
  FarmOperationInputSchema,
  FieldEventSchema,
  HistoricalDatasetSchema,
  ReplanResultSchema,
} from "@/domain/schemas";
import { buildReplan } from "@/domain/replan";
import { ConfirmationError, confirmationGuard } from "@/lib/confirmation";

export const runtime = "nodejs";

const ReplanRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(200),
  draftVersion: z.string().min(1),
  confirmationToken: z.string().min(1),
  affirmative: z.boolean(),
  method: z.enum(["voice", "button"]),
  operation: FarmOperationInputSchema,
  dataset: HistoricalDatasetSchema,
  event: FieldEventSchema,
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ReplanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid replan request", issues: parsed.error.issues.map((issue) => issue.path.join(".")) },
      { status: 400 },
    );
  }

  try {
    const args = parsed.data;
    const confirmation = confirmationGuard.confirm({
      sessionId: args.sessionId,
      subject: "field_event",
      draftVersion: args.draftVersion,
      confirmationToken: args.confirmationToken,
      method: args.method,
      affirmative: args.affirmative,
    });
    const confirmedEvent = ConfirmedFieldEventSchema.parse({
      draftVersion: args.draftVersion,
      confirmation,
      event: args.event,
    });
    const replan = ReplanResultSchema.parse(
      buildReplan(args.operation, args.dataset, confirmedEvent.event),
    );

    return NextResponse.json(
      { draftVersion: confirmedEvent.draftVersion, replan },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ConfirmationError) {
      return NextResponse.json(
        { error: "field event confirmation rejected", code: error.code },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "replan calculation failed" }, { status: 500 });
  }
}
