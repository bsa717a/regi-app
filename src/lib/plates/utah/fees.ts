import {
  UTAH_PLATE_APPLICATION_FEE_CENTS,
  UTAH_PLATE_FEE_DISCLAIMER,
  UTAH_PLATE_PROCESSING_FEE_CENTS,
  UTAH_PLATE_RENEWAL_FEE_CENTS,
} from "./constants";
import type { UtahPlateFeeEstimate } from "./types";

const SPECIAL_GROUP_NOTE =
  "Special group plates may add an organization contribution. Confirm that amount on MVP — it is not included in this estimate.";

export function estimateUtahPersonalizedPlateFees(input?: {
  specialGroup?: boolean;
}): UtahPlateFeeEstimate {
  return {
    currency: "USD",
    applicationFeeCents: UTAH_PLATE_APPLICATION_FEE_CENTS,
    processingFeeCents: UTAH_PLATE_PROCESSING_FEE_CENTS,
    initialTotalCents:
      UTAH_PLATE_APPLICATION_FEE_CENTS + UTAH_PLATE_PROCESSING_FEE_CENTS,
    renewalFeeCents: UTAH_PLATE_RENEWAL_FEE_CENTS,
    isEstimate: true,
    specialGroupNote: input?.specialGroup ? SPECIAL_GROUP_NOTE : null,
    disclaimer: UTAH_PLATE_FEE_DISCLAIMER,
  };
}
