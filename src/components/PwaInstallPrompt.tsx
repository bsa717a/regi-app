"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOs;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const navStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || navStandalone;
}

const DISMISS_KEY = "regi.installPrompt.dismissed";

function subscribeNoop() {
  return () => {};
}

function useIsClient(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DISMISS_KEY) === "1";
}

/**
 * Captures `beforeinstallprompt` and shows a tasteful Install REGI affordance.
 * On iOS (no beforeinstallprompt), shows an Add to Home Screen hint.
 */
export function PwaInstallPrompt() {
  const isClient = useIsClient();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);
  const storedDismissed = isClient ? readDismissed() : false;
  const hide = dismissed || storedDismissed;

  useEffect(() => {
    if (!isClient) return;
    if (isStandalone()) return;
    if (readDismissed()) return;

    const onBip = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
    };
  }, [isClient]);

  if (!isClient || hide || isStandalone()) return null;

  const showIosHint = isIos() && !deferred;
  const visible = Boolean(deferred) || showIosHint;
  if (!visible) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      // ignore
    }
    setDeferred(null);
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-3 sm:bottom-6"
      role="region"
      aria-label="Install REGI"
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-teal-800/15 bg-white/95 p-4 shadow-lg shadow-slate-900/10 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Install REGI</p>
            {showIosHint ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                On iPhone: tap Share, then{" "}
                <span className="font-medium text-slate-800">
                  Add to Home Screen
                </span>
                .
              </p>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Add REGI to your home screen for faster access and push alerts.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            aria-label="Dismiss install prompt"
          >
            Not now
          </button>
        </div>
        {deferred ? (
          <button
            type="button"
            onClick={() => void install()}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            Install REGI
          </button>
        ) : null}
      </div>
    </div>
  );
}
