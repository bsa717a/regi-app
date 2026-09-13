import { createRoot } from "react-dom/client";
import { DashboardRenewalSummary } from "@/components/dashboard/DashboardRenewalSummary";
import { RenewalCard } from "@/components/dashboard/RenewalCard";
import { groupDashboardRegistrations } from "@/lib/dashboard/groupRegistrations";
import {
  attentionVehicles,
  currentFar,
  currentOnlyVehicles,
  expired,
  expiredVehicles,
} from "./fixtures";
import { DashboardInboxShell, LegacyDashboardSummary } from "./DashboardInboxShell";
import "./evidence.css";

const attentionGroups = groupDashboardRegistrations(attentionVehicles);
const currentGroups = groupDashboardRegistrations(currentOnlyVehicles);
const expiredGroups = groupDashboardRegistrations(expiredVehicles);

createRoot(document.getElementById("root")!).render(
  <div className="min-h-screen space-y-10 bg-slate-200 py-6">
    <div id="dashboard-before-attention" data-testid="dashboard-before-attention">
      <DashboardInboxShell>
        <LegacyDashboardSummary vehicleCount={2} variant="attention" />
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Upcoming renewals
          </h2>
          <ul className="mt-3 space-y-3">
            {attentionVehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <RenewalCard vehicle={vehicle} />
              </li>
            ))}
          </ul>
        </section>
      </DashboardInboxShell>
    </div>

    <div id="dashboard-after-attention" data-testid="dashboard-after-attention">
      <DashboardInboxShell>
        <DashboardRenewalSummary
          vehicleCount={attentionVehicles.length}
          groups={attentionGroups}
        />
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Upcoming renewals
          </h2>
          <ul className="mt-3 space-y-3">
            {attentionVehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <RenewalCard vehicle={vehicle} />
              </li>
            ))}
          </ul>
        </section>
      </DashboardInboxShell>
    </div>

    <div id="dashboard-before-current" data-testid="dashboard-before-current">
      <DashboardInboxShell>
        <LegacyDashboardSummary vehicleCount={1} variant="current" />
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Upcoming renewals
          </h2>
          <ul className="mt-3 space-y-3">
            <li>
              <RenewalCard vehicle={currentFar} />
            </li>
          </ul>
        </section>
      </DashboardInboxShell>
    </div>

    <div id="dashboard-after-current" data-testid="dashboard-after-current">
      <DashboardInboxShell>
        <DashboardRenewalSummary
          vehicleCount={currentOnlyVehicles.length}
          groups={currentGroups}
        />
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Upcoming renewals
          </h2>
          <ul className="mt-3 space-y-3">
            {currentOnlyVehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <RenewalCard vehicle={vehicle} />
              </li>
            ))}
          </ul>
        </section>
      </DashboardInboxShell>
    </div>

    <div id="dashboard-after-expired" data-testid="dashboard-after-expired">
      <DashboardInboxShell>
        <DashboardRenewalSummary
          vehicleCount={expiredVehicles.length}
          groups={expiredGroups}
        />
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-700">
            Expired — act now
          </h2>
          <ul className="mt-3 space-y-3">
            <li>
              <RenewalCard vehicle={expired} prominent />
            </li>
          </ul>
        </section>
      </DashboardInboxShell>
    </div>

    <div
      id="dashboard-after-attention-dark"
      data-testid="dashboard-after-attention-dark"
    >
      <DashboardInboxShell dark>
        <DashboardRenewalSummary
          vehicleCount={attentionVehicles.length}
          groups={attentionGroups}
        />
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
            Upcoming renewals
          </h2>
          <ul className="mt-3 space-y-3">
            {attentionVehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <RenewalCard vehicle={vehicle} />
              </li>
            ))}
          </ul>
        </section>
      </DashboardInboxShell>
    </div>
  </div>,
);
