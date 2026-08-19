import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FieldEventSchema, ReplanResultSchema } from "@/domain/schemas";
import { buildReplan } from "@/domain/replan";
import { analysisStore } from "@/lib/analysis-store";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { ConfirmationError, confirmationGuard } from "@/lib/confirmation";

export const runtime = "nodejs";

const SavedReplanRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(200),
  draftVersion: z.string().min(1),
  confirmationToken: z.string().min(1),
  affirmative: z.boolean(),
  method: z.enum(["voice", "button"]),
  event: FieldEventSchema,
});

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!verifySessionToken(req.cookies.get(AUTH_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = SavedReplanRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid replan request" }, { status: 400 });

  const { id } = await context.params;
  const analysis = await analysisStore.get(id);
  if (!analysis) return NextResponse.json({ error: "analysis not found" }, { status: 404 });

  try {
    const args = parsed.data;
    confirmationGuard.confirm({
      sessionId: args.sessionId,
      subject: "field_event",
      draftVersion: args.draftVersion,
      confirmationToken: args.confirmationToken,
      method: args.method,
      affirmative: args.affirmative,
    });
    const replan = ReplanResultSchema.parse(buildReplan(analysis.operation, analysis.dataset, args.event));
    const updated = await analysisStore.addReplan(id, replan);
    return NextResponse.json({ analysis: updated, replan });
  } catch (error) {
    if (error instanceof ConfirmationError) {
      return NextResponse.json({ error: "field event confirmation rejected", code: error.code }, { status: 409 });
    }
    return NextResponse.json({ error: "saved replan failed" }, { status: 500 });
  }
}
