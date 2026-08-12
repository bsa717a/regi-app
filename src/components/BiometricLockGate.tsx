"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  isBiometricUnlockEnabled,
  verifyBiometricUnlock,
} from "@/lib/capacitor/biometric";
import { useIsNativeApp } from "@/lib/capacitor/useIsNativeApp";

/**
 * When Face ID unlock is enabled, locks the UI after backgrounding / session
 * restore until the user verifies biometrics. No-ops on web.
 */
export function BiometricLockGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isNative, ready: nativeReady } = useIsNativeApp();
  const [locked, setLocked] = useState(false);
  const [gateReady, setGateReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unlockedForUser = useRef<string | null>(null);
  const watchedUid = useRef<string | null>(null);

  useEffect(() => {
    if (!nativeReady) return;

    if (!isNative) {
      setGateReady(true);
      setLocked(false);
      return;
    }

    let cancelled = false;
    let removeAppListener: (() => void) | undefined;

    void (async () => {
      if (loading) {
        setGateReady(false);
        return;
      }

      if (!user) {
        unlockedForUser.current = null;
        watchedUid.current = null;
        setLocked(false);
        setGateReady(true);
      } else if (
        watchedUid.current !== user.uid ||
        unlockedForUser.current !== user.uid
      ) {
        watchedUid.current = user.uid;
        const enabled = await isBiometricUnlockEnabled();
        if (cancelled) return;

        if (!enabled) {
          unlockedForUser.current = user.uid;
          setLocked(false);
          setGateReady(true);
        } else if (unlockedForUser.current === user.uid) {
          setLocked(false);
          setGateReady(true);
        } else {
          setLocked(true);
          setError(null);
          setGateReady(true);
        }
      } else {
        setGateReady(true);
      }

      const { App } = await import("@capacitor/app");
      if (cancelled) return;

      const handle = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) return;
        void (async () => {
          if (!user) return;
          const enabled = await isBiometricUnlockEnabled();
          if (!enabled) return;
          unlockedForUser.current = null;
          setLocked(true);
          setError(null);
        })();
      });
      removeAppListener = () => {
        void handle.remove();
      };
    })();

    return () => {
      cancelled = true;
      removeAppListener?.();
    };
  }, [user, loading, isNative, nativeReady]);

  async function unlock() {
    setBusy(true);
    setError(null);
    try {
      await verifyBiometricUnlock("Unlock REGI");
      unlockedForUser.current = user?.uid ?? null;
      setLocked(false);
    } catch {
      setError("Couldn’t verify Face ID. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const showCover = isNative && (!gateReady || locked);

  return (
    <>
      {children}
      {showCover ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-100"
          role="dialog"
          aria-modal="true"
          aria-labelledby="regi-biometric-lock-title"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
            REGI
          </p>
          <h2
            id="regi-biometric-lock-title"
            className="mt-3 text-2xl font-semibold tracking-tight"
          >
            {locked ? "Unlock to continue" : "Starting up…"}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            {locked
              ? "Use Face ID or Touch ID to open your garage and renewals."
              : "Checking device security…"}
          </p>
          {locked ? (
            <>
              {error ? (
                <p className="mt-4 text-sm text-rose-300" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void unlock()}
                disabled={busy}
                className="mt-8 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Waiting…" : "Unlock with Face ID"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
