import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as requestConfirmation } from "@/app/api/confirmations/route";
import { POST as calculateReplan } from "@/app/api/replan/route";
import { canonicalFarmOperationInput } from "../../data/fixtures/contracts";
import { sorrisoMt41Seasons } from "../../data/fixtures/municipalities/sorriso-mt";

const event = {
  effectiveDate: "2025-10-01",
  blockedFieldIds: ["B"],
  seedDeltaAreaHaByCycle: {},
  notes: ["talhão B alagado"],
};

async function issueEventToken(sessionId: string, draftVersion: string) {
  const response = await requestConfirmation(
    new NextRequest("http://localhost/api/confirmations", {
      method: "POST",
      body: JSON.stringify({ sessionId, subject: "field_event", draftVersion }),
    }),
  );
  expect(response.status).toBe(200);
  return (await response.json()) as { confirmationToken: string };
}

function postReplan(
  sessionId: string,
  draftVersion: string,
  confirmationToken: string,
  affirmative = true,
) {
  return calculateReplan(
    new NextRequest("http://localhost/api/replan", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        draftVersion,
        confirmationToken,
        affirmative,
        method: "voice",
        operation: canonicalFarmOperationInput,
        dataset: sorrisoMt41Seasons,
        event,
      }),
    }),
  );
}

describe("POST /api/replan", () => {
  it("returns before, after and deterministic reasons after event confirmation", async () => {
    const sessionId = "confirmed-event-session";
    const draftVersion = "event-v1";
    const challenge = await issueEventToken(sessionId, draftVersion);
    const response = await postReplan(sessionId, draftVersion, challenge.confirmationToken);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.replan.before.historicalOutcomes).toHaveLength(41);
    expect(body.replan.after.historicalOutcomes).toHaveLength(41);
    expect(body.replan.before.sequence.map((item: { fieldId: string }) => item.fieldId)).toContain("B");
    expect(body.replan.after.sequence.map((item: { fieldId: string }) => item.fieldId)).not.toContain("B");
    expect(body.replan.changes.length).toBeGreaterThan(0);
    expect(body.replan.changes.every((change: { reason: string }) => change.reason.length > 0)).toBe(true);
    expect(JSON.stringify(body)).not.toContain(challenge.confirmationToken);
  });

  it("rejects replanning without a server-issued event token", async () => {
    const response = await postReplan("unconfirmed-event", "event-v1", "not-issued");
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("TOKEN_NOT_FOUND");
  });

  it("rejects a spoken negative response", async () => {
    const sessionId = "negative-event-session";
    const challenge = await issueEventToken(sessionId, "event-v1");
    const response = await postReplan(sessionId, "event-v1", challenge.confirmationToken, false);

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("NEGATIVE_CONFIRMATION");
  });
});
