import { z } from "zod";

export const BrazilianStateCodeSchema = z.enum([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

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

export const OperationDraftSchema = z.object({
  municipalityQuery: z
    .object({
      name: z.string().min(1).optional(),
      state: BrazilianStateCodeSchema.optional(),
    })
    .optional(),
  totalAreaHa: z.number().positive().optional(),
  planterCapacityHaPerDay: z.number().positive().optional(),
  startDate: isoDate.optional(),
  fields: z.array(
    z.object({
      id: z.string().min(1),
      areaHa: z.number().positive().optional(),
      secondCropEligible: z.boolean().optional(),
      priority: z.number().int().nonnegative().optional(),
    }),
  ),
  seedLots: z.array(
    z.object({
      id: z.string().min(1),
      crop: z.enum(["soybean", "corn"]),
      cycleDays: z.number().int().positive().optional(),
      availableAreaHa: z.number().positive().optional(),
    }),
  ),
  secondCropTargetAreaHa: z.number().nonnegative().optional(),
  finance: FinanceAssumptionsSchema.partial().optional(),
  missingFields: z.array(z.string()),
  ambiguities: z.array(z.string()),
});
export type OperationDraft = z.infer<typeof OperationDraftSchema>;

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
    if (Math.abs(fieldsArea - input.totalAreaHa) > input.totalAreaHa * 0.001) {
      ctx.addIssue({
        code: "custom",
        message: "sum of field areas must equal totalAreaHa",
        path: ["fields"],
      });
    }

    const fieldIds = input.fields.map((field) => field.id);
    if (new Set(fieldIds).size !== fieldIds.length) {
      ctx.addIssue({ code: "custom", message: "field IDs must be unique", path: ["fields"] });
    }

    const seedLotIds = input.seedLots.map((lot) => lot.id);
    if (new Set(seedLotIds).size !== seedLotIds.length) {
      ctx.addIssue({ code: "custom", message: "seed lot IDs must be unique", path: ["seedLots"] });
    }

    const availableSoybeanAreaHa = input.seedLots.reduce((sum, lot) => sum + lot.availableAreaHa, 0);
    if (availableSoybeanAreaHa < input.totalAreaHa) {
      ctx.addIssue({
        code: "custom",
        message: "soybean seed availability must cover totalAreaHa",
        path: ["seedLots"],
      });
    }

    const secondCropEligibleAreaHa = input.fields
      .filter((field) => field.priority === "second_crop")
      .reduce((sum, field) => sum + field.areaHa, 0);
    if (input.secondCropTargetAreaHa > secondCropEligibleAreaHa) {
      ctx.addIssue({
        code: "custom",
        message: "secondCropTargetAreaHa exceeds eligible field area",
        path: ["secondCropTargetAreaHa"],
      });
    }
  });
export type FarmOperationInput = z.infer<typeof FarmOperationInputSchema>;

export const ConfirmationSchema = z.object({
  method: z.enum(["voice", "button"]),
  confirmedAt: z.string().datetime(),
  confirmationToken: z.string().min(1),
});
export type Confirmation = z.infer<typeof ConfirmationSchema>;

export const ConfirmedFarmOperationSchema = z
  .object({
    draftVersion: z.string().min(1),
    confirmation: ConfirmationSchema,
    municipality: MunicipalitySchema,
    operation: FarmOperationInputSchema,
  })
  .superRefine((value, ctx) => {
    if (
      value.municipality.name !== value.operation.municipality.name ||
      value.municipality.state !== value.operation.municipality.state ||
      value.municipality.latitude !== value.operation.municipality.latitude ||
      value.municipality.longitude !== value.operation.municipality.longitude
    ) {
      ctx.addIssue({
        code: "custom",
        message: "confirmed municipality must match operation municipality",
        path: ["municipality"],
      });
    }
  });
export type ConfirmedFarmOperation = z.infer<typeof ConfirmedFarmOperationSchema>;

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
}).superRefine((event, ctx) => {
  if (new Set(event.blockedFieldIds).size !== event.blockedFieldIds.length) {
    ctx.addIssue({ code: "custom", message: "blocked field IDs must be unique", path: ["blockedFieldIds"] });
  }
  if (event.blockedUntil && event.blockedUntil < event.effectiveDate) {
    ctx.addIssue({ code: "custom", message: "blockedUntil must not precede effectiveDate", path: ["blockedUntil"] });
  }
  const hasSeedDelta = Object.values(event.seedDeltaAreaHaByCycle).some((delta) => delta !== 0);
  if (event.blockedFieldIds.length === 0 && !hasSeedDelta) {
    ctx.addIssue({ code: "custom", message: "field event must contain an effective change" });
  }
});
export type FieldEvent = z.infer<typeof FieldEventSchema>;

export const FieldEventDraftSchema = z.object({
  effectiveDate: isoDate.optional(),
  blockedFieldIds: z.array(z.string()),
  blockedUntil: isoDate.optional(),
  seedDeltaAreaHaByCycle: z.record(z.string(), z.number()),
  notes: z.array(z.string()),
  missingFields: z.array(z.string()),
  ambiguities: z.array(z.string()),
});
export type FieldEventDraft = z.infer<typeof FieldEventDraftSchema>;

export const ConfirmedFieldEventSchema = z.object({
  draftVersion: z.string().min(1),
  confirmation: ConfirmationSchema,
  event: FieldEventSchema,
});
export type ConfirmedFieldEvent = z.infer<typeof ConfirmedFieldEventSchema>;

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
