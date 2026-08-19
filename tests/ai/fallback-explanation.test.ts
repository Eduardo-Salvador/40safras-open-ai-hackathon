import { describe, expect, it, vi } from "vitest";
import { PREPARED_FIELD_EVENT, PREPARED_OPERATION_BRIEF } from "../../data/fixtures/ai";
import { canonicalFarmOperationInput } from "../../data/fixtures/contracts";
import { sorrisoMt41Seasons } from "../../data/fixtures/municipalities/sorriso-mt";
import { buildPlan } from "@/domain/planner";
import {
  explainPlan,
  parseFieldEvent,
  parseOperationBrief,
  verifyExplanationNumbers,
  type PlanExplanationRequester,
  type StructuredOutputRequester,
} from "@/lib/openai";

const plan = buildPlan(canonicalFarmOperationInput, sorrisoMt41Seasons);

describe("prepared AI fallback", () => {
  it("uses a labeled operation fixture only for the exact prepared brief", async () => {
    const requester = vi.fn<StructuredOutputRequester>().mockRejectedValue(new Error("offline"));
    const result = await parseOperationBrief(PREPARED_OPERATION_BRIEF, requester);

    expect(result.source).toBe("fixture");
    expect(result.data.missingFields).toEqual([]);
    expect(result.warning).toContain("prepared offline fixture");
  });

  it("uses a labeled field-event fixture only for the exact prepared event", async () => {
    const requester = vi.fn<StructuredOutputRequester>().mockRejectedValue(new Error("offline"));
    const result = await parseFieldEvent(PREPARED_FIELD_EVENT, requester);

    expect(result.source).toBe("fixture");
    expect(result.data.blockedFieldIds).toEqual(["B"]);
  });
});

describe("verified plan explanation", () => {
  it("accepts prose whose numeric tokens are all present in PlanResult", () => {
    expect(verifyExplanationNumbers(`Foram avaliadas ${plan.dataset.seasons} safras.`, plan)).toBe(true);
  });

  it("rejects an invented numeric claim and returns deterministic prose", async () => {
    const requester = vi
      .fn<PlanExplanationRequester>()
      .mockResolvedValue("O resultado garantido sera 999999 reais.");
    const result = await explainPlan(plan, requester);

    expect(result.source).toBe("deterministic");
    expect(result.text).not.toContain("999999");
    expect(verifyExplanationNumbers(result.text, plan)).toBe(true);
  });

  it("falls back deterministically when OpenAI is offline", async () => {
    const requester = vi.fn<PlanExplanationRequester>().mockRejectedValue(new Error("offline"));
    const result = await explainPlan(plan, requester);

    expect(result.source).toBe("deterministic");
    expect(result.warning).toBe("offline");
    expect(verifyExplanationNumbers(result.text, plan)).toBe(true);
  });
});
