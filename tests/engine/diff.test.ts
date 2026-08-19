import { describe, expect, it } from "vitest";
import { computeReplanDiff } from "@/domain/diff";
import type { FieldEvent, PlanResult } from "@/domain/schemas";

function plan(overrides: Partial<PlanResult>): PlanResult {
  const sequence: PlanResult["sequence"] = [
    { fieldId: "A", seedLotId: "L100", cycleDays: 100, startDate: "2025-09-15", endDate: "2025-12-24", secondCropCandidate: true },
    { fieldId: "B", seedLotId: "L100", cycleDays: 100, startDate: "2025-09-20", endDate: "2025-12-29", secondCropCandidate: true },
  ];
  const historicalOutcomes = Array.from({ length: 41 }, (_, index) => ({
    season: `s${index}`,
    secondCropViableAreaHa: 200,
    financialResult: 100_000,
  }));
  const evidenceMetrics = {
    targetReachedSeasons: 30,
    viableSeasons: 30,
    secondCropAreaP20Ha: 200,
    financialMedian: 100_000,
    financialP20: 80_000,
    financialWorstObserved: 40_000,
    operationDays: 200,
  };
  return {
    inputHash: "h1",
    datasetHash: "h2",
    dataset: { source: "test", seasons: 41, cached: true, real: false },
    assumptions: [],
    candidatesEvaluated: 2,
    recommendedCandidateKey: "A@L100>B@L100",
    rankingCriteria: ["secondCropAreaP20Ha:desc", "targetReachedSeasons:desc", "viableSeasons:desc", "financialP20:desc", "operationDays:asc", "candidateKey:asc"],
    baseline: { candidateKey: "A@L100>B@L100", sequence, historicalOutcomes, metrics: evidenceMetrics },
    sequence,
    historicalOutcomes,
    metrics: {
      ...evidenceMetrics,
      differenceFromBaselineP20: 5_000,
    },
    ...overrides,
  };
}

const event: FieldEvent = {
  effectiveDate: "2025-10-01",
  severity: "critical",
  type: "field_blocked",
  blockedFieldIds: ["B"],
  seedDeltaAreaHaByLot: {},
  notes: ["talhão alagado"],
};

describe("computeReplanDiff", () => {
  it("reports a blocked field with the event's reason", () => {
    const before = plan({});
    const after = plan({ sequence: before.sequence.filter((s) => s.fieldId !== "B") });

    const changes = computeReplanDiff(before, after, event);
    const fieldChange = changes.find((c) => c.entity === "talhão B");

    expect(fieldChange).toEqual({
      code: "FIELD_BLOCKED",
      entity: "talhão B",
      before: "no plano",
      after: "bloqueado",
      reason: "bloqueado pelo evento de campo",
    });
  });

  it("reports metric deltas when they differ", () => {
    const before = plan({});
    const after = plan({ metrics: { ...before.metrics, targetReachedSeasons: 22, financialP20: 60_000 } });

    const changes = computeReplanDiff(before, after, { ...event, blockedFieldIds: [] });

    expect(changes).toContainEqual({
      code: "TARGET_PROBABILITY_CHANGED",
      entity: "safras que atingem a meta (de 41)",
      before: 30,
      after: 22,
      reason: "recalculado com o plano atualizado",
    });
    expect(changes).toContainEqual({
      code: "FINANCIAL_P20_CHANGED",
      entity: "resultado financeiro, P20 (R$)",
      before: 80_000,
      after: 60_000,
      reason: "recalculado com o plano atualizado",
    });
  });

  it("reports nothing when before and after are identical", () => {
    const same = plan({});
    expect(computeReplanDiff(same, same, { ...event, blockedFieldIds: [] })).toEqual([]);
  });
});
