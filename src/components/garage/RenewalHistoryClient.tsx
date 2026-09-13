"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { RenewalHistoryList } from "@/components/renewals/RenewalHistoryList";
import { AppShell } from "@/components/shell/AppShell";
import { ApiError, getRegistration, listRenewals } from "@/lib/api/client";
import { renewalVehicleLabel } from "@/lib/renewals/labels";
import type { RenewalDto } from "@/lib/renewals/types";
import type { RegistrationDto } from "@/lib/registrations/types";

export function RenewalHistoryClient({
  registrationId,
}: {
  registrationId: string;
}) {
  const { idToken, getIdToken, loading: authLoading } = useAuth();
  const [vehicle, setVehicle] = useState<RegistrationDto | null>(null);
  const [renewals, setRenewals] = useState<RenewalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function run() {
      try {
        const token = idToken ?? (await getIdToken());
        if (!token) {
          if (!cancelled) {
            setVehicle(null);
            setRenewals([]);
            setLoading(false);
          }
          return;
        }

        const [registration, rows] = await Promise.all([
          getRegistration(token, registrationId),
          listRenewals(token, registrationId),
        ]);
        if (!cancelled) {
          setVehicle(registration);
          setRenewals(rows);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load renewal history.",
          );
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, idToken, getIdToken, registrationId, reloadKey]);

  const title = vehicle
    ? `History · ${renewalVehicleLabel(vehicle)}`
    : "Renewal history";

  return (
    <AppShell title={title}>
      <div className="space-y-5">
        <Link
          href="/garage"
          className="inline-flex text-sm font-medium text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:text-teal-300"
        >
          ← Back to garage
        </Link>

        <div>
          <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
            Concierge history
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {vehicle ? renewalVehicleLabel(vehicle) : "Renewal history"}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-slate-600 dark:text-slate-400">
            Past and in-progress renewals for this registration. After a
            sticker is mailed, open the confirmation for dates, fee estimate,
            and a downloadable proof — not a card-payment receipt.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy aria-label="Loading renewal history">
            <div className="h-24 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-24 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-5">
            <p className="font-medium text-rose-900">{error}</p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-rose-800 underline-offset-4 hover:underline"
              onClick={() => {
                setLoading(true);
                setReloadKey((k) => k + 1);
              }}
            >
              Try again
            </button>
          </div>
        ) : null}

        {!loading && !error ? <RenewalHistoryList renewals={renewals} /> : null}
      </div>
    </AppShell>
  );
}
