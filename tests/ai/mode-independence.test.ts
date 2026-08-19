import { describe, expect, it, vi } from "vitest";
import { canonicalFarmOperationInput } from "../../data/fixtures/contracts";
import { FarmOperationInputSchema } from "@/domain/schemas";
import { ConfirmationGuard } from "@/lib/confirmation";
import { parseOperationBrief, type StructuredOutputRequester } from "@/lib/openai";

describe("independent input modes", () => {
  it("keeps the structured form functional when OpenAI is unavailable", async () => {
    const requester = vi.fn<StructuredOutputRequester>().mockRejectedValue(new Error("offline"));
    const textResult = await parseOperationBrief("relato preservado", requester);
    const formResult = FarmOperationInputSchema.parse(canonicalFarmOperationInput);

    expect(textResult.source).toBe("recovery");
    expect(textResult.data.missingFields.length).toBeGreaterThan(0);
    expect(formResult).toEqual(canonicalFarmOperationInput);
    expect(requester).toHaveBeenCalledTimes(2);
  });

  it("allows button confirmation without creating a Realtime session", () => {
    const guard = new ConfirmationGuard({
      now: () => Date.parse("2026-08-19T15:00:00.000Z"),
      tokenFactory: () => "button-token",
    });
    const challenge = guard.request({
      sessionId: "form-session",
      subject: "operation",
      draftVersion: "operation-v1",
    });

    const confirmation = guard.confirm({
      sessionId: "form-session",
      subject: "operation",
      draftVersion: "operation-v1",
      confirmationToken: challenge.confirmationToken,
      method: "button",
      affirmative: true,
    });

    expect(confirmation.method).toBe("button");
  });
});
