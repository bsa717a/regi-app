"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { RegistrationType } from "@prisma/client";
import {
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
  selectClassName,
} from "@/components/auth/AuthFormStyles";
import { ExpirationPicker } from "@/components/garage/ExpirationPicker";
import { RegistrationPhotoPicker } from "@/components/garage/RegistrationPhotoPicker";
import { VehicleIllustration } from "@/components/garage/VehicleIllustration";
import { YearMakeModelPickers } from "@/components/garage/YearMakeModelPickers";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ApiError,
  createRegistration,
  decodeVinApi,
  joinWaitlist,
  listActiveStates,
  scanRegistration,
  type ActiveStateDto,
  type ActiveStateRegistrationTypeDto,
  type RegistrationScanDto,
} from "@/lib/api/client";
import type {
  RegistrationDetails,
  RegistrationDto,
} from "@/lib/registrations/types";
import {
  REGISTRATION_TYPE_LABELS,
  titleCaseMakeModel,
} from "@/lib/registrations/illustrations";
import { US_STATES, stateName } from "@/lib/registrations/states";
import { isValidVinFormat, normalizeVin } from "@/lib/vin/decode";
import { prepareScanImage } from "@/lib/images/compress";
import { usePhotoPreviewUrl } from "@/lib/images/usePhotoPreviewUrl";
import { uploadDocumentToVault } from "@/lib/documents/clientUpload";
import { uploadRegistrationPhoto } from "@/lib/registrations/photoUpload";

type Mode = "vin" | "plate";
type Step = "pickType" | "identity" | "confirm" | "manual" | "details" | "waitlist";

type RegistrationDraft = {
  vin: string | null;
  plate: string | null;
  hin: string | null;
  serial: string | null;
  state: string;
  year: number | null;
  make: string | null;
  model: string | null;
  bodyClass: string | null;
};

/** Utah DMV defaults — used until `/api/states` resolves; server config is authoritative. */
const FALLBACK_TYPE_RULES: Record<
  RegistrationType,
  Pick<ActiveStateRegistrationTypeDto, "decode" | "identityFields">
> = {
  passenger: { decode: "nhtsa_vin", identityFields: ["vin", "plate", "yearMakeModel"] },
  motorcycle: { decode: "nhtsa_vin", identityFields: ["vin", "plate", "yearMakeModel"] },
  trailer: { decode: "none", identityFields: ["vin", "plate", "yearMakeModel"] },
  ohv: { decode: "none", identityFields: ["vin", "plate", "serial", "yearMakeModel"] },
  snowmobile: { decode: "none", identityFields: ["vin", "plate", "serial", "yearMakeModel"] },
  boat: { decode: "none", identityFields: ["hin", "plate", "yearMakeModel"] },
};

const TYPE_ORDER: RegistrationType[] = [
  "passenger",
  "motorcycle",
  "trailer",
  "ohv",
  "snowmobile",
  "boat",
];

