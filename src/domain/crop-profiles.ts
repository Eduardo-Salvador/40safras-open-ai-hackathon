import { soybeanProfile } from "../../data/crops/soybean";
import { cornProfile } from "../../data/crops/corn";
import type { CropProfile } from "./schemas";

export const cropProfiles: Record<"soybean" | "corn", CropProfile> = {
  soybean: soybeanProfile,
  corn: cornProfile,
};

export function getCropProfile(crop: "soybean" | "corn"): CropProfile {
  const profile = cropProfiles[crop];
  if (!profile) {
    throw new Error(`unsupported crop path: ${crop}`);
  }
  return profile;
}
