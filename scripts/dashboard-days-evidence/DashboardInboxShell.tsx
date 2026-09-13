import type { ReactNode } from "react";

export function DashboardInboxShell({
  children,
  dark = false,
}: {
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={
        dark
          ? "dark bg-[linear-gradient(180deg,#042f2e_0%,#020617_28%,#020617_100%)] px-4 py-5 text-slate-100"
          : "bg-[linear-gradient(180deg,#f0fdfa_0%,#f8fafc_28%,#f8fafc_100%)] px-4 py-5"
      }
    >
      <header className="mx-auto mb-4 max-w-3xl border-b border-slate-200/70 bg-white/90 px-1 pb-3 dark:border-slate-700/70 dark:bg-slate-900/90">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800 dark:text-teal-300">
          REGI
        </p>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Renewals
        </h1>
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-8">{children}</main>
    </div>
  );
}

/** Frozen pre-change copy: status, not days-until. */
export function LegacyDashboardSummary({
  vehicleCount,
  variant,
}: {
  vehicleCount: number;
  variant: "attention" | "current" | "expired";
}) {
  const line =
    variant === "expired"
      ? "1 expired · renew soon"
      : variant === "attention"
        ? "Something needs attention soon"
        : "Everything looks current";

  return (
    <section>
      <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
        Renewal inbox
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {vehicleCount} registration{vehicleCount === 1 ? "" : "s"} in your garage
      </h2>
      <p
        data-testid="dashboard-summary-legacy"
        className="mt-2 text-base text-slate-600 dark:text-slate-400"
      >
        {line}
      </p>
    </section>
  );
}
