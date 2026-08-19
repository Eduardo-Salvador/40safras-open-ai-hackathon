import { describe, expect, it } from "vitest";
import { applyFieldEvent } from "@/domain/field-event";
import type { FarmOperationInput, FieldEvent } from "@/domain/schemas";

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
    { crop: "soybean", cycleDays: 90, availableAreaHa: 200 },
    { crop: "soybean", cycleDays: 120, availableAreaHa: 200 },
  ],
  secondCropTargetAreaHa: 100,
  finance: { soybeanMarginPerHa: 1000, cornMarginPerHa: 800 },
};

describe("applyFieldEvent", () => {
  it("drops blocked fields and reduces the declared total area", () => {
    const event: FieldEvent = {
      effectiveDate: "2025-10-01",
      blockedFieldIds: ["B"],
      seedDeltaAreaHaByCycle: {},
      notes: ["alagamento"],
    };

    const updated = applyFieldEvent(input, event);
    expect(updated.fields.map((f) => f.id)).toEqual(["A"]);
    expect(updated.totalAreaHa).toBe(100);
  });

  it("adjusts seed lot availability by cycle-days key and drops exhausted lots", () => {
    const event: FieldEvent = {
      effectiveDate: "2025-10-01",
      blockedFieldIds: [],
      seedDeltaAreaHaByCycle: { "90": -200, "120": 50 },
      notes: [],
    };

    const updated = applyFieldEvent(input, event);
    expect(updated.seedLots).toEqual([{ crop: "soybean", cycleDays: 120, availableAreaHa: 250 }]);
  });

  it("never leaves zero fields or zero seed lots, even if the event would exhaust them", () => {
    const blockEverything: FieldEvent = {
      effectiveDate: "2025-10-01",
      blockedFieldIds: ["A", "B"],
      seedDeltaAreaHaByCycle: { "90": -200, "120": -200 },
      notes: [],
    };

    const updated = applyFieldEvent(input, blockEverything);
    expect(updated.fields.length).toBeGreaterThan(0);
    expect(updated.seedLots.length).toBeGreaterThan(0);
  });

  it("leaves the original input untouched when the event has no blocks or deltas", () => {
    const noop: FieldEvent = { effectiveDate: "2025-10-01", blockedFieldIds: [], seedDeltaAreaHaByCycle: {}, notes: [] };
    const updated = applyFieldEvent(input, noop);
    expect(updated.fields).toEqual(input.fields);
    expect(updated.totalAreaHa).toBe(input.totalAreaHa);
  });
});
