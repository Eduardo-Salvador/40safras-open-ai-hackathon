import type { Municipality } from "@/domain/schemas";
import { preparedDataset } from "./prepared";

export const rioVerdeGo: Municipality = {
  name: "Rio Verde",
  state: "GO",
  countryCode: "BR",
  latitude: -17.7923,
  longitude: -50.9192,
  timezone: "America/Sao_Paulo",
};

export const rioVerdeGo41Seasons = preparedDataset(rioVerdeGo, [
  176, 189, 185, 194, 168, 219, 235, 168, 215, 218, 196, 199, 207, 192, 198,
  201, 167, 213, 218, 170, 214, 167, 221, 211, 170, 204, 168, 211, 221, 216,
  194, 173, 178, 194, 172, 184, 167, 186, 211, 167, 206,
]);
