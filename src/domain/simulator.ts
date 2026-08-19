import { addDays, daysBetween } from "./dates";
import { getCropProfile } from "./crop-profiles";
import type { FarmOperationInput, FieldBlock, HistoricalSeason } from "./schemas";

export type SequenceItem = {
  fieldId: string;
  seedLotId: string;
  areaHa: number;
  priority: FieldBlock["priority"];
  cycleDays: number;
  startDate: string;
  endDate: string;
  secondCropCandidate: boolean;
  cornHarvestDaysFromStart: number | null;
};

/**
 * Direct simulator calls fall back to the fastest/slowest compatible lot.
 * The planner always supplies the explicit, stock-checked lot assignment.
 */
function assignSoybeanLot(field: FieldBlock, input: FarmOperationInput) {
  return [...input.seedLots].sort((a, b) =>
    field.priority === "second_crop"
      ? a.cycleDays - b.cycleDays || a.id.localeCompare(b.id)
      : b.cycleDays - a.cycleDays || a.id.localeCompare(b.id),
  )[0];
}

export function buildSequence(
  input: FarmOperationInput,
  fieldOrder: FieldBlock[],
  cycleDaysByField?: Readonly<Record<string, number>>,
  seedLotIdByField?: Readonly<Record<string, string>>,
): SequenceItem[] {
  const corn = getCropProfile("corn");
  let cumulativeDays = 0;

  return fieldOrder.map((field) => {
    const plantDays = Math.ceil(field.areaHa / input.planterCapacityHaPerDay);
    const unconstrainedStartDate = addDays(input.startDate, cumulativeDays);
    const startDate = field.availableFrom && field.availableFrom > unconstrainedStartDate
      ? field.availableFrom
      : unconstrainedStartDate;
    cumulativeDays = daysBetween(input.startDate, startDate) + plantDays;

    const fallbackLot = assignSoybeanLot(field, input);
    const cycleDays = cycleDaysByField?.[field.id] ?? fallbackLot.cycleDays;
    const seedLotId = seedLotIdByField?.[field.id] ?? fallbackLot.id;
    const endDate = addDays(startDate, cycleDays);
    const secondCropCandidate = field.priority === "second_crop";

    const cornHarvestDaysFromStart = secondCropCandidate
      ? daysBetween(input.startDate, addDays(endDate, 1)) + corn.defaultCycleDays
      : null;

    return {
      fieldId: field.id,
      seedLotId,
      areaHa: field.areaHa,
      priority: field.priority,
      cycleDays,
      startDate,
      endDate,
      secondCropCandidate,
      cornHarvestDaysFromStart,
    };
  });
}

export function secondCropViableAreaHa(sequence: SequenceItem[], season: HistoricalSeason): number {
  return sequence
    .filter(
      (item) =>
        item.secondCropCandidate &&
        item.cornHarvestDaysFromStart !== null &&
        item.cornHarvestDaysFromStart <= season.rainWindowDaysFromStart,
    )
    .reduce((sum, item) => sum + item.areaHa, 0);
}

export function totalOperationDays(sequence: SequenceItem[]): number {
  return Math.max(
    ...sequence.map((item) =>
      item.cornHarvestDaysFromStart !== null
        ? item.cornHarvestDaysFromStart
        : daysBetween(sequence[0].startDate, item.endDate),
    ),
  );
}
