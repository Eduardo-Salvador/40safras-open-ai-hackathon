/**
 * Linear-interpolation quantile (same convention as numpy's default "linear"
 * method). `p` is a percentile in [0, 100]. Throws on an empty input.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    throw new Error("percentile requires at least one value");
  }
  if (p < 0 || p > 100) {
    throw new Error("percentile p must be within [0, 100]");
  }
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];

  const rank = (p / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  if (lowerIndex === upperIndex) return sorted[lowerIndex];

  const weight = rank - lowerIndex;
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}

/** Nearest-rank: posição `ceil(p * n)`, indexada a partir de 1. */
export function nearestRankPercentile(values: number[], p: number): number {
  if (values.length === 0) {
    throw new Error("nearest-rank percentile requires at least one value");
  }
  if (p < 0 || p > 100) {
    throw new Error("percentile p must be within [0, 100]");
  }

  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1];
}

export function median(values: number[]): number {
  return percentile(values, 50);
}

/**
 * Deterministic, non-cryptographic hash for provenance/debug output
 * (FNV-1a over the JSON-stable representation of the value).
 */
export function hashObject(value: unknown): string {
  const json = JSON.stringify(value, sortKeysReplacer);
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function sortKeysReplacer(_key: string, value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  }
  return value;
}
