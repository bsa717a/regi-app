import type { RegistrationDto } from "@/lib/registrations/types";
import type { RegistrationStatus } from "@/lib/stateEngine/status";
import type { DashboardRegistrationGroups } from "@/lib/dashboard/groupRegistrations";

export type DashboardExpirationSummary = {
  /** Same Garage countdown copy ("Expires in 14 days"). */
  countdown: string;
  status: RegistrationStatus;
  daysUntilExpiration: number;
  /** Headline line for the renewals inbox. Always includes days-until. */
  label: string;
};

/** Most urgent registration: most overdue expired, else soonest upcoming. */
export function dashboardFocusRegistration(
  groups: DashboardRegistrationGroups,
): RegistrationDto | null {
  return groups.expired[0] ?? groups.upcoming[0] ?? null;
}

/**
 * Days-until line for the dashboard summary.
 * Reuses Garage `countdown` language; prefixes a count when several are expired.
 */
export function dashboardExpirationSummary(
  groups: DashboardRegistrationGroups,
): DashboardExpirationSummary | null {
  const focus = dashboardFocusRegistration(groups);
  if (!focus) return null;

  const countdown = focus.countdown;
  const label =
    groups.expired.length > 1
      ? `${groups.expired.length} expired · ${countdown}`
      : countdown;

  return {
    countdown,
    status: focus.status,
    daysUntilExpiration: focus.daysUntilExpiration,
    label,
  };
}
