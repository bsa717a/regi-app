/**
 * Client-safe helpers for push permission / VAPID degradation.
 * Safe to import from client components (no Node / Admin SDK).
 */

/** True when a non-empty Web Push VAPID key is configured. */
export function isVapidConfigured(
  vapidKey: string | undefined | null = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
): boolean {
  return typeof vapidKey === "string" && vapidKey.trim().length > 0;
}

export type PushCapability =
  | { ok: true }
  | {
      ok: false;
      reason: "unsupported" | "no_vapid" | "denied" | "default";
      message: string;
    };

/** Explain whether this browser can enable push (without prompting). */
export function getPushCapability(options?: {
  vapidKey?: string | null;
  notificationPermission?: NotificationPermission | "unsupported";
  hasNotificationApi?: boolean;
  hasServiceWorker?: boolean;
}): PushCapability {
  const vapidOk = isVapidConfigured(options?.vapidKey);
  if (!vapidOk) {
    return {
      ok: false,
      reason: "no_vapid",
      message:
        "Push alerts aren’t available yet — a Web Push certificate key still needs to be configured.",
    };
  }

  const hasNotificationApi =
    options?.hasNotificationApi ??
    (typeof window !== "undefined" && "Notification" in window);
  const hasServiceWorker =
    options?.hasServiceWorker ??
    (typeof navigator !== "undefined" && "serviceWorker" in navigator);

  if (!hasNotificationApi || !hasServiceWorker) {
    return {
      ok: false,
      reason: "unsupported",
      message: "This browser doesn’t support web push notifications.",
    };
  }

  const permission =
    options?.notificationPermission ??
    (typeof Notification !== "undefined" ? Notification.permission : "unsupported");

  if (permission === "denied") {
    return {
      ok: false,
      reason: "denied",
      message:
        "Notifications are blocked for this site. Enable them in your browser settings to get push alerts.",
    };
  }

  if (permission === "unsupported") {
    return {
      ok: false,
      reason: "unsupported",
      message: "This browser doesn’t support web push notifications.",
    };
  }

  return { ok: true };
}
