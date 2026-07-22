"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { primaryButtonClassName } from "@/components/auth/AuthFormStyles";
import { AppShell } from "@/components/shell/AppShell";
import { ApiError, createRenewal, getVehicle } from "@/lib/api/client";
import type { VehicleDto } from "@/lib/vehicles/types";
import { titleCaseMakeModel } from "@/lib/vehicles/illustrations";

function vehicleLabel(vehicle: VehicleDto): string {
  if (vehicle.nickname?.trim()) return vehicle.nickname.trim();
  const parts = [
    vehicle.year,
    titleCaseMakeModel(vehicle.make),
    titleCaseMakeModel(vehicle.model),
  ]
    .filter(Boolean)
    .join(" ");
  return parts || "Vehicle";
}

export function StartRenewalClient({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const { idToken, getIdToken, loading: authLoading } = useAuth();
  const [vehicle, setVehicle] = useState<VehicleDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function run() {
      setBusy(true);
      setError(null);
      try {
        const token = idToken ?? (await getIdToken());
        if (!token) {
          throw new ApiError("Sign in to start a renewal.", 401);
        }
        const row = await getVehicle(token, vehicleId);
        if (cancelled) return;
        setVehicle(row);

        if (!row.canEdit) {
          throw new ApiError(
            "Viewers can see shared vehicles but cannot start renewals. Ask the household owner.",
            403,
          );
        }

        const { renewal } = await createRenewal(token, { vehicleId });
        if (cancelled) return;
        router.replace(`/renewals/${renewal.id}`);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not start renewal. Please try again.",
          );
          setBusy(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, idToken, getIdToken, vehicleId, router, attempt]);

  return (
    <AppShell title="Renew Registration">
      {busy ? (
        <div className="space-y-4" aria-busy aria-label="Starting renewal">
          <div className="h-24 animate-pulse rounded-3xl bg-gradient-to-br from-teal-100 via-slate-100 to-slate-200" />
          <p className="text-sm text-slate-600">
            {vehicle
              ? `Starting concierge for ${vehicleLabel(vehicle)}…`
              : "Loading vehicle…"}
          </p>
        </div>
      ) : null}

      {!busy && error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-5">
          <p className="font-medium text-rose-900">{error}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className={primaryButtonClassName}
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </button>
            <Link
              href="/garage"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base font-semibold text-slate-900"
            >
              Back to garage
            </Link>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
