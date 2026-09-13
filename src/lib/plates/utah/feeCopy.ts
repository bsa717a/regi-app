import { formatUsdCents } from "@/lib/renewals/formatMoney";
import type { UtahPlateFeeEstimate } from "./types";

export function formatFeeEstimateCopy(fees: UtahPlateFeeEstimate): string {
  const lines = [
    `Application fee: ${formatUsdCents(fees.applicationFeeCents)}`,
    `Processing fee: ${formatUsdCents(fees.processingFeeCents)}`,
    `Estimated initial total: ${formatUsdCents(fees.initialTotalCents)}`,
    `Personalized plate renewal (each year): ${formatUsdCents(fees.renewalFeeCents)}`,
    fees.disclaimer,
  ];
  if (fees.specialGroupNote) {
    lines.push(fees.specialGroupNote);
  }
  return lines.join("\n");
}
