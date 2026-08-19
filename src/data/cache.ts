import type { HistoricalDataset, Municipality } from "@/domain/schemas";
import { luisEduardoMagalhaesBa41Seasons } from "../../data/fixtures/municipalities/luis-eduardo-magalhaes-ba";
import { rioVerdeGo41Seasons } from "../../data/fixtures/municipalities/rio-verde-go";
import { sorrisoMt41Seasons } from "../../data/fixtures/municipalities/sorriso-mt";

/**
 * Process-lifetime cache keyed by normalized location. Good enough for a
 * single-process hackathon demo; a persistent store is a later extension,
 * not required by the MVP (STACK.md: "no user database").
 */
const climateCache = new Map<string, HistoricalDataset>();
const preparedDatasets = [sorrisoMt41Seasons, rioVerdeGo41Seasons, luisEduardoMagalhaesBa41Seasons];

export function climateCacheKey(municipality: Pick<Municipality, "ibgeCode" | "latitude" | "longitude">): string {
  const grid = `${municipality.latitude.toFixed(2)},${municipality.longitude.toFixed(2)}`;
  return `grid:${grid}:era5:1985-07-01:2026-06-30:daily-core-v1`;
}

export function getCachedClimate(key: string): HistoricalDataset | undefined {
  return climateCache.get(key);
}

export function setCachedClimate(key: string, dataset: HistoricalDataset): void {
  climateCache.set(key, { ...dataset, cached: true });
}

/** Returns a labeled offline dataset only for a municipality bundled with the app. */
export function getPreparedClimateFixture(municipality: Municipality): HistoricalDataset | undefined {
  const match = preparedDatasets.find((dataset) => climateCacheKey(dataset.location) === climateCacheKey(municipality));
  return match ? { ...match, cached: true } : undefined;
}
