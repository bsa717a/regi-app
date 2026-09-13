import type { RegistrationStatus } from "@/lib/stateEngine/status";

/**
 * Status-colored countdown text used on Garage vehicle cards.
 * Dashboard reuses the same classes so days-until reads the same way.
 */
export function expirationCountdownClassName(
  status: RegistrationStatus,
): string {
  if (status === "Expired") {
    return "text-rose-700 dark:text-rose-300";
  }
  if (status === "Due Soon") {
    return "text-amber-800 dark:text-amber-200";
  }
  return "text-teal-800 dark:text-teal-300";
}
