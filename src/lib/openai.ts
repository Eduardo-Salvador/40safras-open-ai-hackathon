import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  FieldEventDraftSchema,
  OperationDraftSchema,
  type FieldEventDraft,
  type OperationDraft,
} from "@/domain/schemas";
import { FIELD_EVENT_EXTRACTION_PROMPT, OPERATION_EXTRACTION_PROMPT } from "@/prompts/operation";

export type AiSource = "openai" | "prepared-fallback";

function numberAfter(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return Number(match[1].replace(".", "").replace(",", "."));
  }
  return null;
}

export function preparedOperationDraft(rawText: string): OperationDraft {
  const municipality = rawText.match(/\b(Sorriso|Rio Verde|Lu[ií]s Eduardo Magalh[aã]es)(?:\s*[,/-]\s*([A-Z]{2}|Mato Grosso|Goi[aá]s|Bahia))?/i);
  const startDate = rawText.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] ?? null;
  const totalAreaHa = numberAfter(rawText, [/([\d.,]+)\s*(?:ha|hectares?)\b/i, /área total\D+([\d.,]+)/i]);
  const planterCapacityHaPerDay = numberAfter(rawText, [/([\d.,]+)\s*ha\s*(?:\/|por)\s*dia/i, /capacidade\D+([\d.,]+)/i]);
  const secondCropTargetAreaHa = numberAfter(rawText, [/meta\D+([\d.,]+)\s*(?:ha|hectares?)/i]);

  const draft: OperationDraft = {
    rawText,
    municipalityQuery: municipality?.[0] ?? null,
    startDate,
    totalAreaHa,
    planterCapacityHaPerDay,
    secondCropTargetAreaHa,
    soybeanMarginPerHa: numberAfter(rawText, [/margem\s+(?:da\s+)?soja\D+([\d.,]+)/i]),
    cornMarginPerHa: numberAfter(rawText, [/margem\s+(?:do\s+)?milho\D+([\d.,]+)/i]),
    operatingCostPerDay: numberAfter(rawText, [/custo\s+(?:operacional\s+)?(?:diário|por\s+dia)\D+([\d.,]+)/i]),
    missingFields: [],
    ambiguities: [],
  };
  const required: Array<[keyof OperationDraft, string]> = [
    ["municipalityQuery", "município/UF"],
    ["startDate", "data inicial (AAAA-MM-DD)"],
    ["totalAreaHa", "área total"],
    ["planterCapacityHaPerDay", "capacidade da plantadeira"],
    ["secondCropTargetAreaHa", "meta da segunda safra"],
  ];
  draft.missingFields = required.filter(([key]) => draft[key] === null).map(([, label]) => label);
  return OperationDraftSchema.parse(draft);
}

export function preparedFieldEventDraft(rawText: string, defaultDate: string): FieldEventDraft {
  const blockedFieldIds = [...rawText.matchAll(/\bT[-\s]?(\d{1,2})\b/gi)].map((match) => `T-${match[1].padStart(2, "0")}`);
  const explicitDate = rawText.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  const lower = rawText.toLowerCase();
  const eventType: FieldEventDraft["eventType"] = lower.includes("chuva")
    ? "excess_rain"
    : lower.includes("semente")
      ? "seed_loss"
      : lower.includes("máquina") || lower.includes("plantadeira")
        ? "machine_failure"
        : blockedFieldIds.length > 0
          ? "block"
          : "other";
  return FieldEventDraftSchema.parse({
    rawText,
    eventType,
    severity: /perda total|desastre|crític|alagad/i.test(rawText) ? "critical" : "operational",
    effectiveDate: explicitDate ?? defaultDate,
    blockedFieldIds: [...new Set(blockedFieldIds)],
    blockedUntil: null,
    notes: [rawText],
    missingFields: blockedFieldIds.length === 0 ? ["talhão afetado"] : [],
  });
}

function client(): OpenAI | null {
  return process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
}

export async function parseOperationBrief(rawText: string): Promise<{ draft: OperationDraft; source: AiSource }> {
  const openai = client();
  if (!openai) return { draft: preparedOperationDraft(rawText), source: "prepared-fallback" };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await openai.responses.parse({
        model: process.env.OPENAI_MODEL ?? "gpt-5.6-terra",
        instructions: OPERATION_EXTRACTION_PROMPT,
        input: rawText,
        text: { format: zodTextFormat(OperationDraftSchema, "operation_draft") },
      });
      if (response.output_parsed) return { draft: OperationDraftSchema.parse(response.output_parsed), source: "openai" };
    } catch {
      if (attempt === 1) break;
    }
  }
  return { draft: preparedOperationDraft(rawText), source: "prepared-fallback" };
}

export async function parseFieldEvent(rawText: string, defaultDate: string): Promise<{ draft: FieldEventDraft; source: AiSource }> {
  const openai = client();
  if (!openai) return { draft: preparedFieldEventDraft(rawText, defaultDate), source: "prepared-fallback" };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await openai.responses.parse({
        model: process.env.OPENAI_MODEL ?? "gpt-5.6-terra",
        instructions: FIELD_EVENT_EXTRACTION_PROMPT,
        input: `Data padrão: ${defaultDate}\nEvento: ${rawText}`,
        text: { format: zodTextFormat(FieldEventDraftSchema, "field_event_draft") },
      });
      if (response.output_parsed) return { draft: FieldEventDraftSchema.parse(response.output_parsed), source: "openai" };
    } catch {
      if (attempt === 1) break;
    }
  }
  return { draft: preparedFieldEventDraft(rawText, defaultDate), source: "prepared-fallback" };
}
