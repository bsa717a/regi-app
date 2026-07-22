import type { StateRulesConfig } from "@/lib/stateEngine/types";
import { getDueSoonThresholdDays } from "@/lib/stateEngine/parseConfig";

export type RegistrationStatus = "Current" | "Due Soon" | "Expired";

export type RegistrationStatusResult = {
  status: RegistrationStatus;
  /** Calendar days until expiration (negative when already expired). */
  daysUntilExpiration: number;
  countdown: string;
};

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Whole calendar days from `asOf` to `expiresOn` (UTC date parts).
 * Positive = future, 0 = today, negative = past.
 */
export function daysUntilExpiration(
  expiresOn: Date | string,
  asOf: Date = new Date(),
): number {
  const expires = startOfUtcDay(new Date(expiresOn));
  const today = startOfUtcDay(asOf);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((expires.getTime() - today.getTime()) / msPerDay);
}

/**
 * Human countdown copy:
 * - "Expires in 278 days" / "Expires in 1 day"
 * - "Expires today"
 * - "Expired 12 days ago" / "Expired 1 day ago"
 */
export function formatExpirationCountdown(
  expiresOn: Date | string,
  asOf: Date = new Date(),
): string {
  const days = daysUntilExpiration(expiresOn, asOf);

  if (days > 1) return `Expires in ${days} days`;
  if (days === 1) return "Expires in 1 day";
  if (days === 0) return "Expires today";
  if (days === -1) return "Expired 1 day ago";
  return `Expired ${Math.abs(days)} days ago`;
}

/**
 * Derive registration status from expiration + state_rules threshold.
 * Threshold MUST come from StateRulesConfig — never hard-code 60.
 */
export function computeRegistrationStatus(
  expiresOn: Date | string,
  config: StateRulesConfig,
  asOf: Date = new Date(),
): RegistrationStatusResult {
  const dueSoonThresholdDays = getDueSoonThresholdDays(config);
  const days = daysUntilExpiration(expiresOn, asOf);

  let status: RegistrationStatus;
  if (days < 0) {
    status = "Expired";
  } else if (days <= dueSoonThresholdDays) {
    status = "Due Soon";
  } else {
    status = "Current";
  }

  return {
    status,
    daysUntilExpiration: days,
    countdown: formatExpirationCountdown(expiresOn, asOf),
  };
}
