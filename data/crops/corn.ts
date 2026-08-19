import type { CropProfile } from "@/domain/schemas";

export const cornProfile: CropProfile = {
  crop: "corn",
  label: "Milho segunda safra",
  cycleDaysMin: 95,
  cycleDaysMax: 125,
  defaultCycleDays: 110,
};
