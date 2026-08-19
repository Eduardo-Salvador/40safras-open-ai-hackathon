import type {
  ConfirmedFarmOperation,
  ConfirmedFieldEvent,
  FarmOperationInput,
  FieldEventDraft,
  OperationDraft,
} from "@/domain/schemas";

export const canonicalMunicipality = {
  name: "Sorriso",
  state: "MT",
  countryCode: "BR" as const,
  latitude: -12.5453,
  longitude: -55.7217,
  timezone: "America/Cuiaba",
  ibgeCode: "5107925",
};

export const canonicalOperationDraft: OperationDraft = {
  municipalityQuery: { name: "Sorriso", state: "MT" },
  totalAreaHa: 200,
  planterCapacityHaPerDay: 50,
  startDate: "2025-09-15",
  fields: [
    { id: "A", areaHa: 100, secondCropEligible: false, priority: 2 },
    { id: "B", areaHa: 100, secondCropEligible: true, priority: 1 },
  ],
  seedLots: [
    { id: "S90", crop: "soybean", cycleDays: 90, availableAreaHa: 100 },
    { id: "S120", crop: "soybean", cycleDays: 120, availableAreaHa: 100 },
  ],
  secondCropTargetAreaHa: 100,
  finance: { soybeanMarginPerHa: 1000, cornMarginPerHa: 800 },
  missingFields: [],
  ambiguities: [],
};

export const incompleteOperationDraft: OperationDraft = {
  municipalityQuery: { name: "Sorriso", state: "MT" },
  fields: [],
  seedLots: [],
  missingFields: ["totalAreaHa", "planterCapacityHaPerDay", "startDate", "fields", "seedLots"],
  ambiguities: [],
};

export const ambiguousOperationDraft: OperationDraft = {
  municipalityQuery: { name: "Bom Jesus" },
  fields: [],
  seedLots: [],
  missingFields: ["municipalityQuery.state"],
  ambiguities: ["municipality has multiple matches; state confirmation is required"],
};

export const canonicalFarmOperationInput: FarmOperationInput = {
  municipality: canonicalMunicipality,
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

export const canonicalConfirmedFarmOperation: ConfirmedFarmOperation = {
  draftVersion: "operation-v1",
  confirmation: {
    method: "voice",
    confirmedAt: "2026-08-19T15:00:00.000Z",
    confirmationToken: "operation-token-v1",
  },
  municipality: canonicalMunicipality,
  operation: canonicalFarmOperationInput,
};

export const staleConfirmationAttempt = {
  confirmedOperation: canonicalConfirmedFarmOperation,
  currentDraftVersion: "operation-v2",
};

export const canonicalFieldEventDraft: FieldEventDraft = {
  effectiveDate: "2025-09-20",
  blockedFieldIds: ["B"],
  blockedUntil: "2025-09-23",
  seedDeltaAreaHaByCycle: {},
  notes: ["chuva forte bloqueou o talhão B"],
  missingFields: [],
  ambiguities: [],
};

export const canonicalConfirmedFieldEvent: ConfirmedFieldEvent = {
  draftVersion: "event-v1",
  confirmation: {
    method: "button",
    confirmedAt: "2026-08-19T15:05:00.000Z",
    confirmationToken: "event-token-v1",
  },
  event: {
    effectiveDate: "2025-09-20",
    blockedFieldIds: ["B"],
    blockedUntil: "2025-09-23",
    seedDeltaAreaHaByCycle: {},
    notes: ["chuva forte bloqueou o talhão B"],
  },
};

export const malformedOperationToolArguments = {
  totalAreaHa: "duzentos",
  planterCapacityHaPerDay: null,
  fields: "A e B",
};
