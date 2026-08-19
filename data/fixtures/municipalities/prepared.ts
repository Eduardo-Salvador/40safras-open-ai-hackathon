import type { HistoricalDataset, Municipality } from "@/domain/schemas";

const RETRIEVED_AT = "2026-08-19T16:56:00.000Z";

/** Builds a bundled offline dataset from the 41 normalized annual values. */
export function preparedDataset(location: Municipality, rainWindowDaysFromStart: number[]): HistoricalDataset {
  if (rainWindowDaysFromStart.length !== 41) {
    throw new Error("prepared municipality fixture must contain exactly 41 seasons");
  }

  return {
    location,
    source: "fixture:derived from Open-Meteo archive API ERA5 precipitation_sum, retrieved 2026-08-19; 1985-07-01..2026-06-30 UTC",
    seasons: 41,
    cached: true,
    real: true,
    retrievedAt: RETRIEVED_AT,
    variables: ["precipitation_sum"],
    records: rainWindowDaysFromStart.map((days, index) => {
      const endYear = 1986 + index;
      return { season: `${endYear - 1}/${String(endYear).slice(2)}`, rainWindowDaysFromStart: days };
    }),
  };
}
