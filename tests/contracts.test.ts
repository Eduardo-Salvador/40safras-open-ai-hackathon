import { describe, expect, it } from "vitest";
import {
  ConfirmedFarmOperationSchema,
  ConfirmedFieldEventSchema,
  FieldEventSchema,
  FarmOperationInputSchema,
  HistoricalDatasetSchema,
  OperationDraftSchema,
} from "@/domain/schemas";
import {
  ambiguousOperationDraft,
  canonicalConfirmedFarmOperation,
  canonicalConfirmedFieldEvent,
  canonicalOperationDraft,
  incompleteOperationDraft,
  malformedOperationToolArguments,
  staleConfirmationAttempt,
} from "../data/fixtures/contracts";
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
    { id: "S90", crop: "soybean", cycleDays: 90, availableAreaHa: 100 },
    { id: "S120", crop: "soybean", cycleDays: 120, availableAreaHa: 100 },
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

  it("rejects field areas that do not equal the declared total area", () => {
    const invalid = { ...validInput, totalAreaHa: 250 };
    expect(() => FarmOperationInputSchema.parse(invalid)).toThrow();
  });

  it("rejects duplicate field and seed-lot IDs", () => {
    const duplicateFields = { ...validInput, fields: validInput.fields.map((field) => ({ ...field, id: "A" })) };
    const duplicateSeedLots = {
      ...validInput,
      seedLots: validInput.seedLots.map((lot) => ({ ...lot, id: "S90" })),
    };
    expect(() => FarmOperationInputSchema.parse(duplicateFields)).toThrow();
    expect(() => FarmOperationInputSchema.parse(duplicateSeedLots)).toThrow();
  });

  it("rejects insufficient soybean seed and an ineligible second-crop target", () => {
    const insufficientSeed = {
      ...validInput,
      seedLots: [{ ...validInput.seedLots[0], availableAreaHa: 50 }],
    };
    const ineligibleTarget = { ...validInput, secondCropTargetAreaHa: 150 };
    expect(() => FarmOperationInputSchema.parse(insufficientSeed)).toThrow();
    expect(() => FarmOperationInputSchema.parse(ineligibleTarget)).toThrow();
  });

  it("rejects an unsupported second crop", () => {
    const invalid = { ...validInput, secondCrop: "wheat" };
    expect(() => FarmOperationInputSchema.parse(invalid)).toThrow();
  });
});

describe("OperationDraftSchema", () => {
  it("accepts an incomplete draft without inventing missing values", () => {
    const draft = OperationDraftSchema.parse({
      municipalityQuery: { name: "Sorriso", state: "MT" },
      fields: [],
      seedLots: [],
      missingFields: ["totalAreaHa", "planterCapacityHaPerDay"],
      ambiguities: [],
    });
    expect(draft.totalAreaHa).toBeUndefined();
    expect(draft.missingFields).toContain("totalAreaHa");
  });
});

describe("ConfirmedFarmOperationSchema", () => {
  it("accepts a versioned explicit confirmation", () => {
    expect(() =>
      ConfirmedFarmOperationSchema.parse({
        draftVersion: "draft-v1",
        confirmation: {
          method: "voice",
          confirmedAt: "2026-08-19T15:00:00.000Z",
          confirmationToken: "token-v1",
        },
        municipality: validInput.municipality,
        operation: validInput,
      }),
    ).not.toThrow();
  });

  it("rejects a municipality that differs from the confirmed operation", () => {
    expect(() =>
      ConfirmedFarmOperationSchema.parse({
        draftVersion: "draft-v1",
        confirmation: {
          method: "button",
          confirmedAt: "2026-08-19T15:00:00.000Z",
          confirmationToken: "token-v1",
        },
        municipality: { ...validInput.municipality, name: "Sinop" },
        operation: validInput,
      }),
    ).toThrow();
  });
});

describe("frozen contract fixtures", () => {
  it("accepts canonical and incomplete operation drafts", () => {
    expect(() => OperationDraftSchema.parse(canonicalOperationDraft)).not.toThrow();
    expect(() => OperationDraftSchema.parse(incompleteOperationDraft)).not.toThrow();
    expect(() => OperationDraftSchema.parse(ambiguousOperationDraft)).not.toThrow();
  });

  it("accepts canonical confirmed operation and field event fixtures", () => {
    expect(() => ConfirmedFarmOperationSchema.parse(canonicalConfirmedFarmOperation)).not.toThrow();
    expect(() => ConfirmedFieldEventSchema.parse(canonicalConfirmedFieldEvent)).not.toThrow();
  });

  it("keeps stale confirmation state explicit for the server guard", () => {
    expect(staleConfirmationAttempt.confirmedOperation.draftVersion).not.toBe(
      staleConfirmationAttempt.currentDraftVersion,
    );
  });

  it("rejects malformed tool arguments at the operation boundary", () => {
    expect(() => FarmOperationInputSchema.parse(malformedOperationToolArguments)).toThrow();
  });

  it("rejects an event without an effective change", () => {
    expect(() =>
      FieldEventSchema.parse({
        effectiveDate: "2025-09-20",
        blockedFieldIds: [],
        seedDeltaAreaHaByCycle: {},
        notes: [],
      }),
    ).toThrow();
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
