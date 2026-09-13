import { expirationCountdownClassName } from "@/lib/registrations/countdownStyle";
import { dashboardExpirationSummary } from "@/lib/dashboard/expirationSummary";
import type { DashboardRegistrationGroups } from "@/lib/dashboard/groupRegistrations";

export function DashboardRenewalSummary({
  vehicleCount,
  groups,
}: {
  vehicleCount: number;
  groups: DashboardRegistrationGroups;
}) {
  const summary = dashboardExpirationSummary(groups);

  return (
    <section aria-labelledby="renewals-summary-heading">
      <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
        Renewal inbox
      </p>
      <h2
        id="renewals-summary-heading"
        className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
      >
        {vehicleCount} registration{vehicleCount === 1 ? "" : "s"} in
        your garage
      </h2>
      {summary ? (
        <p
          data-testid="dashboard-days-until"
          className={`mt-2 text-base font-semibold ${expirationCountdownClassName(summary.status)}`}
        >
          {summary.label}
        </p>
      ) : (
        <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
          Everything looks current
        </p>
      )}
    </section>
  );
}
