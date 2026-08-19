import type { FarmOperationInput, FieldEvent } from "./schemas";
import { addDays } from "./dates";

/**
 * Applies a confirmed event without mutating the original operation.
 * Permanent blocks remove fields; temporary blocks preserve them with an
 * explicit release date. Seed changes address stable lot IDs.
 */
export function applyFieldEvent(input: FarmOperationInput, event: FieldEvent): FarmOperationInput {
  const blocked = new Set(event.blockedFieldIds);
  const knownFieldIds = new Set(input.fields.map((field) => field.id));
  const unknownFieldId = event.blockedFieldIds.find((id) => !knownFieldIds.has(id));
  if (unknownFieldId) throw new Error(`evento referencia talhão desconhecido: ${unknownFieldId}`);

  const knownLotIds = new Set(input.seedLots.map((lot) => lot.id));
  const unknownLotId = Object.keys(event.seedDeltaAreaHaByLot).find((id) => !knownLotIds.has(id));
  if (unknownLotId) throw new Error(`evento referencia lote de semente desconhecido: ${unknownLotId}`);

  const permanentBlock = !event.blockedUntil;
  const releaseDate = event.blockedUntil ? addDays(event.blockedUntil, 1) : undefined;
  const fields = input.fields
    .filter((field) => !(permanentBlock && blocked.has(field.id)))
    .map((field) =>
      blocked.has(field.id) && releaseDate
        ? { ...field, availableFrom: field.availableFrom && field.availableFrom > releaseDate ? field.availableFrom : releaseDate }
        : { ...field },
    );

  if (fields.length === 0) {
    throw new Error("o evento bloqueia todos os talhões e não deixa plano operacional viável");
  }

  const adjustedSeedLots = input.seedLots
    .map((lot) => ({
      ...lot,
      availableAreaHa: lot.availableAreaHa + (event.seedDeltaAreaHaByLot[lot.id] ?? 0),
    }))
    .filter((lot) => lot.availableAreaHa > 0);

  if (adjustedSeedLots.length === 0) {
    throw new Error("o evento esgota todos os lotes de semente e não deixa plano operacional viável");
  }

  const totalAreaHa = fields.reduce((sum, field) => sum + field.areaHa, 0);
  const eligibleAreaHa = fields
    .filter((field) => field.priority === "second_crop")
    .reduce((sum, field) => sum + field.areaHa, 0);
  const seedAreaHa = adjustedSeedLots.reduce((sum, lot) => sum + lot.availableAreaHa, 0);
  if (seedAreaHa + 0.01 < totalAreaHa) {
    throw new Error("o estoque de sementes após o evento é insuficiente para os talhões restantes");
  }

  return {
    ...input,
    fields,
    seedLots: adjustedSeedLots,
    totalAreaHa,
    secondCropTargetAreaHa: Math.min(input.secondCropTargetAreaHa, eligibleAreaHa),
  };
}
