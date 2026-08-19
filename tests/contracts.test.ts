import { describe, expect, it } from "vitest";
import { FarmOperationInputSchema, FieldEventSchema, HistoricalDatasetSchema } from "@/domain/schemas";
import { getCropProfile } from "@/domain/crop-profiles";
import { sorrisoMt41Seasons } from "../data/fixtures/municipalities/sorriso-mt";

const validInput = {
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

describe("FarmOperationInputSchema", () => {
  it("accepts a valid canonical operation brief", () => {
    expect(() => FarmOperationInputSchema.parse(validInput)).not.toThrow();
  });

  it("rejects a missing required field", () => {
    const invalid: Record<string, unknown> = { ...validInput };
    delete invalid.municipality;
    expect(() => FarmOperationInputSchema.parse(invalid)).toThrow();
  });

  it("rejects field areas that exceed the declared total area", () => {
    const invalid = { ...validInput, totalAreaHa: 150 };
    expect(() => FarmOperationInputSchema.parse(invalid)).toThrow();
  });

  it("rejects an unsupported second crop", () => {
    const invalid = { ...validInput, secondCrop: "wheat" };
    expect(() => FarmOperationInputSchema.parse(invalid)).toThrow();
  });

  it("rejects duplicate field and seed-lot IDs", () => {
    expect(() => FarmOperationInputSchema.parse({
      ...validInput,
      fields: validInput.fields.map((field) => ({ ...field, id: "A" })),
    })).toThrow(/field IDs must be unique/);
    expect(() => FarmOperationInputSchema.parse({
      ...validInput,
      seedLots: validInput.seedLots.map((lot) => ({ ...lot, id: "LOTE" })),
    })).toThrow(/seed lot IDs must be unique/);
  });

  it("rejects insufficient seed stock and an unreachable second-crop target", () => {
    expect(() => FarmOperationInputSchema.parse({
      ...validInput,
      seedLots: [{ ...validInput.seedLots[0], availableAreaHa: 100 }],
    })).toThrow(/seed availability/);
    expect(() => FarmOperationInputSchema.parse({
      ...validInput,
      secondCropTargetAreaHa: 101,
    })).toThrow(/target exceeds eligible/);
  });
});

describe("FieldEventSchema", () => {
  it("rejects a release date before the event date", () => {
    expect(() => FieldEventSchema.parse({
      effectiveDate: "2025-10-10",
      severity: "operational",
      type: "excess_rain",
      blockedFieldIds: ["A"],
      blockedUntil: "2025-10-09",
      seedDeltaAreaHaByLot: {},
      notes: [],
    })).toThrow(/blockedUntil/);
  });
});

describe("HistoricalDatasetSchema", () => {
  it("accepts the canonical 41-season Sorriso/MT fixture", () => {
    expect(() => HistoricalDatasetSchema.parse(sorrisoMt41Seasons)).not.toThrow();
  });

  it("rejects a dataset without exactly 41 seasons", () => {
    const invalid = { ...sorrisoMt41Seasons, records: sorrisoMt41Seasons.records.slice(0, 40) };
    expect(() => HistoricalDatasetSchema.parse(invalid)).toThrow();
  });
});

describe("crop profiles", () => {
  it("resolves the validated soybean-to-corn profiles", () => {
    expect(getCropProfile("soybean").crop).toBe("soybean");
    expect(getCropProfile("corn").crop).toBe("corn");
  });

  it("fails clearly for an unsupported crop path instead of falling back to soybean", () => {
    // @ts-expect-error deliberate invalid crop to prove the guard
    expect(() => getCropProfile("wheat")).toThrow();
  });
});
