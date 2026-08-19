import type { FarmOperationInput, FieldEvent } from "./schemas";

/**
 * Applies a field event to an operation brief: blocked fields drop out of
 * the plan entirely (and their area leaves the declared total), and seed
 * availability shifts by cycle-days key. Never leaves zero seed lots, since
 * the schema requires at least one.
 */
export function applyFieldEvent(input: FarmOperationInput, event: FieldEvent): FarmOperationInput {
  const blocked = new Set(event.blockedFieldIds);
  const fields = input.fields.filter((f) => !blocked.has(f.id));
  const removedAreaHa = input.fields.filter((f) => blocked.has(f.id)).reduce((sum, f) => sum + f.areaHa, 0);

  const adjustedSeedLots = input.seedLots
    .map((lot) => ({
      ...lot,
      availableAreaHa: lot.availableAreaHa + (event.seedDeltaAreaHaByCycle[String(lot.cycleDays)] ?? 0),
    }))
    .filter((lot) => lot.availableAreaHa > 0);

  return {
    ...input,
    fields: fields.length > 0 ? fields : input.fields,
    seedLots: adjustedSeedLots.length > 0 ? adjustedSeedLots : input.seedLots,
    totalAreaHa: Math.max(0, input.totalAreaHa - removedAreaHa),
  };
}
