import { describe, expect, it } from "vitest";
import { generateCandidates, MAX_CANDIDATES } from "@/domain/candidates";
import type { FarmOperationInput } from "@/domain/schemas";

function operation(overrides: Partial<FarmOperationInput> = {}): FarmOperationInput {
  return {
    municipality: {
      name: "Sorriso",
      state: "MT",
      countryCode: "BR",
      latitude: -12.5453,
      longitude: -55.7217,
      timezone: "America/Cuiaba",
    },
    totalAreaHa: 200,
    planterCapacityHaPerDay: 50,
    startDate: "2025-09-15",
    firstCrop: "soybean",
    secondCrop: "corn",
    fields: [
      { id: "A", areaHa: 100, priority: "second_crop" },
      { id: "B", areaHa: 100, priority: "soy_only" },
    ],
    seedLots: [
      { id: "S90", crop: "soybean", cycleDays: 90, availableAreaHa: 100 },
      { id: "S120", crop: "soybean", cycleDays: 120, availableAreaHa: 100 },
    ],
    secondCropTargetAreaHa: 100,
    finance: { soybeanMarginPerHa: 1000, cornMarginPerHa: 800 },
    ...overrides,
  };
}

describe("generateCandidates", () => {
  it("preserva a ordem informada como baseline e gera todas as combinações válidas", () => {
    const candidates = generateCandidates(operation());

    expect(candidates).toHaveLength(4);
    expect(candidates[0].baseline).toBe(true);
    expect(candidates[0].fieldOrder.map((field) => field.id)).toEqual(["A", "B"]);
    expect(new Set(candidates.map((candidate) => candidate.key)).size).toBe(candidates.length);
  });

  it("nunca excede o estoque de um lote", () => {
    for (const candidate of generateCandidates(operation())) {
      const areaByCycle = new Map<number, number>();
      for (const field of candidate.fieldOrder) {
        const cycle = candidate.cycleDaysByField[field.id];
        areaByCycle.set(cycle, (areaByCycle.get(cycle) ?? 0) + field.areaHa);
      }
      expect(areaByCycle.get(90) ?? 0).toBeLessThanOrEqual(100);
      expect(areaByCycle.get(120) ?? 0).toBeLessThanOrEqual(100);
    }
  });

  it("falha claramente quando nenhum lote consegue atender os talhões", () => {
    const input = operation({
      seedLots: [{ id: "S90", crop: "soybean", cycleDays: 90, availableAreaHa: 150 }],
    });
    expect(() => generateCandidates(input)).toThrow(/nenhum candidato/);
  });

  it("rejeita ciclo fora do perfil de soja validado", () => {
    const input = operation({
      seedLots: [{ id: "S200", crop: "soybean", cycleDays: 200, availableAreaHa: 200 }],
    });
    expect(() => generateCandidates(input)).toThrow(/fora do perfil validado/);
  });

  it("rejeita IDs de talhão repetidos", () => {
    const duplicatedFields = [
      { id: "A", areaHa: 100, priority: "second_crop" as const },
      { id: "A", areaHa: 100, priority: "soy_only" as const },
    ];
    expect(() => generateCandidates(operation({ fields: duplicatedFields }))).toThrow(/IDs dos talhões/);
  });

  it("limita o caminho canônico a quatro talhões e cem candidatos", () => {
    const fields = ["A", "B", "C", "D"].map((id) => ({
      id,
      areaHa: 25,
      priority: "second_crop" as const,
    }));
    const seedLots = [90, 100, 110, 120].map((cycleDays) => ({
      id: `S${cycleDays}`,
      crop: "soybean" as const,
      cycleDays,
      availableAreaHa: 100,
    }));
    expect(generateCandidates(operation({ fields, seedLots, totalAreaHa: 100 }))).toHaveLength(MAX_CANDIDATES);

    const tooManyFields = [...fields, { id: "E", areaHa: 25, priority: "soy_only" as const }];
    expect(() => generateCandidates(operation({ fields: tooManyFields, totalAreaHa: 125 }))).toThrow(/4 talhões/);
  });

  it("gera as 24 permutações possíveis de quatro talhões", () => {
    const fields = ["A", "B", "C", "D"].map((id) => ({
      id,
      areaHa: 25,
      priority: "second_crop" as const,
    }));
    const candidates = generateCandidates(operation({
      fields,
      totalAreaHa: 100,
      seedLots: [{ id: "S100", crop: "soybean", cycleDays: 100, availableAreaHa: 100 }],
    }));

    expect(candidates).toHaveLength(24);
    expect(new Set(candidates.map((candidate) => candidate.fieldOrder.map((field) => field.id).join(""))).size).toBe(24);
  });

  it("produz a mesma ordem e as mesmas chaves em execuções repetidas", () => {
    const input = operation();
    expect(generateCandidates(input)).toEqual(generateCandidates(input));
  });
});
