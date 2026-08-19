import { describe, expect, it } from "vitest";
import { FarmOperationInputSchema, HistoricalDatasetSchema } from "@/domain/schemas";
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
    { crop: "soybean", cycleDays: 90, availableAreaHa: 200 },
    { crop: "soybean", cycleDays: 120, availableAreaHa: 200 },
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