function defaultExpiration(): string {
  const d = new Date();
  const year = d.getFullYear() + 1;
  const month = d.getMonth() + 1;
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nicknamePlaceholder(vehicle: RegistrationDraft): string {
  const model = titleCaseMakeModel(vehicle.model) || "ride";
  return `Mom's ${model}`;
}

function plateFieldLabel(type: RegistrationType): string {
  switch (type) {
    case "boat":
      return "Registration number";
    case "ohv":
    case "snowmobile":
      return "Decal number";
    default:
      return "License plate";
  }
}

function identityHelperText(type: RegistrationType): string {
  switch (type) {
    case "boat":
      return "Enter the HIN (hull ID) or registration number from your title.";
    case "ohv":
      return "Enter the decal number or serial number from your OHV.";
    case "snowmobile":
      return "Enter the decal number or serial number from your snowmobile.";
    case "trailer":
      return "Enter the license plate, if it has one — otherwise we'll use year, make, and model.";
    default:
      return "";
  }
}

export function AddRegistrationFlow({
  onCancel,
  onCreated,
  cancelLabel = "← Back to garage",
  registrationType: initialType,
}: {
  /** When omitted, the back control is hidden (e.g. empty-garage dashboard). */
  onCancel?: () => void;
  onCreated: (vehicle: RegistrationDto, options?: { warning?: string }) => void;
  cancelLabel?: string;
  /** Pre-select a type and skip the picker. */
  registrationType?: RegistrationType;
}) {
  const { getIdToken, profile, idToken } = useAuth();
  const [registrationType, setRegistrationType] = useState<RegistrationType | null>(
    initialType ?? null,
  );
  const [mode, setMode] = useState<Mode>("vin");
  const [step, setStep] = useState<Step>(initialType ? "identity" : "pickType");
  const [availableStates, setAvailableStates] = useState<string[]>(["UT"]);
  const [stateRules, setStateRules] = useState<Map<string, ActiveStateDto>>(
    new Map(),
  );

  const [vin, setVin] = useState("");
  const [plate, setPlate] = useState("");
  const [hin, setHin] = useState("");
  const [serial, setSerial] = useState("");
  const [state, setState] = useState("UT");
  const [waitlistEmail, setWaitlistEmail] = useState(profile?.email ?? "");

  const [draft, setDraft] = useState<RegistrationDraft | null>(null);
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  const [expiresOn, setExpiresOn] = useState(defaultExpiration);
  const [nickname, setNickname] = useState("");
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [unladenWeightLbs, setUnladenWeightLbs] = useState("");
  const [lengthFeet, setLengthFeet] = useState("");
  const [horsepower, setHorsepower] = useState("");
  const [ohvClass, setOhvClass] = useState("");

  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [scanPrefill, setScanPrefill] = useState<RegistrationScanDto | null>(
    null,
  );
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanGenerationRef = useRef(0);

  async function tokenOrThrow(): Promise<string> {
    const token = await getIdToken();
    if (!token) throw new Error("Please sign in again.");
    return token;
  }

  const getToken = useCallback(async (): Promise<string> => {
    const token = await getIdToken();
    if (!token) throw new Error("Please sign in again.");
    return token;
  }, [getIdToken]);

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
        setStateRules(new Map(states.map((s) => [s.code.toUpperCase(), s])));
      } catch {
        // Keep UT fallback; create still validates against state_rules server-side.
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [idToken, getIdToken]);

  function getTypeRule(
    type: RegistrationType,
    stateCode: string,
  ): Pick<ActiveStateRegistrationTypeDto, "label" | "decode" | "identityFields" | "notes"> {
    const rule = stateRules
      .get(stateCode.toUpperCase())
      ?.registrationTypes?.find((t) => t.type === type);
    if (rule) return rule;
    return {
      label: REGISTRATION_TYPE_LABELS[type],
      notes: null,
      ...FALLBACK_TYPE_RULES[type],
    };
  }

  const typeCards = useMemo(
    () =>
      TYPE_ORDER.map((type) => {
        const rule = getTypeRule(type, state);
        return { type, label: rule.label, notes: rule.notes };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilds when state rules resolve
    [state, stateRules],
  );

  const typeRule = registrationType ? getTypeRule(registrationType, state) : null;
  const typeLabel = registrationType
    ? getTypeRule(registrationType, state).label
    : "";
  const detailsPhotoUrl = usePhotoPreviewUrl({
    pendingFile: pendingPhotoFile,
  });
  const detailsHeadline = draft
    ? [
        draft.year,
        titleCaseMakeModel(draft.make),
        titleCaseMakeModel(draft.model),
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  function selectType(type: RegistrationType) {
    if (scanning) return;

    scanGenerationRef.current += 1;

    if (scanPrefill && scannedFile) {
      void applyScanResult(scanPrefill, scannedFile, type);
      setScanPrefill(null);
      return;
    }

    setRegistrationType(type);
    const rule = getTypeRule(type, state);
    setMode(rule.decode === "nhtsa_vin" ? "vin" : "plate");
    setError(null);
    setInfo(null);
    setStep("identity");
  }

  async function applyScanResult(
    scan: RegistrationScanDto,
    file: File,
    type: RegistrationType,
  ) {
    setScannedFile(file);
    setRegistrationType(type);
    const nextState = (scan.state ?? state).toUpperCase();
    const rule = getTypeRule(type, nextState);
    setMode(rule.decode === "nhtsa_vin" ? "vin" : "plate");
    setState(nextState);
    setVin(scan.vin ?? "");
    setPlate(scan.plate ?? "");
    setHin(scan.hin ?? "");
    setSerial(scan.serial ?? "");
    if (scan.registrationExpiresOn) {
      setExpiresOn(scan.registrationExpiresOn);
    }

    if (!stateIsAvailable(nextState)) {
      setStep("waitlist");
      setError(null);
      setInfo("We read your registration, but that state isn't live yet.");
      return;
    }

    setError(null);
    setInfo(null);

    if (rule.decode === "nhtsa_vin" && scan.vin) {
      setBusy(true);
      try {
        const token = await tokenOrThrow();
        const decoded = await decodeVinApi(token, scan.vin);
        if (decoded.ok) {
          setDraft({
            vin: decoded.vin,
            plate: scan.plate,
            hin: scan.hin,
            serial: scan.serial,
            state: nextState,
            year: decoded.year ?? scan.year,
            make: decoded.make ?? scan.make,
            model: decoded.model ?? scan.model,
            bodyClass: decoded.bodyClass,
          });
          setStep("confirm");
          return;
        }
        setInfo(decoded.error);
      } catch (err) {
        setInfo(
          err instanceof ApiError
            ? err.message
            : "VIN lookup failed. Review the details below.",
        );
      } finally {
        setBusy(false);
      }
    }

    setYear(scan.year ? String(scan.year) : "");
    setMake(scan.make ?? "");
    setModel(scan.model ?? "");
    setDraft({
      vin: scan.vin,
      plate: scan.plate,
      hin: scan.hin,
      serial: scan.serial,
      state: nextState,
      year: scan.year,
      make: scan.make,
      model: scan.model,
      bodyClass: null,
    });
    setStep("manual");
  }

  async function onScanFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const generation = ++scanGenerationRef.current;
    setError(null);
    setInfo(null);
    setScanPrefill(null);
    setScanning(true);
    try {
      const prepared = await prepareScanImage(file);
      if (generation !== scanGenerationRef.current) return;

      const token = await tokenOrThrow();
      const scan = await scanRegistration(token, {
        imageBase64: prepared.base64,
        mimeType: prepared.mimeType,
      });
      if (generation !== scanGenerationRef.current) return;

      if (!scan.registrationType) {
        setScanPrefill(scan);
        setScannedFile(prepared.file);
        setInfo(
          "We read some details — pick the registration type to continue.",
        );
        return;
      }

      await applyScanResult(scan, prepared.file, scan.registrationType);
    } catch (err) {
      if (generation !== scanGenerationRef.current) return;
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not read the registration. Try again or enter details manually.",
      );
    } finally {
      if (generation === scanGenerationRef.current) {
        setScanning(false);
      }
    }
  }

  async function onIdentitySubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!registrationType || !typeRule) return;

    if (!stateIsAvailable(state)) {
      setStep("waitlist");
      return;
    }

    if (typeRule.decode === "nhtsa_vin") {
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
              hin: null,
              serial: null,
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
              hin: null,
              serial: null,
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
            hin: null,
            serial: null,
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
        hin: null,
        serial: null,
        state,
        year: null,
        make: null,
        model: null,
        bodyClass: null,
      });
      setStep("manual");
      return;
    }

    // decode === "none": collect the type's identity fields directly.
    const trimmedPlate = plate.trim().toUpperCase();
    const trimmedHin = hin.trim().toUpperCase();
    const trimmedSerial = serial.trim().toUpperCase();
    const trimmedVin = vin.trim().toUpperCase();

    if (registrationType === "boat" && !trimmedPlate && !trimmedHin) {
      setError("Enter a HIN or registration number.");
      return;
    }
    if (
      (registrationType === "ohv" || registrationType === "snowmobile") &&
      !trimmedPlate &&
      !trimmedSerial &&
      !trimmedVin
    ) {
      setError("Enter a decal number, serial number, or VIN.");
      return;
    }
    if (trimmedVin && !isValidVinFormat(normalizeVin(trimmedVin))) {
      setError("VIN must be 17 characters (letters and numbers, no I/O/Q).");
      return;
    }

    setDraft({
      vin: trimmedVin ? normalizeVin(trimmedVin) : null,
      plate: trimmedPlate || null,
      hin: trimmedHin || null,
      serial: trimmedSerial || null,
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
    if (!draft || !registrationType) return;
    setError(null);
    setBusy(true);
    try {
      const token = await tokenOrThrow();

      const details: RegistrationDetails = {};
      if (draft.hin) details.hin = draft.hin;
      if (draft.serial) details.serial = draft.serial;
      if (registrationType === "trailer" && unladenWeightLbs.trim()) {
        const n = Number.parseInt(unladenWeightLbs, 10);
        if (Number.isFinite(n) && n >= 0) details.unladenWeightLbs = n;
      }
      if (registrationType === "boat") {
        if (lengthFeet.trim()) {
          const n = Number.parseFloat(lengthFeet);
          if (Number.isFinite(n) && n > 0) details.lengthFeet = n;
        }
        if (horsepower.trim()) {
          const n = Number.parseInt(horsepower, 10);
          if (Number.isFinite(n) && n >= 0) details.horsepower = n;
        }
      }
      if (registrationType === "ohv" && ohvClass.trim()) {
        details.ohvClass = ohvClass.trim();
      }

      const vehicle = await createRegistration(token, {
        type: registrationType,
        vin: draft.vin,
        plate: draft.plate,
        state: draft.state,
        year: draft.year,
        make: draft.make,
        model: draft.model,
        bodyClass: draft.bodyClass,
        nickname: nickname.trim() || null,
        details: Object.keys(details).length > 0 ? details : undefined,
        registrationExpiresOn: expiresOn,
      });

      let saved = vehicle;
      let photoWarning: string | undefined;
      if (pendingPhotoFile) {
        try {
          saved = await uploadRegistrationPhoto({
            token,
            registrationId: vehicle.id,
            file: pendingPhotoFile,
          });
        } catch {
          photoWarning =
            "Registration saved, but the photo could not be uploaded. Edit the registration to try again.";
        }
      }

      if (scannedFile) {
        try {
          await uploadDocumentToVault({
            token,
            registrationId: vehicle.id,
            type: "registration",
            file: scannedFile,
          });
        } catch {
          // Keep the vehicle add successful even if vault upload fails.
        }
      }

      onCreated(saved, photoWarning ? { warning: photoWarning } : undefined);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not add registration. Please try again.",
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

  function changeType() {
    setRegistrationType(null);
    setStep("pickType");
    setError(null);
    setInfo(null);
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
        Add a registration
      </h2>
      <p className="mt-1 text-base text-slate-600">
        {step === "pickType"
          ? "Choose what you're registering — we'll tailor the next steps."
          : "Under 30 seconds. We'll fill in what we can."}
      </p>

      {registrationType && step !== "pickType" && step !== "waitlist" ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-teal-50 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Registration type
            </p>
            <p className="text-base font-semibold text-teal-950">{typeLabel}</p>
          </div>
          <button
            type="button"
            onClick={changeType}
            className="shrink-0 text-sm font-semibold text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Change type
          </button>
        </div>
      ) : null}

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

      {step === "pickType" ? (
        <div className="mt-6 space-y-4">
          <input
            ref={scanInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={onScanFileChange}
          />
          <button
            type="button"
            disabled={scanning || busy}
            onClick={() => scanInputRef.current?.click()}
            className="flex w-full flex-col overflow-hidden rounded-3xl border-2 border-dashed border-teal-300 bg-teal-50/80 px-5 py-6 text-left shadow-sm transition hover:border-teal-400 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="text-base font-semibold text-teal-950">
              {scanning ? "Reading your registration…" : "Scan your registration"}
            </span>
            <span className="mt-1 text-sm leading-relaxed text-teal-800">
              Take a photo of your registration card and we&apos;ll fill in the
              details.
            </span>
          </button>

          <div className="relative flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              or choose type
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
          {typeCards.map((card) => (
            <button
              key={card.type}
              type="button"
              disabled={scanning || busy}
              onClick={() => selectType(card.type)}
              className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white text-left shadow-sm transition hover:border-teal-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              <div className="relative h-32 w-full">
                <VehicleIllustration registrationType={card.type} label={card.label} />
              </div>
              <div className="px-3 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  {card.label}
                </p>
                {card.notes ? (
                  <p className="mt-1 text-xs leading-snug text-slate-500">
                    {card.notes}
                  </p>
                ) : null}
              </div>
            </button>
          ))}
          </div>
        </div>
      ) : null}

      {step === "identity" && registrationType && typeRule ? (
        <form onSubmit={onIdentitySubmit} className="mt-6 space-y-4">
          {typeRule.decode === "nhtsa_vin" ? (
            <>
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
            </>
          ) : (
            <div className="space-y-4">
              {identityHelperText(registrationType) ? (
                <p className="text-sm text-slate-600">
                  {identityHelperText(registrationType)}
                </p>
              ) : null}

              {typeRule.identityFields.includes("plate") ? (
                <div>
                  <label htmlFor="plate" className={labelClassName}>
                    {plateFieldLabel(registrationType)}{" "}
                    <span className="font-normal text-slate-500">(optional)</span>
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
                  />
                </div>
              ) : null}

              {typeRule.identityFields.includes("hin") ? (
                <div>
                  <label htmlFor="hin" className={labelClassName}>
                    Hull Identification Number (HIN)
                  </label>
                  <input
                    id="hin"
                    name="hin"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="US-XXXXXXXXXXXX"
                    className={`${fieldClassName} font-mono uppercase`}
                    value={hin}
                    onChange={(e) => setHin(e.target.value.toUpperCase())}
                  />
                </div>
              ) : null}

              {typeRule.identityFields.includes("serial") ? (
                <div>
                  <label htmlFor="serial" className={labelClassName}>
                    Serial number{" "}
                    <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  <input
                    id="serial"
                    name="serial"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className={`${fieldClassName} font-mono uppercase`}
                    value={serial}
                    onChange={(e) => setSerial(e.target.value.toUpperCase())}
                  />
                </div>
              ) : null}

              {typeRule.identityFields.includes("vin") ? (
                <div>
                  <label htmlFor="vin" className={labelClassName}>
                    VIN <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  <input
                    id="vin"
                    name="vin"
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
            </div>
          )}

          <div>
            <label htmlFor="state" className={labelClassName}>
              State
            </label>
            <select
              id="state"
              name="state"
              className={selectClassName}
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
                registrationType={registrationType ?? undefined}
              />
            </div>
            <div className="px-4 py-5">
              <p className="text-sm font-medium text-teal-800">Looks right?</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                {confirmLabel} — is this your registration? ✓
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
            {registrationType === "passenger"
              ? "Choose year, make, and model from the lists below."
              : "Quick manual entry — year, make, and model."}
          </p>
          {registrationType === "passenger" ? (
            <YearMakeModelPickers
              year={year}
              make={make}
              model={model}
              onYearChange={setYear}
              onMakeChange={setMake}
              onModelChange={setModel}
              getToken={getToken}
            />
          ) : (
            <>
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
            </>
          )}
          <button type="submit" className={primaryButtonClassName}>
            Continue
          </button>
        </form>
      ) : null}

      {step === "details" && draft && registrationType ? (
        <form onSubmit={onSave} className="mt-6 space-y-5">
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <div className="h-28">
              <VehicleIllustration
                bodyClass={draft.bodyClass}
                photoUrl={detailsPhotoUrl}
                label={detailsHeadline || typeLabel}
                registrationType={registrationType}
              />
            </div>
            <div className="rounded-b-3xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900">
              {detailsHeadline || typeLabel}
            </div>
          </div>

          <ExpirationPicker value={expiresOn} onChange={setExpiresOn} />

          {registrationType === "trailer" ? (
            <div>
              <label htmlFor="unladenWeightLbs" className={labelClassName}>
                Unladen weight (lbs){" "}
                <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="unladenWeightLbs"
                inputMode="numeric"
                className={fieldClassName}
                value={unladenWeightLbs}
                onChange={(e) => setUnladenWeightLbs(e.target.value)}
                placeholder="1200"
              />
            </div>
          ) : null}

          {registrationType === "boat" ? (
            <>
              <div>
                <label htmlFor="lengthFeet" className={labelClassName}>
                  Length (feet){" "}
                  <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="lengthFeet"
                  inputMode="decimal"
                  className={fieldClassName}
                  value={lengthFeet}
                  onChange={(e) => setLengthFeet(e.target.value)}
                  placeholder="18"
                />
              </div>
              <div>
                <label htmlFor="horsepower" className={labelClassName}>
                  Horsepower{" "}
                  <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="horsepower"
                  inputMode="numeric"
                  className={fieldClassName}
                  value={horsepower}
                  onChange={(e) => setHorsepower(e.target.value)}
                  placeholder="150"
                />
              </div>
            </>
          ) : null}

          {registrationType === "ohv" ? (
            <div>
              <label htmlFor="ohvClass" className={labelClassName}>
                OHV class{" "}
                <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="ohvClass"
                className={fieldClassName}
                value={ohvClass}
                onChange={(e) => setOhvClass(e.target.value)}
                placeholder="e.g. ATV, UTV, dirt bike"
              />
            </div>
          ) : null}

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

          <RegistrationPhotoPicker
            pendingFile={pendingPhotoFile}
            onPendingFileChange={setPendingPhotoFile}
            disabled={busy}
          />

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
