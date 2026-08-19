import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { buildPlan } from "@/domain/planner";
import { buildReplan } from "@/domain/replan";
import { FileAnalysisStore } from "@/lib/analysis-store";
import { createSessionToken, validateLogin, verifySessionToken } from "@/lib/auth";
import { sorrisoMt, sorrisoMt41Seasons } from "../data/fixtures/municipalities/sorriso-mt";

const operation = {
  municipality: sorrisoMt,
  totalAreaHa: 200,
  planterCapacityHaPerDay: 50,
  startDate: "2025-09-15",
  firstCrop: "soybean" as const,
  secondCrop: "corn" as const,
  fields: [
    { id: "A", areaHa: 100, priority: "soy_only" as const },
    { id: "B", areaHa: 100, priority: "second_crop" as const },
  ],
  seedLots: [
    { crop: "soybean" as const, cycleDays: 90, availableAreaHa: 200 },
    { crop: "soybean" as const, cycleDays: 120, availableAreaHa: 200 },
  ],
  secondCropTargetAreaHa: 100,
  finance: { soybeanMarginPerHa: 1000, cornMarginPerHa: 800 },
};

const secret = "test-session-secret-with-at-least-32-characters";

describe("demo login", () => {
  it("accepts configured credentials and rejects tampered or expired sessions", () => {
    expect(validateLogin({ username: "demo@40safras.test", password: "correct" }, { username: "demo@40safras.test", password: "correct" })).toBe(true);
    expect(validateLogin({ username: "demo@40safras.test", password: "wrong" }, { username: "demo@40safras.test", password: "correct" })).toBe(false);

    let now = Date.parse("2026-08-19T15:00:00.000Z");
    const token = createSessionToken("demo@40safras.test", { secret, now: () => now });
    expect(verifySessionToken(token, { secret, now: () => now })?.username).toBe("demo@40safras.test");
    expect(verifySessionToken(`${token}tampered`, { secret, now: () => now })).toBeNull();
    now += 8 * 60 * 60 * 1000 + 1;
    expect(verifySessionToken(token, { secret, now: () => now })).toBeNull();
  });
});

describe("local saved analyses", () => {
  it("persists the original plan and appends a replan", async () => {
    const directory = await mkdtemp(join(tmpdir(), "quarenta-safras-analysis-"));
    const store = new FileAnalysisStore(
      join(directory, "analyses.json"),
      () => new Date("2026-08-19T15:00:00.000Z"),
      () => "123e4567-e89b-42d3-a456-426614174000",
    );
    const saved = await store.create({
      title: "Sorriso - plano inicial",
      operation,
      dataset: sorrisoMt41Seasons,
      plan: buildPlan(operation, sorrisoMt41Seasons),
    });

    const updated = await store.addReplan(saved.id, buildReplan(operation, sorrisoMt41Seasons, {
      effectiveDate: "2025-10-01",
      blockedFieldIds: ["B"],
      seedDeltaAreaHaByCycle: {},
      notes: ["talhão B alagado"],
    }));

    expect((await store.list())).toHaveLength(1);
    expect(updated?.replans).toHaveLength(1);
  });
});
