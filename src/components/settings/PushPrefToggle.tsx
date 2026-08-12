"use client";

import { useEffect, useState } from "react";
import {
  registerPushDeviceToken,
  unregisterPushDeviceToken,
  updateMe,
} from "@/lib/api/client";
import { requestDevicePushToken } from "@/lib/capacitor/push";
import { useIsNativeApp } from "@/lib/capacitor/useIsNativeApp";
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

/**
 * Push channel toggle — registers/unregisters the FCM device token.
 * Web uses VAPID; Capacitor iOS uses native Firebase Messaging + APNs.
 */
export function PushPrefToggle({
  prefs,
  disabled,
  getIdToken,
  onPrefsChange,
  onMessage,
  onError,
}: Props) {
  const { isNative, ready: nativeReady } = useIsNativeApp();
  const [busy, setBusy] = useState(false);
  const [capability, setCapability] = useState(() =>
    getPushCapability({
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      hasNotificationApi: true,
      hasServiceWorker: true,
      notificationPermission: "default",
    }),
  );

  useEffect(() => {
    if (!nativeReady) return;
    setCapability(
      getPushCapability({
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        isNativeApp: isNative,
      }),
    );
  }, [isNative, nativeReady]);

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
        if (!isNative && !isVapidConfigured()) {
          throw new Error(
            "Push isn’t configured yet. Ask an admin to set the Web Push key.",
          );
        }

        const deviceToken = await requestDevicePushToken();
        if (!deviceToken) {
          const nextCapability = getPushCapability({
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            isNativeApp: isNative,
          });
          setCapability(nextCapability);
          throw new Error(
            nextCapability.ok
              ? isNative
                ? "Couldn’t enable push on this iPhone. Check notification permission, and confirm Firebase iOS + APNs are set up."
                : "Couldn’t enable push on this device. Check notification permission and try again."
              : nextCapability.message,
          );
        }

        await registerPushDeviceToken(
          authToken,
          deviceToken.token,
          deviceToken.platform,
        );
        await updateMe(authToken, { notificationPrefs: { push: true } });
        onMessage("Push alerts enabled for this device.");
        setCapability({ ok: true });
      } else {
        // Best-effort unregister — prefs still save if token lookup fails.
        try {
          const deviceToken = await requestDevicePushToken();
          if (deviceToken) {
            await unregisterPushDeviceToken(authToken, deviceToken.token);
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

  const isDisabled = Boolean(disabled || busy || !pushAvailable || !nativeReady);

  return (
    <li className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <div>
        <div className="flex items-center gap-2">
          <p
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            id="pref-push-label"
          >
            Push
          </p>
          {!pushAvailable ? (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              Unavailable
            </span>
          ) : null}
        </div>
        <p
          className="mt-0.5 text-sm text-slate-600 dark:text-slate-400"
          id="pref-push-desc"
        >
          {isNative
            ? "Alerts on this iPhone when a renewal needs attention."
            : "Alerts on this device when REGI is installed."}
        </p>
        {note ? (
          <p
            className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400"
            role="note"
          >
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
          prefs.push && pushAvailable
            ? "bg-teal-700 dark:bg-teal-500"
            : "bg-slate-300 dark:bg-slate-600"
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
