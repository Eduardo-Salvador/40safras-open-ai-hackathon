import { describe, expect, it } from "vitest";
import { buildPlanWhatsAppMessage, buildReplanWhatsAppMessage, buildWhatsAppShareUrl } from "@/lib/whatsapp";
import type { Municipality, PlanResult, ReplanResult } from "@/domain/schemas";

const municipality: Municipality = {
  name: "Sorriso",
  state: "MT",
  countryCode: "BR",
  latitude: -12.5453,
  longitude: -55.7217,
  timezone: "America/Cuiaba",
};

const plan: PlanResult = {
  inputHash: "abcd1234",
  datasetHash: "ef567890",
  dataset: { source: "open-meteo:archive-api (ERA5, precipitation_sum)", seasons: 41, cached: false, real: true },
  assumptions: ["some declared assumption"],
  sequence: [
    { fieldId: "T-01", cycleDays: 98, startDate: "2025-09-15", endDate: "2025-12-22", secondCropCandidate: true },
  ],
  historicalOutcomes: [],
  metrics: {
    viableSeasons: 29,
    secondCropAreaP20Ha: 0,
    financialMedian: 2_268_500,
    financialP20: 1_572_500,
    financialWorstObserved: 900_000,
    differenceFromBaselineP20: 0,
  },
};

describe("buildPlanWhatsAppMessage", () => {
  it("includes only numbers present in the plan payload", () => {
    const message = buildPlanWhatsAppMessage(municipality, plan);

    expect(message).toContain("Sorriso/MT");
    expect(message).toContain("T-01 (2025-09-15)");
    expect(message).toContain("29/41");
    expect(message).toContain("1.572.500");
    expect(message).toContain(`${plan.inputHash}-${plan.datasetHash}`);
    expect(message).toContain("Não substitui o ZARC");
  });
});

describe("buildReplanWhatsAppMessage", () => {
  it("leads with the most critical change and shows the before/after P20 area", () => {
    const replan: ReplanResult = {
      before: plan,
      after: { ...plan, metrics: { ...plan.metrics, secondCropAreaP20Ha: 150 } },
      event: {
        effectiveDate: "2025-10-01",
        blockedFieldIds: ["T-02"],
        seedDeltaAreaHaByCycle: {},
        notes: ["alagamento"],
      },
      changes: [
        { entity: "talhão T-02", before: "no plano", after: "bloqueado", reason: "bloqueado pelo evento de campo" },
      ],
    };

    const message = buildReplanWhatsAppMessage(municipality, replan);
    expect(message).toContain("talhão T-02");
    expect(message).toContain("0 ha → 150 ha");
    expect(message).toContain("Não substitui o ZARC");
  });
});

describe("buildWhatsAppShareUrl", () => {
  it("produces a valid wa.me deep link with URL-encoded text", () => {
    const url = buildWhatsAppShareUrl("linha um\nlinha dois");
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url.replace("https://wa.me/?text=", ""))).toBe("linha um\nlinha dois");
  });
});
