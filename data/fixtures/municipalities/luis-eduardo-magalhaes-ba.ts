import type { Municipality } from "@/domain/schemas";
import { preparedDataset } from "./prepared";

export const luisEduardoMagalhaesBa: Municipality = {
  name: "Luís Eduardo Magalhães",
  state: "BA",
  countryCode: "BR",
  latitude: -12.095,
  longitude: -45.786,
  timezone: "America/Bahia",
};

export const luisEduardoMagalhaesBa41Seasons = preparedDataset(luisEduardoMagalhaesBa, [
  183, 204, 190, 192, 167, 200, 168, 168, 184, 167, 218, 197, 167, 187, 184,
  182, 167, 206, 171, 198, 217, 167, 204, 238, 176, 205, 168, 167, 178, 192,
  180, 168, 192, 218, 193, 177, 183, 195, 173, 167, 172,
]);
