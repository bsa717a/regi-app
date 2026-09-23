"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { headerActionClassName, SectionLabel } from "@/components/brand/ui";
import { GarageComplianceBanner } from "@/components/brand/GarageComplianceBanner";
import { useAuth } from "@/components/auth/AuthProvider";
import { AddRegistrationFlow } from "@/components/garage/AddRegistrationFlow";
import { EditRegistrationFlow } from "@/components/garage/EditRegistrationFlow";
import { GarageEmptyState } from "@/components/garage/GarageEmptyState";
import { VehicleCard } from "@/components/garage/VehicleCard";
import { ApiError, listRegistrations } from "@/lib/api/client";
import {
  garageComplianceBanner,
  registrationCountLabel,
} from "@/lib/registrations/brandCopy";
import type { RegistrationDto } from "@/lib/registrations/types";

type ViewState = "list" | "adding" | "editing";

export function GarageClient() {
  const { idToken, getIdToken, loading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState<RegistrationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>("list");
  const [editingRegistration, setEditingRegistration] =
    useState<RegistrationDto | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [addEntry, setAddEntry] = useState<"default" | "vin">("default");
  const [scanFile, setScanFile] = useState<File | null>(null);

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

        const rows = await listRegistrations(token);
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

  function startEditing(vehicle: RegistrationDto) {
    setEditingRegistration(vehicle);
    setView("editing");
  }

  function openAdd(entry: "default" | "vin", file: File | null = null) {
    setAddEntry(entry);
    setScanFile(file);
    setView("adding");
  }

  if (view === "adding") {
    return (
      <AppShell title="Garage">
        <AddRegistrationFlow
          onCancel={() => {
            setScanFile(null);
            setAddEntry("default");
            setView("list");
          }}
          focusVin={addEntry === "vin"}
          initialScanFile={scanFile}
          onCreated={(vehicle, options) => {
            setVehicles((prev) =>
              [...prev, vehicle].sort((a, b) =>
                a.registrationExpiresOn.localeCompare(b.registrationExpiresOn),
              ),
            );
            setNotice(options?.warning ?? null);
            setView("list");
          }}
        />
      </AppShell>
    );
  }

  if (view === "editing" && editingRegistration) {
    return (
      <AppShell title="Garage">
        <EditRegistrationFlow
          registration={editingRegistration}
          onCancel={() => {
            setEditingRegistration(null);
            setView("list");
          }}
          onSaved={(vehicle) => {
            setVehicles((prev) =>
              prev
                .map((v) => (v.id === vehicle.id ? vehicle : v))
                .sort((a, b) =>
                  a.registrationExpiresOn.localeCompare(
                    b.registrationExpiresOn,
                  ),
                ),
            );
            setEditingRegistration(null);
            setView("list");
          }}
          onDeleted={(registrationId) => {
            setVehicles((prev) => prev.filter((v) => v.id !== registrationId));
            setEditingRegistration(null);
            setView("list");
          }}
        />
      </AppShell>
    );
  }

  const needsAttention = vehicles.filter(
    (v) => v.status === "Due Soon" || v.status === "Expired",
  ).length;

  return (
    <AppShell
      title="Garage"
      action={
        vehicles.length > 0 ? (
          <button
            type="button"
            onClick={() => setView("adding")}
            className={headerActionClassName}
            data-testid="add-vehicle-button"
          >
            Add
          </button>
        ) : undefined
      }
    >
      {loading ? (
        <div className="space-y-4" aria-busy aria-label="Loading registrations">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[10px] border border-regi-line bg-regi-surface"
            >
              <div className="h-40 animate-pulse bg-regi-raised" />
              <div className="space-y-3 px-4 py-4">
                <div className="h-5 w-1/2 animate-pulse rounded bg-regi-raised" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-regi-raised" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && notice ? (
        <div
          role="status"
          className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p>{notice}</p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-amber-900 underline-offset-4 hover:underline"
            onClick={() => setNotice(null)}
          >
            Dismiss
          </button>
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
        <GarageEmptyState
          onScanCard={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.capture = "environment";
            input.onchange = () => {
              const file = input.files?.[0];
              if (file) openAdd("default", file);
            };
            input.click();
          }}
          onEnterVin={() => openAdd("vin")}
        />
      ) : null}

      {!loading && !error && vehicles.length > 0 ? (
        <div className="space-y-3">
          {(() => {
            const banner = garageComplianceBanner(vehicles);
            return banner ? <GarageComplianceBanner banner={banner} /> : null;
          })()}
          <SectionLabel>{registrationCountLabel(vehicles.length)}</SectionLabel>
          {needsAttention > 0 ? (
            <p className="text-sm text-regi-muted">
              {needsAttention} need{needsAttention === 1 ? "s" : ""} a renewal.
            </p>
          ) : null}
          <ul className="space-y-3" data-testid="vehicle-list">
            {vehicles.map((vehicle) => (
              <li key={vehicle.id} data-testid={`vehicle-item-${vehicle.id}`}>
                <VehicleCard
                  vehicle={vehicle}
                  expanded={expandedId === vehicle.id}
                  onToggle={() =>
                    setExpandedId((current) =>
                      current === vehicle.id ? null : vehicle.id,
                    )
                  }
                  onEdit={startEditing}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="sr-only"
            onClick={() => openAdd("default")}
            data-testid="add-another-registration-button"
          >
            Add another registration
          </button>
        </div>
      ) : null}
    </AppShell>
  );
}
