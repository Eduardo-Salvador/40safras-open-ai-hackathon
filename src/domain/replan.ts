import { computeReplanDiff } from "./diff";
import { applyFieldEvent } from "./field-event";
import { buildPlan } from "./planner";
import type { FarmOperationInput, FieldEvent, HistoricalDataset, ReplanResult } from "./schemas";

export function buildReplan(input: FarmOperationInput, dataset: HistoricalDataset, event: FieldEvent): ReplanResult {
  const before = buildPlan(input, dataset);
  const after = buildPlan(applyFieldEvent(input, event), dataset);
  const changes = computeReplanDiff(before, after, event);

  return { before, after, event, changes };
}
