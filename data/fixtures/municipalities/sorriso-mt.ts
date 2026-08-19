import type { HistoricalDataset, Municipality } from "@/domain/schemas";

export const sorrisoMt: Municipality = {
  name: "Sorriso",
  state: "MT",
  countryCode: "BR",
  latitude: -12.5453,
  longitude: -55.7217,
  elevationM: 380,
  timezone: "America/Cuiaba",
};

// Prototype fixture: "rainWindowDaysFromStart" is the declared, unvalidated
// operational assumption for effective end-of-rains, counted in days from the
// operation's start date. It is not derived from ERA5/Open-Meteo yet — see
// docs/references/DOMAIN_NOTES.md. First season label stands in for the
// oldest of 41 agricultural years ending in the current one.
const RAIN_WINDOW_DAYS_FROM_START = [
  210, 224, 205, 235, 190, 215, 222, 206, 182, 212, 228, 198, 175, 160, 168,
  178, 208, 225, 218, 193, 236, 220, 183, 204, 219, 213, 165, 180, 196, 209,
  227, 206, 188, 216, 235, 201, 170, 210, 224, 207, 192,
];

function seasonLabel(index: number): string {
  const endYear = 2025 - (RAIN_WINDOW_DAYS_FROM_START.length - 1 - index);
  const startYear = endYear - 1;
  return `${startYear}/${String(endYear).slice(2)}`;
}

export const sorrisoMt41Seasons: HistoricalDataset = {
  location: sorrisoMt,
  source: "fixture:prototype-not-era5",
  seasons: 41,
  cached: true,
  real: false,
  retrievedAt: "2026-08-01T00:00:00Z",
  variables: ["rainWindowDaysFromStart"],
  records: RAIN_WINDOW_DAYS_FROM_START.map((rainWindowDaysFromStart, index) => ({
    season: seasonLabel(index),
    rainWindowDaysFromStart,
  })),
};
