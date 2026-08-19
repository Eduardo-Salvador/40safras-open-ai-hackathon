import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  FieldEventDraftSchema,
  OperationDraftSchema,
  type FieldEventDraft,
  type OperationDraft,
} from "@/domain/schemas";
import { FIELD_EVENT_INSTRUCTIONS } from "@/prompts/field-event";
import { OPERATION_BRIEF_INSTRUCTIONS } from "@/prompts/operation-brief";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6-terra";
const MAX_ATTEMPTS = 2;

export const OperationDraftExtractionSchema = z.object({
  municipalityName: z.string().nullable(),
  municipalityState: z.string().length(2).nullable(),
  totalAreaHa: z.number().positive().nullable(),
  planterCapacityHaPerDay: z.number().positive().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  fields: z.array(
    z.object({
      id: z.string().min(1),
      areaHa: z.number().positive().nullable(),
      secondCropEligible: z.boolean().nullable(),
      priority: z.number().int().nonnegative().nullable(),
    }),
  ),
  seedLots: z.array(
    z.object({
      id: z.string().min(1),
      crop: z.enum(["soybean", "corn"]),
      cycleDays: z.number().int().positive().nullable(),
      availableAreaHa: z.number().positive().nullable(),
    }),
  ),
  secondCropTargetAreaHa: z.number().nonnegative().nullable(),
  finance: z
    .object({
      soybeanMarginPerHa: z.number().nullable(),
      cornMarginPerHa: z.number().nullable(),
      operatingCostPerDay: z.number().nullable(),
    })
    .nullable(),
  missingFields: z.array(z.string()),
  ambiguities: z.array(z.string()),
});

export const FieldEventDraftExtractionSchema = z.object({
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  blockedFieldIds: z.array(z.string()),
  blockedUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  seedDeltas: z.array(
    z.object({
      cycleDays: z.string(),
      deltaAreaHa: z.number(),
    }),
  ),
  notes: z.array(z.string()),
  missingFields: z.array(z.string()),
  ambiguities: z.array(z.string()),
});

export type StructuredOutputKind = "operation_brief" | "field_event";
export type StructuredOutputRequester = (kind: StructuredOutputKind, text: string) => Promise<unknown>;

export type ParseResult<T> = {
  data: T;
  source: "openai" | "recovery";
  attempts: number;
  warning?: string;
};

export class OpenAIConfigurationError extends Error {}

function createClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new OpenAIConfigurationError("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

export const requestStructuredOutput: StructuredOutputRequester = async (kind, text) => {
  const client = createClient();
  const isOperation = kind === "operation_brief";
  const response = await client.responses.parse({
    model: MODEL,
    input: [
      {
        role: "system",
        content: isOperation ? OPERATION_BRIEF_INSTRUCTIONS : FIELD_EVENT_INSTRUCTIONS,
      },
      { role: "user", content: text },
    ],
    text: {
      format: isOperation
        ? zodTextFormat(OperationDraftExtractionSchema, "operation_draft")
        : zodTextFormat(FieldEventDraftExtractionSchema, "field_event_draft"),
    },
  });

  if (!response.output_parsed) throw new Error("OpenAI returned no parsed structured output");
  return response.output_parsed;
};

async function requestWithOneRetry<T>(
  kind: StructuredOutputKind,
  text: string,
  schema: z.ZodType<T>,
  requester: StructuredOutputRequester,
): Promise<{ success: true; data: T; attempts: number } | { success: false; attempts: number; warning: string }> {
  let warning = "structured output failed";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const parsed = schema.safeParse(await requester(kind, text));
      if (parsed.success) return { success: true, data: parsed.data, attempts: attempt };
      warning = parsed.error.issues.map((issue) => issue.message).join("; ");
    } catch (error) {
      warning = error instanceof Error ? error.message : "structured output request failed";
    }
  }

  return { success: false, attempts: MAX_ATTEMPTS, warning };
}

