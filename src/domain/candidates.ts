import type { FarmOperationInput, FieldBlock } from "./schemas";
import { getCropProfile } from "./crop-profiles";

export const MAX_CANDIDATE_FIELDS = 4;
export const MAX_CANDIDATES = 100;

export type PlanCandidate = {
  key: string;
  fieldOrder: FieldBlock[];
  seedLotIdByField: Readonly<Record<string, string>>;
  cycleDaysByField: Readonly<Record<string, number>>;
  baseline: boolean;
};

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [[...items]];

  const result: T[][] = [];
  for (let index = 0; index < items.length; index++) {
    const head = items[index];
    const tail = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const rest of permutations(tail)) result.push([head, ...rest]);
  }
  return result;
}

function candidateKey(fieldOrder: FieldBlock[], seedLotIdByField: Readonly<Record<string, string>>): string {
  return JSON.stringify(fieldOrder.map((field) => [field.id, seedLotIdByField[field.id]]));
}

/**
 * Gera candidatos em ordem determinística. A primeira ordem é sempre a informada pelo
 * produtor; lotes são tentados na ordem recebida e nunca excedem sua área disponível.
 */
export function generateCandidates(input: FarmOperationInput): PlanCandidate[] {
  if (input.fields.length > MAX_CANDIDATE_FIELDS) {
    throw new Error(`o MVP aceita no máximo ${MAX_CANDIDATE_FIELDS} talhões por plano`);
  }

  const fieldIds = new Set(input.fields.map((field) => field.id));
  if (fieldIds.size !== input.fields.length) {
    throw new Error("os IDs dos talhões precisam ser únicos");
  }
  const seedLotIds = new Set(input.seedLots.map((lot) => lot.id));
  if (seedLotIds.size !== input.seedLots.length) {
    throw new Error("os IDs dos lotes de semente precisam ser únicos");
  }

  const soybean = getCropProfile("soybean");
  const invalidLot = input.seedLots.find(
    (lot) => lot.cycleDays < soybean.cycleDaysMin || lot.cycleDays > soybean.cycleDaysMax,
  );
  if (invalidLot) {
    throw new Error(
      `ciclo de soja ${invalidLot.cycleDays} fora do perfil validado (${soybean.cycleDaysMin}-${soybean.cycleDaysMax} dias)`,
    );
  }

  const candidates: PlanCandidate[] = [];
  const seen = new Set<string>();

  for (const fieldOrder of permutations(input.fields)) {
    if (candidates.length >= MAX_CANDIDATES) break;
    const remainingByLot = input.seedLots.map((lot) => lot.availableAreaHa);
    const seedLotIdByField: Record<string, string> = {};
    const cycleDaysByField: Record<string, number> = {};

    function assignField(fieldIndex: number) {
      if (candidates.length >= MAX_CANDIDATES) return;
      if (fieldIndex === fieldOrder.length) {
        const key = candidateKey(fieldOrder, seedLotIdByField);
        if (seen.has(key)) return;
        seen.add(key);
        candidates.push({
          key,
          fieldOrder: [...fieldOrder],
          seedLotIdByField: { ...seedLotIdByField },
          cycleDaysByField: { ...cycleDaysByField },
          baseline: candidates.length === 0,
        });
        return;
      }

      const field = fieldOrder[fieldIndex];
      for (let lotIndex = 0; lotIndex < input.seedLots.length; lotIndex++) {
        if (candidates.length >= MAX_CANDIDATES) break;
        if (remainingByLot[lotIndex] < field.areaHa) continue;

        remainingByLot[lotIndex] -= field.areaHa;
        seedLotIdByField[field.id] = input.seedLots[lotIndex].id;
        cycleDaysByField[field.id] = input.seedLots[lotIndex].cycleDays;
        assignField(fieldIndex + 1);
        remainingByLot[lotIndex] += field.areaHa;
        delete seedLotIdByField[field.id];
        delete cycleDaysByField[field.id];
      }
    }

    assignField(0);
  }

  if (candidates.length === 0) {
    throw new Error("nenhum candidato respeita a disponibilidade dos lotes de soja");
  }

  const baseline = candidates[0];
  const remaining = candidates
    .slice(1)
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return [baseline, ...remaining].slice(0, MAX_CANDIDATES);
}
