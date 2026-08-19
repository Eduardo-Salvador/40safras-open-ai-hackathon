import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { canonicalFarmOperationInput } from "../data/fixtures/contracts";
import { sorrisoMt41Seasons } from "../data/fixtures/municipalities/sorriso-mt";

const event = {
  effectiveDate: "2025-10-01",
  blockedFieldIds: ["B"],
  seedDeltaAreaHaByCycle: {},
  notes: ["talhao B alagado"],
};

describe("demo backend journey", () => {
  let temporaryDirectory: string;

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "quarenta-safras-demo-"));
    vi.stubEnv("APP_LOGIN_USER", "demo");
    vi.stubEnv("APP_LOGIN_PASSWORD", "demo-test-password");
    vi.stubEnv("SESSION_SECRET", "demo-test-secret-with-at-least-32-characters");
    vi.stubEnv("ANALYSIS_STORE_PATH", join(temporaryDirectory, "analyses.json"));
    vi.resetModules();
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("logs in, confirms, plans, saves and replans one analysis", async () => {
    const [{ POST: login }, { POST: confirm }, { POST: plan }, analyses, savedReplan] =
      await Promise.all([
        import("@/app/api/auth/login/route"),
        import("@/app/api/confirmations/route"),
        import("@/app/api/plan/route"),
        import("@/app/api/analyses/route"),
        import("@/app/api/analyses/[id]/replan/route"),
      ]);

    const loginResponse = await login(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "demo", password: "demo-test-password" }),
      }),
    );
    expect(loginResponse.status).toBe(200);
    const cookie = loginResponse.headers.get("set-cookie")?.split(";", 1)[0];
    expect(cookie).toContain("quarenta_safras_session=");

    const operationSessionId = "demo-operation-session";
    const operationDraftVersion = "operation-v1";
    const operationChallengeResponse = await confirm(
      new NextRequest("http://localhost/api/confirmations", {
        method: "POST",
        body: JSON.stringify({
          sessionId: operationSessionId,
          subject: "operation",
          draftVersion: operationDraftVersion,
        }),
      }),
    );
    const operationChallenge = (await operationChallengeResponse.json()) as {
      confirmationToken: string;
    };
    const planResponse = await plan(
      new NextRequest("http://localhost/api/plan", {
        method: "POST",
        body: JSON.stringify({
          sessionId: operationSessionId,
          draftVersion: operationDraftVersion,
          confirmationToken: operationChallenge.confirmationToken,
          affirmative: true,
          method: "voice",
          operation: canonicalFarmOperationInput,
          dataset: sorrisoMt41Seasons,
        }),
      }),
    );
    const planned = await planResponse.json();
    expect(planResponse.status).toBe(200);
    expect(planned.plan.historicalOutcomes).toHaveLength(41);

    const saveResponse = await analyses.POST(
      new NextRequest("http://localhost/api/analyses", {
        method: "POST",
        headers: { cookie: cookie! },
        body: JSON.stringify({
          title: "Sorriso - demonstracao",
          operation: canonicalFarmOperationInput,
          dataset: sorrisoMt41Seasons,
        }),
      }),
    );
    const saved = await saveResponse.json();
    expect(saveResponse.status).toBe(201);
    expect(saved.analysis.plan.inputHash).toBe(planned.plan.inputHash);

    const eventSessionId = "demo-event-session";
    const eventDraftVersion = "event-v1";
    const eventChallengeResponse = await confirm(
      new NextRequest("http://localhost/api/confirmations", {
        method: "POST",
        body: JSON.stringify({
          sessionId: eventSessionId,
          subject: "field_event",
          draftVersion: eventDraftVersion,
        }),
      }),
    );
    const eventChallenge = (await eventChallengeResponse.json()) as {
      confirmationToken: string;
    };
    const replanResponse = await savedReplan.POST(
      new NextRequest(`http://localhost/api/analyses/${saved.analysis.id}/replan`, {
        method: "POST",
        headers: { cookie: cookie! },
        body: JSON.stringify({
          sessionId: eventSessionId,
          draftVersion: eventDraftVersion,
          confirmationToken: eventChallenge.confirmationToken,
          affirmative: true,
          method: "voice",
          event,
        }),
      }),
      { params: Promise.resolve({ id: saved.analysis.id }) },
    );
    const replanned = await replanResponse.json();
    expect(replanResponse.status).toBe(200);
    expect(replanned.replan.before.historicalOutcomes).toHaveLength(41);
    expect(replanned.replan.after.historicalOutcomes).toHaveLength(41);
    expect(replanned.replan.changes.length).toBeGreaterThan(0);
    expect(replanned.analysis.replans).toHaveLength(1);

    const listResponse = await analyses.GET(
      new NextRequest("http://localhost/api/analyses", { headers: { cookie: cookie! } }),
    );
    const list = await listResponse.json();
    expect(listResponse.status).toBe(200);
    expect(list.analyses).toHaveLength(1);
  });
});
