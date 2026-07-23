"use client";

import { useState, type FormEvent } from "react";
import {
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
  selectClassName,
} from "@/components/auth/AuthFormStyles";
import { ExpirationPicker } from "@/components/garage/ExpirationPicker";
import { RegistrationPhotoPicker } from "@/components/garage/RegistrationPhotoPicker";
import { VehicleIllustration } from "@/components/garage/VehicleIllustration";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePhotoPreviewUrl } from "@/lib/images/usePhotoPreviewUrl";
import {
  ApiError,
  deleteRegistration,
  updateRegistration,
} from "@/lib/api/client";
import type {
  RegistrationDetails,
  RegistrationDto,
} from "@/lib/registrations/types";
import {
  removeRegistrationPhoto,
  uploadRegistrationPhoto,
} from "@/lib/registrations/photoUpload";
import { REGISTRATION_TYPE_LABELS } from "@/lib/registrations/illustrations";
import {
  MOTORHOME_CLASSES,
  MOTORHOME_CLASS_LABELS,
  isValidMotorhomeClass,
} from "@/lib/registrations/motorhome";
import { isValidVinFormat, normalizeVin } from "@/lib/vin/decode";

export function EditRegistrationFlow({
  registration,
  onCancel,
  onSaved,
  onDeleted,
}: {
  registration: RegistrationDto;
  onCancel: () => void;
  onSaved: (vehicle: RegistrationDto) => void;
  onDeleted?: (registrationId: string) => void;
}) {
  const { getIdToken } = useAuth();

  const [vin, setVin] = useState(registration.vin ?? "");
  const [plate, setPlate] = useState(registration.plate ?? "");
  const [year, setYear] = useState(
    registration.year ? String(registration.year) : "",
  );
  const [make, setMake] = useState(registration.make ?? "");
  const [model, setModel] = useState(registration.model ?? "");
  const [nickname, setNickname] = useState(registration.nickname ?? "");
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [clearPhoto, setClearPhoto] = useState(false);
  const [expiresOn, setExpiresOn] = useState(registration.registrationExpiresOn);
  const [hin, setHin] = useState(registration.details.hin ?? "");
  const [serial, setSerial] = useState(registration.details.serial ?? "");
  const [ohvClass, setOhvClass] = useState(registration.details.ohvClass ?? "");
  const [motorhomeClass, setMotorhomeClass] = useState(
    registration.details.motorhomeClass ?? "",
  );
  const [unladenWeightLbs, setUnladenWeightLbs] = useState(
    registration.details.unladenWeightLbs != null
      ? String(registration.details.unladenWeightLbs)
      : "",
  );
  const [lengthFeet, setLengthFeet] = useState(
    registration.details.lengthFeet != null
      ? String(registration.details.lengthFeet)
      : "",
  );
  const [horsepower, setHorsepower] = useState(
    registration.details.horsepower != null
      ? String(registration.details.horsepower)
      : "",
  );

  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePhotoChange(file: File | null) {
    if (file) {
      setPendingPhotoFile(file);
      setClearPhoto(false);
      return;
    }
    setPendingPhotoFile(null);
    setClearPhoto(true);
  }

  const previewPhotoUrl = usePhotoPreviewUrl({
    pendingFile: pendingPhotoFile,
    currentPhotoUrl: registration.photoUrl,
    cleared: clearPhoto,
  });
  const typeLabel = REGISTRATION_TYPE_LABELS[registration.type];
  const showVin =
    registration.type === "passenger" ||
    registration.type === "motorhome" ||
    registration.type === "motorcycle" ||
    registration.type === "trailer" ||
    registration.type === "ohv" ||
    registration.type === "snowmobile";
  const showHin = registration.type === "boat";
  const showSerial = registration.type === "ohv" || registration.type === "snowmobile";
  const showOhvClass = registration.type === "ohv";
  const showMotorhomeClass = registration.type === "motorhome";
  const showUnladenWeight = registration.type === "trailer";
  const showBoatDetails = registration.type === "boat";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    let normalizedVin: string | null = null;
    if (vin.trim()) {
      normalizedVin = normalizeVin(vin);
      if (!isValidVinFormat(normalizedVin)) {
        setError("VIN must be 17 characters (letters and numbers, no I/O/Q).");
        return;
      }
    }

    const y = year.trim() ? Number.parseInt(year, 10) : null;
    if (year.trim() && (!Number.isFinite(y) || y! < 1900 || y! > 2100)) {
      setError("Enter a valid year.");
      return;
    }

    setBusy(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Please sign in again.");

      const details: RegistrationDetails = {};
      if (showHin) details.hin = hin.trim() || null;
      if (showSerial) details.serial = serial.trim() || null;
      if (showOhvClass) details.ohvClass = ohvClass.trim() || null;
      if (showMotorhomeClass) {
        if (!isValidMotorhomeClass(motorhomeClass)) {
          setError("Select a motorhome class (A, B, or C).");
          setBusy(false);
          return;
        }
        details.motorhomeClass = motorhomeClass;
      }
      if (showUnladenWeight) {
        details.unladenWeightLbs = unladenWeightLbs.trim()
          ? Number.parseInt(unladenWeightLbs, 10)
          : null;
      }
      if (showBoatDetails) {
        details.lengthFeet = lengthFeet.trim()
          ? Number.parseFloat(lengthFeet)
          : null;
        details.horsepower = horsepower.trim()
          ? Number.parseInt(horsepower, 10)
          : null;
      }

      let updated = await updateRegistration(token, registration.id, {
        vin: normalizedVin,
        plate: plate.trim() ? plate.trim().toUpperCase() : null,
        year: y,
        make: make.trim() || null,
        model: model.trim() || null,
        nickname: nickname.trim() || null,
        registrationExpiresOn: expiresOn,
        details,
      });

      if (clearPhoto && registration.photoUrl && !pendingPhotoFile) {
        try {
          updated = await removeRegistrationPhoto({
            token,
            registrationId: registration.id,
          });
        } catch (err) {
          if (err instanceof ApiError && err.status === 400) {
            updated = await updateRegistration(token, registration.id, {
              photoUrl: null,
            });
          } else {
            throw err;
          }
        }
      }

      if (pendingPhotoFile) {
        updated = await uploadRegistrationPhoto({
          token,
          registrationId: registration.id,
          file: pendingPhotoFile,
        });
      }

      onSaved(updated);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not save changes. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!onDeleted) return;
    setError(null);
    setBusy(true);
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Sign in again to remove this registration.");
        setBusy(false);
        return;
      }
      await deleteRegistration(token, registration.id);
      onDeleted(registration.id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not remove this registration. Please try again.",
      );
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  const deleteLabel =
    nickname.trim() ||
    [year, make, model].filter(Boolean).join(" ") ||
    typeLabel;

  return (
    <section className="mx-auto max-w-lg space-y-5">
      <button
        type="button"
        onClick={onCancel}
        className="text-sm font-medium text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        ← Back to garage
      </button>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Edit registration
        </h2>
        <p className="mt-1 text-base text-slate-600">
          Update the details below. The registration type can&apos;t be changed.
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="h-24">
          <VehicleIllustration
            bodyClass={registration.bodyClass}
            photoUrl={previewPhotoUrl}
            label={registration.nickname || typeLabel}
            registrationType={registration.type}
          />
        </div>
        <div className="px-4 py-3">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-200/80">
            {typeLabel}
          </span>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {showVin ? (
          <div>
            <label htmlFor="edit-vin" className={labelClassName}>
              VIN <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="edit-vin"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={17}
              className={`${fieldClassName} font-mono tracking-wide uppercase`}
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
            />
          </div>
        ) : null}

        <div>
          <label htmlFor="edit-plate" className={labelClassName}>
            {registration.type === "boat"
              ? "Registration number"
              : registration.type === "ohv" || registration.type === "snowmobile"
                ? "Decal number"
                : "License plate"}{" "}
            <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="edit-plate"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className={`${fieldClassName} uppercase`}
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
          />
        </div>

        {showHin ? (
          <div>
            <label htmlFor="edit-hin" className={labelClassName}>
              Hull Identification Number (HIN)
            </label>
            <input
              id="edit-hin"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className={`${fieldClassName} font-mono uppercase`}
              value={hin}
              onChange={(e) => setHin(e.target.value.toUpperCase())}
            />
          </div>
        ) : null}

        {showSerial ? (
          <div>
            <label htmlFor="edit-serial" className={labelClassName}>
              Serial number{" "}
              <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="edit-serial"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className={`${fieldClassName} font-mono uppercase`}
              value={serial}
              onChange={(e) => setSerial(e.target.value.toUpperCase())}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label htmlFor="edit-year" className={labelClassName}>
              Year
            </label>
            <input
              id="edit-year"
              inputMode="numeric"
              className={fieldClassName}
              value={year}
              onChange={(e) => setYear(e.target.value)}
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
          />
        </div>

        <ExpirationPicker value={expiresOn} onChange={setExpiresOn} />

        {showUnladenWeight ? (
          <div>
            <label htmlFor="edit-unladenWeightLbs" className={labelClassName}>
              Unladen weight (lbs){" "}
              <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="edit-unladenWeightLbs"
              inputMode="numeric"
              className={fieldClassName}
              value={unladenWeightLbs}
              onChange={(e) => setUnladenWeightLbs(e.target.value)}
            />
          </div>
        ) : null}

        {showBoatDetails ? (
          <>
            <div>
              <label htmlFor="edit-lengthFeet" className={labelClassName}>
                Length (feet){" "}
                <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="edit-lengthFeet"
                inputMode="decimal"
                className={fieldClassName}
                value={lengthFeet}
                onChange={(e) => setLengthFeet(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="edit-horsepower" className={labelClassName}>
                Horsepower{" "}
                <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="edit-horsepower"
                inputMode="numeric"
                className={fieldClassName}
                value={horsepower}
                onChange={(e) => setHorsepower(e.target.value)}
              />
            </div>
          </>
        ) : null}

        {showOhvClass ? (
          <div>
            <label htmlFor="edit-ohvClass" className={labelClassName}>
              OHV class{" "}
              <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="edit-ohvClass"
              className={fieldClassName}
              value={ohvClass}
              onChange={(e) => setOhvClass(e.target.value)}
            />
          </div>
        ) : null}

        {showMotorhomeClass ? (
          <div>
            <label htmlFor="edit-motorhomeClass" className={labelClassName}>
              Motorhome class
            </label>
            <select
              id="edit-motorhomeClass"
              required
              className={selectClassName}
              value={motorhomeClass}
              onChange={(e) => setMotorhomeClass(e.target.value)}
            >
              <option value="">Select class…</option>
              {MOTORHOME_CLASSES.map((motorhomeClassOption) => (
                <option key={motorhomeClassOption} value={motorhomeClassOption}>
                  {MOTORHOME_CLASS_LABELS[motorhomeClassOption]}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="edit-nickname" className={labelClassName}>
            Nickname <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="edit-nickname"
            className={fieldClassName}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <RegistrationPhotoPicker
          currentPhotoUrl={previewPhotoUrl}
          pendingFile={pendingPhotoFile}
          onPendingFileChange={handlePhotoChange}
          disabled={busy}
        />

        <button type="submit" className={primaryButtonClassName} disabled={busy}>
          {busy && !confirmDelete ? "Saving…" : "Save changes"}
        </button>
      </form>

      {onDeleted ? (
        <div className="rounded-3xl border border-rose-200/80 bg-rose-50/60 px-4 py-4">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              className="text-sm font-semibold text-rose-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:opacity-60"
            >
              Remove registration from garage
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-rose-900">
                Remove <strong>{deleteLabel}</strong>? This can&apos;t be undone.
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
      ) : null}
    </section>
  );
}
