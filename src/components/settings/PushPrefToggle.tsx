"use client";

import { useEffect, useState } from "react";
import { BrandSwitch } from "@/components/brand/ui";
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
    <li className="flex items-center justify-between gap-4 border-b border-regi-line px-3.5 py-3">
      <div>
        <div className="flex items-center gap-2">
          <p
            className="text-base text-regi-text"
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
          className="mt-0.5 text-sm text-regi-muted"
          id="pref-push-desc"
        >
          Renewal and maintenance alerts
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
      <BrandSwitch
        id="pref-push"
        checked={Boolean(prefs.push && pushAvailable)}
        disabled={isDisabled}
        labelledBy="pref-push-label"
        describedBy="pref-push-desc"
        onChange={(next) => void handleToggle(next)}
      />
    </li>
  );
}
