"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { headerActionClassName } from "@/components/brand/ui";
import {
  RenewalsInbox,
  type RenewalFeeSchedule,
  type RenewalListItem,
} from "@/components/brand/RenewalsInbox";
import { useAuth } from "@/components/auth/AuthProvider";
import { VerifyEmailCallout } from "@/components/auth/VerifyEmailCallout";
import { AddRegistrationFlow } from "@/components/garage/AddRegistrationFlow";
import {
  ApiError,
  listActiveStates,
  listNotifications,
  listRegistrations,
} from "@/lib/api/client";
import type { NotificationDto } from "@/lib/notifications/types";
import { REGISTRATION_TYPE_LABELS, titleCaseMakeModel } from "@/lib/registrations/illustrations";
import type { RegistrationDto } from "@/lib/registrations/types";

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

function renewalDetail(vehicle: RegistrationDto): string {
  const model = titleCaseMakeModel(vehicle.model);
  const make = titleCaseMakeModel(vehicle.make);
  const yearLine = [vehicle.year, model || make].filter(Boolean).join(" ");
  if (yearLine) return yearLine;
  return REGISTRATION_TYPE_LABELS[vehicle.type];
}

function toRenewalItem(vehicle: RegistrationDto): RenewalListItem {
  return {
    id: vehicle.id,
    nickname: vehicle.nickname,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    status: vehicle.status,
    daysUntilExpiration: vehicle.daysUntilExpiration,
    registrationExpiresOn: vehicle.registrationExpiresOn,
    state: vehicle.state,
    canEdit: vehicle.canEdit,
    detail: renewalDetail(vehicle),
  };
}

export function DashboardClient() {
  const router = useRouter();
  const { user, idToken, getIdToken, loading: authLoading } = useAuth();
  const showVerifyEmail = Boolean(user && !user.emailVerified);
  const [vehicles, setVehicles] = useState<RegistrationDto[]>([]);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [feeByState, setFeeByState] = useState<
    Record<string, RenewalFeeSchedule>
  >({});

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

        const [vehicleRows, notificationRows, states] = await Promise.all([
          listRegistrations(token),
          listNotifications(token, 8),
          listActiveStates(token).catch(() => []),
        ]);

        if (!cancelled) {
          setVehicles(vehicleRows);
          setNotifications(notificationRows);
          const fees: Record<string, RenewalFeeSchedule> = {};
          for (const state of states) {
            if (state.fees) fees[state.code] = state.fees;
          }
          setFeeByState(fees);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load renewals. Please try again.",
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

  const emptyGarage = !loading && !error && vehicles.length === 0;
  const renewalItems = vehicles.map(toRenewalItem);
  const focusState = [...vehicles].sort(
    (a, b) => a.daysUntilExpiration - b.daysUntilExpiration,
  )[0]?.state;
  const feeSchedule = focusState ? (feeByState[focusState] ?? null) : null;

  if (emptyGarage || adding) {
    return (
      <AppShell title="Renewals">
        {emptyGarage ? (
          <div className="mb-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
                Renewals inbox
              </p>
              <p className="mt-2 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-400">
                Your garage is empty — add a registration first, then we&apos;ll
                track renewals here.
              </p>
            </div>
            {showVerifyEmail ? (
              <VerifyEmailCallout
                email={user?.email}
                testId="dashboard-verify-email"
              />
            ) : null}
          </div>
        ) : null}
        <AddRegistrationFlow
          onCancel={emptyGarage ? undefined : () => setAdding(false)}
          cancelLabel="← Back to renewals"
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
      title="Renewals"
      action={
        vehicles.length > 0 ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={headerActionClassName}
          >
            Add
          </button>
        ) : undefined
      }
    >
      {loading ? (
        <div className="space-y-5" aria-busy aria-label="Loading renewals">
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
          {showVerifyEmail ? (
            <VerifyEmailCallout
              email={user?.email}
              testId="dashboard-verify-email"
            />
          ) : null}

          <RenewalsInbox
            vehicles={renewalItems}
            feeSchedule={feeSchedule}
            onRenew={(vehicle) => {
              router.push(
                `/renewals/new?registrationId=${encodeURIComponent(vehicle.id)}`,
              );
            }}
          />

          <section aria-labelledby="notifications-heading">
            <h2
              id="notifications-heading"
              className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
            >
              Recent notifications
            </h2>
            {notifications.length === 0 ? (
              <div className="mt-3 rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-6 dark:border-slate-700 dark:bg-slate-900">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Inbox zero (for now)
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  When renewal reminders go out, they&apos;ll show up here —
                  friendly nudges before the sticker gets nervous.
                </p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200/80 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
                {notifications.map((n) => (
                  <li key={n.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {n.title}
                        </p>
                        {n.registrationLabel ? (
                          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                            {n.registrationLabel}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {n.channel} · {n.status}
                        </p>
                      </div>
                      <time
                        className="shrink-0 text-xs text-slate-500 dark:text-slate-400"
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
