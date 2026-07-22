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
  createVehicle,
  decodeVinApi,
  joinWaitlist,
  listActiveStates,
} from "@/lib/api/client";
import type { VehicleDto } from "@/lib/vehicles/types";
import { titleCaseMakeModel } from "@/lib/vehicles/illustrations";
import { US_STATES, stateName } from "@/lib/vehicles/states";
import { isValidVinFormat, normalizeVin } from "@/lib/vin/decode";

type Mode = "vin" | "plate";
type Step = "identity" | "confirm" | "manual" | "details" | "waitlist";

type DecodedVehicle = {
  vin: string | null;
  plate: string | null;
  state: string;
  year: number | null;
  make: string | null;
  model: string | null;
  bodyClass: string | null;
};

function defaultExpiration(): string {
  const d = new Date();
  const year = d.getFullYear() + 1;
  const month = d.getMonth() + 1;
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nicknamePlaceholder(vehicle: DecodedVehicle): string {
  const model = titleCaseMakeModel(vehicle.model) || "ride";
  return `Mom's ${model}`;
}

export function AddVehicleFlow({
  onCancel,
  onCreated,
  cancelLabel = "← Back to garage",
}: {
  /** When omitted, the back control is hidden (e.g. empty-garage dashboard). */
  onCancel?: () => void;
  onCreated: (vehicle: VehicleDto) => void;
  cancelLabel?: string;
}) {
  const { getIdToken, profile, idToken } = useAuth();
  const [mode, setMode] = useState<Mode>("vin");
  const [step, setStep] = useState<Step>("identity");
  const [availableStates, setAvailableStates] = useState<string[]>(["UT"]);

  const [vin, setVin] = useState("");
  const [plate, setPlate] = useState("");
  const [state, setState] = useState("UT");
  const [waitlistEmail, setWaitlistEmail] = useState(profile?.email ?? "");

  const [draft, setDraft] = useState<DecodedVehicle | null>(null);
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  const [expiresOn, setExpiresOn] = useState(defaultExpiration);
  const [nickname, setNickname] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function tokenOrThrow(): Promise<string> {
    const token = await getIdToken();
    if (!token) throw new Error("Please sign in again.");
    return token;
  }

  const stateIsAvailable = (code: string) =>
    availableStates.includes(code.toUpperCase());

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const token = idToken ?? (await getIdToken());
        if (!token || cancelled) return;
        const states = await listActiveStates(token);
        if (cancelled) return;
        const codes = states.map((s) => s.code.toUpperCase());
        if (codes.length > 0) {
          setAvailableStates(codes);
        }
      } catch {
        // Keep UT fallback; create still validates against state_rules server-side.
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [idToken, getIdToken]);

  async function onIdentitySubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!stateIsAvailable(state)) {
      setStep("waitlist");
      return;
    }

    if (mode === "vin") {
      const normalized = normalizeVin(vin);
      if (!isValidVinFormat(normalized)) {
        setError("Enter a 17-character VIN (no I, O, or Q).");
        return;
      }

      setBusy(true);
      try {
        const token = await tokenOrThrow();
        const decoded = await decodeVinApi(token, normalized);
        if (decoded.ok) {
          setDraft({
            vin: decoded.vin,
            plate: null,
            state,
            year: decoded.year,
            make: decoded.make,
            model: decoded.model,
            bodyClass: decoded.bodyClass,
          });
          setStep("confirm");
        } else {
          setInfo(decoded.error);
          setDraft({
            vin: normalized,
            plate: null,
            state,
            year: null,
            make: null,
            model: null,
            bodyClass: null,
          });
          setStep("manual");
        }
      } catch (err) {
        setInfo(
          err instanceof ApiError
            ? err.message
            : "VIN lookup failed. Enter details manually.",
        );
        setDraft({
          vin: normalized,
          plate: null,
          state,
          year: null,
          make: null,
          model: null,
          bodyClass: null,
        });
        setStep("manual");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!plate.trim()) {
      setError("Enter a license plate.");
      return;
    }

    setDraft({
      vin: null,
      plate: plate.trim().toUpperCase(),
      state,
      year: null,
      make: null,
      model: null,
      bodyClass: null,
    });
    setStep("manual");
  }

  function confirmDecoded() {
    if (!draft) return;
    setStep("details");
  }

  function onManualContinue(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const y = Number.parseInt(year, 10);
    if (!year || !Number.isFinite(y) || y < 1900 || y > 2100) {
      setError("Enter a valid year.");
      return;
    }
    if (!make.trim() || !model.trim()) {
      setError("Enter make and model.");
      return;
    }
    if (!draft) return;
    setDraft({
      ...draft,
      year: y,
      make: make.trim(),
      model: model.trim(),
    });
    setStep("details");
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setError(null);
    setBusy(true);
    try {
      const token = await tokenOrThrow();
      const vehicle = await createVehicle(token, {
        vin: draft.vin,
        plate: draft.plate,
        state: draft.state,
        year: draft.year,
        make: draft.make,
        model: draft.model,
        bodyClass: draft.bodyClass,
        nickname: nickname.trim() || null,
        photoUrl: photoUrl.trim() || null,
        registrationExpiresOn: expiresOn,
      });
      onCreated(vehicle);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not add vehicle. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onWaitlist(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const token = await tokenOrThrow();
      await joinWaitlist(token, {
        email: waitlistEmail.trim() || undefined,
        state,
      });
      setInfo(`You're on the ${stateName(state)} waitlist. We'll nudge you.`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not join waitlist. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const confirmLabel = draft
    ? [
        draft.year,
        titleCaseMakeModel(draft.make),
        titleCaseMakeModel(draft.model),
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <section className="mx-auto max-w-lg">
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          {cancelLabel}
        </button>
      ) : null}

      <h2
        className={`${onCancel ? "mt-4" : ""} text-2xl font-semibold tracking-tight text-slate-900`}
      >
        Add a vehicle
      </h2>
      <p className="mt-1 text-base text-slate-600">
        Under 30 seconds. VIN first — we fill in the rest.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}
      {info ? (
        <p
          role="status"
          className="mt-4 rounded-2xl bg-amber-50 px-3.5 py-3 text-sm text-amber-950"
        >
          {info}
        </p>
      ) : null}

      {step === "identity" ? (
        <form onSubmit={onIdentitySubmit} className="mt-6 space-y-4">
          <div className="flex rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                mode === "vin"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
              onClick={() => setMode("vin")}
            >
              VIN
            </button>
            <button
              type="button"
              className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                mode === "plate"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
              onClick={() => setMode("plate")}
            >
              Use plate instead
            </button>
          </div>

          {mode === "vin" ? (
            <div>
              <label htmlFor="vin" className={labelClassName}>
                VIN
              </label>
              <input
                id="vin"
                name="vin"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={17}
                placeholder="17 characters on your dash or door"
                className={`${fieldClassName} font-mono tracking-wide uppercase`}
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                required
              />
            </div>
          ) : (
            <div>
              <label htmlFor="plate" className={labelClassName}>
                License plate
              </label>
              <input
                id="plate"
                name="plate"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="ABC123"
                className={`${fieldClassName} uppercase`}
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="state" className={labelClassName}>
              State
            </label>
            <select
              id="state"
              name="state"
              className={fieldClassName}
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                  {!stateIsAvailable(s.code) ? " — Coming soon" : ""}
                </option>
              ))}
            </select>
            {!stateIsAvailable(state) ? (
              <p className="mt-2 text-sm text-slate-500">
                Coming soon — join the waitlist after you continue.
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            className={primaryButtonClassName}
            disabled={busy}
          >
            {busy
              ? "Looking up…"
              : stateIsAvailable(state)
                ? "Continue"
                : "Join waitlist"}
          </button>
        </form>
      ) : null}

      {step === "waitlist" ? (
        <form onSubmit={onWaitlist} className="mt-6 space-y-4">
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
            {stateName(state)} isn&apos;t live yet. Drop your email and we&apos;ll
            invite you when REGI expands.
          </p>
          <div>
            <label htmlFor="waitlist-email" className={labelClassName}>
              Email
            </label>
            <input
              id="waitlist-email"
              type="email"
              className={fieldClassName}
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className={primaryButtonClassName}
            disabled={busy}
          >
            {busy ? "Saving…" : "Join the waitlist"}
          </button>
          <button
            type="button"
            className="w-full text-sm font-medium text-slate-600"
            onClick={() => {
              setState(availableStates[0] ?? "UT");
              setStep("identity");
              setInfo(null);
            }}
          >
            Back — use an available state
          </button>
        </form>
      ) : null}

      {step === "confirm" && draft ? (
        <div className="mt-6 space-y-4">
          <div className="overflow-hidden rounded-3xl border border-teal-200 bg-white shadow-sm">
            <div className="h-28">
              <VehicleIllustration
                bodyClass={draft.bodyClass}
                label={confirmLabel}
              />
            </div>
            <div className="px-4 py-5">
              <p className="text-sm font-medium text-teal-800">Looks right?</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                {confirmLabel} — is this your vehicle? ✓
              </p>
              {draft.vin ? (
                <p className="mt-2 font-mono text-xs tracking-wide text-slate-500">
                  VIN {draft.vin}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className={primaryButtonClassName}
            onClick={confirmDecoded}
          >
            Yes, that&apos;s mine
          </button>
          <button
            type="button"
            className="w-full text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
            onClick={() => {
              setYear(draft.year ? String(draft.year) : "");
              setMake(draft.make ?? "");
              setModel(draft.model ?? "");
              setStep("manual");
            }}
          >
            Edit details manually
          </button>
        </div>
      ) : null}

      {step === "manual" && draft ? (
        <form onSubmit={onManualContinue} className="mt-6 space-y-4">
          <p className="text-sm text-slate-600">
            Quick manual entry — year, make, and model.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label htmlFor="year" className={labelClassName}>
                Year
              </label>
              <input
                id="year"
                inputMode="numeric"
                className={fieldClassName}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2021"
                required
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="make" className={labelClassName}>
                Make
              </label>
              <input
                id="make"
                className={fieldClassName}
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="Chevrolet"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="model" className={labelClassName}>
              Model
            </label>
            <input
              id="model"
              className={fieldClassName}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Tahoe"
              required
            />
          </div>
          <button type="submit" className={primaryButtonClassName}>
            Continue
          </button>
        </form>
      ) : null}

      {step === "details" && draft ? (
        <form onSubmit={onSave} className="mt-6 space-y-5">
          <div className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900">
            {[
              draft.year,
              titleCaseMakeModel(draft.make),
              titleCaseMakeModel(draft.model),
            ]
              .filter(Boolean)
              .join(" ")}
          </div>

          <ExpirationPicker value={expiresOn} onChange={setExpiresOn} />

          <div>
            <label htmlFor="nickname" className={labelClassName}>
              Nickname <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="nickname"
              className={fieldClassName}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={nicknamePlaceholder(draft)}
            />
          </div>

          <div>
            <label htmlFor="photoUrl" className={labelClassName}>
              Photo URL{" "}
              <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="photoUrl"
              type="url"
              className={fieldClassName}
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://… or leave blank for an illustration"
            />
          </div>

          <button
            type="submit"
            className={primaryButtonClassName}
            disabled={busy}
          >
            {busy ? "Adding…" : "Add to garage"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
