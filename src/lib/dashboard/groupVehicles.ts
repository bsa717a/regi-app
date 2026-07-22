import type { VehicleDto } from "@/lib/vehicles/types";

export type DashboardVehicleGroups = {
  /** Expired vehicles, most overdue first. */
  expired: VehicleDto[];
  /** Non-expired vehicles, soonest expiration first. */
  upcoming: VehicleDto[];
  /** Best target for Renew Now: earliest expired, else soonest due-soon. */
  renewTarget: VehicleDto | null;
};

function bySoonestExpiration(a: VehicleDto, b: VehicleDto): number {
  if (a.daysUntilExpiration !== b.daysUntilExpiration) {
    return a.daysUntilExpiration - b.daysUntilExpiration;
  }
  return a.registrationExpiresOn.localeCompare(b.registrationExpiresOn);
}

/**
 * Split garage vehicles for the dashboard: expired (flagged) vs upcoming
 * renewals (soonest first). Does not recompute status — uses API fields.
 */
export function groupDashboardVehicles(
  vehicles: VehicleDto[],
): DashboardVehicleGroups {
  const expired = vehicles
    .filter((v) => v.status === "Expired")
    .sort(bySoonestExpiration);

  const upcoming = vehicles
    .filter((v) => v.status !== "Expired")
    .sort(bySoonestExpiration);

  const dueSoon = upcoming.filter((v) => v.status === "Due Soon");
  // Viewers cannot renew — prefer an owned vehicle for Renew Now.
  const editableExpired = expired.filter((v) => v.canEdit);
  const editableDueSoon = dueSoon.filter((v) => v.canEdit);
  const renewTarget = editableExpired[0] ?? editableDueSoon[0] ?? null;

  return { expired, upcoming, renewTarget };
}
