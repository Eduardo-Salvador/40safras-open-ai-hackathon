import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { canonicalFarmOperationInput } from "../data/fixtures/contracts";
import { sorrisoMt41Seasons } from "../data/fixtures/municipalities/sorriso-mt";
import { buildPlan } from "@/domain/planner";
import { buildReplan } from "@/domain/replan";
import { FileAnalysisStore } from "@/lib/analysis-store";
import { createSessionToken, validateLogin, verifySessionToken } from "@/lib/auth";

const sessionSecret = "test-session-secret-with-at-least-32-characters";

describe("single-user authentication", () => {
  it("accepts only the configured username and password", () => {
    const credentials = { username: "demo", password: "correct-password" };
    expect(validateLogin({ username: "demo", password: "correct-password" }, credentials)).toBe(true);
    expect(validateLogin({ username: "demo", password: "wrong" }, credentials)).toBe(false);
  });

  it("verifies a signed session and rejects tampering or expiration", () => {
    let now = Date.parse("2026-08-19T15:00:00.000Z");
    const token = createSessionToken("demo", { secret: sessionSecret, now: () => now });
    expect(verifySessionToken(token, { secret: sessionSecret, now: () => now })?.username).toBe("demo");
    expect(verifySessionToken(`${token}tampered`, { secret: sessionSecret, now: () => now })).toBeNull();
    now += 8 * 60 * 60 * 1000 + 1;
    expect(verifySessionToken(token, { secret: sessionSecret, now: () => now })).toBeNull();
  });
});

describe("analysis persistence", () => {
  it("persists a plan and appends a confirmed reanalysis", async () => {
    const directory = await mkdtemp(join(tmpdir(), "quarenta-safras-analysis-"));
    const file = join(directory, "analyses.json");
    let now = new Date("2026-08-19T15:00:00.000Z");
    const store = new FileAnalysisStore(file, () => now, () => "123e4567-e89b-42d3-a456-426614174000");
    const plan = buildPlan(canonicalFarmOperationInput, sorrisoMt41Seasons);
    const created = await store.create({
      title: "Sorriso - plano inicial",
      operation: canonicalFarmOperationInput,
      dataset: sorrisoMt41Seasons,
      plan,
    });

    expect((await store.list())).toHaveLength(1);
    expect((await new FileAnalysisStore(file).get(created.id))?.plan.inputHash).toBe(plan.inputHash);

    const event = {
      effectiveDate: "2025-10-01",
      blockedFieldIds: ["B"],
      seedDeltaAreaHaByCycle: {},
      notes: ["talhão B alagado"],
    };
    now = new Date("2026-08-19T15:05:00.000Z");
    const updated = await store.addReplan(
      created.id,
      buildReplan(canonicalFarmOperationInput, sorrisoMt41Seasons, event),
    );

    expect(updated?.replans).toHaveLength(1);
    expect(updated?.updatedAt).toBe("2026-08-19T15:05:00.000Z");
  });
});
