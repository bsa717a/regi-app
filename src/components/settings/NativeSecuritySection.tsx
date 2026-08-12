"use client";

import { BiometricPrefToggle } from "@/components/settings/BiometricPrefToggle";
import { useIsNativeApp } from "@/lib/capacitor/useIsNativeApp";

/** Security settings that only appear inside the Capacitor iOS shell. */
export function NativeSecuritySection({
  onMessage,
  onError,
}: {
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { isNative } = useIsNativeApp();
  if (!isNative) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Security
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Extra protection when opening REGI on this iPhone.
      </p>
      <ul className="mt-4 space-y-3">
        <BiometricPrefToggle onMessage={onMessage} onError={onError} />
      </ul>
    </section>
  );
}
