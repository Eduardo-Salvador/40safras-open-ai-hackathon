import { addDays, daysBetween, toIsoDate } from "@/domain/dates";
import type { HistoricalDataset, HistoricalSeason, Municipality } from "@/domain/schemas";

export class ClimateFetchError extends Error {}

type FetchFn = typeof fetch;

type DailyPrecipitation = { dates: string[]; precipitationMm: number[] };

const NUM_SEASONS = 41;
const SEASON_START_MONTH_DAY = "09-15";
const DRY_DOWN_SEARCH_START_MONTH_DAY = "03-01";
const DRY_DOWN_SEARCH_END_MONTH_DAY = "08-31";
const DRY_DOWN_WINDOW_DAYS = 10;
const DRY_DOWN_THRESHOLD_MM = 15;
/** Open-Meteo's ERA5 archive reports with a short delay; never request past this. */
const ARCHIVE_REPORTING_LAG_DAYS = 5;

/** The most recent agricultural year whose safrinha window has plausibly closed. */
function latestCompleteSeasonEndYear(referenceDate: Date): number {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth() + 1; // 1-12
  return month < 6 ? year - 1 : year;
}

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
  url.searchParams.set("daily", "precipitation_sum");
  url.searchParams.set("timezone", "auto");

  const res = await fetchImpl(url.toString());
  if (!res.ok) {
    throw new ClimateFetchError(`Open-Meteo archive request failed: ${res.status}`);
  }
  const body = (await res.json()) as { daily?: { time: string[]; precipitation_sum: (number | null)[] } };
  if (!body.daily) {
    throw new ClimateFetchError("Open-Meteo archive response missing daily series");
  }
  return {
    dates: body.daily.time,
    precipitationMm: body.daily.precipitation_sum.map((v) => v ?? 0),
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

/**
 * Fetches ~41 years of daily precipitation in a single Open-Meteo Archive
 * (ERA5) call and derives one declared "end of rains" day per agricultural
 * year. `cached`/`real` are set by the caller (the cache layer decides
 * whether this was a hit).
 */
export async function fetchHistoricalSeasons(
  municipality: Municipality,
  fetchImpl: FetchFn = fetch,
  referenceDate: Date = new Date(),
): Promise<HistoricalDataset> {
  const latestEndYear = latestCompleteSeasonEndYear(referenceDate);
  const earliestStartYear = latestEndYear - NUM_SEASONS;

  // The archive endpoint only serves the past, with a short reporting lag —
  // never request a date later than that, even if the season's nominal
  // window (Aug 31) hasn't happened yet.
  const latestAvailableDate = addDays(toIsoDate(referenceDate), -ARCHIVE_REPORTING_LAG_DAYS);
  const requestedEndDate = `${latestEndYear}-${DRY_DOWN_SEARCH_END_MONTH_DAY}`;
  const endDate = requestedEndDate < latestAvailableDate ? requestedEndDate : latestAvailableDate;

  const daily = await fetchDailyPrecipitation(
    municipality,
    `${earliestStartYear}-${SEASON_START_MONTH_DAY}`,
    endDate,
    fetchImpl,
  );

  return {
    location: municipality,
    source: "open-meteo:archive-api (ERA5, precipitation_sum)",
    seasons: NUM_SEASONS,
    cached: false,
    real: true,
    retrievedAt: new Date().toISOString(),
    variables: ["precipitation_sum"],
    records: buildSeasonRecords(daily, latestEndYear),
  };
}
