import { z } from "zod";

export const MunicipalitySchema = z.object({
  name: z.string().min(1),
  state: z.string().length(2),
  countryCode: z.literal("BR"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevationM: z.number().optional(),
  timezone: z.string().min(1),
  ibgeCode: z.string().optional(),
});
export type Municipality = z.infer<typeof MunicipalitySchema>;

export const CropProfileSchema = z.object({
  crop: z.enum(["soybean", "corn"]),
  label: z.string(),
  cycleDaysMin: z.number().int().positive(),
  cycleDaysMax: z.number().int().positive(),
  defaultCycleDays: z.number().int().positive(),
});
export type CropProfile = z.infer<typeof CropProfileSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const OperationDraftSchema = z.object({
  rawText: z.string(),
  municipalityQuery: z.string().nullable(),
  startDate: isoDate.nullable(),
  totalAreaHa: z.number().positive().nullable(),
  planterCapacityHaPerDay: z.number().positive().nullable(),
  secondCropTargetAreaHa: z.number().nonnegative().nullable(),
  soybeanMarginPerHa: z.number().nullable(),
  cornMarginPerHa: z.number().nullable(),
  operatingCostPerDay: z.number().nullable(),
  missingFields: z.array(z.string()),
  ambiguities: z.array(z.string()),
});
export type OperationDraft = z.infer<typeof OperationDraftSchema>;

export const ConfirmationSchema = z.object({
  draftVersion: z.number().int().positive(),
  token: z.string().min(8),
  method: z.enum(["button", "voice"]),
  confirmedAt: z.string().datetime(),
});
export type Confirmation = z.infer<typeof ConfirmationSchema>;

export const FieldBlockSchema = z.object({
  id: z.string().min(1),
  areaHa: z.number().positive(),
  priority: z.enum(["second_crop", "soy_only"]),
});
export type FieldBlock = z.infer<typeof FieldBlockSchema>;

export const SeedLotSchema = z.object({
  crop: z.literal("soybean"),
  cycleDays: z.number().int().positive(),
  availableAreaHa: z.number().positive(),
});
export type SeedLot = z.infer<typeof SeedLotSchema>;

export const FinanceAssumptionsSchema = z.object({
  soybeanMarginPerHa: z.number(),
  cornMarginPerHa: z.number(),
  operatingCostPerDay: z.number().optional(),
});
export type FinanceAssumptions = z.infer<typeof FinanceAssumptionsSchema>;

export const FarmOperationInputSchema = z
  .object({
    municipality: MunicipalitySchema,
    totalAreaHa: z.number().positive(),
    planterCapacityHaPerDay: z.number().positive(),
    startDate: isoDate,
    firstCrop: z.literal("soybean"),
    secondCrop: z.literal("corn"),
    fields: z.array(FieldBlockSchema).min(1),
    seedLots: z.array(SeedLotSchema).min(1),
    secondCropTargetAreaHa: z.number().nonnegative(),
    finance: FinanceAssumptionsSchema,
  })
  .superRefine((input, ctx) => {
    const fieldsArea = input.fields.reduce((sum, f) => sum + f.areaHa, 0);
    if (fieldsArea > input.totalAreaHa * 1.001) {
      ctx.addIssue({
        code: "custom",
        message: "sum of field areas exceeds totalAreaHa",
        path: ["fields"],
      });
    }
  });
export type FarmOperationInput = z.infer<typeof FarmOperationInputSchema>;

export const HistoricalSeasonSchema = z.object({
  season: z.string().min(1),
  rainWindowDaysFromStart: z.number().int().positive(),
});
export type HistoricalSeason = z.infer<typeof HistoricalSeasonSchema>;

export const HistoricalDatasetSchema = z.object({
  location: MunicipalitySchema,
  source: z.string(),
  seasons: z.literal(41),
  cached: z.boolean(),
  real: z.boolean(),
  retrievedAt: z.string(),
  variables: z.array(z.string()),
  records: z.array(HistoricalSeasonSchema).length(41),
});
export type HistoricalDataset = z.infer<typeof HistoricalDatasetSchema>;

export const FieldEventSchema = z.object({
  effectiveDate: isoDate,
  blockedFieldIds: z.array(z.string()),
  blockedUntil: isoDate.optional(),
  seedDeltaAreaHaByCycle: z.record(z.string(), z.number()),
  notes: z.array(z.string()),
});
export type FieldEvent = z.infer<typeof FieldEventSchema>;

export const FieldEventDraftSchema = z.object({
  rawText: z.string(),
  eventType: z.enum(["block", "excess_rain", "seed_loss", "machine_failure", "other"]),
  severity: z.enum(["operational", "critical"]),
  effectiveDate: isoDate,
  blockedFieldIds: z.array(z.string()),
  blockedUntil: isoDate.nullable(),
  notes: z.array(z.string()),
  missingFields: z.array(z.string()),
});
export type FieldEventDraft = z.infer<typeof FieldEventDraftSchema>;

export const PlanResultSchema = z.object({
  inputHash: z.string(),
  datasetHash: z.string(),
  dataset: z.object({ source: z.string(), seasons: z.literal(41), cached: z.boolean(), real: z.boolean() }),
  assumptions: z.array(z.string()),
  sequence: z.array(
    z.object({
      fieldId: z.string(),
      cycleDays: z.number().int().positive(),
      startDate: isoDate,
      endDate: isoDate,
      secondCropCandidate: z.boolean(),
    }),
  ),
  baseline: z.object({
    sequence: z.array(
      z.object({
        fieldId: z.string(),
        cycleDays: z.number().int().positive(),
        startDate: isoDate,
        endDate: isoDate,
        secondCropCandidate: z.boolean(),
      }),
    ),
    financialP20: z.number(),
    secondCropAreaP20Ha: z.number().nonnegative(),
    viableSeasons: z.number().int().nonnegative(),
  }).optional(),
  historicalOutcomes: z.array(
    z.object({
      season: z.string(),
      secondCropViableAreaHa: z.number().nonnegative(),
      financialResult: z.number(),
    }),
  ),
  metrics: z.object({
    viableSeasons: z.number().int().nonnegative(),
    secondCropAreaP20Ha: z.number().nonnegative(),
    financialMedian: z.number(),
    financialP20: z.number(),
    financialWorstObserved: z.number(),
    differenceFromBaselineP20: z.number(),
  }),
});
export type PlanResult = z.infer<typeof PlanResultSchema>;

export const ReplanResultSchema = z.object({
  before: PlanResultSchema,
  after: PlanResultSchema,
  event: FieldEventSchema,
  changes: z.array(
    z.object({
      entity: z.string(),
      before: z.union([z.string(), z.number(), z.null()]),
      after: z.union([z.string(), z.number(), z.null()]),
      reason: z.string(),
    }),
  ),
});
export type ReplanResult = z.infer<typeof ReplanResultSchema>;
