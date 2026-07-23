import type { RegistrationDto } from "@/lib/registrations/types";

export type DashboardRegistrationGroups = {
  /** Expired registrations, most overdue first. */
  expired: RegistrationDto[];
  /** Non-expired registrations, soonest expiration first. */
  upcoming: RegistrationDto[];
  /** Best target for Renew Now: earliest expired, else soonest due-soon. */
  renewTarget: RegistrationDto | null;
};

function bySoonestExpiration(a: RegistrationDto, b: RegistrationDto): number {
  if (a.daysUntilExpiration !== b.daysUntilExpiration) {
    return a.daysUntilExpiration - b.daysUntilExpiration;
  }
  return a.registrationExpiresOn.localeCompare(b.registrationExpiresOn);
}

/**
 * Split garage registrations for the dashboard: expired (flagged) vs upcoming
 * renewals (soonest first). Does not recompute status — uses API fields.
 */
export function groupDashboardRegistrations(
  registrations: RegistrationDto[],
): DashboardRegistrationGroups {
  const expired = registrations
    .filter((r) => r.status === "Expired")
    .sort(bySoonestExpiration);

  const upcoming = registrations
    .filter((r) => r.status !== "Expired")
    .sort(bySoonestExpiration);

  const dueSoon = upcoming.filter((r) => r.status === "Due Soon");
  // Viewers cannot renew — prefer an owned registration for Renew Now.
  const editableExpired = expired.filter((r) => r.canEdit);
  const editableDueSoon = dueSoon.filter((r) => r.canEdit);
  const renewTarget = editableExpired[0] ?? editableDueSoon[0] ?? null;

  return { expired, upcoming, renewTarget };
}
