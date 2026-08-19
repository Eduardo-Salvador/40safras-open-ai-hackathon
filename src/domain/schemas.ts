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

export const FieldBlockSchema = z.object({
  id: z.string().min(1),
  areaHa: z.number().positive(),
  priority: z.enum(["second_crop", "soy_only"]),
  availableFrom: isoDate.optional(),
});
export type FieldBlock = z.infer<typeof FieldBlockSchema>;

export const SeedLotSchema = z.object({
  id: z.string().min(1),
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
    if (Math.abs(fieldsArea - input.totalAreaHa) > Math.max(0.01, input.totalAreaHa * 0.001)) {
      ctx.addIssue({
        code: "custom",
        message: "sum of field areas must equal totalAreaHa",
        path: ["fields"],
      });
    }
    if (new Set(input.fields.map((field) => field.id)).size !== input.fields.length) {
      ctx.addIssue({ code: "custom", message: "field IDs must be unique", path: ["fields"] });
    }
    if (new Set(input.seedLots.map((lot) => lot.id)).size !== input.seedLots.length) {
      ctx.addIssue({ code: "custom", message: "seed lot IDs must be unique", path: ["seedLots"] });
    }
    const soybeanArea = input.seedLots.reduce((sum, lot) => sum + lot.availableAreaHa, 0);
    if (soybeanArea + 0.01 < fieldsArea) {
      ctx.addIssue({ code: "custom", message: "soybean seed availability is below planned area", path: ["seedLots"] });
    }
    const eligibleArea = input.fields
      .filter((field) => field.priority === "second_crop")
      .reduce((sum, field) => sum + field.areaHa, 0);
    if (input.secondCropTargetAreaHa > eligibleArea) {
      ctx.addIssue({
        code: "custom",
        message: "second crop target exceeds eligible field area",
        path: ["secondCropTargetAreaHa"],
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
}).superRefine((dataset, ctx) => {
  if (new Set(dataset.records.map((record) => record.season)).size !== dataset.records.length) {
    ctx.addIssue({ code: "custom", message: "historical season labels must be unique", path: ["records"] });
  }
});
export type HistoricalDataset = z.infer<typeof HistoricalDatasetSchema>;

export const FieldEventSchema = z.object({
  effectiveDate: isoDate,
  severity: z.enum(["operational", "critical"]),
  type: z.enum(["field_blocked", "excess_rain", "seed_loss", "machine_failure", "other"]),
  blockedFieldIds: z.array(z.string()),
  blockedUntil: isoDate.optional(),
  seedDeltaAreaHaByLot: z.record(z.string(), z.number()),
  notes: z.array(z.string()),
}).superRefine((event, ctx) => {
  if (event.blockedUntil && event.blockedUntil < event.effectiveDate) {
    ctx.addIssue({ code: "custom", message: "blockedUntil cannot precede effectiveDate", path: ["blockedUntil"] });
  }
  if (new Set(event.blockedFieldIds).size !== event.blockedFieldIds.length) {
    ctx.addIssue({ code: "custom", message: "blocked field IDs must be unique", path: ["blockedFieldIds"] });
  }
});
export type FieldEvent = z.infer<typeof FieldEventSchema>;

const PlanSequenceItemSchema = z.object({
  fieldId: z.string(),
  seedLotId: z.string(),
  cycleDays: z.number().int().positive(),
  startDate: isoDate,
  endDate: isoDate,
  secondCropCandidate: z.boolean(),
});

const HistoricalOutcomeSchema = z.object({
  season: z.string(),
  secondCropViableAreaHa: z.number().nonnegative(),
  financialResult: z.number(),
});

const CandidateMetricsSchema = z.object({
  targetReachedSeasons: z.number().int().nonnegative().max(41),
  viableSeasons: z.number().int().nonnegative().max(41),
  secondCropAreaP20Ha: z.number().nonnegative(),
  financialMedian: z.number(),
  financialP20: z.number(),
  financialWorstObserved: z.number(),
  operationDays: z.number().int().nonnegative(),
});

const CandidateEvidenceSchema = z.object({
  candidateKey: z.string(),
  sequence: z.array(PlanSequenceItemSchema),
  historicalOutcomes: z.array(HistoricalOutcomeSchema).length(41),
  metrics: CandidateMetricsSchema,
});

export const PlanResultSchema = z.object({
  inputHash: z.string(),
  datasetHash: z.string(),
  dataset: z.object({ source: z.string(), seasons: z.literal(41), cached: z.boolean(), real: z.boolean() }),
  assumptions: z.array(z.string()),
  candidatesEvaluated: z.number().int().positive().max(100),
  recommendedCandidateKey: z.string(),
  rankingCriteria: z.tuple([
    z.literal("secondCropAreaP20Ha:desc"),
    z.literal("targetReachedSeasons:desc"),
    z.literal("viableSeasons:desc"),
    z.literal("financialP20:desc"),
    z.literal("operationDays:asc"),
    z.literal("candidateKey:asc"),
  ]),
  baseline: CandidateEvidenceSchema,
  sequence: z.array(PlanSequenceItemSchema),
  historicalOutcomes: z.array(HistoricalOutcomeSchema).length(41),
  metrics: CandidateMetricsSchema.extend({
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
      code: z.enum([
        "FIELD_BLOCKED",
        "FIELD_RELEASE_DELAYED",
        "SEED_STOCK_CHANGED",
        "FIELD_REORDERED",
        "CORN_AREA_P20_CHANGED",
        "TARGET_PROBABILITY_CHANGED",
        "FINANCIAL_P20_CHANGED",
      ]),
      before: z.union([z.string(), z.number(), z.null()]),
      after: z.union([z.string(), z.number(), z.null()]),
      reason: z.string(),
    }),
  ),
});
export type ReplanResult = z.infer<typeof ReplanResultSchema>;
