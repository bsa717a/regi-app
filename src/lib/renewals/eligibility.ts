import { daysUntilExpiration } from "@/lib/stateEngine/status";
import type { StateRulesConfig } from "@/lib/stateEngine/types";

export type RenewalEligibility =
  | { ok: true }
  | { ok: false; error: string };

/**
 * A vehicle may start a renewal when it is within the state's open window
 * (daysBeforeExpirationOpen) or already expired. Null open window = anytime.
 */
export function canStartRenewal(
  registrationExpiresOn: Date | string,
  config: StateRulesConfig,
  asOf: Date = new Date(),
): RenewalEligibility {
  const days = daysUntilExpiration(registrationExpiresOn, asOf);
  const open = config.renewalWindow.daysBeforeExpirationOpen;

  if (open === null) {
    return { ok: true };
  }

  if (days <= open) {
    return { ok: true };
  }

  return {
    ok: false,
    error: `Renewal opens ${open} days before expiration (${days} days remaining).`,
  };
}

/** Statuses that still count as an "open" concierge renewal for a vehicle. */
export const OPEN_RENEWAL_STATUSES = [
  "Requested",
  "DocumentsReceived",
  "Reviewing",
  "Processing",
  "Submitted",
  "Completed",
] as const;
