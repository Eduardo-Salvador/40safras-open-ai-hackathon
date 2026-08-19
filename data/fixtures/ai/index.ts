import type { FieldEventDraft, OperationDraft } from "@/domain/schemas";
import { canonicalOperationDraft, canonicalFieldEventDraft } from "../contracts";

export const PREPARED_OPERATION_BRIEF =
  "Sorriso MT, 200 hectares, plantadeira 50 hectares por dia, início 15 de setembro de 2025, talhão A 100 hectares só soja, talhão B 100 hectares com safrinha, lotes de soja de 90 e 120 dias para 100 hectares cada, meta de milho 100 hectares, margens de soja 1000 e milho 800 reais por hectare.";

export const PREPARED_FIELD_EVENT =
  "Em 20 de setembro de 2025, o talhão B ficou bloqueado por chuva forte até 23 de setembro de 2025.";

function normalized(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function preparedOperationDraft(text: string): OperationDraft | null {
  return normalized(text) === normalized(PREPARED_OPERATION_BRIEF)
    ? structuredClone(canonicalOperationDraft)
    : null;
}

export function preparedFieldEventDraft(text: string): FieldEventDraft | null {
  return normalized(text) === normalized(PREPARED_FIELD_EVENT)
    ? structuredClone(canonicalFieldEventDraft)
    : null;
}
