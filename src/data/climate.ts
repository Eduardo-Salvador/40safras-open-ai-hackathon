import { addDays, daysBetween } from "@/domain/dates";
import type { HistoricalDataset, HistoricalSeason, Municipality } from "@/domain/schemas";

export class ClimateFetchError extends Error {}

type FetchFn = typeof fetch;

type DailyPrecipitation = { dates: string[]; precipitationMm: number[] };

const NUM_SEASONS = 41;
export const CLIMATE_PERIOD_START = "1985-07-01";
export const CLIMATE_PERIOD_END = "2026-06-30";
const DAILY_VARIABLES = [
  "precipitation_sum",
  "et0_fao_evapotranspiration",
  "temperature_2m_min",
  "temperature_2m_max",
] as const;
const SEASON_START_MONTH_DAY = "09-15";
const DRY_DOWN_SEARCH_START_MONTH_DAY = "03-01";
const DRY_DOWN_SEARCH_END_MONTH_DAY = "06-30";
const DRY_DOWN_WINDOW_DAYS = 10;
const DRY_DOWN_THRESHOLD_MM = 15;
export async function fetchDailyPrecipitation(
  municipality: Municipality,
  startDate: string,
  endDate: string,
  fetchImpl: FetchFn = fetch,
): Promise<DailyPrecipitation> {
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(municipality.latitude));
  url.searchParams.set("longitude", String(municipality.longitude));
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("daily", DAILY_VARIABLES.join(","));
  // ERA5-Land omits precipitation and ET0 in Open-Meteo's archive response.
  // ERA5 supplies the complete daily set required by this frozen contract.
  url.searchParams.set("models", "era5");
  // A fixed daily boundary keeps the live path reproducible with fixtures.
  url.searchParams.set("timezone", "UTC");

  let res: Response;
  try {
    res = await fetchImpl(url.toString(), { signal: AbortSignal.timeout(30_000) });
  } catch (error) {
    throw new ClimateFetchError(`Open-Meteo archive request failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  if (!res.ok) {
    const kind = res.status === 429 ? "rate limited" : `failed: ${res.status}`;
    throw new ClimateFetchError(`Open-Meteo archive request ${kind}`);
  }
  const body = (await res.json()) as {
    daily?: {
      time?: string[];
      precipitation_sum?: (number | null)[];
      et0_fao_evapotranspiration?: (number | null)[];
      temperature_2m_min?: (number | null)[];
      temperature_2m_max?: (number | null)[];
    };
    daily_units?: { precipitation_sum?: string; et0_fao_evapotranspiration?: string; temperature_2m_min?: string; temperature_2m_max?: string };
  };
  if (
    !body.daily?.time ||
    !body.daily.precipitation_sum ||
    !body.daily.et0_fao_evapotranspiration ||
    !body.daily.temperature_2m_min ||
    !body.daily.temperature_2m_max
  ) {
    throw new ClimateFetchError("Open-Meteo archive response missing daily series");
  }
  const units = body.daily_units;
  if (
    units?.precipitation_sum !== "mm" ||
    units.et0_fao_evapotranspiration !== "mm" ||
    units.temperature_2m_min !== "°C" ||
    units.temperature_2m_max !== "°C"
  ) {
    throw new ClimateFetchError("Open-Meteo archive response has unexpected daily units");
  }
  const series = Object.entries({
    precipitation_sum: body.daily.precipitation_sum,
    et0_fao_evapotranspiration: body.daily.et0_fao_evapotranspiration,
    temperature_2m_min: body.daily.temperature_2m_min,
    temperature_2m_max: body.daily.temperature_2m_max,
  });
  for (const [name, values] of series) {
    if (values.length !== body.daily.time.length) {
      throw new ClimateFetchError(`Open-Meteo archive response has mismatched ${name} series length`);
    }
    const cannotBeNegative = name !== "temperature_2m_min" && name !== "temperature_2m_max";
    if (values.some((value) => value === null || !Number.isFinite(value) || (cannotBeNegative && value < 0))) {
      throw new ClimateFetchError(`Open-Meteo archive response has missing or invalid ${name}`);
    }
  }
  return {
    dates: body.daily.time,
    precipitationMm: body.daily.precipitation_sum.map((value) => value as number),
  };
}

/**
 * Declared prototype heuristic for "end of rains" (see docs/references/DOMAIN_NOTES.md):
 * the first day, searching from `searchFromDate`, whose trailing
 * `DRY_DOWN_WINDOW_DAYS`-day cumulative rainfall drops below
 * `DRY_DOWN_THRESHOLD_MM`. Not agronomically validated.
 */
export function findRainsEndDate(
  daily: DailyPrecipitation,
  searchFromDate: string,
  searchToDate: string,
): string | null {
  const index = new Map(daily.dates.map((d, i) => [d, i]));

  for (let cursor = searchFromDate; cursor <= searchToDate; cursor = addDays(cursor, 1)) {
    const i = index.get(cursor);
    if (i === undefined || i + DRY_DOWN_WINDOW_DAYS > daily.precipitationMm.length) continue;

    let windowSum = 0;
    for (let k = 0; k < DRY_DOWN_WINDOW_DAYS; k++) windowSum += daily.precipitationMm[i + k];
    if (windowSum < DRY_DOWN_THRESHOLD_MM) return cursor;
  }
  return null;
}

function buildSeasonRecords(daily: DailyPrecipitation, latestEndYear: number): HistoricalSeason[] {
  const records: HistoricalSeason[] = [];

  for (let offset = NUM_SEASONS - 1; offset >= 0; offset--) {
    const endYear = latestEndYear - offset;
    const startYear = endYear - 1;
    const startDateRef = `${startYear}-${SEASON_START_MONTH_DAY}`;
    const searchFrom = `${endYear}-${DRY_DOWN_SEARCH_START_MONTH_DAY}`;
    const searchTo = `${endYear}-${DRY_DOWN_SEARCH_END_MONTH_DAY}`;

    const rainsEndDate = findRainsEndDate(daily, searchFrom, searchTo);
    const effectiveEndDate = rainsEndDate ?? searchTo;

    records.push({
      season: `${startYear}/${String(endYear).slice(2)}`,
      rainWindowDaysFromStart: daysBetween(startDateRef, effectiveEndDate),
    });
  }

  return records;
}

function assertCompleteClimatePeriod(daily: DailyPrecipitation): void {
  const expectedDays = daysBetween(CLIMATE_PERIOD_START, CLIMATE_PERIOD_END) + 1;
  if (daily.dates.length !== expectedDays) {
    throw new ClimateFetchError(`Open-Meteo archive response has ${daily.dates.length} days; expected ${expectedDays}`);
  }
  for (let index = 0; index < expectedDays; index++) {
    const expectedDate = addDays(CLIMATE_PERIOD_START, index);
    if (daily.dates[index] !== expectedDate) {
      throw new ClimateFetchError(`Open-Meteo archive response is missing or misordered day ${expectedDate}`);
    }
  }
}

/**
 * Fetches ~41 years of daily precipitation in a single Open-Meteo Archive
 * (ERA5) call and derives one declared "end of rains" day per agricultural
 * year. `cached`/`real` are set by the caller (the cache layer decides
 * whether this was a hit).
 */
export async function fetchHistoricalSeasons(
  municipality: Municipality,
  fetchImpl: FetchFn = fetch,
): Promise<HistoricalDataset> {
  const daily = await fetchDailyPrecipitation(municipality, CLIMATE_PERIOD_START, CLIMATE_PERIOD_END, fetchImpl);
  assertCompleteClimatePeriod(daily);

  return {
    location: municipality,
    source: `open-meteo:archive-api (ERA5; ${CLIMATE_PERIOD_START}..${CLIMATE_PERIOD_END}; daily UTC)`,
    seasons: NUM_SEASONS,
    cached: false,
    real: true,
    retrievedAt: new Date().toISOString(),
    variables: [...DAILY_VARIABLES],
    records: buildSeasonRecords(daily, 2026),
  };
}
