"use client";

import { useEffect, useState } from "react";
import {
  getBiometricAvailability,
  isBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
  verifyBiometricUnlock,
  type BiometricAvailability,
} from "@/lib/capacitor/biometric";
import { useIsNativeApp } from "@/lib/capacitor/useIsNativeApp";

type Props = {
  onMessage: (message: string) => void;
  onError: (message: string) => void;
};

/**
 * Settings toggle for Face ID / Touch ID app unlock (Capacitor iOS only).
 */
export function BiometricPrefToggle({ onMessage, onError }: Props) {
  const { isNative } = useIsNativeApp();
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [availability, setAvailability] = useState<BiometricAvailability>({
    available: false,
    label: "Face ID",
  });

  useEffect(() => {
    if (!isNative) {
      setReady(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const nextAvailability = await getBiometricAvailability();
      const nextEnabled = await isBiometricUnlockEnabled();
      if (cancelled) return;
      setAvailability(nextAvailability);
      setEnabled(nextEnabled && nextAvailability.available);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [isNative]);

  if (!isNative) return null;

  if (!ready) {
    return (
      <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        Checking Face ID…
      </li>
    );
  }

  async function handleToggle(next: boolean) {
    onError("");
    setBusy(true);
    try {
      if (next) {
        if (!availability.available) {
          throw new Error(
            availability.reason ?? "Biometrics aren’t available on this device.",
          );
        }
        await verifyBiometricUnlock(`Enable ${availability.label} unlock`);
        await setBiometricUnlockEnabled(true);
        setEnabled(true);
        onMessage(`${availability.label} unlock enabled.`);
      } else {
        await setBiometricUnlockEnabled(false);
        setEnabled(false);
        onMessage(`${availability.label} unlock turned off.`);
      }
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : `Couldn’t update ${availability.label} unlock.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {availability.label} unlock
        </p>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
          {availability.available
            ? `Require ${availability.label} when opening REGI.`
            : (availability.reason ??
              "Set up Face ID or Touch ID in iOS Settings to use this.")}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={busy || !availability.available}
        onClick={() => void handleToggle(!enabled)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${
          enabled ? "bg-teal-700" : "bg-slate-300 dark:bg-slate-600"
        } disabled:opacity-50`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
            enabled ? "translate-x-5" : ""
          }`}
        />
      </button>
    </li>
  );
}
