import { describe, expect, it } from "vitest";
import { addDays, daysBetween } from "@/domain/dates";
import { CLIMATE_PERIOD_END, CLIMATE_PERIOD_START, ClimateFetchError, fetchHistoricalSeasons, findRainsEndDate } from "@/data/climate";
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
    const rangeStart = CLIMATE_PERIOD_START;
    const rangeEnd = CLIMATE_PERIOD_END;

    // Synthetic climate: wet (20mm/day) through April, bone dry (0mm) from May.
    const dates: string[] = [];
    for (let d = rangeStart; d <= rangeEnd; d = addDays(d, 1)) dates.push(d);
    const precipitationMm = dates.map((d) => (Number(d.slice(5, 7)) <= 4 ? 20 : 0));

    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          daily: {
            time: dates,
            precipitation_sum: precipitationMm,
            et0_fao_evapotranspiration: dates.map(() => 4),
            temperature_2m_min: dates.map(() => 20),
            temperature_2m_max: dates.map(() => 30),
          },
          daily_units: {
            precipitation_sum: "mm",
            et0_fao_evapotranspiration: "mm",
            temperature_2m_min: "°C",
            temperature_2m_max: "°C",
          },
        }),
        { status: 200 },
      )) as unknown as typeof fetch;

    const dataset = await fetchHistoricalSeasons(sorrisoMt, mockFetch);

    expect(dataset.seasons).toBe(41);
    expect(dataset.records).toHaveLength(41);
    expect(dataset.real).toBe(true);
    expect(dataset.records[40].season).toBe("2025/26");
    expect(dataset.records[0].season).toBe("1985/86");

    // Every season's dry-down lands on May 1st of its end year in this fixture.
    // (Reconstructed from the loop bounds, not the display label, since the
    // label's two-digit year would be ambiguous across centuries.)
    for (let offset = 40; offset >= 0; offset--) {
      const endYear = 2026 - offset;
      const startYear = endYear - 1;
      const expectedDays = daysBetween(`${startYear}-09-15`, `${endYear}-05-01`);
      const record = dataset.records[40 - offset];
      expect(record.rainWindowDaysFromStart).toBe(expectedDays);
    }
  });

  it("rejects a missing day instead of producing a partial season", async () => {
    const dates: string[] = [];
    for (let d = CLIMATE_PERIOD_START; d <= CLIMATE_PERIOD_END; d = addDays(d, 1)) dates.push(d);
    dates.splice(250, 1);
    const precipitation = dates.map(() => 1);
    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          daily: {
            time: dates,
            precipitation_sum: precipitation,
            et0_fao_evapotranspiration: dates.map(() => 4),
            temperature_2m_min: dates.map(() => 20),
            temperature_2m_max: dates.map(() => 30),
          },
          daily_units: { precipitation_sum: "mm", et0_fao_evapotranspiration: "mm", temperature_2m_min: "°C", temperature_2m_max: "°C" },
        }),
      )) as unknown as typeof fetch;

    await expect(fetchHistoricalSeasons(sorrisoMt, mockFetch)).rejects.toThrow(ClimateFetchError);
  });

  it("rejects an unexpected precipitation unit", async () => {
    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          daily: {
            time: [CLIMATE_PERIOD_START],
            precipitation_sum: [1],
            et0_fao_evapotranspiration: [4],
            temperature_2m_min: [20],
            temperature_2m_max: [30],
          },
          daily_units: { precipitation_sum: "inch", et0_fao_evapotranspiration: "mm", temperature_2m_min: "°C", temperature_2m_max: "°C" },
        }),
      )) as unknown as typeof fetch;

    await expect(fetchHistoricalSeasons(sorrisoMt, mockFetch)).rejects.toThrow("unexpected daily units");
  });

  it("rejects null in a required climate series", async () => {
    const dates: string[] = [];
    for (let d = CLIMATE_PERIOD_START; d <= CLIMATE_PERIOD_END; d = addDays(d, 1)) dates.push(d);
    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          daily: {
            time: dates,
            precipitation_sum: dates.map(() => 1),
            et0_fao_evapotranspiration: dates.map(() => 4),
            temperature_2m_min: [null, ...dates.slice(1).map(() => 20)],
            temperature_2m_max: dates.map(() => 30),
          },
          daily_units: { precipitation_sum: "mm", et0_fao_evapotranspiration: "mm", temperature_2m_min: "°C", temperature_2m_max: "°C" },
        }),
      )) as unknown as typeof fetch;

    await expect(fetchHistoricalSeasons(sorrisoMt, mockFetch)).rejects.toThrow("missing or invalid temperature_2m_min");
  });
});
