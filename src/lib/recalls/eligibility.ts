import type { Registration, RegistrationType } from "@prisma/client";
import type { RecallEligibility } from "./types";

const NHTSA_ELIGIBLE_TYPES: RegistrationType[] = [
  "passenger",
  "motorcycle",
  "motorhome",
  "trailer",
];

const INELIGIBLE_TYPE_REASON: Partial<Record<RegistrationType, string>> = {
  boat: "NHTSA recall lookup is not available for boats. Use the NHTSA VIN search instead.",
  ohv: "NHTSA recall lookup is not available for off-highway vehicles. Use the NHTSA VIN search instead.",
  snowmobile:
    "NHTSA recall lookup is not available for snowmobiles. Use the NHTSA VIN search instead.",
};

export function getRecallEligibility(
  registration: Pick<Registration, "type" | "year" | "make" | "model">,
): RecallEligibility {
  const typeReason = INELIGIBLE_TYPE_REASON[registration.type];
  if (typeReason) {
    return { eligible: false, reason: typeReason };
  }

  if (!NHTSA_ELIGIBLE_TYPES.includes(registration.type)) {
    return {
      eligible: false,
      reason: "Recall lookup is not available for this registration type.",
    };
  }

  if (!registration.year || !registration.make?.trim() || !registration.model?.trim()) {
    return {
      eligible: false,
      reason:
        "Add year, make, and model to this registration to check for recalls.",
    };
  }

  return { eligible: true, reason: null };
}
