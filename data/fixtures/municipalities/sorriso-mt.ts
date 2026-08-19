import type { Municipality } from "@/domain/schemas";
import { preparedDataset } from "./prepared";

export const sorrisoMt: Municipality = {
  name: "Sorriso",
  state: "MT",
  countryCode: "BR",
  latitude: -12.5453,
  longitude: -55.7217,
  elevationM: 380,
  timezone: "America/Cuiaba",
};

const RAIN_WINDOW_DAYS_FROM_START = [
  193, 203, 222, 234, 216, 204, 219, 207, 217, 239, 220, 225, 204, 192, 219,
  199, 193, 214, 210, 203, 213, 167, 223, 224, 202, 210, 220, 222, 220, 239,
  210, 204, 218, 208, 195, 186, 198, 221, 215, 175, 215,
];

export const sorrisoMt41Seasons = preparedDataset(sorrisoMt, RAIN_WINDOW_DAYS_FROM_START);
