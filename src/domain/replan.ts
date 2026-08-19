import { computeReplanDiff } from "./diff";
import { applyFieldEvent } from "./field-event";
import { buildPlan } from "./planner";
import {
  FieldEventSchema,
  ReplanResultSchema,
  type FarmOperationInput,
  type FieldEvent,
  type HistoricalDataset,
  type ReplanResult,
} from "./schemas";

export function buildReplan(input: FarmOperationInput, dataset: HistoricalDataset, event: FieldEvent): ReplanResult {
  const validEvent = FieldEventSchema.parse(event);
  const before = buildPlan(input, dataset);
  const after = buildPlan(applyFieldEvent(input, validEvent), dataset);
  const changes = computeReplanDiff(before, after, validEvent);

  return ReplanResultSchema.parse({ before, after, event: validEvent, changes });
}
