"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { AddVehicleFlow } from "@/components/garage/AddVehicleFlow";
import { EditVehicleFlow } from "@/components/garage/EditVehicleFlow";
import { VehicleCard } from "@/components/garage/VehicleCard";
import { ApiError, listVehicles } from "@/lib/api/client";
import type { VehicleDto } from "@/lib/vehicles/types";
import { primaryButtonClassName } from "@/components/auth/AuthFormStyles";

export function GarageClient() {
  const { idToken, getIdToken, loading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<VehicleDto | null>(null);
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
            setError(null);
            setLoading(false);
          }
          return;
        }

        const rows = await listVehicles(token);
        if (!cancelled) {
          setVehicles(rows);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load your garage. Pull to refresh or try again.",
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

  if (editing) {
    return (
      <AppShell title="Garage">
        <EditVehicleFlow
          vehicle={editing}
          onCancel={() => setEditing(null)}
          onSaved={(updated) => {
            setVehicles((prev) =>
              prev
                .map((v) => (v.id === updated.id ? updated : v))
                .sort((a, b) =>
                  a.registrationExpiresOn.localeCompare(
                    b.registrationExpiresOn,
                  ),
                ),
            );
            setEditing(null);
          }}
          onDeleted={(vehicleId) => {
            setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
            setEditing(null);
          }}
        />
      </AppShell>
    );
  }

  if (adding) {
    return (
      <AppShell title="Garage">
        <AddVehicleFlow
          onCancel={() => setAdding(false)}
          onCreated={(vehicle) => {
            setVehicles((prev) =>
              [...prev, vehicle].sort((a, b) =>
                a.registrationExpiresOn.localeCompare(b.registrationExpiresOn),
              ),
            );
            setAdding(false);
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Garage"
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
        <div className="space-y-4" aria-busy aria-label="Loading vehicles">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white"
            >
              <div className="h-36 animate-pulse bg-gradient-to-br from-teal-100 via-slate-100 to-slate-200" />
              <div className="space-y-3 px-4 py-4">
                <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && error ? (
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

      {!loading && !error && vehicles.length === 0 ? (
        <section className="flex min-h-[55vh] flex-col justify-center">
          <p className="text-sm font-medium text-teal-800">Your garage</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Add your first vehicle
          </h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600">
            Drop in a VIN, confirm the year/make/model, pick the sticker date —
            done in under 30 seconds.
          </p>
          <div className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-slate-800 px-5 py-8 text-white shadow-lg shadow-teal-900/10">
            <p className="text-sm font-medium text-teal-100">Ready when you are</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              Nobody should ever forget a registration again.
            </p>
            <button
              type="button"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3.5 text-base font-semibold text-teal-900 transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={() => setAdding(true)}
            >
              Add a vehicle
            </button>
          </div>
        </section>
      ) : null}

      {!loading && !error && vehicles.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} · soonest
            expiration first
          </p>
          <ul className="space-y-4">
            {vehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <VehicleCard
                  vehicle={vehicle}
                  onEdit={(v) => setEditing(v)}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={`${primaryButtonClassName} mt-2`}
            onClick={() => setAdding(true)}
          >
            Add another vehicle
          </button>
        </div>
      ) : null}
    </AppShell>
  );
}
