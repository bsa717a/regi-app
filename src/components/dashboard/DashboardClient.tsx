"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { AddVehicleFlow } from "@/components/garage/AddVehicleFlow";
import { RenewalCard } from "@/components/dashboard/RenewalCard";
import { primaryButtonClassName } from "@/components/auth/AuthFormStyles";
import { ApiError, listNotifications, listVehicles } from "@/lib/api/client";
import { groupDashboardVehicles } from "@/lib/dashboard/groupVehicles";
import type { NotificationDto } from "@/lib/notifications/types";
import type { VehicleDto } from "@/lib/vehicles/types";
import { titleCaseMakeModel } from "@/lib/vehicles/illustrations";

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(diffDays) >= 1) return rtf.format(diffDays, "day");
  const diffHours = Math.round(diffMs / (60 * 60 * 1000));
  if (Math.abs(diffHours) >= 1) return rtf.format(diffHours, "hour");
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  return rtf.format(diffMinutes, "minute");
}

function renewTargetLabel(vehicle: VehicleDto): string {
  if (vehicle.nickname) return vehicle.nickname;
  const make = titleCaseMakeModel(vehicle.make);
  const model = titleCaseMakeModel(vehicle.model);
  return [vehicle.year, make, model].filter(Boolean).join(" ") || "your vehicle";
}

export function DashboardClient() {
  const router = useRouter();
  const { idToken, getIdToken, loading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function run() {
      try {
        const token = idToken ?? (await getIdToken());
        if (!token) {
          if (!cancelled) {
            setVehicles([]);
            setNotifications([]);
            setError(null);
            setLoading(false);
          }
          return;
        }

        const [vehicleRows, notificationRows] = await Promise.all([
          listVehicles(token),
          listNotifications(token, 8),
        ]);

        if (!cancelled) {
          setVehicles(vehicleRows);
          setNotifications(notificationRows);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load your dashboard. Please try again.",
          );
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, idToken, getIdToken, reloadKey]);

  const groups = groupDashboardVehicles(vehicles);
  const emptyGarage = !loading && !error && vehicles.length === 0;

  if (emptyGarage || adding) {
    return (
      <AppShell title="Dashboard">
        {emptyGarage ? (
          <div className="mb-6">
            <p className="text-sm font-medium text-teal-800">Welcome home</p>
            <p className="mt-2 max-w-md text-base leading-relaxed text-slate-600">
              Your garage is empty — start with a VIN and we&apos;ll track the
              sticker from here.
            </p>
          </div>
        ) : null}
        <AddVehicleFlow
          onCancel={emptyGarage ? undefined : () => setAdding(false)}
          cancelLabel="← Back to dashboard"
          onCreated={(vehicle) => {
            setVehicles((prev) =>
              [...prev, vehicle].sort(
                (a, b) => a.daysUntilExpiration - b.daysUntilExpiration,
              ),
            );
            setAdding(false);
            setReloadKey((k) => k + 1);
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Dashboard"
      action={
        vehicles.length > 0 ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-xl bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Add
          </button>
        ) : undefined
      }
    >
      {loading ? (
        <div className="space-y-5" aria-busy aria-label="Loading dashboard">
          <div className="h-24 animate-pulse rounded-3xl bg-gradient-to-br from-teal-100 via-slate-100 to-slate-200" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-36 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-5">
          <p className="font-medium text-rose-900">{error}</p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-rose-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800"
            onClick={() => {
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-8">
          <section aria-labelledby="dashboard-summary-heading">
            <p className="text-sm font-medium text-teal-800">At a glance</p>
            <h2
              id="dashboard-summary-heading"
              className="mt-1 text-2xl font-semibold tracking-tight text-slate-900"
            >
              {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} in your
              garage
            </h2>
            <p className="mt-2 text-base text-slate-600">
              {groups.expired.length > 0
                ? `${groups.expired.length} expired · renew soon`
                : groups.renewTarget
                  ? "Something needs attention soon"
                  : "Everything looks current"}
            </p>
          </section>

          <section aria-labelledby="quick-actions-heading">
            <h2
              id="quick-actions-heading"
              className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500"
            >
              Quick actions
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className={primaryButtonClassName}
                onClick={() => setAdding(true)}
              >
                Add Vehicle
              </button>
              <div className="space-y-2">
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!groups.renewTarget}
                  onClick={() => {
                    if (!groups.renewTarget) return;
                    router.push(
                      `/renewals/new?vehicleId=${encodeURIComponent(groups.renewTarget.id)}`,
                    );
                  }}
                  aria-describedby={
                    groups.renewTarget ? "renew-target-hint" : "renew-disabled-hint"
                  }
                >
                  Renew Now
                </button>
                {groups.renewTarget ? (
                  <p id="renew-target-hint" className="text-xs text-slate-500">
                    For {renewTargetLabel(groups.renewTarget)} · concierge
                  </p>
                ) : (
                  <p id="renew-disabled-hint" className="text-xs text-slate-500">
                    No renewals due yet
                  </p>
                )}
              </div>
            </div>
          </section>

          {groups.expired.length > 0 ? (
            <section aria-labelledby="expired-heading">
              <h2
                id="expired-heading"
                className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-700"
              >
                Expired — act now
              </h2>
              <ul className="mt-3 space-y-3">
                {groups.expired.map((vehicle) => (
                  <li key={vehicle.id}>
                    <RenewalCard vehicle={vehicle} prominent />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="upcoming-heading">
            <h2
              id="upcoming-heading"
              className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500"
            >
              Upcoming renewals
            </h2>
            {groups.upcoming.length === 0 ? (
              <p className="mt-3 rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
                No upcoming renewals — expired vehicles are listed above.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {groups.upcoming.map((vehicle) => (
                  <li key={vehicle.id}>
                    <RenewalCard vehicle={vehicle} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="notifications-heading">
            <h2
              id="notifications-heading"
              className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500"
            >
              Recent notifications
            </h2>
            {notifications.length === 0 ? (
              <div className="mt-3 rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-6">
                <p className="font-medium text-slate-900">Inbox zero (for now)</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  When renewal reminders go out, they&apos;ll show up here —
                  friendly nudges before the sticker gets nervous.
                </p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200/80 bg-white">
                {notifications.map((n) => (
                  <li key={n.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{n.title}</p>
                        {n.vehicleLabel ? (
                          <p className="mt-0.5 text-sm text-slate-600">
                            {n.vehicleLabel}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                          {n.channel} · {n.status}
                        </p>
                      </div>
                      <time
                        className="shrink-0 text-xs text-slate-500"
                        dateTime={n.sentAt ?? n.scheduledFor}
                      >
                        {formatRelativeTime(n.sentAt ?? n.scheduledFor)}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
