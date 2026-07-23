"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
} from "@/components/auth/AuthFormStyles";
import { ExpirationPicker } from "@/components/garage/ExpirationPicker";
import { VehicleIllustration } from "@/components/garage/VehicleIllustration";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ApiError,
  deleteVehicle,
  listActiveStates,
  updateVehicle,
} from "@/lib/api/client";
import type { VehicleDto } from "@/lib/vehicles/types";
import { titleCaseMakeModel } from "@/lib/vehicles/illustrations";
import { isValidVinFormat, normalizeVin } from "@/lib/vin/decode";

export function EditVehicleFlow({
  vehicle,
  onCancel,
  onSaved,
  onDeleted,
}: {
  vehicle: VehicleDto;
  onCancel: () => void;
  onSaved: (vehicle: VehicleDto) => void;
  onDeleted: (vehicleId: string) => void;
}) {
  const { getIdToken } = useAuth();
  const [availableStates, setAvailableStates] = useState<string[]>([
    vehicle.state,
  ]);

  const [nickname, setNickname] = useState(vehicle.nickname ?? "");
  const [plate, setPlate] = useState(vehicle.plate ?? "");
  const [state, setState] = useState(vehicle.state);
  const [vin, setVin] = useState(vehicle.vin ?? "");
  const [year, setYear] = useState(
    vehicle.year != null ? String(vehicle.year) : "",
  );
  const [make, setMake] = useState(vehicle.make ?? "");
  const [model, setModel] = useState(vehicle.model ?? "");
  const [expiresOn, setExpiresOn] = useState(vehicle.registrationExpiresOn);
  const [photoUrl, setPhotoUrl] = useState(vehicle.photoUrl ?? "");

  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadStates() {
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const states = await listActiveStates(token);
        if (!cancelled) {
          const codes = states.map((s) => s.code);
          if (!codes.includes(vehicle.state)) {
            codes.unshift(vehicle.state);
          }
          setAvailableStates(codes.length > 0 ? codes : [vehicle.state]);
        }
      } catch {
        // Keep current state as the only option.
      }
    }
    void loadStates();
    return () => {
      cancelled = true;
    };
  }, [getIdToken, vehicle.state]);

  const headline =
    [year || vehicle.year, titleCaseMakeModel(make || vehicle.make), titleCaseMakeModel(model || vehicle.model)]
      .filter(Boolean)
      .join(" ") || "Vehicle";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedVin = vin.trim();
    if (trimmedVin) {
      const normalized = normalizeVin(trimmedVin);
      if (!isValidVinFormat(normalized)) {
        setError("VIN must be a valid 17-character code.");
        return;
      }
    }

    const yearNum = year.trim() ? Number(year.trim()) : null;
    if (year.trim() && (!Number.isInteger(yearNum) || yearNum! < 1900 || yearNum! > 2100)) {
      setError("Year must be a valid 4-digit year.");
      return;
    }

    setBusy(true);
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Sign in again to save changes.");
        setBusy(false);
        return;
      }

      const updated = await updateVehicle(token, vehicle.id, {
        nickname: nickname.trim() || null,
        plate: plate.trim() || null,
        state,
        vin: trimmedVin ? normalizeVin(trimmedVin) : null,
        year: yearNum,
        make: make.trim() || null,
        model: model.trim() || null,
        registrationExpiresOn: expiresOn,
        photoUrl: photoUrl.trim() || null,
      });
      onSaved(updated);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not save changes. Please try again.",
      );
      setBusy(false);
    }
  }

  async function onDelete() {
    setError(null);
    setBusy(true);
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Sign in again to remove this vehicle.");
        setBusy(false);
        return;
      }
      await deleteVehicle(token, vehicle.id);
      onDeleted(vehicle.id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not remove this vehicle. Please try again.",
      );
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <section className="space-y-5">
      <button
        type="button"
        onClick={onCancel}
        className="text-sm font-semibold text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        ← Back to garage
      </button>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Edit vehicle
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Update nickname, plate, expiration, or details.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="relative h-36 w-full overflow-hidden">
          <VehicleIllustration
            bodyClass={vehicle.bodyClass}
            photoUrl={photoUrl.trim() || vehicle.photoUrl}
            label={nickname.trim() || headline}
          />
        </div>
        <form onSubmit={onSubmit} className="space-y-4 px-4 py-5" noValidate>
          <div>
            <label htmlFor="edit-nickname" className={labelClassName}>
              Nickname
            </label>
            <input
              id="edit-nickname"
              className={fieldClassName}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={`Mom's ${titleCaseMakeModel(model) || "ride"}`}
              disabled={busy}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-plate" className={labelClassName}>
                Plate
              </label>
              <input
                id="edit-plate"
                className={fieldClassName}
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="ABC123"
                disabled={busy}
                autoCapitalize="characters"
              />
            </div>
            <div>
              <label htmlFor="edit-state" className={labelClassName}>
                State
              </label>
              <select
                id="edit-state"
                className={fieldClassName}
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={busy}
              >
                {availableStates.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ExpirationPicker value={expiresOn} onChange={setExpiresOn} />

          <div>
            <label htmlFor="edit-vin" className={labelClassName}>
              VIN
            </label>
            <input
              id="edit-vin"
              className={fieldClassName}
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              placeholder="Optional"
              disabled={busy}
              autoCapitalize="characters"
              spellCheck={false}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="edit-year" className={labelClassName}>
                Year
              </label>
              <input
                id="edit-year"
                inputMode="numeric"
                className={fieldClassName}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2021"
                disabled={busy}
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="edit-make" className={labelClassName}>
                Make
              </label>
              <input
                id="edit-make"
                className={fieldClassName}
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="Chevrolet"
                disabled={busy}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-model" className={labelClassName}>
              Model
            </label>
            <input
              id="edit-model"
              className={fieldClassName}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Tahoe"
              disabled={busy}
            />
          </div>

          <div>
            <label htmlFor="edit-photo" className={labelClassName}>
              Photo URL
            </label>
            <input
              id="edit-photo"
              type="url"
              className={fieldClassName}
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Optional https://…"
              disabled={busy}
            />
          </div>

          {error ? (
            <p
              className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className={primaryButtonClassName}
            disabled={busy}
          >
            {busy && !confirmDelete ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-rose-200/80 bg-rose-50/60 px-4 py-4">
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="text-sm font-semibold text-rose-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:opacity-60"
          >
            Remove vehicle from garage
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-rose-900">
              Remove <strong>{nickname.trim() || headline}</strong>? This can&apos;t
              be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void onDelete()}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:opacity-60"
              >
                {busy ? "Removing…" : "Yes, remove"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
