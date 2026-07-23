"use client";

import { useEffect } from "react";

/** Registers the PWA service worker (app shell + offline) when supported. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      return;
    }

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.warn("[PWA] service worker registration failed", error);
    });
  }, []);

  return null;
}
