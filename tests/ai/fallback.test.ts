import { afterEach, describe, expect, it, vi } from "vitest";
import { preparedFieldEventDraft, preparedOperationDraft } from "@/lib/openai";

afterEach(() => vi.unstubAllEnvs());

describe("prepared AI boundary", () => {
  it("extracts only values present in the canonical text", () => {
    const draft = preparedOperationDraft(
      "Sorriso, MT. Início 2025-09-15, área total 850 ha, capacidade 45 ha/dia e meta de 580 ha.",
    );
    expect(draft).toMatchObject({
      municipalityQuery: "Sorriso, MT",
      startDate: "2025-09-15",
      totalAreaHa: 850,
      planterCapacityHaPerDay: 45,
      secondCropTargetAreaHa: 580,
    });
    expect(draft.soybeanMarginPerHa).toBeNull();
  });

  it("keeps missing values explicit instead of inventing them", () => {
    const draft = preparedOperationDraft("Quero plantar em Sorriso.");
    expect(draft.startDate).toBeNull();
    expect(draft.missingFields).toContain("data inicial (AAAA-MM-DD)");
  });

  it("structures a field event without calculating impact", () => {
    const event = preparedFieldEventDraft("Chuva alagou o talhão T-01.", "2025-09-15");
    expect(event.blockedFieldIds).toEqual(["T-01"]);
    expect(event.eventType).toBe("excess_rain");
    expect(event.effectiveDate).toBe("2025-09-15");
  });
});
