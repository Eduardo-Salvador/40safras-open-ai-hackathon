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
    { id: "L90", crop: "soybean", cycleDays: 90, availableAreaHa: 200 },
    { id: "L120", crop: "soybean", cycleDays: 120, availableAreaHa: 200 },
  ],
  secondCropTargetAreaHa: 100,
  finance: { soybeanMarginPerHa: 1000, cornMarginPerHa: 800 },
};

describe("applyFieldEvent", () => {
  it("drops blocked fields and reduces the declared total area", () => {
    const event: FieldEvent = {
      effectiveDate: "2025-10-01",
      severity: "critical",
      type: "field_blocked",
      blockedFieldIds: ["B"],
      seedDeltaAreaHaByLot: {},
      notes: ["alagamento"],
    };

    const updated = applyFieldEvent(input, event);
    expect(updated.fields.map((f) => f.id)).toEqual(["A"]);
    expect(updated.totalAreaHa).toBe(100);
  });

  it("adjusts seed availability by stable lot ID and drops exhausted lots", () => {
    const event: FieldEvent = {
      effectiveDate: "2025-10-01",
      severity: "operational",
      type: "seed_loss",
      blockedFieldIds: [],
      seedDeltaAreaHaByLot: { L90: -200, L120: 50 },
      notes: [],
    };

    const updated = applyFieldEvent(input, event);
    expect(updated.seedLots).toEqual([{ id: "L120", crop: "soybean", cycleDays: 120, availableAreaHa: 250 }]);
  });

  it("rejects an event that leaves no operational plan", () => {
    const blockEverything: FieldEvent = {
      effectiveDate: "2025-10-01",
      severity: "critical",
      type: "field_blocked",
      blockedFieldIds: ["A", "B"],
      seedDeltaAreaHaByLot: {},
      notes: [],
    };

    expect(() => applyFieldEvent(input, blockEverything)).toThrow(/todos os talhões/);
  });

  it("preserves a temporarily blocked field and records its release date", () => {
    const temporaryBlock: FieldEvent = {
      effectiveDate: "2025-10-01",
      severity: "operational",
      type: "excess_rain",
      blockedFieldIds: ["B"],
      blockedUntil: "2025-10-10",
      seedDeltaAreaHaByLot: {},
      notes: [],
    };

    const updated = applyFieldEvent(input, temporaryBlock);
    expect(updated.fields.find((field) => field.id === "B")?.availableFrom).toBe("2025-10-11");
    expect(updated.totalAreaHa).toBe(200);
  });

  it("leaves the original input untouched when the event has no blocks or deltas", () => {
    const noop: FieldEvent = {
      effectiveDate: "2025-10-01",
      severity: "operational",
      type: "other",
      blockedFieldIds: [],
      seedDeltaAreaHaByLot: {},
      notes: [],
    };
    const updated = applyFieldEvent(input, noop);
    expect(updated.fields).toEqual(input.fields);
    expect(updated.totalAreaHa).toBe(input.totalAreaHa);
  });
});
