"use client";

import { useEffect } from "react";
import { useIsNativeApp } from "@/lib/capacitor/useIsNativeApp";

/**
 * Applies native shell chrome when running inside Capacitor.
 * No-ops on web / PWA.
 */
export function CapacitorShell() {
  const { isNative } = useIsNativeApp();

  useEffect(() => {
    if (!isNative) return;

    let cancelled = false;

    void (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        if (cancelled) return;
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0f172a" });
      } catch {
        // StatusBar may be unavailable on some hosts.
      }

      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        if (cancelled) return;
        await SplashScreen.hide();
      } catch {
        // Splash plugin may already auto-hide.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isNative]);

  return null;
}
