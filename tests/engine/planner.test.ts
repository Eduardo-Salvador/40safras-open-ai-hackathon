import { describe, expect, it } from "vitest";
import { buildPlan } from "@/domain/planner";
import { HistoricalDatasetSchema, PlanResultSchema, type FarmOperationInput, type HistoricalDataset } from "@/domain/schemas";
import { sorrisoMt, sorrisoMt41Seasons } from "../../data/fixtures/municipalities/sorriso-mt";

const input: FarmOperationInput = {
  municipality: sorrisoMt,
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
    { id: "L90", crop: "soybean", cycleDays: 90, availableAreaHa: 200 },
    { id: "L120", crop: "soybean", cycleDays: 120, availableAreaHa: 200 },
  ],
  secondCropTargetAreaHa: 100,
  finance: { soybeanMarginPerHa: 1000, cornMarginPerHa: 800 },
};

// A single tight season isolates the ordering effect: B's corn harvest lands
// on day 201 when planted first (candidate order) and day 203 when planted
// second (baseline order) - see tests/engine/simulator.test.ts.
const tightSeasonDataset: HistoricalDataset = {
  ...sorrisoMt41Seasons,
  records: Array.from({ length: 41 }, (_, i) => ({
    season: `s${i}`,
    rainWindowDaysFromStart: 202,
  })),
};

describe("buildPlan", () => {
  it("is deterministic for the same input and dataset", () => {
    const first = buildPlan(input, tightSeasonDataset);
    const second = buildPlan(input, tightSeasonDataset);
    expect(second).toEqual(first);
  });

  it("recommends the second-crop-first order, which beats the baseline in a tight rain window", () => {
    const plan = buildPlan(input, tightSeasonDataset);
    // Every one of the 41 (identical) seasons is viable under the candidate order.
    expect(plan.metrics.viableSeasons).toBe(41);
    expect(plan.sequence[0].fieldId).toBe("B");
    expect(plan.sequence[0].secondCropCandidate).toBe(true);
    // Financial P20 improves over the baseline usual order.
    expect(plan.metrics.differenceFromBaselineP20).toBeGreaterThan(0);
  });

  it("traces every historical outcome to a season in the dataset", () => {
    const plan = buildPlan(input, tightSeasonDataset);
    expect(plan.historicalOutcomes).toHaveLength(41);
    expect(plan.historicalOutcomes.map((o) => o.season)).toEqual(
      tightSeasonDataset.records.map((r) => r.season),
    );
  });

  it("produces plausible metrics against the real 41-season fixture", () => {
    expect(() => HistoricalDatasetSchema.parse(sorrisoMt41Seasons)).not.toThrow();

    const plan = buildPlan(input, sorrisoMt41Seasons);
    expect(plan.metrics.viableSeasons).toBeGreaterThanOrEqual(0);
    expect(plan.metrics.viableSeasons).toBeLessThanOrEqual(41);
    expect(plan.metrics.secondCropAreaP20Ha).toBeLessThanOrEqual(100);
    expect(Number.isFinite(plan.metrics.financialP20)).toBe(true);
  });

  it("returns complete baseline evidence and preserves field and seed-lot IDs", () => {
    const plan = buildPlan(input, tightSeasonDataset);

    expect(() => PlanResultSchema.parse(plan)).not.toThrow();
    expect(plan.baseline.sequence.map((item) => item.fieldId)).toEqual(input.fields.map((field) => field.id));
    expect(plan.baseline.historicalOutcomes).toHaveLength(41);
    expect(plan.baseline.metrics.financialP20 + plan.metrics.differenceFromBaselineP20).toBe(plan.metrics.financialP20);
    expect(plan.candidatesEvaluated).toBeGreaterThan(0);
    expect(plan.candidatesEvaluated).toBeLessThanOrEqual(100);
    expect(plan.rankingCriteria).toEqual([
      "secondCropAreaP20Ha:desc",
      "targetReachedSeasons:desc",
      "viableSeasons:desc",
      "financialP20:desc",
      "operationDays:asc",
      "candidateKey:asc",
    ]);

    const knownFieldIds = new Set(input.fields.map((field) => field.id));
    const knownLotIds = new Set(input.seedLots.map((lot) => lot.id));
    for (const item of [...plan.baseline.sequence, ...plan.sequence]) {
      expect(knownFieldIds.has(item.fieldId)).toBe(true);
      expect(knownLotIds.has(item.seedLotId)).toBe(true);
    }
  });

  it("rejeita dataset que não tenha exatamente 41 safras", () => {
    const incomplete = { ...tightSeasonDataset, records: tightSeasonDataset.records.slice(0, 40) };
    expect(() => buildPlan(input, incomplete)).toThrow(/exatamente 41 safras/);
  });

  it("usa a chave canônica como desempate final estável", () => {
    const tiedInput: FarmOperationInput = {
      ...input,
      fields: [
        { id: "B", areaHa: 100, priority: "second_crop" },
        { id: "A", areaHa: 100, priority: "second_crop" },
      ],
      seedLots: [{ id: "L90", crop: "soybean", cycleDays: 90, availableAreaHa: 200 }],
    };
    const generousDataset = {
      ...tightSeasonDataset,
      records: tightSeasonDataset.records.map((record) => ({ ...record, rainWindowDaysFromStart: 365 })),
    };

    expect(buildPlan(tiedInput, generousDataset).sequence.map((item) => item.fieldId)).toEqual(["A", "B"]);
  });

  it("não altera a operação nem o dataset recebidos", () => {
    const inputSnapshot = structuredClone(input);
    const datasetSnapshot = structuredClone(tightSeasonDataset);
    buildPlan(input, tightSeasonDataset);
    expect(input).toEqual(inputSnapshot);
    expect(tightSeasonDataset).toEqual(datasetSnapshot);
  });

  it("avalia o limite de cem candidatos em menos de um segundo", () => {
    const fields = ["A", "B", "C", "D"].map((id) => ({
      id,
      areaHa: 25,
      priority: "second_crop" as const,
    }));
    const seedLots = [90, 100, 110, 120].map((cycleDays) => ({
      id: `L${cycleDays}`,
      crop: "soybean" as const,
      cycleDays,
      availableAreaHa: 100,
    }));
    const canonicalInput = { ...input, fields, seedLots, totalAreaHa: 100, secondCropTargetAreaHa: 100 };

    const startedAt = performance.now();
    const plan = buildPlan(canonicalInput, sorrisoMt41Seasons);
    const elapsedMs = performance.now() - startedAt;

    expect(plan.historicalOutcomes).toHaveLength(41);
    expect(elapsedMs).toBeLessThan(1_000);
  });
});
