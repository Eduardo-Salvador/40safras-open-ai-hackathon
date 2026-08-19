import { describe, expect, it, vi } from "vitest";
import { parseFieldEvent, parseOperationBrief, type StructuredOutputRequester } from "@/lib/openai";

const operationExtraction = {
  municipalityName: "Sorriso",
  municipalityState: "MT",
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
  finance: { soybeanMarginPerHa: 1000, cornMarginPerHa: 800, operatingCostPerDay: null },
  missingFields: [],
  ambiguities: [],
};

describe("OpenAI structured parsing boundary", () => {
  it("normalizes a valid operation extraction into the shared draft", async () => {
    const requester = vi.fn<StructuredOutputRequester>().mockResolvedValue(operationExtraction);
    const result = await parseOperationBrief("operação canônica", requester);

    expect(result.source).toBe("openai");
    expect(result.attempts).toBe(1);
    expect(result.data.municipalityQuery).toEqual({ name: "Sorriso", state: "MT" });
    expect(result.data.missingFields).toEqual([]);
  });

  it("retries once after malformed output", async () => {
    const requester = vi
      .fn<StructuredOutputRequester>()
      .mockResolvedValueOnce({ totalAreaHa: "duzentos" })
      .mockResolvedValueOnce(operationExtraction);

    const result = await parseOperationBrief("operação canônica", requester);
    expect(result.source).toBe("openai");
    expect(result.attempts).toBe(2);
    expect(requester).toHaveBeenCalledTimes(2);
  });

  it("returns an editable labeled recovery after two failures", async () => {
    const requester = vi.fn<StructuredOutputRequester>().mockRejectedValue(new Error("network unavailable"));
    const result = await parseOperationBrief("texto preservado pela rota", requester);

    expect(result.source).toBe("recovery");
    expect(result.attempts).toBe(2);
    expect(result.data.missingFields).toContain("municipalityQuery");
    expect(result.warning).toBe("network unavailable");
  });

  it("normalizes a field event without calculating a replan", async () => {
    const requester = vi.fn<StructuredOutputRequester>().mockResolvedValue({
      effectiveDate: "2025-09-20",
      blockedFieldIds: ["B"],
      blockedUntil: "2025-09-23",
      seedDeltas: [],
      notes: ["chuva forte bloqueou o talhão B"],
      missingFields: [],
      ambiguities: [],
    });

    const result = await parseFieldEvent("talhão B bloqueado até 23/09", requester);
    expect(result.source).toBe("openai");
    expect(result.data.blockedFieldIds).toEqual(["B"]);
    expect(result.data).not.toHaveProperty("replan");
  });
});
