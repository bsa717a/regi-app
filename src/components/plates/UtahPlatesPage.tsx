"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  UtahPersonalizedPlateFlow,
  type UtahPlateVehicleContext,
} from "@/components/plates/UtahPersonalizedPlateFlow";
import { AppShell } from "@/components/shell/AppShell";
import { ApiError, getRegistration } from "@/lib/api/client";
import { titleCaseMakeModel } from "@/lib/registrations/illustrations";

function vehicleLabel(vehicle: {
  nickname: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
}): string {
  if (vehicle.nickname?.trim()) return vehicle.nickname.trim();
  const parts = [
    vehicle.year,
    titleCaseMakeModel(vehicle.make),
    titleCaseMakeModel(vehicle.model),
  ]
    .filter(Boolean)
    .join(" ");
  return parts || "Registration";
}

export function UtahPlatesPage({
  registrationId,
}: {
  registrationId?: string;
}) {
  const { idToken, getIdToken, loading: authLoading } = useAuth();
  const [vehicle, setVehicle] = useState<UtahPlateVehicleContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const id = registrationId?.trim() ?? "";
    if (!id || authLoading) return;

    let cancelled = false;

    async function load() {
      try {
        const token = idToken ?? (await getIdToken());
        if (!token) return;
        const row = await getRegistration(token, id);
        if (cancelled) return;
        setVehicle({
          id: row.id,
          label: vehicleLabel(row),
          plate: row.plate,
          state: row.state,
          type: row.type,
          status: row.status,
          vin: row.vin,
        });
        setLoadError(null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError
              ? err.message
              : "Could not load that garage vehicle. You can still plan a plate request.",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, getIdToken, idToken, registrationId]);

  return (
    <AppShell
      title="Personalized plates"
      action={
        <Link
          href="/garage"
          data-testid="plates-back-to-garage-header"
          className="rounded-xl px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:text-teal-300 dark:hover:bg-teal-950/50"
        >
          Back to garage
        </Link>
      }
    >
      {loadError ? (
        <p
          role="status"
          className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
        >
          {loadError}
        </p>
      ) : null}
      <UtahPersonalizedPlateFlow vehicle={vehicle} />
    </AppShell>
  );
}
