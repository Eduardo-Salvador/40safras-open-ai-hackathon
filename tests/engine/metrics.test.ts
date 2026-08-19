import { describe, expect, it } from "vitest";
import { hashObject, median, percentile } from "@/domain/metrics";

describe("percentile", () => {
  it("returns the single value for a one-element array", () => {
    expect(percentile([42], 20)).toBe(42);
  });

  it("matches a known linear-interpolation result", () => {
    // sorted: [1,2,3,4,5]; rank = 0.2 * 4 = 0.8 -> interpolate between index 0 and 1
    expect(percentile([5, 1, 4, 2, 3], 20)).toBeCloseTo(1.8);
  });

  it("returns the min/max at p=0/p=100", () => {
    const values = [8, 3, 5, 1, 9];
    expect(percentile(values, 0)).toBe(1);
    expect(percentile(values, 100)).toBe(9);
  });

  it("throws on an empty array", () => {
    expect(() => percentile([], 20)).toThrow();
  });
});

describe("median", () => {
  it("matches percentile(values, 50)", () => {
    expect(median([1, 2, 3, 4])).toBe(percentile([1, 2, 3, 4], 50));
  });
});

describe("hashObject", () => {
  it("is stable regardless of key order", () => {
    expect(hashObject({ a: 1, b: 2 })).toBe(hashObject({ b: 2, a: 1 }));
  });

  it("differs for different content", () => {
    expect(hashObject({ a: 1 })).not.toBe(hashObject({ a: 2 }));
  });
});
