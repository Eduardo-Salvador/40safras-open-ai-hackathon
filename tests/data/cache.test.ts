import { describe, expect, it } from "vitest";
import { climateCacheKey, getCachedClimate, getPreparedClimateFixture, setCachedClimate } from "@/data/cache";
import { sorrisoMt41Seasons } from "../../data/fixtures/municipalities/sorriso-mt";
import { rioVerdeGo } from "../../data/fixtures/municipalities/rio-verde-go";

describe("climate cache", () => {
  it("includes the grid, model, period, and variable contract in its key", () => {
    expect(climateCacheKey(sorrisoMt41Seasons.location)).toBe(
      "grid:-12.55,-55.72:era5:1985-07-01:2026-06-30:daily-core-v1",
    );
  });

  it("returns a labeled prepared fixture only for bundled municipalities", () => {
    const prepared = getPreparedClimateFixture(sorrisoMt41Seasons.location);
    expect(prepared?.cached).toBe(true);
    expect(prepared?.real).toBe(true);
    expect(prepared?.records).toHaveLength(41);
    expect(getPreparedClimateFixture({ ...rioVerdeGo, latitude: -17.9 })).toBeUndefined();
  });

  it("marks a successful live dataset as cached on subsequent reads", () => {
    const key = climateCacheKey(sorrisoMt41Seasons.location);
    setCachedClimate(key, { ...sorrisoMt41Seasons, cached: false });
    expect(getCachedClimate(key)?.cached).toBe(true);
  });
});
