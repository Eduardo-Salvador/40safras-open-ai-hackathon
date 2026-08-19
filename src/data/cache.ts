import type { HistoricalDataset, Municipality } from "@/domain/schemas";

/**
 * Process-lifetime cache keyed by normalized location. Good enough for a
 * single-process hackathon demo; a persistent store is a later extension,
 * not required by the MVP (STACK.md: "no user database").
 */
const climateCache = new Map<string, HistoricalDataset>();

export function climateCacheKey(municipality: Pick<Municipality, "ibgeCode" | "latitude" | "longitude">): string {
  if (municipality.ibgeCode) return `ibge:${municipality.ibgeCode}`;
  return `grid:${municipality.latitude.toFixed(2)},${municipality.longitude.toFixed(2)}`;
}

export function getCachedClimate(key: string): HistoricalDataset | undefined {
  return climateCache.get(key);
}

export function setCachedClimate(key: string, dataset: HistoricalDataset): void {
  climateCache.set(key, { ...dataset, cached: true });
}
