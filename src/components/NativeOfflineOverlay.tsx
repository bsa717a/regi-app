"use client";

import { useEffect, useState } from "react";
import { useIsNativeApp } from "@/lib/capacitor/useIsNativeApp";

/**
 * Full-screen offline state for the Capacitor shell when the network drops
 * after the hosted app has already loaded.
 */
export function NativeOfflineOverlay() {
  const { isNative } = useIsNativeApp();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!isNative) return;

    let remove: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const { Network } = await import("@capacitor/network");
      const status = await Network.getStatus();
      if (!cancelled) setOffline(!status.connected);

      const handle = await Network.addListener(
        "networkStatusChange",
        (next) => {
          setOffline(!next.connected);
        },
      );
      remove = () => {
        void handle.remove();
      };
    })();

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [isNative]);

  if (!isNative || !offline) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-100"
      role="status"
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
        REGI
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">
        You&apos;re offline
      </h2>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        Connect to the internet to load your garage, renewals, and documents.
      </p>
    </div>
  );
}
