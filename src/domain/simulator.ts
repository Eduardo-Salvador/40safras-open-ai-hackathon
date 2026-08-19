import { addDays, daysBetween } from "./dates";
import { getCropProfile } from "./crop-profiles";
import type { FarmOperationInput, FieldBlock, HistoricalSeason } from "./schemas";

export type SequenceItem = {
  fieldId: string;
  areaHa: number;
  priority: FieldBlock["priority"];
  cycleDays: number;
  startDate: string;
  endDate: string;
  secondCropCandidate: boolean;
  cornHarvestDaysFromStart: number | null;
};

/**
 * Declared prototype simplification: second-crop fields draw the fastest
 * available soybean cultivar, soy-only fields draw the slowest. There is no
 * seed-lot depletion tracking yet — see docs/references/DOMAIN_NOTES.md.
 */
function assignSoybeanCycleDays(field: FieldBlock, input: FarmOperationInput): number {
  const cycles = input.seedLots.map((lot) => lot.cycleDays);
  return field.priority === "second_crop" ? Math.min(...cycles) : Math.max(...cycles);
}

export function buildSequence(
  input: FarmOperationInput,
  fieldOrder: FieldBlock[],
  cycleDaysByField?: Readonly<Record<string, number>>,
): SequenceItem[] {
  const corn = getCropProfile("corn");
  let cumulativeDays = 0;

  return fieldOrder.map((field) => {
    const plantDays = Math.ceil(field.areaHa / input.planterCapacityHaPerDay);
    const startDate = addDays(input.startDate, cumulativeDays);
    cumulativeDays += plantDays;

    const cycleDays = cycleDaysByField?.[field.id] ?? assignSoybeanCycleDays(field, input);
    const endDate = addDays(startDate, cycleDays);
    const secondCropCandidate = field.priority === "second_crop";

    const cornHarvestDaysFromStart = secondCropCandidate
      ? daysBetween(input.startDate, addDays(endDate, 1)) + corn.defaultCycleDays
      : null;

    return {
      fieldId: field.id,
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
