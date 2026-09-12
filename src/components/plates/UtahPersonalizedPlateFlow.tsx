"use client";

import { useMemo, useState } from "react";
import {
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
} from "@/components/auth/AuthFormStyles";
import { UtahDmvHandoff } from "@/components/plates/UtahDmvHandoff";
import { UtahMvpCopyCard } from "@/components/plates/UtahMvpCopyCard";
import { UtahPlateFeeEstimateCard } from "@/components/plates/UtahPlateFeeEstimate";
import { UtahPlateRequirementsChecklist } from "@/components/plates/UtahPlateRequirementsChecklist";
import {
  collectSoftWarnings,
  estimateUtahPersonalizedPlateFees,
  getUtahPlateType,
  normalizePlateCombo,
  suggestedUtahPlateTypes,
  validatePlateCombo,
  validatePlateCombos,
  validatePlateMeaning,
  type UtahPlateTypeId,
} from "@/lib/plates/utah";

const STEPS = [
  { id: "type", label: "Plate type" },
  { id: "combos", label: "Choices" },
  { id: "meaning", label: "Meaning" },
  { id: "checks", label: "Checks" },
  { id: "fees", label: "Fees" },
  { id: "summary", label: "MVP" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export type UtahPlateVehicleContext = {
  id: string;
  label: string;
  plate: string | null;
  state: string;
  type: string;
  status: string;
};

export function UtahPersonalizedPlateFlow({
  vehicle,
}: {
  vehicle?: UtahPlateVehicleContext | null;
}) {
  const plateTypes = useMemo(
    () => suggestedUtahPlateTypes(vehicle?.type),
    [vehicle?.type],
  );
  const defaultType =
    vehicle?.type === "motorcycle"
      ? "motorcycle_standard"
      : "standard_life_elevated";

  const [step, setStep] = useState<StepId>("type");
  const [selectedPlateTypeId, setSelectedPlateTypeId] =
    useState<UtahPlateTypeId | null>(null);
  const plateTypeId = selectedPlateTypeId ?? defaultType;
  const [combos, setCombos] = useState(["", "", ""]);
  const [comboErrors, setComboErrors] = useState<Array<string | null>>([
    null,
    null,
    null,
  ]);
  const [meaning, setMeaning] = useState("");
  const [meaningError, setMeaningError] = useState<string | null>(null);

  const plateType = getUtahPlateType(plateTypeId);
  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const fees = estimateUtahPersonalizedPlateFees({
    specialGroup: plateType.isSpecialGroup,
  });
  const validatedCombos = validatePlateCombos(combos, plateTypeId);
  const comboValues = validatedCombos.ok ? validatedCombos.values : [];
  const warnings = collectSoftWarnings(comboValues);

  const draft = {
    plateTypeId,
    combos: comboValues,
    meaning: meaning.trim(),
    vehicleLabel: vehicle?.label ?? null,
    vehiclePlate: vehicle?.plate ?? null,
  };

  function goNext() {
    if (step === "type") {
      setStep("combos");
      return;
    }
    if (step === "combos") {
      const result = validatePlateCombos(combos, plateTypeId);
      if (!result.ok) {
        setComboErrors(result.errors);
        return;
      }
      setComboErrors([null, null, null]);
      setCombos([result.values[0] ?? "", result.values[1] ?? "", result.values[2] ?? ""]);
      setStep("meaning");
      return;
    }
    if (step === "meaning") {
      const result = validatePlateMeaning(meaning);
      if (!result.ok) {
        setMeaningError(result.error);
        return;
      }
      setMeaningError(null);
      setMeaning(result.value);
      setStep("checks");
      return;
    }
    if (step === "checks") {
      setStep("fees");
      return;
    }
    if (step === "fees") {
      setStep("summary");
    }
  }

  function goBack() {
    const previous = STEPS[stepIndex - 1];
    if (previous) setStep(previous.id);
  }

  function updateCombo(index: number, raw: string) {
    const next = normalizePlateCombo(raw).slice(0, plateType.maxCharacters + 4);
    const updated = [...combos];
    updated[index] = next;
    setCombos(updated);
    if (!next.trim()) {
      const errors = [...comboErrors];
      errors[index] = index === 0 ? comboErrors[0] : null;
      setComboErrors(errors);
      return;
    }
    const result = validatePlateCombo(next, plateTypeId);
    const errors = [...comboErrors];
    errors[index] = result.ok ? null : result.error;
    setComboErrors(errors);
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
          Utah personalized / specialty plates
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Plan your request, then enter it in MVP
        </h2>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
          REGI helps you pick a plate type, up to three combinations, and a
          meaning. You still apply on the Utah DMV site — we do not submit or
          prefill anything.
        </p>
        {vehicle ? (
          <p className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            For {vehicle.label}
            {vehicle.plate ? ` · current plate ${vehicle.plate}` : ""}.
            {vehicle.state !== "UT"
              ? " This garage vehicle is not marked Utah — the DMV still requires a currently UT-registered vehicle."
              : vehicle.status === "Expired"
                ? " REGI shows this registration as expired. The DMV requires the vehicle to be currently Utah-registered."
                : " The vehicle must be currently Utah-registered at the DMV."}
          </p>
        ) : null}
      </header>

      <ol className="grid grid-cols-6 gap-1" aria-label="Guided steps">
        {STEPS.map((item, index) => {
          const current = item.id === step;
          const done = index < stepIndex;
          return (
            <li key={item.id} className="min-w-0">
              <span
                className={`block h-1.5 rounded-full ${
                  current || done
                    ? "bg-teal-700 dark:bg-teal-400"
                    : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
              <span
                className={`mt-1.5 block truncate text-[11px] font-medium ${
                  current
                    ? "text-teal-800 dark:text-teal-300"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>

      {step === "type" ? (
        <div className="space-y-4">
          <UtahPlateRequirementsChecklist />
          <fieldset>
            <legend className={labelClassName}>Plate type</legend>
            <div className="mt-2 space-y-2">
              {plateTypes.map((type) => {
                const selected = type.id === plateTypeId;
                return (
                  <label
                    key={type.id}
                    className={`flex cursor-pointer gap-3 rounded-2xl border px-4 py-3 transition ${
                      selected
                        ? "border-teal-600 bg-teal-50 dark:border-teal-400 dark:bg-teal-950/40"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                    }`}
                  >
                    <input
                      type="radio"
                      name="utah-plate-type"
                      className="mt-1"
                      checked={selected}
                      onChange={() => {
                        setSelectedPlateTypeId(type.id);
                        setComboErrors([null, null, null]);
                      }}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {type.label}
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">
                        {type.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      ) : null}

      {step === "combos" ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Enter up to three letter/number choices in preference order.{" "}
            {plateType.shortLabel} allows up to {plateType.maxCharacters}{" "}
            characters, including spaces. Letters and numbers only.
          </p>
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <label htmlFor={`utah-combo-${index}`} className={labelClassName}>
                {index === 0 ? "First choice (required)" : `Choice ${index + 1} (optional)`}
              </label>
              <input
                id={`utah-combo-${index}`}
                value={combos[index] ?? ""}
                onChange={(event) => updateCombo(index, event.target.value)}
                className={`${fieldClassName} font-mono tracking-[0.18em]`}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={plateType.maxCharacters + 4}
                aria-invalid={Boolean(comboErrors[index])}
                aria-describedby={
                  comboErrors[index] ? `utah-combo-${index}-error` : undefined
                }
              />
              {comboErrors[index] ? (
                <p
                  id={`utah-combo-${index}-error`}
                  className="mt-1 text-sm text-rose-700 dark:text-rose-300"
                  role="alert"
                >
                  {comboErrors[index]}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {step === "meaning" ? (
        <div>
          <label htmlFor="utah-plate-meaning" className={labelClassName}>
            What does this combination mean?
          </label>
          <textarea
            id="utah-plate-meaning"
            value={meaning}
            onChange={(event) => {
              setMeaning(event.target.value);
              setMeaningError(null);
            }}
            rows={4}
            className={fieldClassName}
            placeholder="Utah asks for a short explanation of the meaning."
          />
          {meaningError ? (
            <p className="mt-1 text-sm text-rose-700 dark:text-rose-300" role="alert">
              {meaningError}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Example: family initials, a nickname, or a club name.
            </p>
          )}
        </div>
      ) : null}

      {step === "checks" ? (
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200/80 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Soft content check
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              These are reminders, not a DMV decision. Availability and approval
              happen only after you enter the request in MVP.
            </p>
            {warnings.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-teal-50 px-3 py-2.5 text-sm text-teal-950 dark:bg-teal-950/40 dark:text-teal-100">
                No obvious punctuation or content flags on{" "}
                {comboValues.join(", ")}. The DMV can still decline a
                combination.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {warnings.map((warning) => (
                  <li
                    key={`${warning.id}-${warning.message}`}
                    className="rounded-2xl bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
                  >
                    {warning.message}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {step === "fees" ? <UtahPlateFeeEstimateCard fees={fees} /> : null}

      {step === "summary" ? (
        <div className="space-y-4">
          <UtahMvpCopyCard draft={draft} />
          <UtahDmvHandoff />
          <UtahPlateRequirementsChecklist heading="Remember" />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Back
          </button>
        ) : null}
        {step !== "summary" ? (
          <button
            type="button"
            onClick={goNext}
            className={`${primaryButtonClassName} flex-1`}
          >
            {step === "fees" ? "See MVP summary" : "Continue"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
