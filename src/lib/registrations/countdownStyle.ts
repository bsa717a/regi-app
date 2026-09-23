import type { RegistrationStatus } from "@/lib/stateEngine/status";

/**
 * Status-colored countdown text used on Garage vehicle cards.
 * Dashboard reuses the same classes so days-until reads the same way.
 */
export function expirationCountdownClassName(
  status: RegistrationStatus,
): string {
  if (status === "Expired") return "text-regi-expired";
  if (status === "Due Soon") return "text-regi-due";
  return "text-regi-current";
}
