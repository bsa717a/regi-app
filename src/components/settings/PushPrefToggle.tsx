"use client";

import { useState } from "react";
import {
  registerPushDeviceToken,
  unregisterPushDeviceToken,
  updateMe,
} from "@/lib/api/client";
import { requestFcmToken } from "@/lib/firebase/messaging";
import {
  getPushCapability,
  isVapidConfigured,
} from "@/lib/push/capability";
import type { NotificationPrefs } from "@/lib/auth/notificationPrefs";

type Props = {
  prefs: NotificationPrefs;
  disabled?: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  onPrefsChange: (next: NotificationPrefs) => void;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
};

function readInitialCapability() {
  // SSR-safe: gate on VAPID only; browser APIs are checked when enabling.
  return getPushCapability({
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    hasNotificationApi: true,
    hasServiceWorker: true,
    notificationPermission: "default",
  });
}

/**
 * Push channel toggle — registers/unregisters the FCM device token.
 * Degrades gracefully when VAPID is blank or permission is denied.
 */
export function PushPrefToggle({
  prefs,
  disabled,
  getIdToken,
  onPrefsChange,
  onMessage,
  onError,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [capability, setCapability] = useState(readInitialCapability);
  const pushAvailable = capability.ok;
  const note = capability.ok ? null : capability.message;

  async function handleToggle(enable: boolean) {
    onError("");
    setBusy(true);
    const previous = prefs;
    const next = { ...prefs, push: enable };
    onPrefsChange(next);

    try {
      const authToken = await getIdToken();
      if (!authToken) throw new Error("Session expired. Sign in again.");

      if (enable) {
        if (!isVapidConfigured()) {
          throw new Error(
            "Push isn’t configured yet. Ask an admin to set the Web Push key.",
          );
        }

        const fcmToken = await requestFcmToken();
        if (!fcmToken) {
          const nextCapability = getPushCapability({
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          });
          setCapability(nextCapability);
          throw new Error(
            nextCapability.ok
              ? "Couldn’t enable push on this device. Check notification permission and try again."
              : nextCapability.message,
          );
        }

        await registerPushDeviceToken(authToken, fcmToken);
        await updateMe(authToken, { notificationPrefs: { push: true } });
        onMessage("Push alerts enabled for this device.");
        setCapability({ ok: true });
      } else {
        // Best-effort unregister — prefs still save if token lookup fails.
        try {
          const fcmToken = await requestFcmToken();
          if (fcmToken) {
            await unregisterPushDeviceToken(authToken, fcmToken);
          }
        } catch {
          // ignore token cleanup failures
        }
        await updateMe(authToken, { notificationPrefs: { push: false } });
        onMessage("Push alerts turned off.");
      }
    } catch (err) {
      onPrefsChange(previous);
      const message =
        err instanceof Error ? err.message : "Could not update push settings.";
      onError(message);
    } finally {
      setBusy(false);
    }
  }

  const isDisabled = Boolean(disabled || busy || !pushAvailable);

  return (
    <li className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900" id="pref-push-label">
            Push
          </p>
          {!pushAvailable ? (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              Unavailable
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-slate-600" id="pref-push-desc">
          Alerts on this device when REGI is installed.
        </p>
        {note ? (
          <p className="mt-2 text-xs leading-relaxed text-slate-500" role="note">
            {note}
          </p>
        ) : null}
      </div>
      <button
        id="pref-push"
        type="button"
        role="switch"
        aria-checked={prefs.push && pushAvailable}
        aria-labelledby="pref-push-label"
        aria-describedby="pref-push-desc"
        disabled={isDisabled}
        onClick={() => void handleToggle(!(prefs.push && pushAvailable))}
        className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50 ${
          prefs.push && pushAvailable ? "bg-teal-700" : "bg-slate-300"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            prefs.push && pushAvailable ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </li>
  );
}