function normalizeOperationDraft(
  extraction: z.infer<typeof OperationDraftExtractionSchema>,
): OperationDraft {
  const draft: Record<string, unknown> = {
    fields: extraction.fields.map((field) => ({
      id: field.id,
      ...(field.areaHa === null ? {} : { areaHa: field.areaHa }),
      ...(field.secondCropEligible === null ? {} : { secondCropEligible: field.secondCropEligible }),
      ...(field.priority === null ? {} : { priority: field.priority }),
    })),
    seedLots: extraction.seedLots.map((lot) => ({
      id: lot.id,
      crop: lot.crop,
      ...(lot.cycleDays === null ? {} : { cycleDays: lot.cycleDays }),
      ...(lot.availableAreaHa === null ? {} : { availableAreaHa: lot.availableAreaHa }),
    })),
    missingFields: extraction.missingFields,
    ambiguities: extraction.ambiguities,
  };

  if (extraction.municipalityName !== null || extraction.municipalityState !== null) {
    draft.municipalityQuery = {
      ...(extraction.municipalityName === null ? {} : { name: extraction.municipalityName }),
      ...(extraction.municipalityState === null ? {} : { state: extraction.municipalityState }),
    };
  }
  if (extraction.totalAreaHa !== null) draft.totalAreaHa = extraction.totalAreaHa;
  if (extraction.planterCapacityHaPerDay !== null) {
    draft.planterCapacityHaPerDay = extraction.planterCapacityHaPerDay;
  }
  if (extraction.startDate !== null) draft.startDate = extraction.startDate;
  if (extraction.secondCropTargetAreaHa !== null) {
    draft.secondCropTargetAreaHa = extraction.secondCropTargetAreaHa;
  }
  if (extraction.finance !== null) {
    draft.finance = {
      ...(extraction.finance.soybeanMarginPerHa === null
        ? {}
        : { soybeanMarginPerHa: extraction.finance.soybeanMarginPerHa }),
      ...(extraction.finance.cornMarginPerHa === null
        ? {}
        : { cornMarginPerHa: extraction.finance.cornMarginPerHa }),
      ...(extraction.finance.operatingCostPerDay === null
        ? {}
        : { operatingCostPerDay: extraction.finance.operatingCostPerDay }),
    };
  }

  return OperationDraftSchema.parse(draft);
}

function operationRecovery(): OperationDraft {
  return OperationDraftSchema.parse({
    fields: [],
    seedLots: [],
    missingFields: [
      "municipalityQuery",
      "totalAreaHa",
      "planterCapacityHaPerDay",
      "startDate",
      "fields",
      "seedLots",
      "secondCropTargetAreaHa",
    ],
    ambiguities: [],
  });
}

function normalizeFieldEventDraft(
  extraction: z.infer<typeof FieldEventDraftExtractionSchema>,
): FieldEventDraft {
  return FieldEventDraftSchema.parse({
    ...(extraction.effectiveDate === null ? {} : { effectiveDate: extraction.effectiveDate }),
    blockedFieldIds: extraction.blockedFieldIds,
    ...(extraction.blockedUntil === null ? {} : { blockedUntil: extraction.blockedUntil }),
    seedDeltaAreaHaByCycle: Object.fromEntries(
      extraction.seedDeltas.map((delta) => [delta.cycleDays, delta.deltaAreaHa]),
    ),
    notes: extraction.notes,
    missingFields: extraction.missingFields,
    ambiguities: extraction.ambiguities,
  });
}

function fieldEventRecovery(): FieldEventDraft {
  return FieldEventDraftSchema.parse({
    blockedFieldIds: [],
    seedDeltaAreaHaByCycle: {},
    notes: [],
    missingFields: ["effectiveDate", "eventChange"],
    ambiguities: [],
  });
}

export async function parseOperationBrief(
  text: string,
  requester: StructuredOutputRequester = requestStructuredOutput,
): Promise<ParseResult<OperationDraft>> {
  const result = await requestWithOneRetry(
    "operation_brief",
    text,
    OperationDraftExtractionSchema,
    requester,
  );
  if (!result.success) {
    return { data: operationRecovery(), source: "recovery", attempts: result.attempts, warning: result.warning };
  }
  return { data: normalizeOperationDraft(result.data), source: "openai", attempts: result.attempts };
}

export async function parseFieldEvent(
  text: string,
  requester: StructuredOutputRequester = requestStructuredOutput,
): Promise<ParseResult<FieldEventDraft>> {
  const result = await requestWithOneRetry(
    "field_event",
    text,
    FieldEventDraftExtractionSchema,
    requester,
  );
  if (!result.success) {
    return { data: fieldEventRecovery(), source: "recovery", attempts: result.attempts, warning: result.warning };
  }
  return { data: normalizeFieldEventDraft(result.data), source: "openai", attempts: result.attempts };
}
