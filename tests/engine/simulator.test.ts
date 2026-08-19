import { describe, expect, it } from "vitest";
import { buildSequence, secondCropViableAreaHa } from "@/domain/simulator";
import type { FarmOperationInput } from "@/domain/schemas";

const input: FarmOperationInput = {
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
    { id: "A", areaHa: 100, priority: "soy_only" },
    { id: "B", areaHa: 100, priority: "second_crop" },
  ],
  seedLots: [
    { id: "S90", crop: "soybean", cycleDays: 90, availableAreaHa: 200 },
    { id: "S120", crop: "soybean", cycleDays: 120, availableAreaHa: 200 },
  ],
  secondCropTargetAreaHa: 100,
  finance: { soybeanMarginPerHa: 1000, cornMarginPerHa: 800 },
};

describe("buildSequence", () => {
  it("queues fields sequentially by planter capacity, in the given order", () => {
    const sequence = buildSequence(input, input.fields);
    // A: 100ha at 50ha/day -> 2 planting days, so A starts at day 0.
    expect(sequence[0].startDate).toBe("2025-09-15");
    // B starts only after A's 2 planting days.
    expect(sequence[1].startDate).toBe("2025-09-17");
  });

  it("gives second-crop fields the fastest cultivar and soy-only fields the slowest", () => {
    const sequence = buildSequence(input, input.fields);
    expect(sequence.find((s) => s.fieldId === "A")?.cycleDays).toBe(120);
    expect(sequence.find((s) => s.fieldId === "B")?.cycleDays).toBe(90);
  });

  it("moving the second-crop field first shortens its corn-harvest day", () => {
    const baseline = buildSequence(input, input.fields); // [A, B]
    const candidate = buildSequence(input, [...input.fields].reverse()); // [B, A]

    const baselineB = baseline.find((s) => s.fieldId === "B")!;
    const candidateB = candidate.find((s) => s.fieldId === "B")!;

    expect(candidateB.cornHarvestDaysFromStart).toBeLessThan(baselineB.cornHarvestDaysFromStart!);
    expect(candidateB.cornHarvestDaysFromStart).toBe(201);
    expect(baselineB.cornHarvestDaysFromStart).toBe(203);
  });

  it("never assigns a corn harvest day to a soy-only field", () => {
    const sequence = buildSequence(input, input.fields);
    expect(sequence.find((s) => s.fieldId === "A")?.cornHarvestDaysFromStart).toBeNull();
  });
});

describe("secondCropViableAreaHa", () => {
  const sequence = buildSequence(input, [...input.fields].reverse()); // B first -> harvest day 201

  it("counts the field's area when the rain window covers its corn harvest", () => {
    expect(secondCropViableAreaHa(sequence, { season: "test", rainWindowDaysFromStart: 202 })).toBe(100);
  });

  it("excludes the field when the rain window ends before its corn harvest", () => {
    expect(secondCropViableAreaHa(sequence, { season: "test", rainWindowDaysFromStart: 200 })).toBe(0);
  });

  it("is a boundary-inclusive comparison", () => {
    expect(secondCropViableAreaHa(sequence, { season: "test", rainWindowDaysFromStart: 201 })).toBe(100);
  });
});
