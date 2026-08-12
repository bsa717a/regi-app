"use client";

import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/capacitor/platform";

/**
 * Capacitor may inject its bridge slightly after first paint when loading a
 * remote server.url. Poll briefly so native-only UI (Face ID) can appear.
 */
export function useIsNativeApp(): { isNative: boolean; ready: boolean } {
  const [isNative, setIsNative] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function finish(native: boolean) {
      if (cancelled) return;
      setIsNative(native);
      setReady(true);
    }

    if (isNativeApp()) {
      finish(true);
      return;
    }

    // Plain browsers never get a delayed bridge — only Capacitor shells do.
    // Avoid blocking Settings (push toggle) for the full poll window on web.
    if (!/Capacitor/i.test(navigator.userAgent)) {
      finish(false);
      return;
    }

    const interval = window.setInterval(() => {
      if (isNativeApp()) {
        window.clearInterval(interval);
        finish(true);
      }
    }, 200);

    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      finish(isNativeApp());
    }, 4_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, []);

  return { isNative, ready };
}
