import { describe, expect, it } from "vitest";
import { buildReplan } from "@/domain/replan";
import type { FarmOperationInput, FieldEvent, HistoricalDataset } from "@/domain/schemas";
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
    { id: "S90", crop: "soybean", cycleDays: 90, availableAreaHa: 200 },
    { id: "S120", crop: "soybean", cycleDays: 120, availableAreaHa: 200 },
  ],
  secondCropTargetAreaHa: 100,
  finance: { soybeanMarginPerHa: 1000, cornMarginPerHa: 800 },
};

// Every season has the same tight rain window, so B is viable whenever it's
// planted first and never viable once it's blocked out of the plan.
const tightSeasonDataset: HistoricalDataset = {
  ...sorrisoMt41Seasons,
  records: Array.from({ length: 41 }, (_, i) => ({ season: `s${i}`, rainWindowDaysFromStart: 202 })),
};

const floodEvent: FieldEvent = {
  effectiveDate: "2025-10-01",
  blockedFieldIds: ["B"],
  seedDeltaAreaHaByCycle: {},
  notes: ["talhão B alagado"],
};

describe("buildReplan", () => {
  it("is deterministic", () => {
    const first = buildReplan(input, tightSeasonDataset, floodEvent);
    const second = buildReplan(input, tightSeasonDataset, floodEvent);
    expect(second).toEqual(first);
  });

  it("removes the blocked field from the after-plan and degrades the metrics", () => {
    const replan = buildReplan(input, tightSeasonDataset, floodEvent);

    expect(replan.before.sequence.map((s) => s.fieldId)).toContain("B");
    expect(replan.after.sequence.map((s) => s.fieldId)).not.toContain("B");
    expect(replan.after.metrics.viableSeasons).toBeLessThan(replan.before.metrics.viableSeasons);
  });

  it("keeps the original plan visible alongside the recalculated one", () => {
    const replan = buildReplan(input, tightSeasonDataset, floodEvent);
    expect(replan.before).not.toEqual(replan.after);
    expect(replan.event).toEqual(floodEvent);
  });

  it("explains at least one change with a concrete reason", () => {
    const replan = buildReplan(input, tightSeasonDataset, floodEvent);
    expect(replan.changes.length).toBeGreaterThan(0);
    for (const change of replan.changes) {
      expect(change.reason.length).toBeGreaterThan(0);
    }
  });
});
