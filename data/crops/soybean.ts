import type { CropProfile } from "@/domain/schemas";

export const soybeanProfile: CropProfile = {
  crop: "soybean",
  label: "Soja",
  cycleDaysMin: 90,
  cycleDaysMax: 130,
  defaultCycleDays: 105,
};
