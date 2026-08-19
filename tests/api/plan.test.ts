import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as requestConfirmation } from "@/app/api/confirmations/route";
import { POST as calculatePlan } from "@/app/api/plan/route";
import { canonicalFarmOperationInput } from "../../data/fixtures/contracts";
import { sorrisoMt41Seasons } from "../../data/fixtures/municipalities/sorriso-mt";

async function issueToken(sessionId: string, draftVersion: string) {
  const response = await requestConfirmation(
    new NextRequest("http://localhost/api/confirmations", {
      method: "POST",
      body: JSON.stringify({ sessionId, subject: "operation", draftVersion }),
    }),
  );
  expect(response.status).toBe(200);
  return (await response.json()) as { confirmationToken: string };
}

async function postPlan(
  sessionId: string,
  draftVersion: string,
  confirmationToken: string,
  method: "voice" | "button",
) {
  return calculatePlan(
    new NextRequest("http://localhost/api/plan", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        draftVersion,
        confirmationToken,
        affirmative: true,
        method,
        operation: canonicalFarmOperationInput,
        dataset: sorrisoMt41Seasons,
      }),
    }),
  );
}

describe("POST /api/plan", () => {
  it("calculates only after a valid button confirmation", async () => {
    const sessionId = "form-plan-session";
    const draftVersion = "operation-form-v1";
    const challenge = await issueToken(sessionId, draftVersion);
    const response = await postPlan(sessionId, draftVersion, challenge.confirmationToken, "button");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.draftVersion).toBe(draftVersion);
    expect(body.plan.historicalOutcomes).toHaveLength(41);
    expect(body.plan.inputHash).toMatch(/^[a-f0-9]{8}$/);
    expect(JSON.stringify(body)).not.toContain(challenge.confirmationToken);
  });

  it("rejects calculation without a server-issued token", async () => {
    const response = await postPlan("unconfirmed-session", "operation-v1", "not-issued", "voice");
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("TOKEN_NOT_FOUND");
  });

  it("invalidates an earlier token when the draft version changes", async () => {
    const sessionId = "edited-draft-session";
    const first = await issueToken(sessionId, "operation-v1");
    await issueToken(sessionId, "operation-v2");
    const response = await postPlan(sessionId, "operation-v1", first.confirmationToken, "button");

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("TOKEN_NOT_FOUND");
  });

  it("produces the same inputHash for voice, natural text and form transports", async () => {
    const modes = [
      { name: "voice", method: "voice" as const },
      { name: "text", method: "button" as const },
      { name: "form", method: "button" as const },
    ];
    const hashes: string[] = [];

    for (const mode of modes) {
      const sessionId = `${mode.name}-same-operation`;
      const draftVersion = `${mode.name}-v1`;
      const challenge = await issueToken(sessionId, draftVersion);
      const response = await postPlan(
        sessionId,
        draftVersion,
        challenge.confirmationToken,
        mode.method,
      );
      expect(response.status).toBe(200);
      hashes.push((await response.json()).plan.inputHash);
    }

    expect(new Set(hashes)).toEqual(new Set([hashes[0]]));
  });
});
