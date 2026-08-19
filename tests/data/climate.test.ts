import { describe, expect, it } from "vitest";
import { addDays, daysBetween } from "@/domain/dates";
import { fetchHistoricalSeasons, findRainsEndDate } from "@/data/climate";
import type { Municipality } from "@/domain/schemas";

const sorrisoMt: Municipality = {
  name: "Sorriso",
  state: "MT",
  countryCode: "BR",
  latitude: -12.5453,
  longitude: -55.7217,
  timezone: "America/Cuiaba",
};

describe("findRainsEndDate", () => {
  it("finds the first day whose trailing window drops below the dry threshold", () => {
    // 12 wet days (20mm) then 12 dry days (0mm), starting 2024-01-01.
    const dates = Array.from({ length: 24 }, (_, i) => addDays("2024-01-01", i));
    const precipitationMm = dates.map((_, i) => (i < 12 ? 20 : 0));

    // A trailing 10-day window is fully dry starting the day after the last wet day.
    expect(findRainsEndDate({ dates, precipitationMm }, "2024-01-01", "2024-01-24")).toBe("2024-01-13");
  });

  it("returns null when rain never dries down within the search range", () => {
    const dates = Array.from({ length: 20 }, (_, i) => addDays("2024-01-01", i));
    const precipitationMm = dates.map(() => 20);
    expect(findRainsEndDate({ dates, precipitationMm }, "2024-01-01", "2024-01-20")).toBeNull();
  });
});

describe("fetchHistoricalSeasons", () => {
  it("derives 41 deterministic seasons from a single mocked archive call", async () => {
    const referenceDate = new Date(Date.UTC(2020, 7, 15)); // 2020-08-15 -> latest complete endYear = 2020
    const earliestStartYear = 2020 - 41;
    const rangeStart = `${earliestStartYear}-09-15`;
    const rangeEnd = "2020-08-31";

    // Synthetic climate: wet (20mm/day) through April, bone dry (0mm) from May.
    const dates: string[] = [];
    for (let d = rangeStart; d <= rangeEnd; d = addDays(d, 1)) dates.push(d);
    const precipitationMm = dates.map((d) => (Number(d.slice(5, 7)) <= 4 ? 20 : 0));

    const mockFetch = (async () =>
      new Response(
        JSON.stringify({ daily: { time: dates, precipitation_sum: precipitationMm } }),
        { status: 200 },
      )) as unknown as typeof fetch;

    const dataset = await fetchHistoricalSeasons(sorrisoMt, mockFetch, referenceDate);

    expect(dataset.seasons).toBe(41);
    expect(dataset.records).toHaveLength(41);
    expect(dataset.real).toBe(true);
    expect(dataset.records[40].season).toBe("2019/20");
    expect(dataset.records[0].season).toBe(`${earliestStartYear}/${String(earliestStartYear + 1).slice(2)}`);

    // Every season's dry-down lands on May 1st of its end year in this fixture.
    // (Reconstructed from the loop bounds, not the display label, since the
    // label's two-digit year would be ambiguous across centuries.)
    for (let offset = 40; offset >= 0; offset--) {
      const endYear = 2020 - offset;
      const startYear = endYear - 1;
      const expectedDays = daysBetween(`${startYear}-09-15`, `${endYear}-05-01`);
      const record = dataset.records[40 - offset];
      expect(record.rainWindowDaysFromStart).toBe(expectedDays);
    }
  });
});
